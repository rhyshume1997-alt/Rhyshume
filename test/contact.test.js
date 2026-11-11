'use strict';

// Run with: node --test
// Handler tests for api/contact.js. fetch is mocked, so nothing here talks to Cloudflare or Resend.
const test = require('node:test');
const assert = require('node:assert');
const handler = require('../api/contact');
const antispam = require('../api/_lib/antispam');
const words = require('../api/_lib/contact-words');

const SECRET = 'test-secret-value';
const REAL_FETCH = global.fetch;
const ENV_NAMES = ['RESEND_API_KEY', 'CONTACT_TO', 'CONTACT_FROM', 'TURNSTILE_SECRET_KEY', 'CONTACT_QUARANTINE_TO'];
let ipCounter = 0;

function nextIp() { ipCounter += 1; return '10.0.' + Math.floor(ipCounter / 250) + '.' + (ipCounter % 250); }

/*
Runs fn with the env set, fetch mocked and console captured, then puts everything back.
cf: what the fake Cloudflare answers. { success, hostname, action, 'error-codes' }, or { down: true } to throw, or { status: 500 }.
resend: { fail: true } to make Resend refuse.
*/
async function scenario(options, fn) {
  const o = options || {};
  const saved = {};
  ENV_NAMES.forEach(function (n) { saved[n] = process.env[n]; delete process.env[n]; });
  const env = Object.assign({
    RESEND_API_KEY: 're_test_key',
    CONTACT_TO: 'me@example.com',
    TURNSTILE_SECRET_KEY: SECRET,
    CONTACT_QUARANTINE_TO: 'review@example.com'
  }, o.env || {});
  Object.keys(env).forEach(function (n) { if (env[n] !== null) process.env[n] = env[n]; });

  const calls = { verify: [], resend: [] };
  const cf = o.cf || { success: true, hostname: 'rhyshume.co.uk', action: 'contact' };
  global.fetch = async function (url, init) {
    if (String(url).indexOf('challenges.cloudflare.com') !== -1) {
      calls.verify.push({ url: url, body: init.body });
      if (cf.down) throw new Error('network down');
      if (cf.status) return { ok: false, status: cf.status, json: async function () { return {}; } };
      return { ok: true, json: async function () { return cf; } };
    }
    if (String(url).indexOf('api.resend.com') !== -1) {
      const payload = JSON.parse(init.body);
      calls.resend.push(payload);
      if (o.resend && o.resend.fail) return { ok: false, status: 500, text: async function () { return 'boom'; } };
      return { ok: true, json: async function () { return { id: 'email_123' }; } };
    }
    throw new Error('unexpected fetch ' + url);
  };

  const logs = [];
  const saveConsole = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = function () { logs.push(Array.prototype.slice.call(arguments).join(' ')); };

  try {
    await fn(calls, logs);
  } finally {
    global.fetch = REAL_FETCH;
    console.log = saveConsole.log; console.warn = saveConsole.warn; console.error = saveConsole.error;
    ENV_NAMES.forEach(function (n) { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n]; });
  }
}

function request(fields, over) {
  const o = over || {};
  return {
    method: o.method || 'POST',
    headers: Object.assign({
      'content-type': 'application/x-www-form-urlencoded',
      'x-forwarded-for': o.ip || nextIp()
    }, o.json ? { accept: 'application/json' } : {}, o.headers || {}),
    body: fields,
    socket: {}
  };
}

function response() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader: function (k, v) { res.headers[k.toLowerCase()] = v; },
    end: function (b) { res.body = b || ''; }
  };
  return res;
}

async function post(fields, over) {
  const res = response();
  await handler(request(fields, over), res);
  res.json = res.body ? JSON.parse(res.body) : null;
  return res;
}

const contactEnquiry = {
  form: 'contact',
  name: 'Sam Carter',
  company: 'Carter Fabrications',
  email: 'sam@carterfab.co.uk',
  phone: '',
  service: 'Website',
  message: 'We are a fabrication shop in Motherwell and need a new website with a quote form that takes drawings.',
  'cf-turnstile-response': 'good-token'
};

const contactPitch = {
  form: 'contact',
  name: 'Alex Reed',
  company: 'Rankwell Digital Marketing',
  email: 'alex@rankwell.example',
  phone: '',
  service: 'Website',
  message: 'We noticed your website has SEO issues. We are a marketing agency and can get you to the first page of Google. Free audit at https://rankwell.example/audit and www.rankwell.example',
  'cf-turnstile-response': 'good-token'
};

const grantsEnquiry = {
  form: 'grants',
  name: 'Jo Miller',
  company: 'Miller Joinery',
  email: 'jo@millerjoinery.co.uk',
  phone: '',
  council_area: 'North Lanarkshire',
  what_you_want_built: 'A website with a quote form for our joinery workshop. We want to apply for the council digital grant.',
  'cf-turnstile-response': 'good-token'
};

const grantsPitch = {
  form: 'grants',
  name: 'Pat Grant',
  company: 'Fundright Services',
  email: 'pat@fundright.example',
  phone: '',
  council_area: 'East Dunbartonshire',
  what_you_want_built: 'We offer guaranteed grant approval and grant writing services. Claim your grant today. Special offer, click here https://fundright.example',
  'cf-turnstile-response': 'good-token'
};

// ---------------------------------------------------------------- basics

test('handler: anything but POST is refused and nothing is fetched', async function () {
  await scenario({}, async function (calls) {
    const res = await post({}, { method: 'GET', json: true });
    assert.strictEqual(res.statusCode, 405);
    assert.strictEqual(res.headers.allow, 'POST');
    assert.strictEqual(calls.verify.length + calls.resend.length, 0);
  });
});

test('handler: honeypot gets a normal thank you and nothing is checked or sent', async function () {
  await scenario({}, async function (calls) {
    const res = await post(Object.assign({}, contactEnquiry, { company_website: 'http://spam.example', 'cf-turnstile-response': '' }), { json: true });
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.json, { ok: true });
    assert.strictEqual(calls.verify.length, 0);
    assert.strictEqual(calls.resend.length, 0);
  });
});

test('handler: the sixth send from one address in ten minutes is rate limited', async function () {
  await scenario({}, async function (calls) {
    const ip = nextIp();
    for (let i = 0; i < 5; i++) {
      const ok = await post(contactEnquiry, { ip: ip, json: true });
      assert.strictEqual(ok.statusCode, 200);
    }
    const res = await post(contactEnquiry, { ip: ip, json: true });
    assert.strictEqual(res.statusCode, 429);
    assert.strictEqual(calls.resend.length, 5);
  });
});

// ---------------------------------------------------------------- turnstile

test('turnstile: a missing token is refused with 403, nothing is fetched or emailed', async function () {
  await scenario({}, async function (calls) {
    const fields = Object.assign({}, contactEnquiry);
    delete fields['cf-turnstile-response'];
    const res = await post(fields, { json: true });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.json.ok, false);
    assert.match(res.json.error, /07908 041480/);
    assert.match(res.json.error, /rhyshume1997@gmail\.com/);
    assert.strictEqual(calls.verify.length, 0);
    assert.strictEqual(calls.resend.length, 0);
  });
});

test('turnstile: a form post with no token goes back to the page with the check failed note', async function () {
  await scenario({}, async function (calls) {
    const contact = await post(Object.assign({}, contactEnquiry, { 'cf-turnstile-response': '' }));
    assert.strictEqual(contact.statusCode, 303);
    assert.strictEqual(contact.headers.location, '/contact?error=1#check-failed');
    const grants = await post(Object.assign({}, grantsEnquiry, { 'cf-turnstile-response': '' }));
    assert.strictEqual(grants.headers.location, '/council-digital-grants?error=1#check-failed');
    assert.strictEqual(calls.resend.length, 0);
  });
});

test('turnstile: no secret set fails closed with 503 and the log names the variable, not a value', async function () {
  await scenario({ env: { TURNSTILE_SECRET_KEY: null } }, async function (calls, logs) {
    const res = await post(contactEnquiry, { json: true });
    assert.strictEqual(res.statusCode, 503);
    assert.match(res.json.error, /07908 041480/);
    assert.match(res.json.error, /rhyshume1997@gmail\.com/);
    assert.strictEqual(calls.verify.length, 0);
    assert.strictEqual(calls.resend.length, 0);
    assert.ok(logs.some(function (l) { return l.indexOf('TURNSTILE_SECRET_KEY') !== -1; }));
  });
});

test('turnstile: Cloudflare unreachable fails closed with 503', async function () {
  await scenario({ cf: { down: true } }, async function (calls) {
    const res = await post(contactEnquiry, { json: true });
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(calls.resend.length, 0);
  });
});

test('turnstile: Cloudflare error status and internal-error both fail closed with 503', async function () {
  await scenario({ cf: { status: 500 } }, async function (calls) {
    const res = await post(contactEnquiry, { json: true });
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(calls.resend.length, 0);
  });
  await scenario({ cf: { success: false, 'error-codes': ['internal-error'] } }, async function (calls) {
    const res = await post(contactEnquiry, { json: true });
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(calls.resend.length, 0);
  });
});

test('turnstile: a rejected, expired or reused token is refused with 403', async function () {
  await scenario({ cf: { success: false, 'error-codes': ['timeout-or-duplicate'] } }, async function (calls, logs) {
    const res = await post(contactEnquiry, { json: true });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(calls.resend.length, 0);
    assert.ok(logs.some(function (l) { return l.indexOf('timeout-or-duplicate') !== -1; }));
  });
});

test('turnstile: a token from another site or another form is refused', async function () {
  await scenario({ cf: { success: true, hostname: 'jnrengineering.co.uk', action: 'contact' } }, async function (calls) {
    const res = await post(contactEnquiry, { json: true });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(calls.resend.length, 0);
  });
  await scenario({ cf: { success: true, hostname: 'rhyshume.co.uk', action: 'quote' } }, async function (calls) {
    const res = await post(contactEnquiry, { json: true });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(calls.resend.length, 0);
  });
});

test('turnstile: both rhyshume.co.uk and www are accepted', async function () {
  for (const host of ['rhyshume.co.uk', 'www.rhyshume.co.uk']) {
    await scenario({ cf: { success: true, hostname: host, action: 'contact' } }, async function (calls) {
      const res = await post(contactEnquiry, { json: true });
      assert.strictEqual(res.statusCode, 200, host);
      assert.strictEqual(calls.resend.length, 1);
    });
  }
});

test('turnstile: the token comes only from cf-turnstile-response', async function () {
  await scenario({}, async function (calls) {
    const fields = Object.assign({}, contactEnquiry, { token: 'good-token', 'turnstile': 'good-token' });
    delete fields['cf-turnstile-response'];
    const res = await post(fields, { json: true });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(calls.verify.length, 0);
  });
});

// ---------------------------------------------------------------- normal sends

test('send: a real enquiry is verified once, emailed once to CONTACT_TO, and the secret goes nowhere else', async function () {
  await scenario({}, async function (calls, logs) {
    const res = await post(contactEnquiry, { json: true });
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.json, { ok: true });
    assert.strictEqual(calls.verify.length, 1);
    assert.strictEqual(calls.verify[0].body.get('secret'), SECRET);
    assert.strictEqual(calls.verify[0].body.get('response'), 'good-token');
    assert.strictEqual(calls.resend.length, 1);
    const mail = calls.resend[0];
    assert.deepStrictEqual(mail.to, ['me@example.com']);
    assert.strictEqual(mail.reply_to, 'sam@carterfab.co.uk');
    assert.strictEqual(mail.subject, 'New enquiry from rhyshume.co.uk – Carter Fabrications');
    assert.ok(mail.text.indexOf('SPAM REVIEW') === -1);
    assert.ok(JSON.stringify(mail).indexOf(SECRET) === -1, 'secret must not be in the email');
    assert.ok(logs.join('\n').indexOf(SECRET) === -1, 'secret must not be in the logs');
  });
});

test('send: a form post that works redirects to the sent note', async function () {
  await scenario({}, async function () {
    const res = await post(contactEnquiry);
    assert.strictEqual(res.statusCode, 303);
    assert.strictEqual(res.headers.location, '/contact?sent=1#sent');
  });
});

test('send: field errors are still reported after the check passes, and nothing is emailed', async function () {
  await scenario({}, async function (calls) {
    const res = await post(Object.assign({}, contactEnquiry, { email: 'not-an-email' }), { json: true });
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.json.errors.email);
    assert.strictEqual(calls.resend.length, 0);
  });
});

test('send: a genuine web enquiry that mentions SEO is not held', async function () {
  await scenario({}, async function (calls) {
    const res = await post(Object.assign({}, contactEnquiry, {
      message: 'Hi Rhys, we make steel brackets in Wishaw. Our website is out of date and we want better SEO and a quote form for drawings.'
    }), { json: true });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(calls.resend.length, 1);
    assert.deepStrictEqual(calls.resend[0].to, ['me@example.com']);
    assert.ok(calls.resend[0].subject.indexOf('[SPAM REVIEW') === -1);
  });
});

test('send: a plain short enquiry for a website is not held', async function () {
  await scenario({}, async function (calls) {
    const res = await post(Object.assign({}, contactEnquiry, { message: 'Can you quote for a new website for our garage in Paisley? Thanks.' }), { json: true });
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(calls.resend[0].to, ['me@example.com']);
  });
});

test('send: Resend refusing the email gives 502, never a false thank you', async function () {
  await scenario({ resend: { fail: true } }, async function (calls) {
    const res = await post(contactEnquiry, { json: true });
    assert.strictEqual(res.statusCode, 502);
    assert.strictEqual(res.json.ok, false);
  });
});

// ---------------------------------------------------------------- quarantine

test('quarantine: a sales pitch goes only to the review address, marked [SPAM REVIEW], with no confirmation', async function () {
  await scenario({}, async function (calls) {
    const res = await post(contactPitch, { json: true });
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.json, { ok: true }, 'the sender sees the normal thank you');
    assert.strictEqual(calls.resend.length, 1, 'one email only, so no confirmation to the sender');
    const mail = calls.resend[0];
    assert.deepStrictEqual(mail.to, ['review@example.com']);
    assert.ok(mail.to.indexOf('me@example.com') === -1);
    assert.ok(mail.to.indexOf('alex@rankwell.example') === -1);
    assert.match(mail.subject, /^\[SPAM REVIEW score \d+\] New enquiry from rhyshume\.co\.uk/);
    assert.match(mail.text, /^SPAM REVIEW: scored \d+/);
    assert.match(mail.text, /NOT sent to your normal enquiries inbox/);
    assert.ok(mail.html.indexOf('SPAM REVIEW') !== -1);
  });
});

test('quarantine: a held form post redirects to the normal sent note', async function () {
  await scenario({}, async function () {
    const res = await post(contactPitch);
    assert.strictEqual(res.statusCode, 303);
    assert.strictEqual(res.headers.location, '/contact?sent=1#sent');
  });
});

test('quarantine: with no review address set the pitch comes to CONTACT_TO, still marked, nothing is lost', async function () {
  await scenario({ env: { CONTACT_QUARANTINE_TO: null } }, async function (calls) {
    const res = await post(contactPitch, { json: true });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(calls.resend.length, 1);
    assert.deepStrictEqual(calls.resend[0].to, ['me@example.com']);
    assert.match(calls.resend[0].subject, /^\[SPAM REVIEW/);
    assert.match(calls.resend[0].text, /CONTACT_QUARANTINE_TO is not set/);
  });
});

test('quarantine: several review addresses can be comma separated', async function () {
  await scenario({ env: { CONTACT_QUARANTINE_TO: 'a@example.com, b@example.com' } }, async function (calls) {
    await post(contactPitch, { json: true });
    assert.deepStrictEqual(calls.resend[0].to, ['a@example.com', 'b@example.com']);
  });
});

test('quarantine: a held pitch whose review email fails gives 502, not a false thank you', async function () {
  await scenario({ resend: { fail: true } }, async function () {
    const res = await post(contactPitch, { json: true });
    assert.strictEqual(res.statusCode, 502);
  });
});

test('quarantine: the pitch still has to pass Turnstile first', async function () {
  await scenario({ cf: { success: false, 'error-codes': ['invalid-input-response'] } }, async function (calls) {
    const res = await post(contactPitch, { json: true });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(calls.resend.length, 0);
  });
});

// ---------------------------------------------------------------- grants form

test('grants: a real grants enquiry is sent normally with the grants subject', async function () {
  await scenario({}, async function (calls) {
    const res = await post(grantsEnquiry, { json: true });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(calls.resend.length, 1);
    assert.deepStrictEqual(calls.resend[0].to, ['me@example.com']);
    assert.strictEqual(calls.resend[0].subject, 'New grants enquiry from rhyshume.co.uk – Miller Joinery');
  });
});

test('grants: a grant funding pitch is held for review', async function () {
  await scenario({}, async function (calls) {
    const res = await post(grantsPitch, { json: true });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(calls.resend.length, 1);
    assert.deepStrictEqual(calls.resend[0].to, ['review@example.com']);
    assert.match(calls.resend[0].subject, /^\[SPAM REVIEW score \d+\] New grants enquiry/);
  });
});

test('grants: the grants form needs the same check, and a missing token goes back to the grants page', async function () {
  await scenario({}, async function (calls) {
    const res = await post(Object.assign({}, grantsEnquiry, { 'cf-turnstile-response': '' }));
    assert.strictEqual(res.statusCode, 303);
    assert.strictEqual(res.headers.location, '/council-digital-grants?error=1#check-failed');
    assert.strictEqual(calls.resend.length, 0);
  });
});

// ---------------------------------------------------------------- the site word list

test('words: one selling phrase alone is under the threshold', function () {
  const v = words.classifyEnquiry(antispam, { name: 'A B', company: 'Acme', message: 'Special offer on your next order.', service: 'Website' });
  assert.strictEqual(v.quarantine, false);
});

test('words: two selling phrases are held', function () {
  const v = words.classifyEnquiry(antispam, { name: 'A B', company: 'Acme', message: 'We are an automation agency. White label partnership opportunity for you.', service: 'Admin automation' });
  assert.strictEqual(v.quarantine, true);
  assert.ok(v.reasons.join(' ').indexOf('selling to me') !== -1);
});

test('words: customer words offset one stray marketing phrase', function () {
  const v = words.classifyEnquiry(antispam, { name: 'A B', company: 'Acme Fab', message: 'We want SEO help for our Tolra quote form.', service: 'Website' });
  assert.strictEqual(v.quarantine, false);
  assert.ok(v.reasons.join(' ').indexOf('customer words') !== -1);
});

test('words: customer words cannot hide a clear pitch', function () {
  const v = words.classifyEnquiry(antispam, {
    name: 'A B', company: 'Growth Co',
    message: 'We noticed your website has issues. Our SEO agency offers a free audit and a guaranteed grant for your quote form, validation and CRM.',
    service: 'Website'
  });
  assert.strictEqual(v.quarantine, true);
});

test('words: the verdict lists the reasons so the lists can be tuned', function () {
  const v = words.classifyEnquiry(antispam, { name: 'A B', company: 'Acme', message: 'Buy backlinks and traffic. Click here.', service: 'Website' });
  assert.ok(Array.isArray(v.reasons) && v.reasons.length > 0);
  assert.strictEqual(typeof v.score, 'number');
});

// ---------------------------------------------------------------- local business form (/local-business)

const localEnquiry = {
  form: 'local',
  name: 'Kirsty Boyd',
  company: 'Boyd Bakery',
  email: 'kirsty@boydbakery.co.uk',
  phone: '',
  service: 'Domain and email set up',
  message: 'We are a bakery in Motherwell and need a domain and business email set up.',
  'cf-turnstile-response': 'good-token'
};

test('local: a real enquiry is sent with the local business subject and goes back to /local-business', async function () {
  await scenario({}, async function (calls) {
    const res = await post(localEnquiry);
    assert.strictEqual(res.statusCode, 303);
    assert.strictEqual(res.headers.location, '/local-business?sent=1#sent');
    assert.strictEqual(calls.resend.length, 1);
    assert.strictEqual(calls.resend[0].subject, 'New local business enquiry from rhyshume.co.uk – Boyd Bakery');
    assert.deepStrictEqual(calls.resend[0].to, ['me@example.com']);
  });
});

test('local: it needs the same security check, and a missing token goes back to /local-business', async function () {
  await scenario({}, async function (calls) {
    const res = await post(Object.assign({}, localEnquiry, { 'cf-turnstile-response': '' }));
    assert.strictEqual(res.statusCode, 303);
    assert.strictEqual(res.headers.location, '/local-business?error=1#check-failed');
    assert.strictEqual(calls.resend.length, 0);
  });
});

test('local: the honeypot still gets a normal-looking success and nothing is sent', async function () {
  await scenario({}, async function (calls) {
    const res = await post(Object.assign({}, localEnquiry, { company_website: 'https://spam.example' }));
    assert.strictEqual(res.headers.location, '/local-business?sent=1#sent');
    assert.strictEqual(calls.resend.length, 0);
    assert.strictEqual(calls.verify.length, 0);
  });
});

test('local: a missing required field goes back to /local-business with the not sent note', async function () {
  await scenario({}, async function (calls) {
    const res = await post(Object.assign({}, localEnquiry, { service: '' }));
    assert.strictEqual(res.headers.location, '/local-business?error=1#not-sent');
    assert.strictEqual(calls.resend.length, 0);
  });
});
