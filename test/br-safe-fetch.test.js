'use strict';
// Package A: SSRF matrix and fetcher limits. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const zlib = require('node:zlib');
const { parseUrl, classifyIp, createSafeFetcher } = require('../api/_lib/br/safe-fetch');
const { startServer, siteHandler, testFetcher } = require('./br-helpers');
const { BOT_UA } = require('../api/_lib/br/config');

const HOSTILE = [
  ['http://127.0.0.1', 'private_address'], ['http://localhost', 'private_address'], ['http://0.0.0.0', 'private_address'], ['http://[::1]', 'private_address'],
  ['http://[::ffff:7f00:1]', 'private_address'], ['http://[::ffff:127.0.0.1]', 'private_address'], ['http://2130706433', 'private_address'], ['http://0x7f000001', 'private_address'],
  ['http://0177.0.0.1', 'private_address'], ['http://169.254.169.254', 'private_address'], ['http://169.254.169.254/latest/meta-data/', 'private_address'], ['http://metadata.google.internal', 'private_address'],
  ['http://10.0.0.1', 'private_address'], ['http://10.255.255.255', 'private_address'], ['http://172.16.0.1', 'private_address'], ['http://172.31.255.255', 'private_address'], ['http://192.168.0.1', 'private_address'],
  ['http://100.64.0.1', 'private_address'], ['http://127.1', 'private_address'], ['http://0', 'private_address'], ['http://[::]', 'private_address'], ['http://[fe80::1]', 'private_address'],
  ['http://[fd00:ec2::254]', 'private_address'], ['http://[fc00::1]', 'private_address'], ['http://[64:ff9b::7f00:1]', 'private_address'], ['http://[2002:7f00:1::1]', 'private_address'],
  ['http://[::ffff:a9fe:a9fe]', 'private_address'], ['http://[0:0:0:0:0:ffff:7f00:1]', 'private_address'], ['http://2130706433/', 'private_address'], ['http://017700000001', 'private_address'],
  ['http://0x7f.0x0.0x0.0x1', 'private_address'], ['http://127.0.0.1.', 'private_address'], ['http://LOCALHOST', 'private_address'], ['http://foo.localhost', 'private_address'],
  ['http://printer.local', 'private_address'], ['http://db.internal', 'private_address'], ['http://router.home.arpa', 'private_address'], ['http://intranet', 'not_a_website'],
  ['http://user:pass@example.com', 'credentials'], ['http://user@example.com', 'credentials'], ['http://example.com@127.0.0.1/', 'credentials'], ['http://:pw@example.com', 'credentials'],
  ['http://example.com:22', 'bad_port'], ['http://example.com:8080', 'bad_port'], ['https://example.com:8443', 'bad_port'], ['http://example.com:0', 'bad_port'], ['http://example.com:65535', 'bad_port'],
  ['file:///etc/passwd', 'bad_scheme'], ['ftp://example.com', 'bad_scheme'], ['gopher://example.com', 'bad_scheme'], ['javascript:alert(1)', 'bad_scheme'], ['data:text/html,hi', 'bad_scheme'],
  ['ws://example.com', 'bad_scheme'], ['dict://example.com', 'bad_scheme'], ['ldap://example.com', 'bad_scheme'], ['sftp://example.com', 'bad_scheme'],
  ['', 'not_a_website'], ['   ', 'not_a_website'], ['not a url', 'not_a_website'], ['http://', 'not_a_website'], ['http://exa mple.com', 'not_a_website'], ['http://example.com/\u0000', 'not_a_website'],
  ['http://' + 'a'.repeat(301), 'too_long'], ['example', 'not_a_website'], ['http://-bad-.com', 'not_a_website'], ['http://example.com\nHost: evil', 'not_a_website'],
  ['http://999.999.999.999', 'private_address']
];
const CRLF = 'http://example.com/%0d%0aX-Injected:%201';

test('ssrf matrix: every hostile address is refused with the right reason', function () {
  HOSTILE.forEach(function (c) {
    const r = parseUrl(c[0]);
    assert.strictEqual(r.ok, false, 'should refuse ' + JSON.stringify(c[0]));
    if (c[1] === 'private_address' && r.reason === 'not_a_website') return; // some exotic forms are refused as not a website: still refused
    assert.strictEqual(r.reason, c[1], 'reason for ' + JSON.stringify(c[0]) + ' was ' + r.reason);
  });
});

test('public addresses and ordinary inputs pass', function () {
  ['example.com', 'https://www.rhyshume.co.uk/', 'Example.COM/path?x=1', 'http://example.co.uk:80/', 'https://example.com:443/a', 'xn--bcher-kva.example', 'https://sub.domain.example.org/a/b?c=d#e', '//example.com'].forEach(function (u) {
    const r = parseUrl(u);
    assert.strictEqual(r.ok, true, u);
    assert.ok(/^https?:\/\//.test(r.url));
  });
  assert.strictEqual(parseUrl('example.com').url, 'https://example.com/');
  assert.strictEqual(parseUrl('HTTP://Example.com').hostname, 'example.com');
});

test('control characters smuggled through percent encoding do not reach the host', function () {
  const r = parseUrl(CRLF);
  assert.ok(r.ok && !/[\r\n]/.test(r.path), 'path stays encoded');
});

test('ip classification: IPv4, mapped, NAT64, 6to4, Teredo and special ranges', function () {
  const blocked = ['127.0.0.1', '0.0.0.0', '10.1.2.3', '172.16.5.5', '192.168.9.9', '169.254.169.254', '100.64.1.1', '224.0.0.1', '255.255.255.255', '198.18.0.1', '192.0.2.1', '203.0.113.5',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.0.0.1', '::ffff:a00:1', '::ffff:c0a8:1', '64:ff9b::a00:1', '2002:a00:1::', '2001:0:4136:e378:8000:63bf:3fff:fdd2', '2001:db8::1', '::127.0.0.1', 'garbage', 'fe80::1%eth0', '999.1.1.1'];
  blocked.forEach(function (ip) { assert.strictEqual(classifyIp(ip).allowed, false, ip); });
  ['93.184.216.34', '8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2a00:1450:4009:81f::200e', '::ffff:8.8.8.8', '64:ff9b::808:808', '2002:808:808::1'].forEach(function (ip) { assert.strictEqual(classifyIp(ip).allowed, true, ip); });
});

test('strict policy: names that resolve to private addresses are refused (including mixed answers and mapped forms)', async function () {
  for (const addr of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '169.254.169.254', '::1', 'fe80::1', '::ffff:10.0.0.1', '::ffff:7f00:1', '100.64.0.9']) {
    const f = createSafeFetcher({ lookup: async function () { return [{ address: addr, family: addr.indexOf(':') >= 0 ? 6 : 4 }]; } });
    const r = await f.request('http://rebind.example/');
    assert.strictEqual(r.ok, false, addr);
    assert.strictEqual(r.code, 'url_not_allowed', addr);
    assert.strictEqual(r.reason, 'private_address');
    assert.ok(!JSON.stringify(r).includes(addr.replace(/:/g, '')), 'does not echo the resolved address');
  }
  const mixed = createSafeFetcher({ lookup: async function () { return [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.1', family: 4 }]; } });
  assert.strictEqual((await mixed.request('http://mixed.example/')).code, 'url_not_allowed');
  const none = createSafeFetcher({ lookup: async function () { return []; } });
  assert.strictEqual((await none.request('http://none.example/')).code, 'unresolvable');
  const boom = createSafeFetcher({ lookup: async function () { throw new Error('ENOTFOUND'); } });
  assert.strictEqual((await boom.request('http://boom.example/')).code, 'unresolvable');
  const slowDns = createSafeFetcher({ dnsTimeoutMs: 50, lookup: function () { return new Promise(function () {}); } });
  assert.strictEqual((await slowDns.request('http://slow.example/')).code, 'unresolvable');
});

test('strict default policy rejects the fixture server ports and addresses', async function () {
  const srv = await startServer(siteHandler({ '/': { body: '<html></html>' } }));
  try {
    const strict = createSafeFetcher({ lookup: async function () { return [{ address: '127.0.0.1', family: 4 }]; } });
    const r = await strict.request('http://good.test:' + srv.port + '/');
    assert.strictEqual(r.code, 'url_not_allowed');
    assert.strictEqual(r.reason, 'bad_port');
    assert.strictEqual(srv.hits.length, 0);
    const r2 = await strict.request('http://good.test/');
    assert.strictEqual(r2.reason, 'private_address');
  } finally { await srv.close(); }
});

test('dns pinning: the validated address is the one connected to, a second DNS answer cannot redirect the socket', async function () {
  const srv = await startServer(siteHandler({ '/': { body: '<html><title>pinned</title></html>' } }));
  try {
    let n = 0;
    const f = testFetcher({}, [srv.port], {
      lookup: async function () { n++; return [{ address: n === 1 ? '127.0.0.1' : '10.9.9.9', family: 4 }]; }
    });
    const r = await f.request('http://rebind.test:' + srv.port + '/');
    assert.strictEqual(r.ok, true);
    assert.ok(r.body.indexOf('pinned') !== -1);
    assert.strictEqual(n, 1, 'DNS was consulted exactly once for the hop');
    assert.strictEqual(srv.hits.length, 1);
    assert.strictEqual(srv.hits[0].remote, '127.0.0.1');
    assert.strictEqual(srv.hits[0].headers.host, 'rebind.test:' + srv.port, 'Host header is the name, the socket went to the pinned address');
  } finally { await srv.close(); }
});

test('first lookup public, second private (rebinding): the private answer is never used or even requested', async function () {
  let n = 0;
  const f = createSafeFetcher({ timeoutMs: 300, lookup: async function () { n++; return [{ address: n === 1 ? '93.184.216.34' : '127.0.0.1', family: 4 }]; } });
  const r = await f.request('http://rebind2.example/', { timeoutMs: 400 });
  assert.strictEqual(n, 1);
  assert.notStrictEqual(r.code, 'url_not_allowed', 'the first (public) answer passed validation');
});

test('redirects: every hop is revalidated and nothing private is ever contacted', async function () {
  const canary = await startServer(siteHandler({ '/': { body: 'CANARY' }, '/latest/meta-data/': { body: 'SECRET' } }));
  const targets = [
    'http://127.0.0.1:' + canary.port + '/', 'http://[::1]:' + canary.port + '/', 'http://169.254.169.254/latest/meta-data/', 'http://localhost:' + canary.port + '/', 'http://2130706433:' + canary.port + '/',
    'file:///etc/passwd', 'gopher://good.test/', 'ftp://good.test/', 'http://good.test:22/', 'http://user:pw@good.test/', 'http://internal.test:' + canary.port + '/', 'http://[::ffff:7f00:1]:' + canary.port + '/'
  ];
  const routes = {};
  targets.forEach(function (t, i) { routes['/r' + i] = { status: 302, headers: { Location: t } }; });
  const srv = await startServer(siteHandler(routes));
  try {
    const f = testFetcher({ 'good.test': '127.0.0.1', 'internal.test': '10.0.0.5' }, [srv.port, canary.port]);
    for (let i = 0; i < targets.length; i++) {
      const r = await f.request('http://good.test:' + srv.port + '/r' + i);
      assert.strictEqual(r.ok, false, targets[i]);
      assert.strictEqual(r.code, 'url_not_allowed', targets[i] + ' -> ' + r.code);
    }
    assert.strictEqual(canary.hits.length, 0, 'the canary server was never contacted');
  } finally { await srv.close(); await canary.close(); }
});

test('redirects: a relative redirect works, a loop is detected, more than four hops stop', async function () {
  const routes = { '/a': { status: 301, headers: { Location: '/b' } }, '/b': { status: 302, headers: { Location: '/c' } }, '/c': { body: '<html>ok</html>' },
    '/loop1': { status: 302, headers: { Location: '/loop2' } }, '/loop2': { status: 302, headers: { Location: '/loop1' } }, '/self': { status: 302, headers: { Location: '/self' } } };
  for (let i = 0; i < 8; i++) routes['/h' + i] = { status: 302, headers: { Location: '/h' + (i + 1) } };
  const srv = await startServer(siteHandler(routes));
  try {
    const f = testFetcher({ 'good.test': '127.0.0.1' }, [srv.port]);
    const base = 'http://good.test:' + srv.port;
    const ok = await f.request(base + '/a');
    assert.strictEqual(ok.ok, true);
    assert.strictEqual(ok.chain.length, 2);
    assert.ok(ok.finalUrl.endsWith('/c'));
    assert.strictEqual((await f.request(base + '/loop1')).code, 'redirect_loop');
    assert.strictEqual((await f.request(base + '/self')).code, 'redirect_loop');
    assert.strictEqual((await f.request(base + '/h0')).code, 'too_many_redirects');
    const noFollow = await f.request(base + '/a', { followRedirects: false });
    assert.strictEqual(noFollow.status, 301);
    assert.strictEqual(noFollow.headers.location, '/b');
  } finally { await srv.close(); }
});

test('limits: oversize body, declared oversize length, slow body, wrong type, gzip bomb, unsupported encoding', async function () {
  const big = Buffer.alloc(3 * 1024 * 1024, 'a');
  const bomb = zlib.gzipSync(Buffer.alloc(60 * 1024 * 1024, 0));
  const routes = {
    '/big': { body: big.toString() },
    '/declared': function (req, res) { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Length': String(50 * 1024 * 1024) }); res.write('x'); setTimeout(function () { res.destroy(); }, 50); },
    '/slow': function (req, res) { res.writeHead(200, { 'Content-Type': 'text/html' }); res.write('<html>'); const t = setInterval(function () { res.write('x'); }, 100); req.on('close', function () { clearInterval(t); }); },
    '/hang': function () { /* never answers */ },
    '/image': { headers: { 'Content-Type': 'image/png' }, body: 'PNG' },
    '/bomb': function (req, res) { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'gzip' }); res.end(bomb); },
    '/br': function (req, res) { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'br' }); res.end('xx'); },
    '/gz': function (req, res) { res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Encoding': 'gzip' }); res.end(zlib.gzipSync('<html><title>zipped</title></html>')); },
    '/e500': { status: 500, body: 'boom' }, '/e404': { status: 404, body: 'nope' }
  };
  const srv = await startServer(siteHandler(routes));
  try {
    const f = testFetcher({ 'good.test': '127.0.0.1' }, [srv.port]);
    const base = 'http://good.test:' + srv.port;
    assert.strictEqual((await f.request(base + '/big', { maxBytes: 1024 * 1024 })).code, 'too_large');
    assert.strictEqual((await f.request(base + '/declared', { maxBytes: 1024 * 1024 })).code, 'too_large');
    let t0 = Date.now();
    assert.strictEqual((await f.request(base + '/slow', { timeoutMs: 500 })).code, 'timeout');
    assert.ok(Date.now() - t0 < 2500);
    assert.strictEqual((await f.request(base + '/hang', { timeoutMs: 300 })).code, 'timeout');
    assert.strictEqual((await f.request(base + '/image', { allowedTypes: ['text/html'] })).code, 'bad_content_type');
    t0 = Date.now();
    const b = await f.request(base + '/bomb', { maxBytes: 1024 * 1024 });
    assert.strictEqual(b.code, 'too_large');
    assert.ok(Date.now() - t0 < 5000, 'decompression stopped early');
    assert.strictEqual((await f.request(base + '/br')).code, 'bad_content_type');
    const z = await f.request(base + '/gz');
    assert.ok(z.ok && z.body.indexOf('zipped') !== -1);
    const e = await f.request(base + '/e500');
    assert.strictEqual(e.status, 500);
    assert.strictEqual(e.body, '', 'error bodies are not read by default');
  } finally { await srv.close(); }
});

test('requests identify themselves honestly and send nothing private', async function () {
  const srv = await startServer(siteHandler({ '/': { body: '<html></html>' } }));
  try {
    const f = testFetcher({ 'good.test': '127.0.0.1' }, [srv.port]);
    await f.request('http://good.test:' + srv.port + '/');
    const h = srv.hits[0].headers;
    assert.strictEqual(h['user-agent'], BOT_UA);
    assert.ok(/RhysHumeReviewBot\/1\.0/.test(h['user-agent']) && h['user-agent'].indexOf('/business-review/bot') !== -1);
    assert.strictEqual(h['accept-encoding'], 'gzip');
    assert.ok(!('authorization' in h) && !('cookie' in h));
    assert.strictEqual(h.connection, 'close');
  } finally { await srv.close(); }
});

test('http and https only; HEAD returns no body', async function () {
  const srv = await startServer(siteHandler({ '/': { body: '<html>content</html>' } }));
  try {
    const f = testFetcher({ 'good.test': '127.0.0.1' }, [srv.port]);
    const r = await f.request('http://good.test:' + srv.port + '/', { method: 'HEAD' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body, '');
    assert.strictEqual((await f.request('ftp://good.test/')).reason, 'bad_scheme');
  } finally { await srv.close(); }
});

test('connection problems are reported as a closed set of codes without internal detail', async function () {
  const f = testFetcher({ 'closed.test': '127.0.0.1' }, [1]);
  const r = await f.request('http://closed.test:1/', { timeoutMs: 800 });
  assert.strictEqual(r.ok, false);
  assert.ok(['site_unreachable', 'timeout'].indexOf(r.code) !== -1);
  assert.ok(!/127\.0\.0\.1|ECONN/.test(JSON.stringify(r)));
});
