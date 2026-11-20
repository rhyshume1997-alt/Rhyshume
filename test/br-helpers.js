'use strict';
/*
Test support for the business review (package A). Not a test file: it only defines helpers (node --test runs it harmlessly).
Provides: a local fixture web server, a safe fetcher pointed at it through a stubbed DNS (tests only), fake req/res for the handlers,
and a deps builder using the in memory store. Nothing here touches the real network or any real service.
*/
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const { Readable } = require('node:stream');
const { createSafeFetcher, classifyIp } = require('../api/_lib/br/safe-fetch');
const { createMemoryStore } = require('../api/_lib/br/db');
const { buildDeps } = require('../api/_lib/br/deps');
const { createPublicHandler } = require('../api/_lib/br/routes');
const { createAdminHandler } = require('../api/_lib/br/admin');

function startServer(handler, opts) {
  return new Promise(function (resolve) {
    const hits = [];
    const srv = (opts && opts.tls ? https.createServer(opts.tls, wrap) : http.createServer(wrap));
    function wrap(req, res) { hits.push({ url: req.url, method: req.method, headers: req.headers, remote: req.socket.remoteAddress }); handler(req, res); }
    srv.listen(0, '127.0.0.1', function () {
      resolve({ port: srv.address().port, hits: hits, server: srv, close: function () { return new Promise(function (r) { if (srv.closeAllConnections) srv.closeAllConnections(); srv.close(function () { r(); }); }); } });
    });
  });
}

// route table: { '/path': { status, headers, body } | function(req,res) }
function siteHandler(routes) {
  return function (req, res) {
    const p = req.url.split('?')[0];
    const r = routes[req.url] || routes[p];
    if (!r) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end('<html><body>not found</body></html>'); }
    if (typeof r === 'function') return r(req, res);
    res.writeHead(r.status || 200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, r.headers || {}));
    res.end(req.method === 'HEAD' ? undefined : r.body === undefined ? '' : r.body);
  };
}

// hostMap: { 'good.test': '127.0.0.1', 'internal.test': '10.0.0.5' }. ports: extra allowed ports (the fixture servers).
function testFetcher(hostMap, ports, extra) {
  const lookups = [];
  const f = createSafeFetcher(Object.assign({
    lookup: async function (host) {
      lookups.push(host);
      const v = hostMap[host];
      if (v === undefined) { const e = new Error('ENOTFOUND'); e.code = 'ENOTFOUND'; throw e; }
      const list = Array.isArray(v) ? v : [v];
      return list.map(function (a) { return { address: a, family: net.isIPv6(a) ? 6 : 4 }; });
    },
    allowAddress: function (ip) { return ip === '127.0.0.1' || classifyIp(ip).allowed; },
    allowedPorts: [80, 443].concat(ports || [])
  }, extra || {}));
  f.lookups = lookups;
  return f;
}

function fakeReq(o) {
  const raw = o.body === undefined ? '' : (typeof o.body === 'string' ? o.body : JSON.stringify(o.body));
  const r = Readable.from(raw ? [Buffer.from(raw)] : []);
  r.method = o.method || 'GET';
  r.url = o.url;
  const h = {};
  Object.keys(o.headers || {}).forEach(function (k) { h[k.toLowerCase()] = o.headers[k]; });
  if (o.body !== undefined && !('content-type' in h) && !o.noContentType) h['content-type'] = 'application/json; charset=utf-8';
  if (o.token) h.authorization = 'Bearer ' + o.token;
  if (o.ip !== false) h['x-forwarded-for'] = o.ip || '203.0.113.7';
  r.headers = h;
  r.socket = { remoteAddress: '198.51.100.1' };
  if (o.query) r.query = o.query;
  return r;
}
function fakeRes() {
  const res = { statusCode: 200, headers: {}, body: '', setHeader: function (k, v) { res.headers[k.toLowerCase()] = v; }, end: function (b) { res.body = b || ''; res._done(); } };
  res.promise = new Promise(function (r) { res._done = r; });
  return res;
}
async function invoke(handler, o) {
  const req = fakeReq(o), res = fakeRes();
  await handler(req, res);
  let json = null;
  try { json = res.body ? JSON.parse(res.body) : null; } catch (e) { json = null; }
  return { status: res.statusCode, headers: res.headers, json: json, raw: res.body };
}

const BASE_ENV = {
  SUPABASE_URL: 'https://example-project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key-not-real', BR_OWNER_EMAIL: 'owner@example.test', BR_SALT: 'test-salt-not-real',
  TURNSTILE_SECRET_KEY: 'test-turnstile', CRON_SECRET: 'test-cron-secret'
};
const FIXED_NOW = new Date('2026-11-20T10:00:00.000Z');

// A fake fetch for external services: records every call and answers by host. Never touches the network.
function fakeExternal(handlers) {
  const calls = [];
  const fn = async function (url, init) {
    const u = String(url);
    calls.push({ url: u, init: init || {} });
    for (let i = 0; i < (handlers || []).length; i++) {
      const h = handlers[i];
      if (u.indexOf(h.match) === 0 || u.indexOf(h.match) !== -1) {
        const out = typeof h.reply === 'function' ? await h.reply(u, init) : h.reply;
        return { ok: out.status >= 200 && out.status < 300, status: out.status, json: async function () { return out.json; }, text: async function () { return JSON.stringify(out.json || {}); } };
      }
    }
    return { ok: false, status: 599, json: async function () { return {}; }, text: async function () { return ''; } };
  };
  fn.calls = calls;
  return fn;
}

function makeApp(o) {
  const opts = o || {};
  const clock = { t: new Date(FIXED_NOW) };
  const store = opts.store || createMemoryStore({ now: function () { return new Date(clock.t); } });
  const ext = opts.fetchImpl || fakeExternal([]);
  const env = Object.assign({}, BASE_ENV, opts.env || {});
  const deps = buildDeps(env, {
    store: store, fetcher: opts.fetcher, fetchImpl: ext, now: function () { return new Date(clock.t); }, sleep: async function () {}, minIntervalMs: 0, registry: opts.registry,
    verifyTurnstile: opts.verifyTurnstile || (async function () { return { ok: true }; }), softMs: opts.softMs, hardMs: opts.hardMs
  });
  deps.verifyOwner = opts.verifyOwner || (async function (t) { return t === 'owner-session' ? { ok: true, email: 'owner@example.test' } : t === 'other-session' ? { ok: true, email: 'someone@example.test' } : { ok: false }; });
  return { deps: deps, store: store, clock: clock, ext: ext, pub: createPublicHandler(deps), admin: createAdminHandler(deps) };
}

module.exports = { startServer, siteHandler, testFetcher, fakeReq, fakeRes, invoke, makeApp, fakeExternal, BASE_ENV, FIXED_NOW };

// ---- scenario world for API tests: fixture sites, fetcher, app (all local)
async function world(opts) {
  const o = opts || {};
  const sitesMod = require('./br-sites');
  const servers = {};
  const defs = o.sites || { biz: 'good', rival: 'good', poor: 'poor' };
  const holders = {};
  const names = Object.keys(defs);
  for (const n of names) {
    holders[n] = {};
    servers[n] = await startServer(function (req, res) { return siteHandler(holders[n])(req, res); });
  }
  names.forEach(function (n) { holders[n] = (defs[n] === 'poor' ? sitesMod.poor() : sitesMod.good(n + '.test:' + servers[n].port)); Object.assign(holders[n], {}); });
  // handlers read holders[n] lazily through the closure above; rebind
  names.forEach(function (n) { const routes = holders[n]; servers[n].server.removeAllListeners('request'); servers[n].server.on('request', function (req, res) { servers[n].hits.push({ url: req.url, method: req.method, headers: req.headers }); siteHandler(routes)(req, res); }); });
  const map = {};
  names.forEach(function (n) { map[n + '.test'] = '127.0.0.1'; });
  Object.assign(map, o.extraHosts || {});
  const fetcher = testFetcher(map, names.map(function (n) { return servers[n].port; }));
  const url = function (n, path) { return 'http://' + n + '.test:' + servers[n].port + (path || '/'); };
  return { servers: servers, routes: holders, fetcher: fetcher, url: url, close: async function () { for (const n of names) await servers[n].close(); } };
}

module.exports.world = world;
