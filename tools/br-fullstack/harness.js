'use strict';
/*
DEVELOPMENT HARNESS, not shipped (listed in .vercelignore). Full stack local run of the Business Review.
Serves the static site like Vercel (cleanUrls, vercel.json headers and rewrites) and mounts the REAL handlers api/business-review.js
and api/business-review-admin.js through buildDeps with TEST ONLY overrides:
  - in memory store (test/br-helpers.js style, api/_lib/br/db.js createMemoryStore)
  - a test safe fetcher: hostnames ending .test resolve to the fixture server (127.0.0.1); private addresses are still refused
  - a stub Turnstile verifier (accepts TEST-TOKEN-<action> only for the matching action; records every call)
  - a STUB PageSpeed answer (every number is labelled STUB, never a real measurement)
  - a mail capture instead of Resend (nothing is sent)
  - a fixed clock (movable through /__harness/clock)
  - a stub owner verifier (token owner-session is the owner)
A second handler pair ("strict") uses the production safe fetcher with no override, for SSRF checks.
Also answers PostgREST shaped requests (/rest/v1/<table>) for the workbook, backed by the same store, so the workbook sees real reviews.
Inputs: PORT env or argv[2]. Outputs: an HTTP server. Must not: be imported by production code; contain a real key, address or token.
*/
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const ROOT = path.join(__dirname, '..', '..');
const { createMemoryStore } = require(path.join(ROOT, 'api/_lib/br/db'));
const { buildDeps } = require(path.join(ROOT, 'api/_lib/br/deps'));
const { createPublicHandler } = require(path.join(ROOT, 'api/_lib/br/routes'));
const { createAdminHandler } = require(path.join(ROOT, 'api/_lib/br/admin'));
const { testFetcher } = require(path.join(ROOT, 'test/br-helpers'));
const sites = require(path.join(ROOT, 'test/br-sites'));

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain', '.xml': 'text/xml', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const OWNER = 'owner@example.test';
const ENV = {
  SUPABASE_URL: 'https://example-project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'harness-service-key-not-real', BR_OWNER_EMAIL: OWNER, BR_SALT: 'harness-salt-not-real-0123456789',
  TURNSTILE_SECRET_KEY: 'harness-turnstile', CRON_SECRET: 'harness-cron-secret', PSI_API_KEY: 'harness-psi-key-not-real', BR_EMAIL: '1', RESEND_API_KEY: 'harness-resend-not-real',
  CONTACT_TO: 'owner-inbox@example.test', CONTACT_FROM: 'Rhys Hume <hello@example.test>', BR_SITE_ORIGIN: 'http://localhost', BR_DAILY_REVIEWS: '500'
};

function createHarness(opts) {
  const o = opts || {};
  const clock = { t: new Date(o.now || '2026-11-20T10:00:00.000Z') };
  const state = { mails: [], turnstile: [], psiCalls: [], external: [], faults: {}, psiDelayMs: {} };
  const env = Object.assign({}, ENV, o.env || {});
  let store = createMemoryStore({ now: function () { return new Date(clock.t); } });
  const extraTables = { client_workbooks: [], client_portals: [], client_answers: [], client_videos: [], business_details: [], client_quotes: [], quote_acceptances: [] };

  // ---- fixture web sites (virtual hosts on one local server). good*, rival*, clyde* : good site. poor* : poor site. robots* blocks bots. Others: 404.
  const siteHits = [];
  function siteFor(host) {
    const h = host.replace(/:\d+$/, '');
    if (/^poor/.test(h)) return sites.poor();
    if (/^robots/.test(h)) return { '/': { body: '<html><head><title>Blocked</title></head><body><h1>Blocked</h1></body></html>' }, '/robots.txt': { headers: { 'Content-Type': 'text/plain' }, body: 'User-agent: *\nDisallow: /\n' } };
    if (/^(good|rival|clyde|slow|psifail)/.test(h)) return sites.good(host);
    if (/^redirect-/.test(h)) {
      const target = h.replace(/^redirect-/, '').replace(/\.test$/, '');
      const map = { metadata: 'http://169.254.169.254/latest/meta-data/', loopback6: 'http://[::1]/', internal: 'http://internal.test/', file: 'file:///etc/passwd', decimal: 'http://2130706433/' };
      return { '/': { status: 302, headers: { Location: map[target] || 'http://169.254.169.254/' }, body: '' }, '/robots.txt': { status: 404, body: 'no' } };
    }
    return null;
  }
  const fixture = http.createServer(function (req, res) {
    const host = String(req.headers.host || '');
    siteHits.push({ host: host, url: req.url, ua: req.headers['user-agent'] });
    const routes = siteFor(host);
    const p = req.url.split('?')[0];
    const r = routes && (routes[req.url] || routes[p]);
    if (!r) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end('<html><body>not found</body></html>'); }
    res.writeHead(r.status || 200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, r.headers || {}));
    res.end(req.method === 'HEAD' ? undefined : (r.body === undefined ? '' : r.body));
  });

  // host map for the test fetcher: *.test resolves to loopback except internal.test, which resolves to a private address
  const hostMap = new Proxy({}, { get: function (t, h) { if (typeof h !== 'string') return undefined; if (h === 'internal.test') return '10.0.0.5'; if (h === 'meta.test') return '169.254.169.254'; return /\.test$/.test(h) ? '127.0.0.1' : undefined; } });
  let fixturePort = 0;
  const makeFetcher = function () { return testFetcher(hostMap, [fixturePort]); };

  // ---- external services stub: Resend (captured), PageSpeed (STUB numbers), everything else refused (no outbound network)
  async function externalFetch(url, init) {
    const u = String(url);
    state.external.push(u.split('?')[0]);
    const reply = function (status, json) { return { ok: status >= 200 && status < 300, status: status, json: async function () { return json; }, text: async function () { return JSON.stringify(json); } }; };
    if (u.indexOf('https://api.resend.com/emails') === 0) {
      const body = JSON.parse(init.body);
      state.mails.push({ at: clock.t.toISOString(), headers: init.headers, to: body.to, subject: body.subject, text: body.text, html: body.html, from: body.from, reply_to: body.reply_to || null });
      if (state.faults.mailFail) return reply(500, {});
      return reply(200, { id: 'stub-mail-' + state.mails.length });
    }
    if (u.indexOf('https://www.googleapis.com/pagespeedonline/v5/runPagespeed') === 0) {
      const target = new URL(new URL(u).searchParams.get('url'));
      state.psiCalls.push(target.host);
      const delay = Object.keys(state.psiDelayMs).reduce(function (a, k) { return target.host.indexOf(k) === 0 ? state.psiDelayMs[k] : a; }, 0);
      if (delay) await new Promise(function (r) { setTimeout(r, delay); });
      if (/^psifail/.test(target.host)) return reply(500, {});
      const poor = /^poor/.test(target.host);
      const n = function (a, b) { return poor ? a : b; };
      return reply(200, { lighthouseResult: { fetchTime: clock.t.toISOString(), lighthouseVersion: 'STUB-NOT-A-REAL-MEASUREMENT', requestedUrl: target.href, finalUrl: target.href,
        configSettings: { formFactor: 'mobile', throttlingMethod: 'simulate', locale: 'en-GB', emulatedFormFactor: 'mobile' },
        categories: { performance: { score: n(0.41, 0.93) }, seo: { score: n(0.62, 0.98) }, accessibility: { score: n(0.7, 0.96) }, 'best-practices': { score: n(0.75, 0.95) } },
        audits: { 'largest-contentful-paint': { numericValue: n(6100, 1800) }, 'cumulative-layout-shift': { numericValue: n(0.31, 0.02) }, 'total-blocking-time': { numericValue: n(900, 80) }, 'first-contentful-paint': { numericValue: n(3400, 1100) }, 'speed-index': { numericValue: n(5200, 1900) }, 'server-response-time': { numericValue: n(700, 90) } }, runWarnings: ['STUB numbers from the local test harness, not a measurement'] } });
    }
    return reply(599, {});
  }

  function turnstileVerifier(args) {
    state.turnstile.push({ action: args.action, hasToken: !!args.token });
    const t = String(args.token || '');
    if (!t) return Promise.resolve({ ok: false, reason: 'missing_token' });
    if (t === 'TEST-TOKEN-' + args.action) return Promise.resolve({ ok: true });
    return Promise.resolve({ ok: false, reason: t.indexOf('TEST-TOKEN-') === 0 ? 'wrong_action' : 'rejected' });
  }
  const ownerVerifier = async function (t) { return t === 'owner-session' ? { ok: true, email: OWNER } : t === 'other-session' ? { ok: true, email: 'someone@example.test' } : { ok: false }; };

  function buildPair(kind) {
    const overrides = { store: store, fetchImpl: externalFetch, now: function () { return new Date(clock.t); }, sleep: async function () {}, minIntervalMs: 0, verifyTurnstile: turnstileVerifier, softMs: o.softMs, hardMs: o.hardMs };
    if (kind !== 'strict') overrides.fetcher = makeFetcher();
    const mkEnv = kind === 'noowner' ? Object.assign({}, env, { BR_OWNER_EMAIL: '' }) : env;
    const deps = buildDeps(mkEnv, overrides);
    deps.verifyOwner = ownerVerifier;
    return { pub: createPublicHandler(deps), admin: createAdminHandler(deps), deps: deps };
  }
  let pairs = {};
  function rebuild() { pairs = { main: buildPair('main'), strict: buildPair('strict'), noowner: buildPair('noowner') }; }

  // ---- vercel.json mimic
  const vj = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  function srcToRegex(src, named) {
    let s = src.replace(/[.+?^${}[\]\\]/g, '\\$&');
    s = s.replace(/\\\(\.\*\\\)/g, '(.*)');
    s = s.replace(/\(([^()]*\|[^()]*)\)/g, '($1)');
    s = s.replace(/\\\(\.\*\)/g, '(.*)');
    s = s.replace(/:(\w+)\*/g, '(?<$1>.*)').replace(/:(\w+)/g, '(?<$1>[^/]+)');
    return new RegExp('^' + s + '$');
  }
  const headerRules = vj.headers.map(function (h) { return { re: srcToRegex(h.source.replace('(.*)', '(.*)')), headers: h.headers }; });
  const rewriteRules = vj.rewrites.map(function (r) { return { re: srcToRegex(r.source), dest: r.destination }; });

  function readFileFor(p) {
    const tries = p.endsWith('/') ? [p + 'index.html'] : [p, p + '.html', p + '/index.html'];
    for (const t of tries) {
      const f = path.join(ROOT, t);
      if (!f.startsWith(ROOT + path.sep) && f !== ROOT) continue;
      try { if (fs.statSync(f).isFile()) return f; } catch (e) { /* next */ }
    }
    return null;
  }

  function sendStatic(req, res, p) {
    // Vercel cleanUrls: /x.html redirects to /x
    if (/\.html$/.test(p) && !/\/(index)\.html$/.test(p)) { res.writeHead(308, { Location: p.replace(/\.html$/, '') }); return res.end(); }
    if (/\/index\.html$/.test(p)) { res.writeHead(308, { Location: p.replace(/index\.html$/, '') || '/' }); return res.end(); }
    let f = readFileFor(p);
    const blocked = /^\/(test|docs|tools|\.git|node_modules|\.claude|\.agents)(\/|$)|^\/(skills-lock\.json)$/.test(p);
    if (blocked) f = null; // .vercelignore
    const headers = {};
    headerRules.forEach(function (h) { if (h.re.test(p)) h.headers.forEach(function (x) { headers[x.key] = x.value; }); });
    if (!f) { const nf = path.join(ROOT, '404.html'); res.writeHead(404, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers)); return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'not found'); }
    res.writeHead(200, Object.assign({ 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }, headers));
    fs.createReadStream(f).pipe(res);
  }

  // ---- PostgREST shaped answer for the workbook, backed by the same store
  function tableRows(t) { if (store._data[t]) return store._data[t]; if (!extraTables[t]) return null; return extraTables[t]; }
  function applyFilters(rows, sp) {
    let out = rows.slice();
    sp.forEach(function (v, k) {
      if (['select', 'order', 'limit', 'offset'].indexOf(k) !== -1) return;
      const dot = v.indexOf('.'), op = v.slice(0, dot), val = v.slice(dot + 1);
      out = out.filter(function (r) {
        const x = r[k];
        switch (op) {
          case 'eq': return String(x) === val;
          case 'neq': return String(x) !== val;
          case 'in': return val.replace(/^\(|\)$/g, '').split(',').map(function (s) { return s.replace(/^"|"$/g, ''); }).indexOf(String(x)) !== -1;
          case 'is': return val === 'null' ? (x === null || x === undefined) : x != null;
          case 'gt': return x > val; case 'gte': return x >= val; case 'lt': return x < val; case 'lte': return x <= val;
          case 'ilike': case 'like': return new RegExp('^' + val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i').test(String(x));
          default: return true;
        }
      });
    });
    const order = sp.get('order');
    if (order) { const specs = order.split(',').map(function (s) { const p = s.split('.'); return { c: p[0], d: p[1] === 'desc' ? -1 : 1 }; }); out.sort(function (a, b) { for (const s of specs) { if (a[s.c] === b[s.c]) continue; return (a[s.c] < b[s.c] ? -1 : 1) * s.d; } return 0; }); }
    return out;
  }
  function pgrest(req, res, body, urlObj) {
    const j = function (status, obj) { res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }); res.end(JSON.stringify(obj)); };
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }); return res.end(); }
    // owner only row level security: anything but the owner's session sees nothing
    const auth = String(req.headers.authorization || '');
    if (auth !== 'Bearer owner-session') return j(401, { code: '42501', message: 'harness: not the owner session' });
    const table = urlObj.pathname.replace(/^\/rest\/v1\//, '');
    const rows = tableRows(table);
    if (!rows) return j(404, { code: 'PGRST205', message: 'Could not find the table ' + table });
    if (req.method === 'GET') {
      let out = applyFilters(rows, urlObj.searchParams);
      const sel = urlObj.searchParams.get('select') || '*';
      if (table === 'client_workbooks' && /status:data/.test(sel)) out = out.map(function (r) { return { id: r.id, client_name: r.client_name, updated_at: r.updated_at, status: r.data && r.data.client && r.data.client.status, seen: null }; });
      else if (sel !== '*' && !/[>:(]/.test(sel)) { const cols = sel.split(',').map(function (s) { return s.trim(); }); out = out.map(function (r) { const x = {}; cols.forEach(function (c) { if (c in r) x[c] = r[c]; }); return x; }); }
      const lim = Number(urlObj.searchParams.get('limit')); if (lim) out = out.slice(0, lim);
      return j(200, JSON.parse(JSON.stringify(out)));
    }
    const b = body ? JSON.parse(body) : null;
    if (req.method === 'POST') {
      if (store._data[table] && table !== 'leads') return j(403, { code: '42501', message: 'harness: owner has no insert policy on ' + table });
      const add = (Array.isArray(b) ? b : [b]).map(function (r) { return Object.assign({ id: require('node:crypto').randomUUID(), created_at: clock.t.toISOString(), updated_at: clock.t.toISOString() }, r); });
      rows.push.apply(rows, add);
      return j(201, add);
    }
    if (req.method === 'PATCH') {
      const hit = applyFilters(rows, urlObj.searchParams);
      hit.forEach(function (r) { Object.assign(r, b); if ('updated_at' in r) r.updated_at = clock.t.toISOString(); });
      return j(200, hit);
    }
    if (req.method === 'DELETE') {
      const hit = applyFilters(rows, urlObj.searchParams);
      if (store._data[table] && table !== 'leads') return j(403, { code: '42501', message: 'harness: owner cannot delete ' + table });
      const keep = rows.filter(function (r) { return hit.indexOf(r) === -1; });
      rows.length = 0; keep.forEach(function (r) { rows.push(r); });
      return j(200, hit);
    }
    return j(405, {});
  }

  function readRaw(req) { return new Promise(function (resolve) { const c = []; req.on('data', function (d) { c.push(d); }); req.on('end', function () { resolve(Buffer.concat(c).toString('utf8')); }); }); }

  async function handle(req, res) {
    const u = new URL(req.url, 'http://localhost');
    const p = u.pathname;
    try {
      if (p.indexOf('/__harness/') === 0) return control(req, res, u);
      if (u.hostname === 'localhost' && p.indexOf('/rest/v1/') === 0) { const raw = await readRaw(req); return pgrest(req, res, raw, u); }
      // rewrites in vercel.json order
      for (const r of rewriteRules) {
        const m = r.re.exec(p);
        if (!m) continue;
        const route = (m.groups && m.groups.path) || '';
        const isAdmin = r.dest.indexOf('business-review-admin') !== -1;
        if (r.dest.indexOf('/api/business-review') !== 0) continue;
        const kind = req.headers['x-harness-stack'] || 'main';
        const pair = pairs[kind] || pairs.main;
        req.query = { route: route };
        u.searchParams.forEach(function (v, k) { if (k !== 'route') req.query[k] = v; });
        if (state.faults.advance504 && /\/advance$/.test(route) && req.method === 'POST') { res.writeHead(504, { 'Content-Type': 'text/plain' }); return res.end('FUNCTION_INVOCATION_TIMEOUT'); }
        if (state.faults.advanceDrop && /\/advance$/.test(route) && req.method === 'POST') { req.socket.destroy(); return; }
        return await (isAdmin ? pair.admin : pair.pub)(req, res);
      }
      if (/^\/api\//.test(p)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('The page could not be found (harness has no handler for ' + p + ')'); }
      if (p === '/__stub/turnstile.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(TURNSTILE_STUB); }
      return sendStatic(req, res, decodeURIComponent(p));
    } catch (e) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('harness error ' + (e && e.message)); }
  }

  const TURNSTILE_STUB = "window.turnstile={_n:0,_cb:{},render:function(el,o){var id='w'+(++this._n);this._cb[id]=o;setTimeout(function(){o.callback('TEST-TOKEN-'+o.action)},60);return id},reset:function(id){var o=this._cb[id];if(o)setTimeout(function(){o.callback('TEST-TOKEN-'+o.action)},60)}};";

  function control(req, res, u) {
    const j = function (obj) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const p = u.pathname.replace('/__harness/', '');
    if (p === 'state') return j({ mails: state.mails.length, turnstile: state.turnstile, psiCalls: state.psiCalls, external: state.external, siteHits: siteHits.length, clock: clock.t.toISOString() });
    if (p === 'mails') return j(state.mails);
    if (p === 'clear') { state.mails.length = 0; state.turnstile.length = 0; state.psiCalls.length = 0; state.external.length = 0; siteHits.length = 0; return j({ ok: true }); }
    if (p === 'clock') { if (u.searchParams.get('set')) clock.t = new Date(u.searchParams.get('set')); if (u.searchParams.get('add_days')) clock.t = new Date(clock.t.getTime() + Number(u.searchParams.get('add_days')) * 86400000); return j({ clock: clock.t.toISOString() }); }
    if (p === 'fault') { u.searchParams.forEach(function (v, k) { state.faults[k] = v === '1'; }); return j(state.faults); }
    if (p === 'psi-delay') { state.psiDelayMs[u.searchParams.get('host')] = Number(u.searchParams.get('ms')); return j(state.psiDelayMs); }
    if (p === 'sitehits') return j(siteHits);
    if (p === 'data') { const t = u.searchParams.get('table'); return j(t ? (tableRows(t) || []) : Object.keys(store._data)); }
    if (p === 'reset') { store = createMemoryStore({ now: function () { return new Date(clock.t); } }); Object.keys(extraTables).forEach(function (k) { extraTables[k] = []; }); rebuild(); return j({ ok: true }); }
    if (p === 'seed-workbook') { extraTables.client_workbooks.push({ id: 'c0c0c0c0-0000-4000-8000-000000000001', client_name: 'Maple Street Bakery (made up)', updated_at: '2026-11-18T09:00:00Z', data: { client: { status: 'enquiry', business: 'Maple Street Bakery (made up)' } } }); return j({ ok: true }); }
    res.writeHead(404); res.end('no');
  }

  rebuild();
  const server = http.createServer(handle);
  return {
    state: state, clock: clock, server: server, fixture: fixture, siteHits: siteHits,
    start: async function (port, fport) {
      await new Promise(function (r) { fixture.listen(fport || 0, '127.0.0.1', r); });
      fixturePort = fixture.address().port; rebuild();
      await new Promise(function (r) { server.listen(port || 0, '127.0.0.1', r); });
      return { port: server.address().port, fixturePort: fixturePort };
    },
    close: async function () { server.closeAllConnections && server.closeAllConnections(); fixture.closeAllConnections && fixture.closeAllConnections(); await new Promise(function (r) { server.close(r); }); await new Promise(function (r) { fixture.close(r); }); }
  };
}

module.exports = { createHarness, OWNER };
if (require.main === module) {
  const port = Number(process.argv[2] || process.env.PORT || 4300);
  const fport = Number(process.argv[3] || process.env.FIXTURE_PORT || 80);
  const h = createHarness();
  h.start(port, fport).then(function (r) { console.log('br-fullstack harness: site http://localhost:' + r.port + '  fixture sites on 127.0.0.1:' + r.fixturePort + ' (use hosts like good-harbour.test, poor-site.test, rival-one.test)'); });
}
