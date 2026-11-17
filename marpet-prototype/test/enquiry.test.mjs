// Run with: node --test marpet-prototype/test/enquiry.test.mjs
// Unit tests for api/enquiry.js. fetch is mocked, so nothing here talks to Cloudflare or Resend.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import handler, { validate, isSpam, SERVICES, countLinks, oneLine, QUARANTINE_PREFIX } from '../api/enquiry.js';

const REAL_FETCH = globalThis.fetch;
const ENV_NAMES = [
  'MARPET_RESEND_API_KEY', 'MARPET_ENQUIRY_TO', 'MARPET_ENQUIRY_FROM',
  'MARPET_TURNSTILE_SECRET_KEY', 'MARPET_TURNSTILE_HOSTNAMES'
];
const TEST_ENV = {
  MARPET_RESEND_API_KEY: 'test-resend-key',
  MARPET_ENQUIRY_TO: 'enquiries@example.com',
  MARPET_ENQUIRY_FROM: 'Marpet Website <website@example.com>',
  MARPET_TURNSTILE_SECRET_KEY: 'test-turnstile-secret'
};

/*
Runs fn with the env set, fetch mocked and console captured, then puts everything back.
  env:    overrides; a null value removes that variable
  cf:     what the fake Cloudflare answers, or { down: true } to throw, or { status: 500 }
  resend: { fail: true } for a 500, { down: true } to throw
*/
async function scenario(options, fn) {
  const o = options || {};
  const saved = {};
  for (const n of ENV_NAMES) { saved[n] = process.env[n]; delete process.env[n]; }
  const env = { ...TEST_ENV, ...(o.env || {}) };
  for (const n of Object.keys(env)) { if (env[n] !== null) process.env[n] = env[n]; }

  const calls = { all: [], verify: [], resend: [] };
  const cf = o.cf || { success: true, hostname: 'marpet.example' };
  globalThis.fetch = async function (url, init) {
    calls.all.push(String(url));
    if (String(url) === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      calls.verify.push({ init, params: new URLSearchParams(init.body) });
      if (cf.down) throw new Error('network down');
      if (cf.status) return { ok: false, status: cf.status, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => cf };
    }
    if (String(url) === 'https://api.resend.com/emails') {
      calls.resend.push({ init, payload: JSON.parse(init.body) });
      if (o.resend && o.resend.down) throw new Error('network down');
      if (o.resend && o.resend.fail) return { ok: false, status: 500, text: async () => 'boom' };
      return { ok: true, status: 200, json: async () => ({ id: 'email_123' }) };
    }
    throw new Error('unexpected fetch ' + url);
  };

  const logs = [];
  const savedConsole = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = (...args) => { logs.push(args.join(' ')); };

  try {
    await fn(calls, logs);
  } finally {
    globalThis.fetch = REAL_FETCH;
    Object.assign(console, savedConsole);
    for (const n of ENV_NAMES) { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n]; }
  }
}

function good(over) {
  return {
    name: 'Jane Smith',
    company: 'Acme Foods Ltd',
    email: 'jane@acme.example',
    tel: '+44 (0)1234 567-890',
    service: 'Conveyor systems',
    message: 'We need a 6 metre belt conveyor with side tables for a packing line.',
    website: '',
    ts: String(Date.now() - 60 * 1000),
    'cf-turnstile-response': 'token-abc',
    ...(over || {})
  };
}

function request(fields, over) {
  const o = over || {};
  return {
    method: o.method || 'POST',
    headers: {
      'content-type': o.type || 'application/x-www-form-urlencoded',
      'x-forwarded-for': '203.0.113.7',
      ...(o.json === false ? {} : { accept: 'application/json' }),
      ...(o.headers || {})
    },
    body: fields,
    socket: {}
  };
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    ended: false,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.ended = true; this.body = body || ''; },
    json() { return JSON.parse(this.body); }
  };
}

async function run(req) {
  const res = response();
  await handler(req, res);
  assert.equal(res.ended, true, 'response was ended');
  return res;
}

// ---------------------------------------------------------------- pure helpers

test('SERVICES is the list in the form', () => {
  assert.deepEqual([...SERVICES], [
    'Conveyor systems', 'Production lines', 'Industrial pipework', 'Access platforms',
    'Catering fabrication', 'Dentistry equipment', 'General fabrication', 'Something else'
  ]);
});

test('validate: accepts a good enquiry and tidies it', () => {
  const r = validate(good({ name: '  Jane   Smith ', message: '  Line one\r\nLine two is here  ' }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, {});
  assert.equal(r.value.name, 'Jane Smith');
  assert.equal(r.value.message, 'Line one\nLine two is here');
  assert.equal(r.value.service, 'Conveyor systems');
});

test('validate: optional fields can be left out', () => {
  const r = validate({ name: 'Jo', email: 'jo@example.com', message: 'Ten chars!' });
  assert.equal(r.ok, true);
  assert.equal(r.value.company, '');
  assert.equal(r.value.tel, '');
  assert.equal(r.value.service, '');
});

test('validate: name is required, 2 to 100 characters', () => {
  assert.ok(validate(good({ name: '' })).errors.name);
  assert.ok(validate(good({ name: '   ' })).errors.name);
  assert.ok(validate(good({ name: 'J' })).errors.name);
  assert.ok(validate(good({ name: 'x'.repeat(101) })).errors.name);
  assert.equal(validate(good({ name: 'x'.repeat(100) })).errors.name, undefined);
  assert.equal(validate(good({ name: 'Jo' })).errors.name, undefined);
});

test('validate: company is optional, 120 characters at most', () => {
  assert.equal(validate(good({ company: '' })).errors.company, undefined);
  assert.equal(validate(good({ company: 'x'.repeat(120) })).errors.company, undefined);
  assert.ok(validate(good({ company: 'x'.repeat(121) })).errors.company);
});

test('validate: email is required, valid, 254 characters at most', () => {
  assert.ok(validate(good({ email: '' })).errors.email);
  for (const bad of ['jane', 'jane@', '@acme.example', 'jane@acme', 'jane smith@acme.example',
    'jane@acme.example, other@x.example', 'Jane <jane@acme.example>', 'jane@acme..example']) {
    assert.ok(validate(good({ email: bad })).errors.email, bad);
  }
  assert.ok(validate(good({ email: 'a'.repeat(250) + '@x.example' })).errors.email);
  assert.equal(validate(good({ email: 'jane.o\'neil+quotes@sub.acme.co.uk' })).errors.email, undefined);
});

test('validate: tel is optional, 40 characters at most, digits space + ( ) - only', () => {
  assert.equal(validate(good({ tel: '' })).errors.tel, undefined);
  assert.equal(validate(good({ tel: '01234 567890' })).errors.tel, undefined);
  assert.equal(validate(good({ tel: '+44 (0)1234 567-890' })).errors.tel, undefined);
  assert.ok(validate(good({ tel: 'call me' })).errors.tel);
  assert.ok(validate(good({ tel: '01234 567890 ext. 4' })).errors.tel);
  assert.ok(validate(good({ tel: '()-+' })).errors.tel);
  assert.ok(validate(good({ tel: '1'.repeat(41) })).errors.tel);
});

test('validate: service must be on the list when given', () => {
  for (const s of SERVICES) assert.equal(validate(good({ service: s })).errors.service, undefined, s);
  assert.equal(validate(good({ service: '' })).errors.service, undefined);
  assert.ok(validate(good({ service: 'Shipbuilding' })).errors.service);
  assert.ok(validate(good({ service: 'conveyor systems' })).errors.service);
  // A caller can pass its own list.
  assert.equal(validate(good({ service: 'Shipbuilding' }), ['Shipbuilding']).errors.service, undefined);
});

test('validate: message is required, 10 to 5000 characters', () => {
  assert.ok(validate(good({ message: '' })).errors.message);
  assert.ok(validate(good({ message: 'Too short' })).errors.message);
  assert.ok(validate(good({ message: 'x'.repeat(5001) })).errors.message);
  assert.equal(validate(good({ message: 'x'.repeat(5000) })).errors.message, undefined);
  assert.equal(validate(good({ message: 'x'.repeat(10) })).errors.message, undefined);
});

test('validate: non-string values and missing input do not throw', () => {
  const r = validate({ name: { a: 1 }, email: ['x@y.example'], message: null, tel: 12345 });
  assert.equal(r.ok, false);
  assert.ok(r.errors.name && r.errors.email && r.errors.message);
  assert.equal(r.value.tel, '12345');
  assert.equal(validate(undefined).ok, false);
});

test('isSpam: honeypot, time trap and missing ts', () => {
  const now = 1_800_000_000_000;
  assert.deepEqual(isSpam({ website: '', ts: String(now - 60_000) }, now),
    { spam: false, honeypot: false, suspicious: false, reason: null });
  assert.equal(isSpam({ website: 'http://spam.example', ts: String(now - 60_000) }, now).honeypot, true);
  assert.equal(isSpam({ website: 'x' }, now).spam, true);
  assert.equal(isSpam({ ts: String(now - 2_999) }, now).reason, 'too_fast');
  assert.equal(isSpam({ ts: String(now - 2_999) }, now).spam, true);
  assert.equal(isSpam({ ts: String(now - 3_000) }, now).spam, false);
  assert.equal(isSpam({ ts: String(now - 24 * 3600 * 1000) }, now).spam, false);
  assert.equal(isSpam({ ts: String(now - 24 * 3600 * 1000 - 1) }, now).reason, 'too_old');
  assert.equal(isSpam({ ts: 'abc' }, now).reason, 'bad_ts');
  assert.equal(isSpam({ ts: '-5' }, now).spam, true);
  // Missing: suspicious, not fatal.
  assert.deepEqual(isSpam({}, now), { spam: false, honeypot: false, suspicious: true, reason: 'missing_ts' });
  // Visitor's clock a little ahead of the server: suspicious, not fatal. Far ahead: refused.
  assert.deepEqual(isSpam({ ts: String(now + 30_000) }, now),
    { spam: false, honeypot: false, suspicious: true, reason: 'clock_skew' });
  assert.equal(isSpam({ ts: String(now + 3600 * 1000) }, now).spam, true);
});

test('countLinks and oneLine', () => {
  assert.equal(countLinks('no links here'), 0);
  assert.equal(countLinks('see https://a.example and http://b.example/x and www.c.example'), 3);
  assert.equal(oneLine('  a\r\nb\tc\u2028d  '), 'a b c d');
});

// ---------------------------------------------------------------- handler

test('method not allowed: 405 with Allow header, no network', async () => {
  await scenario({}, async (calls) => {
    for (const method of ['GET', 'PUT', 'DELETE', 'OPTIONS']) {
      const res = await run(request(good(), { method }));
      assert.equal(res.statusCode, 405, method);
      assert.equal(res.headers.allow, 'POST');
      assert.deepEqual(res.json(), { ok: false, code: 'method_not_allowed' });
    }
    assert.equal(calls.all.length, 0);
  });
});

test('validation errors: 400 with a message per field, nothing verified or sent', async () => {
  await scenario({}, async (calls) => {
    const res = await run(request(good({
      name: 'J', company: 'x'.repeat(121), email: 'nope', tel: 'abc', service: 'Shipbuilding', message: 'short'
    })));
    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.equal(body.ok, false);
    assert.equal(body.code, 'validation');
    assert.deepEqual(Object.keys(body.errors).sort(), ['company', 'email', 'message', 'name', 'service', 'tel']);
    for (const k of Object.keys(body.errors)) assert.equal(typeof body.errors[k], 'string');
    assert.equal(calls.all.length, 0);
  });
});

test('validation errors never echo what the visitor typed', async () => {
  await scenario({}, async () => {
    const res = await run(request(good({ name: '<', email: '<script>alert(1)</script>', service: '<img src=x>' })));
    assert.equal(res.statusCode, 400);
    assert.ok(!res.body.includes('<'));
    assert.ok(!res.body.includes('alert'));
  });
});

test('honeypot: looks like success, nothing verified or sent', async () => {
  await scenario({}, async (calls) => {
    const res = await run(request(good({ website: 'https://spam.example' })));
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });
    assert.equal(calls.all.length, 0);

    const form = await run(request(good({ website: 'x' }), { json: false }));
    assert.equal(form.statusCode, 303);
    assert.equal(form.headers.location, '/contact.html?sent=1#enquiry-status');
    assert.equal(calls.all.length, 0);
  });
});

test('too fast: 403 spam, nothing verified or sent', async () => {
  await scenario({}, async (calls) => {
    const res = await run(request(good({ ts: String(Date.now() - 500) })));
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.json(), { ok: false, code: 'spam' });
    assert.equal(calls.all.length, 0);
  });
});

test('too old (over 24 hours): 403 spam, nothing sent', async () => {
  await scenario({}, async (calls) => {
    const res = await run(request(good({ ts: String(Date.now() - 25 * 3600 * 1000) })));
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().code, 'spam');
    assert.equal(calls.all.length, 0);
  });
});

test('missing env: 503 not_configured and no network call, for each required variable', async () => {
  for (const name of Object.keys(TEST_ENV)) {
    await scenario({ env: { [name]: null } }, async (calls, logs) => {
      const res = await run(request(good()));
      assert.equal(res.statusCode, 503, name);
      assert.deepEqual(res.json(), { ok: false, code: 'not_configured' });
      assert.equal(calls.all.length, 0, name + ': no fetch');
      assert.ok(logs.some((l) => l.includes(name)), 'logs the missing variable name');
    });
  }
  await scenario({ env: { MARPET_TURNSTILE_SECRET_KEY: '   ' } }, async (calls) => {
    const res = await run(request(good()));
    assert.equal(res.statusCode, 503);
    assert.equal(calls.all.length, 0);
  });
  await scenario({ env: { MARPET_RESEND_API_KEY: null } }, async (calls) => {
    const res = await run(request(good(), { json: false }));
    assert.equal(res.statusCode, 303);
    assert.equal(res.headers.location, '/contact.html?error=not_configured#enquiry-status');
    assert.equal(calls.all.length, 0);
  });
});

test('Turnstile failure: 403 and no email sent', async () => {
  await scenario({ cf: { success: false, 'error-codes': ['invalid-input-response'] } }, async (calls) => {
    const res = await run(request(good()));
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.json(), { ok: false, code: 'turnstile_failed' });
    assert.equal(calls.verify.length, 1);
    assert.equal(calls.resend.length, 0);
  });
});

test('Turnstile token missing: 403, Cloudflare not asked, no email sent', async () => {
  await scenario({}, async (calls) => {
    const res = await run(request(good({ 'cf-turnstile-response': '' })));
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().code, 'turnstile_failed');
    assert.equal(calls.all.length, 0);
  });
});

test('Turnstile unreachable or erroring: 502, fails closed, no email sent', async () => {
  for (const cf of [{ down: true }, { status: 500 }]) {
    await scenario({ cf }, async (calls) => {
      const res = await run(request(good()));
      assert.equal(res.statusCode, 502);
      assert.deepEqual(res.json(), { ok: false, code: 'turnstile_unavailable' });
      assert.equal(calls.resend.length, 0);
    });
  }
});

test('Turnstile hostname is enforced when MARPET_TURNSTILE_HOSTNAMES is set', async () => {
  const env = { MARPET_TURNSTILE_HOSTNAMES: 'marpet.example, www.marpet.example' };
  await scenario({ env, cf: { success: true, hostname: 'evil.example' } }, async (calls) => {
    const res = await run(request(good()));
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().code, 'turnstile_failed');
    assert.equal(calls.resend.length, 0);
  });
  await scenario({ env, cf: { success: true, hostname: 'www.marpet.example' } }, async (calls) => {
    const res = await run(request(good()));
    assert.equal(res.statusCode, 200);
    assert.equal(calls.resend.length, 1);
  });
});

test('happy path: verifies Turnstile, sends exactly one Resend request, ok only after Resend accepts', async () => {
  await scenario({}, async (calls, logs) => {
    const req = request(good());
    const res = response();

    // Hold Resend's answer back to prove the handler has not answered before it arrives.
    const inner = globalThis.fetch;
    let release;
    const gate = new Promise((r) => { release = r; });
    let resendAsked;
    const asked = new Promise((r) => { resendAsked = r; });
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('api.resend.com')) { resendAsked(); await gate; }
      return inner(url, init);
    };

    const pending = handler(req, res);
    await asked;
    assert.equal(res.ended, false, 'no answer before Resend has replied');
    release();
    await pending;

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });
    assert.match(res.headers['content-type'], /application\/json/);
    assert.equal(res.headers['cache-control'], 'no-store');

    // Turnstile first, then Resend. Nothing else.
    assert.deepEqual(calls.all, [
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      'https://api.resend.com/emails'
    ]);
    const verify = calls.verify[0];
    assert.equal(verify.init.method, 'POST');
    assert.equal(verify.params.get('secret'), 'test-turnstile-secret');
    assert.equal(verify.params.get('response'), 'token-abc');
    assert.equal(verify.params.get('remoteip'), '203.0.113.7');

    assert.equal(calls.resend.length, 1);
    const { init, payload } = calls.resend[0];
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer test-resend-key');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.deepEqual(payload.to, ['enquiries@example.com']);
    assert.equal(payload.from, 'Marpet Website <website@example.com>');
    assert.equal(payload.reply_to, 'jane@acme.example');
    assert.equal(payload.subject, 'Website enquiry: Conveyor systems - Jane Smith (Acme Foods Ltd)');
    assert.ok(payload.text.includes('We need a 6 metre belt conveyor'));
    assert.ok(payload.text.includes('+44 (0)1234 567-890'));
    assert.ok(payload.html.includes('Acme Foods Ltd'));
    // Hidden fields and the token are not forwarded.
    assert.ok(!payload.text.includes('token-abc'));

    // Logs carry codes only.
    const all = logs.join('\n');
    assert.ok(!all.includes('jane@acme.example'));
    assert.ok(!all.includes('Jane Smith'));
    assert.ok(!all.includes('belt conveyor'));
    assert.ok(!all.includes('test-resend-key'));
    assert.ok(!all.includes('test-turnstile-secret'));
  });
});

test('happy path without optional fields, several recipients', async () => {
  await scenario({ env: { MARPET_ENQUIRY_TO: 'a@example.com, b@example.com' } }, async (calls) => {
    const res = await run(request(good({ company: '', tel: '', service: '' })));
    assert.equal(res.statusCode, 200);
    const { payload } = calls.resend[0];
    assert.deepEqual(payload.to, ['a@example.com', 'b@example.com']);
    assert.equal(payload.subject, 'Website enquiry: General - Jane Smith');
  });
});

test('plain form post: 303 to ?sent=1 on success', async () => {
  await scenario({}, async (calls) => {
    const res = await run(request(good(), { json: false }));
    assert.equal(res.statusCode, 303);
    assert.equal(res.headers.location, '/contact.html?sent=1#enquiry-status');
    assert.equal(res.body, '');
    assert.equal(calls.resend.length, 1);
  });
});

test('plain form post: 303 to ?error=<code> on failure', async () => {
  await scenario({}, async (calls) => {
    const res = await run(request(good({ email: 'nope' }), { json: false }));
    assert.equal(res.statusCode, 303);
    assert.equal(res.headers.location, '/contact.html?error=validation#enquiry-status');
    assert.equal(calls.all.length, 0);
  });
  await scenario({ resend: { fail: true } }, async () => {
    const res = await run(request(good(), { json: false }));
    assert.equal(res.headers.location, '/contact.html?error=send_failed#enquiry-status');
  });
});

test('Resend failure: 502 send_failed, never reports success', async () => {
  for (const resend of [{ fail: true }, { down: true }]) {
    await scenario({ resend }, async (calls, logs) => {
      const res = await run(request(good()));
      assert.equal(res.statusCode, 502);
      assert.deepEqual(res.json(), { ok: false, code: 'send_failed' });
      assert.equal(calls.resend.length, 1);
      assert.ok(!logs.join('\n').includes('boom'), 'upstream body is not logged');
    });
  }
});

test('header injection: CR/LF in name and company cannot add header lines', async () => {
  await scenario({}, async (calls) => {
    const res = await run(request(good({
      name: 'Jane\r\nBcc: victim@evil.example',
      company: 'Acme\nSubject: hijacked'
    })));
    assert.equal(res.statusCode, 200);
    const { payload } = calls.resend[0];
    assert.ok(!/[\r\n]/.test(payload.subject), 'subject is a single line');
    assert.equal(payload.subject, 'Website enquiry: Conveyor systems - Jane Bcc: victim@evil.example (Acme Subject: hijacked)');
    for (const key of ['from', 'reply_to']) assert.ok(!/[\r\n]/.test(payload[key]), key);
    assert.deepEqual(payload.to, ['enquiries@example.com']);
    assert.equal(payload.bcc, undefined);
    assert.equal(payload.cc, undefined);
    assert.equal(payload.headers, undefined);
  });
});

test('header injection: CR/LF or extra addresses in email are refused, nothing sent', async () => {
  await scenario({}, async (calls) => {
    for (const email of [
      'jane@acme.example\r\nBcc: victim@evil.example',
      'jane@acme.example\nvictim@evil.example',
      'jane@acme.example,victim@evil.example',
      'jane@acme.example%0ABcc:victim@evil.example'
    ]) {
      const res = await run(request(good({ email })));
      assert.equal(res.statusCode, 400, JSON.stringify(email));
      assert.ok(res.json().errors.email);
    }
    assert.equal(calls.all.length, 0);
  });
});

test('header injection: CR/LF in the env-supplied from address is flattened too', async () => {
  await scenario({ env: { MARPET_ENQUIRY_FROM: 'Marpet <website@example.com>\r\nBcc: x@evil.example' } }, async (calls) => {
    await run(request(good()));
    assert.ok(!/[\r\n]/.test(calls.resend[0].payload.from));
  });
});

test('HTML email escapes what the visitor typed', async () => {
  await scenario({}, async (calls) => {
    const res = await run(request(good({
      name: '<b>Jane</b>',
      message: 'Hello <script>alert("x")</script> & goodbye\nsecond line'
    })));
    assert.equal(res.statusCode, 200);
    const { html } = calls.resend[0].payload;
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<b>Jane</b>'));
    assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; goodbye<br>second line'));
    assert.ok(html.includes('&lt;b&gt;Jane&lt;/b&gt;'));
  });
});

test('quarantine prefix: more than 3 links marks the subject [SPAM REVIEW], still delivered', async () => {
  await scenario({}, async (calls) => {
    const four = 'Look at https://a.example http://b.example https://c.example and www.d.example please';
    const res = await run(request(good({ message: four })));
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });
    const { payload } = calls.resend[0];
    assert.equal(QUARANTINE_PREFIX, '[SPAM REVIEW] ');
    assert.ok(payload.subject.startsWith('[SPAM REVIEW] Website enquiry: '));
    assert.ok(payload.text.startsWith('SPAM REVIEW'));
    assert.deepEqual(payload.to, ['enquiries@example.com']);
  });
  await scenario({}, async (calls) => {
    const three = 'Drawings at https://a.example and https://b.example and https://c.example thanks';
    await run(request(good({ message: three })));
    assert.ok(!calls.resend[0].payload.subject.includes('[SPAM REVIEW]'));
  });
});

test('missing ts: not fatal when Turnstile passes, but marked [SPAM REVIEW]', async () => {
  await scenario({}, async (calls) => {
    const fields = good();
    delete fields.ts;
    const res = await run(request(fields));
    assert.equal(res.statusCode, 200);
    assert.equal(calls.verify.length, 1);
    assert.equal(calls.resend.length, 1);
    assert.ok(calls.resend[0].payload.subject.startsWith('[SPAM REVIEW] '));
  });
  await scenario({ cf: { success: false } }, async (calls) => {
    const fields = good();
    delete fields.ts;
    const res = await run(request(fields));
    assert.equal(res.statusCode, 403);
    assert.equal(calls.resend.length, 0);
  });
});

// ---------------------------------------------------------------- body handling

test('body: urlencoded string, JSON string, JSON object and bytes are all read', async () => {
  const fields = good();
  const encoded = new URLSearchParams(fields).toString();
  const cases = [
    request(encoded),
    request(JSON.stringify(fields), { type: 'application/json; charset=utf-8' }),
    request(fields, { type: 'application/json' }),
    request(new TextEncoder().encode(encoded))
  ];
  for (const req of cases) {
    await scenario({}, async (calls) => {
      const res = await run(req);
      assert.equal(res.statusCode, 200);
      assert.equal(calls.resend.length, 1);
      assert.equal(calls.resend[0].payload.reply_to, 'jane@acme.example');
    });
  }
});

test('body: raw stream is read when the host has not parsed it', async () => {
  await scenario({}, async (calls) => {
    const req = new EventEmitter();
    req.method = 'POST';
    req.headers = { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' };
    const res = response();
    const pending = handler(req, res);
    const encoded = Buffer.from(new URLSearchParams(good()).toString());
    req.emit('data', encoded.subarray(0, 20));
    req.emit('data', encoded.subarray(20));
    req.emit('end');
    await pending;
    assert.equal(res.statusCode, 200);
    assert.equal(calls.resend[0].payload.reply_to, 'jane@acme.example');
  });
});

test('body: over 20 KB is refused with 413, however it arrives', async () => {
  const big = good({ message: 'x'.repeat(21 * 1024) });
  await scenario({}, async (calls) => {
    for (const req of [
      request(big),
      request(new URLSearchParams(big).toString()),
      request(JSON.stringify(big), { type: 'application/json' }),
      request(good(), { headers: { 'content-length': String(64 * 1024) } })
    ]) {
      const res = await run(req);
      assert.equal(res.statusCode, 413);
      assert.deepEqual(res.json(), { ok: false, code: 'too_large' });
    }

    const stream = new EventEmitter();
    stream.method = 'POST';
    stream.headers = { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' };
    const res = response();
    const pending = handler(stream, res);
    stream.emit('data', Buffer.alloc(15 * 1024, 'a'));
    stream.emit('data', Buffer.alloc(15 * 1024, 'a'));
    stream.emit('end');
    await pending;
    assert.equal(res.statusCode, 413);
    assert.equal(calls.all.length, 0);
  });
});

test('body: wrong content type 415, broken JSON 400, nothing sent', async () => {
  await scenario({}, async (calls) => {
    const multipart = await run(request('x', { type: 'multipart/form-data; boundary=x' }));
    assert.equal(multipart.statusCode, 415);
    assert.equal(multipart.json().code, 'unsupported_media_type');

    const broken = await run(request('{not json', { type: 'application/json' }));
    assert.equal(broken.statusCode, 400);
    assert.equal(broken.json().code, 'bad_request');

    const array = await run(request('[1,2]', { type: 'application/json' }));
    assert.equal(array.statusCode, 400);
    assert.equal(calls.all.length, 0);
  });
});
