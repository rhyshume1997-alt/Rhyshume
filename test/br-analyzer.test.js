'use strict';
// Package A: crawl and analyzer against local fixture sites (fictional, never the real network). Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const { crawlSite } = require('../api/_lib/br/crawl');
const { analyzeSnapshot, headingOrderValid } = require('../api/_lib/br/analyzer');
const { buildRow } = require('../api/_lib/br/evidence');
const html = require('../api/_lib/br/html');
const { startServer, siteHandler, testFetcher } = require('./br-helpers');
const sites = require('./br-sites');

async function crawl(routes, opts) {
  const srv = await startServer(siteHandler(routes));
  try {
    const f = testFetcher({ 'good.test': '127.0.0.1', 'www.good.test': '127.0.0.1' }, [srv.port]);
    const url = 'http://good.test:' + srv.port + '/';
    const snap = await crawlSite(Object.assign({ url: url, role: 'business', fetcher: f, minIntervalMs: 0, sleep: async function () {}, httpCheckOrigin: null, requestTimeoutMs: 600 }, opts || {}));
    return { snap: snap, srv: srv, hits: srv.hits.slice(), host: 'good.test:' + srv.port };
  } finally { await srv.close(); }
}
const byKey = function (drafts, key) { return drafts.find(function (d) { return d.metric_key === key; }); };

test('good site: measured facts, every draft is a valid evidence row with source, time and inputs', async function () {
  // the fixture embeds its own port in absolute URLs, so the routes are built once the port is known
  let routesHolder = {};
  const s3 = await startServer(function (req, res) { return siteHandler(routesHolder)(req, res); });
  routesHolder = sites.good('good.test:' + s3.port);
  try {
    const fetcher = testFetcher({ 'good.test': '127.0.0.1' }, [s3.port]);
    const snap = await crawlSite({ url: 'http://good.test:' + s3.port + '/', role: 'business', fetcher: fetcher, minIntervalMs: 0, sleep: async function () {}, requestTimeoutMs: 600, httpCheckOrigin: 'http://good.test:' + s3.port });
    const drafts = analyzeSnapshot(snap, { category: 'CNC machining' });
    assert.ok(snap.requests <= 25);
    assert.strictEqual(snap.home.ok, true);
    assert.strictEqual(byKey(drafts, 'https.enabled').value, false, 'a plain http fixture is correctly reported as not HTTPS');
    assert.strictEqual(byKey(drafts, 'page.status').value, 200);
    assert.strictEqual(byKey(drafts, 'page.title.present').value, true);
    assert.strictEqual(byKey(drafts, 'page.title.length').value, 'Harbour Precision | CNC machining in Glasgow'.length);
    assert.strictEqual(byKey(drafts, 'page.meta_description.present').value, true);
    assert.strictEqual(byKey(drafts, 'page.h1.count').value, 1);
    assert.strictEqual(byKey(drafts, 'page.heading_order.valid').value, true);
    assert.strictEqual(byKey(drafts, 'page.canonical.present').value, true);
    assert.strictEqual(byKey(drafts, 'page.canonical.self').value, true);
    assert.strictEqual(byKey(drafts, 'page.viewport.present').value, true);
    assert.strictEqual(byKey(drafts, 'structured_data.present').value, true);
    assert.deepStrictEqual(byKey(drafts, 'structured_data.types').value, ['LocalBusiness']);
    assert.strictEqual(byKey(drafts, 'structured_data.json_ld_parses').value, true);
    assert.strictEqual(byKey(drafts, 'robots.present').value, true);
    assert.strictEqual(byKey(drafts, 'robots.blocks_crawl').value, false);
    assert.strictEqual(byKey(drafts, 'sitemap.present').value, true);
    assert.strictEqual(byKey(drafts, 'sitemap.url_count').value, 5);
    assert.ok(byKey(drafts, 'nav.internal_links.count').value >= 5);
    assert.strictEqual(byKey(drafts, 'contact.route.present').value, true);
    assert.deepStrictEqual(byKey(drafts, 'contact.route.kinds').value.sort(), ['contact_page_link', 'email_link', 'form', 'phone_link']);
    assert.strictEqual(byKey(drafts, 'links.broken.count').value, 1, 'the one dead link was found');
    assert.ok(byKey(drafts, 'links.checked.count').value >= 1);
    const sp = byKey(drafts, 'content.service_pages.estimate');
    assert.strictEqual(sp.state, 'reasonable_inference');
    assert.ok(sp.value >= 3);
    assert.ok(sp.limitations.join(' ').toLowerCase().indexOf('inference') !== -1);
    drafts.forEach(function (d) {
      const row = buildRow('rev', d);
      assert.ok(row.source.kind && row.source.name, 'source ' + d.metric_key);
      assert.ok(!Number.isNaN(new Date(row.observed_at).getTime()), 'timestamp ' + d.metric_key);
      assert.ok(row.inputs && typeof row.inputs === 'object' && row.method.settings.user_agent, 'inputs and method ' + d.metric_key);
    });
    // the crawl stayed polite: robots first, declared agent on every request, private path never fetched
    assert.strictEqual(s3.hits[0].url, '/robots.txt');
    s3.hits.forEach(function (h) { assert.ok(/RhysHumeReviewBot/.test(h.headers['user-agent'])); assert.ok(h.url.indexOf('/private') !== 0); });
  } finally { await s3.close(); }
});

test('poor site: problems are observed, absent items are false, nothing invented', async function () {
  const r = await crawl(sites.poor());
  const d = analyzeSnapshot(r.snap, { category: 'Plumber' });
  assert.strictEqual(byKey(d, 'page.title.present').value, false);
  assert.strictEqual(byKey(d, 'page.title.length'), undefined, 'no length row when there is no title');
  assert.strictEqual(byKey(d, 'page.meta_description.present').value, false);
  assert.strictEqual(byKey(d, 'page.h1.count').value, 2);
  assert.strictEqual(byKey(d, 'page.heading_order.valid').value, false);
  assert.strictEqual(byKey(d, 'page.canonical.present').value, false);
  assert.strictEqual(byKey(d, 'page.viewport.present').value, false);
  assert.strictEqual(byKey(d, 'structured_data.present').value, true);
  assert.strictEqual(byKey(d, 'structured_data.json_ld_parses').value, false);
  assert.strictEqual(byKey(d, 'robots.present').value, false);
  assert.strictEqual(byKey(d, 'sitemap.present').value, false);
  assert.strictEqual(byKey(d, 'contact.route.present').value, false);
  assert.strictEqual(byKey(d, 'links.broken.count').value, 4);
  assert.strictEqual(byKey(d, 'content.service_pages.estimate').value, 0);
});

test('robots.txt blocking the home page: not tested with a reason, and the page is never fetched', async function () {
  const routes = sites.good('x'); routes['/robots.txt'] = { headers: { 'Content-Type': 'text/plain' }, body: 'User-agent: *\nDisallow: /\n' };
  const r = await crawl(routes);
  assert.strictEqual(r.snap.home.ok, false);
  assert.strictEqual(r.snap.home.code, 'blocked_by_robots');
  assert.deepStrictEqual(r.hits.map(function (h) { return h.url; }), ['/robots.txt']);
  const d = analyzeSnapshot(r.snap, {});
  const st = byKey(d, 'page.status');
  assert.strictEqual(st.state, 'not_tested');
  assert.strictEqual(st.reason_code, 'blocked_by_robots');
  assert.strictEqual(st.value, undefined);
  assert.strictEqual(byKey(d, 'robots.blocks_crawl').value, true);
  d.forEach(function (x) { assert.doesNotThrow(function () { buildRow('r', x); }); });
});

test('robots.txt server error: treated as disallow all and recorded, not guessed', async function () {
  const routes = sites.good('x'); routes['/robots.txt'] = { status: 503, body: 'down' };
  const r = await crawl(routes);
  assert.strictEqual(r.snap.home.code, 'robots_unavailable');
  assert.strictEqual(r.hits.length, 1);
  const d = analyzeSnapshot(r.snap, {});
  assert.strictEqual(byKey(d, 'page.status').state, 'not_tested');
  assert.strictEqual(byKey(d, 'robots.present').state, 'unavailable');
});

test('disallowed paths are skipped for the link sample, never fetched', async function () {
  const routes = sites.good('x');
  routes['/'] = { body: '<html><head><title>T</title></head><body><h1>H</h1><a href="/private/a">p</a><a href="/services">s</a></body></html>' };
  const r = await crawl(routes);
  assert.ok(r.hits.every(function (h) { return h.url.indexOf('/private') !== 0; }));
});

test('huge page, malformed markup, redirect loop and a dead site are all handled with honest states', async function () {
  const huge = await crawl({ '/': { body: '<html><title>x</title>' + 'a'.repeat(2 * 1024 * 1024) + '</html>' }, '/robots.txt': { status: 404 } });
  assert.strictEqual(huge.snap.home.code, 'too_large');
  assert.strictEqual(byKey(analyzeSnapshot(huge.snap, {}), 'page.status').state, 'unavailable');
  const garbage = '<html><head><title>Broken<meta name="description" content="oops><body><h1>Unclosed<h2>a<<<>>><a href="/x"><div <p ' + '<'.repeat(5000) + '<script>var x = "</div>';
  const mal = await crawl({ '/': { body: garbage }, '/robots.txt': { status: 404 } });
  assert.strictEqual(mal.snap.home.ok, true);
  assert.doesNotThrow(function () { analyzeSnapshot(mal.snap, {}).forEach(function (x) { buildRow('r', x); }); });
  const loop = await crawl({ '/': { status: 302, headers: { Location: '/a' } }, '/a': { status: 302, headers: { Location: '/' } }, '/robots.txt': { status: 404 } });
  assert.strictEqual(loop.snap.home.code, 'redirect_loop');
  assert.strictEqual(byKey(analyzeSnapshot(loop.snap, {}), 'page.status').reason_code, 'redirect_loop');
  const slow = await crawl({ '/': function () { /* never answers */ }, '/robots.txt': { status: 404 } }, { requestTimeoutMs: 300 });
  assert.strictEqual(slow.snap.home.code, 'timeout');
  const notHtml = await crawl({ '/': { headers: { 'Content-Type': 'application/pdf' }, body: '%PDF' }, '/robots.txt': { status: 404 } });
  assert.strictEqual(notHtml.snap.home.code, 'bad_content_type');
  const dead = await crawl({ '/': { status: 500, body: 'err' }, '/robots.txt': { status: 404 } });
  assert.strictEqual(byKey(analyzeSnapshot(dead.snap, {}), 'page.status').value, 500, 'a 500 is a real observation');
});

test('crawl limits: never more than 25 requests, link checks capped, one request at a time', async function () {
  const links = [];
  for (let i = 0; i < 60; i++) links.push('<a href="/p' + i + '">page ' + i + '</a>');
  const routes = { '/': { body: '<html><head><title>T</title></head><body><nav>' + links.join('') + '</nav><a href="/contact">contact</a><a href="/services">services</a><a href="/about">about</a><a href="/work">work</a></body></html>' }, '/robots.txt': { status: 404 } };
  const srv = await startServer(function (req, res) { srv.active = (srv.active || 0) + 1; srv.max = Math.max(srv.max || 0, srv.active); siteHandler(routes)(req, res); res.on('finish', function () { srv.active--; }); });
  try {
    const f = testFetcher({ 'good.test': '127.0.0.1' }, [srv.port]);
    const snap = await crawlSite({ url: 'http://good.test:' + srv.port + '/', role: 'business', fetcher: f, minIntervalMs: 0, sleep: async function () {}, requestTimeoutMs: 600 });
    assert.ok(snap.requests <= 25, 'requests ' + snap.requests);
    assert.ok(srv.hits.length <= 25);
    assert.ok(snap.links.checked.length <= 15);
    assert.ok(snap.pages.length <= 7);
    assert.strictEqual(srv.max, 1, 'strictly sequential');
    assert.ok(snap.requests >= 20, 'the crawl used its allowance but not more');
  } finally { await srv.close(); }
});

test('competitor crawl uses at most 4 requests and reads only the home page', async function () {
  const r = await crawl(sites.good('x'), { role: 'competitor' });
  assert.ok(r.snap.requests <= 4, 'requests ' + r.snap.requests);
  assert.strictEqual(r.snap.pages.length, 0);
  const d = analyzeSnapshot(r.snap, { competitorId: '5a0c2f1e-7b3d-4a9c-9d2e-1f3a5b7c9d0e' });
  assert.ok(d.every(function (x) { return x.competitor_id === '5a0c2f1e-7b3d-4a9c-9d2e-1f3a5b7c9d0e'; }));
  assert.strictEqual(byKey(d, 'links.broken.count'), undefined, 'link sampling is business only');
});

test('crawl honours a crawl delay by pausing between requests', async function () {
  const routes = sites.good('x'); routes['/robots.txt'] = { headers: { 'Content-Type': 'text/plain' }, body: 'User-agent: *\nCrawl-delay: 2\n' };
  const waits = [];
  const srv = await startServer(siteHandler(routes));
  try {
    const f = testFetcher({ 'good.test': '127.0.0.1' }, [srv.port]);
    await crawlSite({ url: 'http://good.test:' + srv.port + '/', role: 'competitor', fetcher: f, minIntervalMs: 1000, sleep: async function (ms) { waits.push(ms); }, requestTimeoutMs: 600 });
    assert.ok(waits.some(function (w) { return w >= 1000; }), 'paused ' + JSON.stringify(waits));
  } finally { await srv.close(); }
});

test('redirect to another host re-checks robots there; scheme change to https is a real observation', async function () {
  const target = await startServer(siteHandler({ '/': { body: '<html><head><title>New home</title></head><body><h1>Hi</h1></body></html>' }, '/robots.txt': { headers: { 'Content-Type': 'text/plain' }, body: 'User-agent: *\nDisallow: /\n' } }));
  const first = await startServer(siteHandler({ '/': { status: 301, headers: { Location: 'http://www.good.test:' + target.port + '/' } }, '/robots.txt': { status: 404 } }));
  try {
    const f = testFetcher({ 'good.test': '127.0.0.1', 'www.good.test': '127.0.0.1' }, [first.port, target.port]);
    const snap = await crawlSite({ url: 'http://good.test:' + first.port + '/', role: 'competitor', fetcher: f, minIntervalMs: 0, sleep: async function () {}, requestTimeoutMs: 600 });
    assert.strictEqual(snap.home.code, 'blocked_by_robots', 'the redirect target forbids reading');
    assert.ok(target.hits.every(function (h) { return h.url === '/robots.txt'; }), 'only robots.txt was requested from the target');
  } finally { await first.close(); await target.close(); }
});

test('https site over a real TLS handshake is reported as HTTPS, with the plain http redirect observed', async function () {
  const cp = require('node:child_process'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brtls-'));
  const r = cp.spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem'), '-days', '1', '-subj', '/CN=good.test', '-addext', 'subjectAltName=DNS:good.test'], { encoding: 'utf8' });
  if (r.status !== 0) return; // openssl not available: skipped
  const key = fs.readFileSync(path.join(dir, 'k.pem')), cert = fs.readFileSync(path.join(dir, 'c.pem'));
  fs.rmSync(dir, { recursive: true, force: true });
  const plain = await startServer(siteHandler({ '/': { status: 301, headers: { Location: 'https://good.test/' } } }));
  const secure = await startServer(siteHandler(sites.good('good.test')), { tls: { key: key, cert: cert } });
  try {
    const f = testFetcher({ 'good.test': '127.0.0.1' }, [plain.port, secure.port], { tls: { ca: cert } });
    // the secure server is on a random port: use the url with that port; the fetcher treats scheme https
    const snap = await crawlSite({ url: 'https://good.test:' + secure.port + '/', role: 'business', fetcher: f, minIntervalMs: 0, sleep: async function () {}, requestTimeoutMs: 800, httpCheckOrigin: 'http://good.test:' + plain.port });
    const d = analyzeSnapshot(snap, {});
    assert.strictEqual(byKey(d, 'https.enabled').value, true);
    assert.strictEqual(byKey(d, 'https.http_redirects_to_https').value, true);
  } finally { await plain.close(); await secure.close(); }
});

test('html scanner: heading order, entities, hostile input, caps', function () {
  assert.strictEqual(headingOrderValid([{ level: 1 }, { level: 2 }, { level: 2 }, { level: 3 }, { level: 2 }]), true);
  assert.strictEqual(headingOrderValid([{ level: 2 }]), false);
  assert.strictEqual(headingOrderValid([{ level: 1 }, { level: 3 }]), false);
  assert.strictEqual(headingOrderValid([]), null);
  const f = html.scan('<title>A &amp; B &#163;5 &#x41;</title><h1>x &lt;b&gt;</h1>');
  assert.strictEqual(f.title, 'A & B £5 A');
  assert.strictEqual(f.headings[0].text, 'x <b>');
  const many = html.scan('<a href="/x">l</a>'.repeat(5000) + '<h2>h</h2>'.repeat(1000));
  assert.ok(many.links.length <= html.CAPS.links && many.headings.length <= html.CAPS.headings);
  const t = Date.now();
  html.scan('<'.repeat(200000)); html.scan('<a '.repeat(50000)); html.scan('<script>'.repeat(30000));
  assert.ok(Date.now() - t < 4000, 'hostile markup is scanned in bounded time');
});
