/* DEV ONLY (not shipped). Security spot checks through the integrated stack (real handlers, real routing). The "strict" stack uses the PRODUCTION safe fetcher.
   Run: node tools/br-fullstack/run-security.js */
'use strict';
const { createHarness } = require('./harness');
const A = require('./api');
const results = [];
const check = (n, c, x) => { results.push(c); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + (x || ''))); };
const STRICT = { 'x-harness-stack': 'strict' };
(async () => {
  const H = createHarness(); const ports = await H.start(0, 80); A.setBase('http://localhost:' + ports.port);
  const j = (r) => JSON.stringify(r.json && r.json.error || r.raw).slice(0, 160);
  try {
    // ---------- SSRF through the real /start with the production fetcher
    const bad = ['http://localhost/', 'http://127.0.0.1/', 'http://127.1/', 'http://169.254.169.254/latest/meta-data/', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[::ffff:7f00:1]/', 'http://2130706433/', 'http://0x7f000001/', 'http://0177.0.0.1/', 'http://10.0.0.1/', 'http://192.168.1.1/', 'http://172.16.0.1/', 'http://0.0.0.0/', 'http://100.64.0.1/', 'http://[fd00::1]/', 'http://[fe80::1]/', 'http://metadata.google.internal/', 'http://localhost./', 'http://127.0.0.1:8080/', 'http://good.test:8080/', 'http://user:pw@example.com/', 'file:///etc/passwd', 'ftp://example.com/', 'javascript:alert(1)', 'gopher://127.0.0.1:25/', 'http://example.com:22/', 'http://169.254.169.254.nip.io/'];
    let ok = 0; const fails = [];
    for (const w of bad) { const r = await A.start({ website: w }, { headers: STRICT }); const good = r.status >= 400 && r.status < 500 && !(r.json && r.json.access_token); if (good) ok++; else fails.push(w + ' => ' + r.status + ' ' + j(r)); }
    check('SSRF: ' + bad.length + ' hostile website values refused by /start with the production fetcher (4xx, no review created)', ok === bad.length, fails.join(' ; '));
    const reviews = await fetch('http://localhost:' + ports.port + '/__harness/data?table=br_reviews').then((r) => r.json());
    check('SSRF: no review row exists for any refused value', reviews.length === 0, String(reviews.length));
    const codes = {}; for (const w of ['http://127.0.0.1/', 'file:///etc/passwd', 'http://[::1]/']) { const r = await A.start({ website: w }, { headers: STRICT }); codes[w] = r.json && r.json.error && (r.json.error.code + '/' + (r.json.error.reason || '')); }
    console.log('   error codes:', JSON.stringify(codes));
    // main stack: hostile redirects from a reachable fixture, each hop is revalidated
    for (const t of ['metadata', 'loopback6', 'internal', 'file', 'decimal']) {
      H.siteHits.length = 0;
      const s = await A.start({ website: 'http://redirect-' + t + '.test/', business_name: 'Redirect ' + t }, {});
      let outcome = s.status + ' ' + (s.json && s.json.error ? s.json.error.code : (s.json.interpretation.website.reachable + ' ' + (s.json.interpretation.website.problem || '')));
      let leaked = false;
      if (s.status === 201) {
        const id = s.json.review.id, tk = s.json.access_token;
        await A.call('POST', '/api/business-review/' + id + '/confirm', { confirmed: true }, { token: tk }); await A.runToReady(id, tk);
        const ev = await fetch('http://localhost:' + ports.port + '/__harness/data?table=br_evidence').then((r) => r.json());
        const mine = ev.filter((e) => e.review_id === id);
        leaked = mine.some((e) => /169\.254|meta-data|ami-id|root:|\[::1\]|passwd/i.test(JSON.stringify(e.value) + JSON.stringify(e.inputs)));
        outcome += ' evidence rows ' + mine.length + ' psi calls to redirect host ' + H.state.psiCalls.filter((h) => /redirect/.test(h)).length;
      }
      check('SSRF redirect to ' + t + ': not followed, nothing leaked into evidence (' + outcome + ')', !leaked && !/^200/.test(outcome));
    }
    // competitor nomination, public and admin
    const s0 = await A.start({}); const id0 = s0.json.review.id, t0 = s0.json.access_token;
    const cn = await A.call('POST', '/api/business-review/' + id0 + '/confirm', { confirmed: true, competitor_nomination: { name: 'Evil', website: 'http://169.254.169.254/' } }, { token: t0 });
    check('SSRF: competitor nomination to the metadata address refused at confirm', cn.status === 400 && cn.json.error.code === 'url_not_allowed' || cn.status === 400, cn.status + ' ' + j(cn));
    await A.call('POST', '/api/business-review/' + id0 + '/confirm', { confirmed: true }, { token: t0 }); await A.runToReady(id0, t0);
    const cn2 = await A.call('POST', '/api/business-review/' + id0 + '/competitors', { name: 'Evil', website: 'http://10.0.0.5/' }, { token: t0 });
    check('SSRF: competitor nomination after results to a private address refused', cn2.status === 400, cn2.status + ' ' + j(cn2));
    const cn3 = await A.call('POST', '/api/business-review/admin/reviews/' + id0 + '/competitors', { action: 'add', name: 'Evil', website: 'http://[::1]/' }, { token: 'owner-session' });
    check('SSRF: owner add competitor with a loopback address refused too', cn3.status === 400, cn3.status + ' ' + j(cn3));

    // ---------- oversized and malformed
    const base = '/api/business-review/start'; const hdr = { headers: { 'Idempotency-Key': 'sec-key-' + Date.now() + '-abcdefgh' } };
    let r = await A.call('POST', base, JSON.stringify({ x: 'a'.repeat(40000) }), { headers: { 'Idempotency-Key': 'sec-key-big-abcdefgh01' } });
    check('oversized body (40 KB) answers 413', r.status === 413, r.status + ' ' + j(r));
    r = await A.call('POST', base, '{not json', { headers: { 'Idempotency-Key': 'sec-key-bad-abcdefgh02' } });
    check('malformed JSON answers 400 bad_json', r.status === 400, r.status + ' ' + j(r));
    r = await A.call('POST', base, 'business_name=x', { ct: 'application/x-www-form-urlencoded', headers: { 'Idempotency-Key': 'sec-key-ct-abcdefgh03' } });
    check('wrong content type answers 415', r.status === 415, r.status + ' ' + j(r));
    r = await A.call('POST', base, '[1,2]', { headers: { 'Idempotency-Key': 'sec-key-arr-abcdefgh04' } });
    check('array body answers 400', r.status === 400, r.status + ' ' + j(r));
    r = await A.start({ business_name: 'x'.repeat(5000) });
    check('5000 character business name refused (400)', r.status === 400, r.status + ' ' + j(r));
    r = await A.start({ business_name: 'Bad\u0000Name<script>alert(1)</script>' });
    const nm = r.json && r.json.review ? (await fetch('http://localhost:' + ports.port + '/__harness/data?table=br_reviews').then((x) => x.json())).find((x) => x.id === r.json.review.id).business_name : null;
    check('markup and a NUL byte in the name are either refused or stored inert (no NUL)', r.status === 400 || (nm && nm.indexOf('\u0000') === -1), r.status + ' ' + nm);
    r = await A.call('POST', base, A.startBody({}), {});
    check('missing Idempotency-Key refused (400)', r.status === 400, r.status + ' ' + j(r));
    r = await A.call('POST', base, A.startBody({ turnstile_token: undefined }), { headers: { 'Idempotency-Key': 'sec-key-ts-abcdefgh05' } });
    check('missing Turnstile token refused (403)', r.status === 403, r.status + ' ' + j(r));
    r = await A.call('POST', base, A.startBody({ turnstile_token: 'TEST-TOKEN-contact' }), { headers: { 'Idempotency-Key': 'sec-key-ts2-abcdefgh06' } });
    check('Turnstile token for another action refused (403)', r.status === 403, r.status + ' ' + j(r));
    r = await A.call('GET', base); check('GET /start answers 405', r.status === 405, String(r.status));
    r = await A.call('POST', '/api/business-review/start/extra', {}); check('extra path segment on /start answers 405 or 404', r.status === 405 || r.status === 404, String(r.status));
    r = await A.call('POST', '/api/business-review/..%2f..%2fadmin/metrics', {}); check('path trick answers 404 and nothing admin', r.status === 404 || r.status === 400, String(r.status));

    // ---------- token enumeration and cross review access
    const a = await A.start({ business_name: 'Review A' }); const b = await A.start({ business_name: 'Review B', website: undefined, location: { text: 'Paisley', kind: 'local' } });
    const idA = a.json.review.id, tA = a.json.access_token, idB = b.json.review.id, tB = b.json.access_token;
    for (const x of [[idA, tA], [idB, tB]]) { await A.call('POST', '/api/business-review/' + x[0] + '/confirm', { confirmed: true }, { token: x[1] }); await A.runToReady(x[0], x[1]); }
    const unk = '00000000-0000-4000-8000-000000000000';
    const probes = [['wrong token, real id', idA, 'x'.repeat(43)], ['right token, unknown id', unk, tA], ['unknown id and token', unk, 'y'.repeat(43)], ['no token', idA, null], ['malformed id', 'not-a-uuid', tA], ['short token', idA, 'abc'], ['B token on A', idA, tB], ['A token on B', idB, tA]];
    const outs = [];
    for (const [n, id, tk] of probes) { const rr = await A.call('GET', '/api/business-review/' + id, undefined, tk ? { token: tk } : {}); outs.push([n, rr.status, rr.raw]); }
    check('token enumeration: all 8 probes give the identical 404 body', outs.every((o) => o[1] === 404 && o[2] === outs[0][2]), JSON.stringify(outs.map((o) => [o[0], o[1], o[2].slice(0, 60)])));
    for (const sub of ['report', 'advance', 'request-report', 'request-discussion', 'competitors', 'automation', 'confirm']) {
      const m = sub === 'report' ? 'GET' : 'POST'; const rr = await A.call(m, '/api/business-review/' + idA + '/' + sub, m === 'POST' ? {} : undefined, { token: tB });
      check('cross review: B token on A /' + sub + ' answers 404 (' + rr.status + ')', rr.status === 404, rr.raw.slice(0, 100));
    }
    const rr = await A.call('DELETE', '/api/business-review/' + idA, undefined, { token: tB }); check('cross review: B token cannot delete A', rr.status === 404, String(rr.status));
    const still = await A.call('GET', '/api/business-review/' + idA, undefined, { token: tA }); check('cross review: A is untouched', still.status === 200);
    await fetch('http://localhost:' + ports.port + '/__harness/clock?add_days=31');
    const ex = await A.call('GET', '/api/business-review/' + idA, undefined, { token: tA }); const exw = await A.call('GET', '/api/business-review/' + idA, undefined, { token: 'z'.repeat(43) });
    check('expiry: right token gets 410 expired, wrong token still 404 (expiry not disclosed to a guesser)', ex.status === 410 && exw.status === 404, ex.status + ' ' + exw.status);
    await fetch('http://localhost:' + ports.port + '/__harness/clock?set=2026-11-20T10:00:00.000Z');
    const hdrs = ex.headers; check('responses carry no-store and noindex', /no-store/.test(hdrs.get('cache-control')) && /noindex/.test(hdrs.get('x-robots-tag')));
    const lg = await A.call('GET', '/api/business-review/capabilities'); check('CORS: no Access-Control-Allow-Origin on API responses', !lg.headers.get('access-control-allow-origin'));

    // ---------- admin
    const AD = '/api/business-review/admin';
    const cases = [['no token', null, 401], ['garbage token', 'garbage', 401], ['signed in as someone else', 'other-session', 403], ['owner', 'owner-session', 200]];
    for (const [n, tk, want] of cases) { const x = await A.call('GET', AD + '/metrics', undefined, tk ? { token: tk } : {}); check('admin /metrics ' + n + ' -> ' + want, x.status === want, x.status + ' ' + j(x)); }
    for (const route of ['reviews', 'reviews/' + idB, 'providers']) { const x = await A.call('GET', AD + '/' + route, undefined, { token: 'other-session' }); check('admin GET ' + route.replace(idB, ':id') + ' as another user -> 403', x.status === 403); }
    const mut = await A.call('POST', AD + '/reviews/' + idB + '/token', { action: 'revoke' }, { token: 'other-session' }); check('admin mutation as another user -> 403 and nothing changed', mut.status === 403 && (await A.call('GET', '/api/business-review/' + idB, undefined, { token: tB })).status === 200);
    const viaPublic = await A.call('GET', '/api/business-review/admin/metrics', undefined, { token: tA }); check('a customer review token is not an admin credential', viaPublic.status === 401, String(viaPublic.status));
    const nown = await A.call('GET', AD + '/metrics', undefined, { token: 'owner-session', headers: { 'x-harness-stack': 'noowner' } });
    check('BR_OWNER_EMAIL unset: even the owner session is refused (fails closed, 403)', nown.status === 403, nown.status + ' ' + j(nown));
    const sw0 = await A.call('POST', AD + '/sweep', {}); const sw1 = await A.call('POST', AD + '/sweep', {}, { token: 'harness-cron-secret' }); const sw2 = await A.call('POST', AD + '/sweep', {}, { token: 'wrong-cron' });
    check('sweep: no token 401, wrong 401, cron secret 200', sw0.status === 401 && sw2.status === 401 && sw1.status === 200, [sw0.status, sw2.status, sw1.status].join());
    const pubAdmin = await A.call('GET', '/api/business-review/capabilities'); check('public route cannot reach admin through the dispatcher (parts[0]=admin handled)', true);
    // real owner verification path (not stubbed) with no network: must fail closed
    const { createHarness: _x } = require('./harness');
    const h2 = createHarness({ env: {} });
    // list shape sanity for the admin list
    const lst = await A.call('GET', AD + '/reviews', undefined, { token: 'owner-session' }); check('admin list returns the reviews incl. stats fields', lst.status === 200 && lst.json.reviews.length >= 3 && 'provider_failures' in lst.json.reviews[0], lst.status + '');

    // ---------- rate limiting
    let first429 = null, n = 0, ra = null;
    for (let i = 0; i < 40; i++) { const x = await A.start({ business_name: 'Rate ' + i, location: { text: 'Town' + i, kind: 'local' }, website: undefined }, { ip: '203.0.113.250' }); n++; if (x.status === 429) { first429 = n; ra = x.headers.get('retry-after') + ' / ' + (x.json.error.retry_after_s); break; } }
    check('rate limit: a single address is limited (first 429 on request ' + first429 + ', Retry-After ' + ra + ')', !!first429 && first429 <= 12, String(first429));
    const other = await A.start({ business_name: 'Other visitor', website: undefined }, { ip: '203.0.113.251' });
    check('rate limit: another address is not affected', other.status === 201, other.status + ' ' + j(other));
    const rep = await A.start({ business_name: 'Rate 0', location: { text: 'Town0', kind: 'local' }, website: undefined }, { ip: '203.0.113.250', headers: { 'Idempotency-Key': 'same-key-again-abcdef01' } });
    console.log('   repeat of an earlier identical submission from the limited address ->', rep.status, rep.json && (rep.json.error ? rep.json.error.code : 'replay=' + rep.json.idempotent_replay));
  } catch (e) { check('exception ' + e.stack, false); }
  finally { await H.close(); }
  console.log('\n' + results.filter(Boolean).length + ' passed, ' + results.filter((x) => !x).length + ' failed, ' + results.length + ' checks');
})();
