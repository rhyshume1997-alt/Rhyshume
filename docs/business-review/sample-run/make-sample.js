'use strict';
/*
Business review sample run generator (package A). Not part of the product and not a test.
Usage:  node docs/business-review/sample-run/make-sample.js fixture
        NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<ca bundle> node docs/business-review/sample-run/make-sample.js live https://www.rhyshume.co.uk/
"fixture": drives the real handlers end to end against two local fictional websites with the PageSpeed API replaced by a STUB that returns
  fixed numbers. Everything it writes is labelled FIXTURE. No real network, no real provider, nothing is sent.
"live":    runs the real crawler and analyzer once against a public site the owner controls. The sandbox blocks direct DNS, so this run
  goes through a small adapter that uses the sandbox proxy; the production pinned fetcher is NOT used for it (it is covered by tests).
  PageSpeed does not run without PSI_API_KEY, and the shared anonymous pool is never used.
Outputs are written next to this file.
*/
const fs = require('node:fs');
const path = require('node:path');
const out = __dirname;
const T = path.join(__dirname, '..', '..', '..', 'test');
const H = require(path.join(T, 'br-helpers'));
const { crawlSite } = require('../../../api/_lib/br/crawl');
const { analyzeSnapshot } = require('../../../api/_lib/br/analyzer');
const { buildRow, toApiEvidence } = require('../../../api/_lib/br/evidence');
const { parseUrl } = require('../../../api/_lib/br/safe-fetch');
const { displayValue } = require('../../../api/_lib/br/metrics');

function listing(rows, header) {
  const lines = header.concat(['', 'subject | metric | state | value | observed_at | source | reason or limitation']);
  rows.forEach(function (e) {
    const v = e.value ? (typeof e.value.v === 'object' ? JSON.stringify(e.value.v) : displayValue(e.metric_key, e.value) + ' (raw ' + e.value.v + ')') : '-';
    lines.push([e.subject.kind === 'competitor' ? 'competitor' : 'business', e.metric_key, e.evidence_state, v, e.observed_at, e.source.name + (e.source.url ? ' ' + e.source.url : ''), e.reason_code || (e.limitations || [])[0] || ''].join(' | '));
  });
  return lines.join('\n') + '\n';
}

async function fixture() {
  const w = await H.world({ sites: { harbourprecision: 'good', clydecomponents: 'good' } });
  const lh = function (lcp, perf, seo) { return { status: 200, json: { lighthouseResult: { fetchTime: '2026-11-20T10:00:05.000Z', lighthouseVersion: '12.3.0 (STUB)', requestedUrl: 'u', finalUrl: 'u', configSettings: { formFactor: 'mobile', throttlingMethod: 'simulate' }, runWarnings: [],
    categories: { performance: { score: perf }, seo: { score: seo }, accessibility: { score: 0.88 }, 'best-practices': { score: 0.96 } },
    audits: { 'largest-contentful-paint': { numericValue: lcp }, 'cumulative-layout-shift': { numericValue: 0.04 }, 'total-blocking-time': { numericValue: 180 }, 'first-contentful-paint': { numericValue: 1700 }, 'speed-index': { numericValue: 3300 } } } } }; };
  const ext = H.fakeExternal([{ match: 'pagespeedonline', reply: function (u) { return u.indexOf('clydecomponents') !== -1 ? lh(2100, 0.82, 0.97) : lh(3820, 0.61, 0.92); } }]);
  const app = H.makeApp({ fetcher: w.fetcher, fetchImpl: ext, env: { PSI_API_KEY: 'stub-key-not-real' } });
  const call = async function (method, url, body, token, headers) { return H.invoke(app.pub, { method: method, url: '/api/business-review/' + url, body: body, token: token, headers: headers }); };
  const st = await call('POST', 'start', { business_name: 'Harbour Precision Ltd', website: w.url('harbourprecision'), location: { text: 'Glasgow', kind: 'regional' }, category: 'CNC machining', goals: ['more_enquiries', 'quoting_followups'], turnstile_token: 'fixture' }, undefined, { 'Idempotency-Key': '11111111-2222-4333-8444-555555555555' });
  const id = st.json.review.id, token = st.json.access_token;
  await call('POST', id + '/confirm', { confirmed: true, competitor_nomination: { name: 'Clyde Components Ltd', website: w.url('clydecomponents') }, automation_task: 'We send quotes but forget to chase them' }, token);
  const timeline = [];
  let last;
  for (let i = 0; i < 12; i++) {
    last = await call('POST', id + '/advance', {}, token);
    timeline.push({ call: i + 1, ran: last.json.ran, status: last.json.review.status, steps: last.json.steps.map(function (s) { return s.key + ':' + s.state; }) });
    if (last.json.review.status === 'ready') break;
  }
  const rep = (await call('GET', id + '/report', token ? token : undefined, token)).json.report;
  const ev = (await app.store.select('br_evidence', {}, { order: ['created_at.asc'] })).map(toApiEvidence);
  const note = 'FIXTURE DATA. Fictional businesses served from local test servers; the PageSpeed API was replaced by a stub that returns fixed numbers, so every speed figure in this run is made up for the demonstration. Nothing in this run is a real measurement of a real business.';
  const wrap = function (o) { return Object.assign({ fixture: true, fixture_note: note }, o); };
  fs.writeFileSync(path.join(out, 'fixture-start-response.json'), JSON.stringify(wrap({ response: Object.assign({}, st.json, { access_token: '<redacted in sample>', report_url: '<redacted in sample>' }) }), null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'fixture-advance-timeline.json'), JSON.stringify(wrap({ calls: timeline }), null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'fixture-report.json'), JSON.stringify(wrap({ report: rep }), null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'fixture-evidence.txt'), listing(ev, ['FIXTURE DATA: ' + note, 'Review ' + rep.review_ref + ', report version ' + rep.version + ', ' + ev.length + ' evidence rows (all active rows; none superseded).']));
  const failures = (await app.store.select('br_provider_calls', {})).map(function (c) { return c.provider + ':' + c.operation + ':' + c.status; });
  fs.writeFileSync(path.join(out, 'fixture-provider-calls.txt'), 'FIXTURE DATA\n' + failures.join('\n') + '\n');
  console.log('fixture: ' + ev.length + ' evidence rows, ' + rep.recommendations.length + ' recommendations, ' + rep.comparison.rows.length + ' comparison rows, review status ' + last.json.review.status + ', completeness ' + last.json.review.completeness);
  await w.close();
}

// sandbox only: same interface as the safe fetcher but through the sandbox proxy (global fetch honours NODE_USE_ENV_PROXY)
function proxyAdapter() {
  const MAX = 1572864;
  return {
    parseUrl: function (u) { return parseUrl(u); },
    resolveHost: async function () { return { ok: true }; },
    request: async function (url, o) {
      o = o || {};
      const chain = [];
      let current = url;
      const started = Date.now();
      for (let hop = 0; hop < 6; hop++) {
        const p = parseUrl(current);
        if (!p.ok) return { ok: false, code: 'url_not_allowed', reason: p.reason, chain: chain };
        const ac = new AbortController();
        const timer = setTimeout(function () { ac.abort(); }, Math.min(o.timeoutMs || 8000, 15000));
        let res;
        try { res = await fetch(p.url, { method: o.method || 'GET', redirect: 'manual', signal: ac.signal, headers: { 'User-Agent': o.userAgent, Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.1' } }); }
        catch (e) { clearTimeout(timer); return { ok: false, code: ac.signal.aborted ? 'timeout' : 'site_unreachable', chain: chain }; }
        const hdr = {}; ['content-type', 'content-length', 'location', 'x-robots-tag'].forEach(function (k) { if (res.headers.get(k)) hdr[k] = res.headers.get(k); });
        const ct = String(hdr['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (res.status >= 300 && res.status < 400 && hdr.location && o.followRedirects !== false) { clearTimeout(timer); chain.push({ url: p.url, status: res.status, to_scheme: new URL(hdr.location, p.url).protocol.replace(':', '') }); current = new URL(hdr.location, p.url).href; continue; }
        let body = '';
        if (o.method !== 'HEAD' && res.status >= 200 && res.status < 300) {
          if (o.allowedTypes && o.allowedTypes.indexOf(ct) === -1) { clearTimeout(timer); return { ok: false, code: 'bad_content_type', chain: chain }; }
          body = await res.text().catch(function () { return ''; });
          if (body.length > (o.maxBytes || MAX)) { clearTimeout(timer); return { ok: false, code: 'too_large', chain: chain }; }
        } else await res.arrayBuffer().catch(function () { return null; });
        clearTimeout(timer);
        return { ok: true, status: res.status, headers: hdr, body: body, bytes: body.length, finalUrl: p.url, chain: chain, ms: Date.now() - started, scheme: p.protocol.replace(':', ''), host: p.hostname };
      }
      return { ok: false, code: 'too_many_redirects', chain: chain };
    }
  };
}

async function live(url) {
  const t0 = new Date();
  const snap = await crawlSite({ url: url, role: 'business', fetcher: proxyAdapter(), minIntervalMs: 1000, requestTimeoutMs: 10000 });
  const drafts = analyzeSnapshot(snap, { category: 'web developer' });
  const rows = drafts.map(function (d, i) { const r = buildRow('live-run', d); r.id = 'live-' + i; r.created_at = t0.toISOString(); return toApiEvidence(r); });
  const note = 'LIVE MEASUREMENT of ' + url + ' (a public site owned by the commissioner), run once on ' + t0.toISOString() + ' with the declared user agent, robots.txt honoured, at most 25 requests. This sandbox blocks direct DNS, so the fetches went through the sandbox proxy via a small adapter; the production SSRF-pinned fetcher was not used for this run. PageSpeed Insights did NOT run: no PSI_API_KEY exists here and the shared anonymous pool is never used by design.';
  fs.writeFileSync(path.join(out, 'live-rhyshume-snapshot.json'), JSON.stringify({ live: true, note: note, snapshot: snap }, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'live-rhyshume-evidence.txt'), listing(rows, ['LIVE: ' + note, rows.length + ' evidence rows.']));
  const pick = function (k) { const e = rows.find(function (r) { return r.metric_key === k; }); return e && e.value ? e.value.v : (e ? e.evidence_state + ' ' + e.reason_code : 'none'); };
  console.log('live: requests ' + snap.requests + ', home ' + (snap.home.ok ? snap.home.status : snap.home.code) + ', https ' + pick('https.enabled') + ', robots.present ' + pick('robots.present') + ', sitemap ' + pick('sitemap.present') + ', sitemap urls ' + pick('sitemap.url_count') + ', title ' + pick('page.title.present') + ' len ' + pick('page.title.length') + ', meta ' + pick('page.meta_description.present') + ', h1 ' + pick('page.h1.count') + ', heading order ' + pick('page.heading_order.valid') + ', canonical ' + pick('page.canonical.present') + '/' + pick('page.canonical.self') + ', viewport ' + pick('page.viewport.present') + ', json-ld ' + pick('structured_data.present') + ' parses ' + pick('structured_data.json_ld_parses') + ', links checked ' + pick('links.checked.count') + ' broken ' + pick('links.broken.count') + ', contact ' + pick('contact.route.present') + ', http->https ' + pick('https.http_redirects_to_https'));
}

(async function () {
  const mode = process.argv[2];
  if (mode === 'fixture') await fixture();
  else if (mode === 'live') await live(process.argv[3]);
  else { console.log('usage: fixture | live <url>'); process.exit(1); }
})().catch(function (e) { console.error(e); process.exit(1); });
