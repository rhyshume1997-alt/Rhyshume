'use strict';
// Package A: robots.txt parsing and decisions. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const robots = require('../api/_lib/br/robots');
const { startServer, siteHandler, testFetcher } = require('./br-helpers');

function st(text, token) { return { kind: 'present', parsed: robots.parseRobots(text), agentToken: token || 'RhysHumeReviewBot', sitemaps: [] }; }

test('robots: disallow, allow, longest match wins and allow wins a tie', function () {
  const s = st('User-agent: *\nDisallow: /private\nAllow: /private/public\nDisallow: /tie\nAllow: /tie\n');
  assert.strictEqual(robots.isAllowed(s, '/'), true);
  assert.strictEqual(robots.isAllowed(s, '/private'), false);
  assert.strictEqual(robots.isAllowed(s, '/private/x'), false);
  assert.strictEqual(robots.isAllowed(s, '/private/public/page'), true);
  assert.strictEqual(robots.isAllowed(s, '/tie'), true);
});

test('robots: wildcards, end anchors and empty Disallow', function () {
  const s = st('User-agent: *\nDisallow: /*.pdf$\nDisallow: /a*b\n');
  assert.strictEqual(robots.isAllowed(s, '/x/y.pdf'), false);
  assert.strictEqual(robots.isAllowed(s, '/x/y.pdf?z=1'), true);
  assert.strictEqual(robots.isAllowed(s, '/a123b'), false);
  assert.strictEqual(robots.isAllowed(st('User-agent: *\nDisallow:\n'), '/anything'), true);
  assert.strictEqual(robots.isAllowed(st('User-agent: *\nDisallow: /\n'), '/'), false);
});

test('robots: our agent group beats the star group; groups merge; comments and junk ignored', function () {
  const text = '# comment\nUser-agent: *\nDisallow: /\n\nUser-agent: SomeOtherBot\nDisallow: /x\n\nUser-agent: rhyshumereviewbot\nUser-agent: another\nDisallow: /secret # trailing\nGarbage line\n:nokey\n';
  const s = st(text);
  assert.strictEqual(robots.isAllowed(s, '/open'), true, 'our group allows what star blocks');
  assert.strictEqual(robots.isAllowed(s, '/secret/a'), false);
  assert.strictEqual(robots.isAllowed(st(text, 'OtherAgent'), '/open'), false, 'a different agent falls back to star');
});

test('robots: crawl delay is honoured but capped at 5 seconds; sitemaps collected', function () {
  assert.strictEqual(robots.crawlDelayMs(st('User-agent: *\nCrawl-delay: 2\n')), 2000);
  assert.strictEqual(robots.crawlDelayMs(st('User-agent: *\nCrawl-delay: 120\n')), 5000);
  assert.strictEqual(robots.crawlDelayMs(st('User-agent: *\nDisallow: /x\n')), 0);
  assert.deepStrictEqual(robots.parseRobots('Sitemap: https://a.example/s.xml\nSitemap: ftp://bad\n').sitemaps, ['https://a.example/s.xml']);
});

test('robots: oversized and hostile files are bounded', function () {
  const big = 'User-agent: *\n' + 'Disallow: /a\n'.repeat(200000);
  const t0 = Date.now();
  const s = st(big);
  robots.isAllowed(s, '/zzz');
  assert.ok(Date.now() - t0 < 2000);
  assert.ok(big.length > robots.MAX_ROBOTS_BYTES);
  const evil = st('User-agent: *\nDisallow: /' + '*a'.repeat(5000) + '\n');
  const t1 = Date.now();
  robots.isAllowed(evil, '/' + 'a'.repeat(5000));
  assert.ok(Date.now() - t1 < 2000, 'wildcard pattern does not blow up');
});

test('robots fetch states: 404 and 403 mean no restrictions, 500 and timeouts mean disallow all, no file at all is absent', async function () {
  const routes = {};
  const mk = async function (status, body, host) {
    const srv = await startServer(siteHandler({ '/robots.txt': { status: status, headers: { 'Content-Type': 'text/plain' }, body: body } }));
    const f = testFetcher({ 'good.test': '127.0.0.1' }, [srv.port]);
    const r = await robots.fetchRobots(f, 'http://good.test:' + srv.port, { agentToken: 'RhysHumeReviewBot' });
    await srv.close();
    return r;
  };
  const r404 = await mk(404, 'nope');
  assert.strictEqual(r404.kind, 'absent');
  assert.strictEqual(robots.isAllowed(r404, '/x'), true);
  assert.strictEqual((await mk(403, 'no')).kind, 'absent');
  const r500 = await mk(503, 'down');
  assert.strictEqual(r500.kind, 'unavailable');
  assert.strictEqual(r500.reason, 'robots_unavailable');
  assert.strictEqual(robots.isAllowed(r500, '/'), false);
  const ok = await mk(200, 'User-agent: *\nDisallow: /nope\n');
  assert.strictEqual(ok.kind, 'present');
  assert.strictEqual(robots.isAllowed(ok, '/nope'), false);
  const srv = await startServer(function () { /* hangs */ });
  const f = testFetcher({ 'good.test': '127.0.0.1' }, [srv.port]);
  const t = await robots.fetchRobots(f, 'http://good.test:' + srv.port, { agentToken: 'x', timeoutMs: 300 });
  assert.strictEqual(t.kind, 'unavailable');
  await srv.close();
});
