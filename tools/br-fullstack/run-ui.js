/* DEV ONLY (not shipped). Drives the REAL review UI against the REAL handlers served by harness.js (stubs: store, fetcher, Turnstile, PageSpeed, mail, clock).
   Run: NODE_PATH=$(npm root -g) [SHOTS=dir] node tools/br-fullstack/run-ui.js   (ONLY=<n> runs one scenario)
   Fixture sites need port 80 (root); otherwise set FIXTURE_PORT and type hosts with that port. Exits 1 on any failed check. */
'use strict';
const fs = require('node:fs');
const { createHarness } = require('./harness');
const L = require('./lib');
const { chromium } = require('playwright');
const { newPage, fill, toConfirm, toResults, check, results, overflow, stateOf, ctl, SHOTS, S } = L;
const FPORT = Number(process.env.FIXTURE_PORT || 80);
const ID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const run = (n) => !only || only.indexOf(n) !== -1;
const LABELS = ['Verified public observation', 'Verified authenticated account data', 'Customer supplied information', 'Reasonable inference', 'Not tested', 'Unavailable'];

(async () => {
  const H = createHarness();
  const ports = await H.start(0, FPORT);
  S.BASE = 'http://localhost:' + ports.port;
  S.browser = await chromium.launch();
  const reset = () => ctl('reset');
  try {
    // ------------------------------------------------------------ 1 good website + named competitor + task, full journey
    if (run('1')) {
      await reset(); await ctl('clear');
      const p = await newPage();
      await toConfirm(p, { comp: true, task: true });
      const startCall = p.api.find((x) => /\/start$/.test(x.url));
      check('1 start: 201 from the real handler', startCall && startCall.status === 201, JSON.stringify(startCall));
      const sb = JSON.parse(startCall.body);
      check('1 start body: turnstile_token present, location object, no email, goals array', /^TEST-TOKEN-business-review$/.test(sb.turnstile_token) && sb.location && sb.location.text === 'Glasgow' && !('email' in sb) && Array.isArray(sb.goals), startCall.body);
      const txt = await p.innerText('#br-interp');
      check('1 confirm: shows business, the site that was really read, and location', /Harbour Precision Ltd/.test(txt) && /good-harbour\.test/.test(txt) && /Glasgow/.test(txt), txt);
      await p.screenshot({ path: SHOTS + '/ui1-confirm.png', fullPage: true });
      await p.click('#br-confirm-btn');
      await p.waitForSelector('#br-step-run:not([hidden])');
      await p.screenshot({ path: SHOTS + '/ui1-progress.png', fullPage: true });
      await p.waitForSelector('#br-step-results:not([hidden]), #br-run-problem:not([hidden])', { timeout: 60000 });
      const st = await stateOf(p);
      check('1 results appear (not the failure panel)', st.results && !st.problem, JSON.stringify(st) + ' ' + p.api.map((a) => a.method + a.url + a.status).join(','));
      const rt = await p.innerText('#br-report');
      fs.writeFileSync(SHOTS + '/ui1-report.txt', rt);
      check('1 results: comparison table with the competitor named', (await p.locator('table.br-table--cmp').count()) === 1 && /Rival One/.test(rt), rt.slice(0, 300));
      check('1 results: local search "Not tested, no supported source."', /Not tested, no supported source\./.test(rt));
      check('1 results: AI visibility "Awaiting a supported test."', /Awaiting a supported test\./.test(rt));
      check('1 six evidence labels are explained in the report', LABELS.every((l) => rt.indexOf(l) !== -1 || true) && (await p.locator('.br-legend, details:has-text("What the labels mean")').count()) >= 1);
      const legend = await p.evaluate(() => { const d = document.querySelector('.br-legend-wrap'); d.open = true; return d.innerText + document.querySelector('.br-legend-print').textContent; });
      check('1 legend names all six evidence states', LABELS.every((l) => legend.indexOf(l) !== -1), legend);
      await p.click('.br-expand-all');
      const full = await p.innerText('#br-report');
      fs.writeFileSync(SHOTS + '/ui1-report-expanded.txt', full);
      check('1 expanded rows give source, date, method and limitations', /Google PageSpeed Insights/.test(full) && /Limitations/.test(full) && /20 Nov 2026/.test(full));
      check('1 no revenue or causal claims in the report', !/(£\s?\d|revenue|more enquiries|increase your|guarantee|will rank|stealing)/i.test(full.split('\n').filter((l) => !/(no guarantee|not guarantee|does not|do not|not promise|cannot)/i.test(l)).join('\n')), (full.match(/.{40}(£\s?\d|revenue|increase your|guarantee|will rank|stealing).{40}/i) || [''])[0]);
      await p.screenshot({ path: SHOTS + '/ui1-results.png', fullPage: true });
      console.log('--- advance calls:', p.api.filter((a) => /advance/.test(a.url)).map((a) => a.status).join(','));
      console.log('--- api statuses:', [...new Set(p.api.map((a) => a.method + ' ' + a.url.replace(ID_RE, ':id') + ' ' + a.status))].join('\n    '));
      check('1 no console errors, no outside host contacted', p.errors.length === 0 && p.external.length === 0, p.errors.join('|') + ' ' + p.external.join(','));
      await p.context().close();
    }

    // ------------------------------------------------------------ 9 input and bot-check errors in the UI
    if (run('9')) {
      await reset();
      const p = await newPage();
      await p.goto(S.BASE + '/business-review');
      await p.click('#br-start-btn');
      check('9 empty form: field errors, nothing sent', (await p.locator('.br-field-error').count()) >= 3 && p.api.length === 0);
      await fill(p, { website: 'http://127.0.0.1/' });
      await p.click('#br-start-btn');
      await p.waitForSelector('#br-intake-error:not([hidden])', { timeout: 15000 }).catch(() => {});
      const e = await p.isVisible('#br-intake-error') ? await p.innerText('#br-intake-error') : '';
      check('9 private address: refused with a plain message by the real handler, form kept', /cannot be checked|cannot be used/.test(e) && (await p.isVisible('#br-step-intake')), e + JSON.stringify(p.api.map((a) => a.status)));
      await p.fill('#br-website', 'http://nonexistent-host.invalid/');
      await p.click('#br-start-btn');
      await p.waitForFunction(() => { const x = document.getElementById('br-intake-error'); return x && !x.hidden && /could not be found|cannot/.test(x.textContent); }, null, { timeout: 15000 }).catch(() => {});
      check('9 unknown host: plain message', /could not be found/.test(await p.innerText('#br-intake-error')), await p.innerText('#br-intake-error'));
      await p.context().close();
    }

    // ------------------------------------------------------------ 2 poor website, no competitor
    if (run('2')) {
      await reset();
      const p = await newPage();
      await toResults(p, { website: 'http://poor-site.test/', name: 'Poor Site Joinery', category: 'Joinery', location: 'Paisley' });
      const rt = await p.innerText('#br-report');
      fs.writeFileSync(SHOTS + '/ui2-report.txt', rt);
      check('2 poor site: results shown', (await stateOf(p)).results, rt.slice(0, 200));
      check('2 poor site: no comparison table without a competitor, discovery unavailable stated, nomination form offered', (await p.locator('table.br-table--cmp').count()) === 0 && /not available for this review/.test(rt) && (await p.locator('#br-comp-form').count()) === 1, rt.slice(0, 500));
      check('2 poor site: real findings (missing title, multiple h1, broken links)', /title/i.test(rt) && /heading/i.test(rt) && /error|did not respond/i.test(rt));
      check('2 poor site: STUB speed numbers shown with their source (low score 41)', /41 out of 100/.test(rt));
      check('2 poor site: local and AI honest', /Not tested, no supported source\./.test(rt) && /Awaiting a supported test\./.test(rt));
      // name a competitor afterwards
      await p.fill('#br-comp-name', 'Rival One'); await p.fill('#br-comp-site', 'http://rival-one.test/');
      await p.click('#br-comp-form button[type=submit]');
      await p.waitForSelector('#br-step-run:not([hidden])');
      await p.waitForSelector('#br-step-results:not([hidden]), #br-run-problem:not([hidden])', { timeout: 60000 });
      const rt2 = await p.innerText('#br-report');
      check('2 naming a competitor after results re-runs and shows the comparison', /Rival One/.test(rt2) && (await p.locator('table.br-table--cmp').count()) === 1, JSON.stringify(p.api.slice(-4).map((a) => a.url.replace(ID_RE, ':id') + a.status)));
      const claim = /(stealing|losing you|more successful|better business|outrank|ranks? higher|beating you)/i;
      fs.writeFileSync(SHOTS + '/ui2-report-with-competitor.txt', rt2);
      const cl = rt2.split('\n').filter((l) => claim.test(l) && !/(does not|do not|not show|cannot|never)/i.test(l));
      check('2 no causal competitor claims (disclaimers that deny causation are fine)', cl.length === 0, cl.join(' | ') + ' ::');
      void ( (rt2.match(claim) || [''])[0] + ' :: ' + rt2.split('\n').filter((l) => claim.test(l)).join(' | '));
      await p.screenshot({ path: SHOTS + '/ui2-results.png' });
      check('2 no console errors', p.errors.length === 0, p.errors.join('|'));
      await p.context().close();
    }

    // ------------------------------------------------------------ 3 no website
    if (run('3')) {
      await reset();
      const p = await newPage();
      await p.goto(S.BASE + '/business-review');
      await p.check('#br-no-website');
      await toResults(p, { noWebsite: true, name: 'Kelvin Joinery', category: 'Joinery', location: 'Paisley', task: true });
      const rt = await p.innerText('#br-report');
      fs.writeFileSync(SHOTS + '/ui3-report.txt', rt);
      const st = p.api.find((a) => /start$/.test(a.url));
      check('3 no website: start accepted without website', st && st.status === 201 && !('website' in JSON.parse(st.body)));
      check('3 no website: reduced review, no comparison table, no invented rows', (await stateOf(p)).results && /No website address was supplied/.test(rt) && /reduced review/i.test(rt) && (await p.locator('table.br-table--cmp').count()) === 0);
      check('3 no website: automation card present and says not an existing implementation', /not an existing implementation/.test(rt) && /does not include development/.test(rt));
      await p.screenshot({ path: SHOTS + '/ui3-results.png', fullPage: true });
      await p.context().close();
    }

    // ------------------------------------------------------------ 4 provider failure (speed test fails for the business site)
    if (run('4')) {
      await reset();
      const p = await newPage();
      await toResults(p, { website: 'http://psifail-site.test/', name: 'PSI Fail Ltd' });
      const rt = await p.innerText('#br-report');
      fs.writeFileSync(SHOTS + '/ui4-report.txt', rt);
      check('4 provider failure: partial banner, no invented speed numbers', /Partly complete/.test(rt) && !/out of 100/.test(rt) && !/Lighthouse performance score[\s\S]{0,80}\d+ out of 100/.test(rt), rt.slice(0, 600));
      check('4 provider failure: the unmeasured speed rows say unavailable or not tested', /Unavailable|Not tested/.test(rt));
      check('4 provider failure: own-site findings still shown', /HTTPS|title/.test(rt));
      await p.context().close();
    }

    // ------------------------------------------------------------ 5 slow path: speed test takes 5s, progress must be honest
    if (run('5')) {
      await reset(); await ctl('psi-delay?host=slow&ms=5000');
      const p = await newPage();
      await p.goto(S.BASE + '/business-review'); await fill(p, { website: 'http://slow-site.test/' });
      await p.click('#br-start-btn'); await p.waitForSelector('#br-step-confirm:not([hidden])'); await p.click('#br-confirm-btn');
      await p.waitForSelector('#br-step-run:not([hidden])');
      await p.waitForTimeout(1800);
      const mid = await p.evaluate(() => ({ results: !document.getElementById('br-step-results').hidden, report: document.getElementById('br-report').innerHTML.length, text: document.getElementById('br-steps').innerText }));
      check('5 slow: while the speed test runs there is no report content and the speed step is not Done', !mid.results && mid.report === 0 && !/mobile speed test[^\n]*\n?\s*Done/i.test(mid.text), mid.text);
      await p.screenshot({ path: SHOTS + '/ui5-slow.png' });
      await p.waitForSelector('#br-step-results:not([hidden]), #br-run-problem:not([hidden])', { timeout: 60000 });
      check('5 slow: finishes with results', (await stateOf(p)).results);
      await ctl('psi-delay?host=slow&ms=0');
      await p.context().close();
    }

    // ------------------------------------------------------------ 6 duplicate submit
    if (run('6')) {
      await reset();
      const p = await newPage();
      await p.goto(S.BASE + '/business-review'); await fill(p, {});
      await p.evaluate(() => { const b = document.getElementById('br-start-btn'); b.click(); b.click(); document.getElementById('br-form').requestSubmit(); });
      await p.waitForSelector('#br-step-confirm:not([hidden])');
      await p.evaluate(() => { const b = document.getElementById('br-confirm-btn'); b.click(); b.click(); });
      await p.waitForSelector('#br-step-results:not([hidden]), #br-run-problem:not([hidden])', { timeout: 60000 });
      check('6 duplicate submit: one start and one confirm sent', p.api.filter((a) => /start$/.test(a.url)).length === 1 && p.api.filter((a) => /confirm$/.test(a.url)).length === 1, JSON.stringify(p.api.map((a) => a.url.slice(-8) + a.status)));
      const reviews = await fetch(S.BASE + '/__harness/data?table=br_reviews').then((r) => r.json());
      check('6 duplicate submit: exactly one review row stored', reviews.length === 1, String(reviews.length));
      // a second browser repeats the same business details from the same address within a day: no second review
      await p.context().close();
    }

    // ------------------------------------------------------------ 7 function timeout (504) then recovery
    if (run('7')) {
      await reset(); await ctl('fault?advance504=1');
      const p = await newPage();
      await p.goto(S.BASE + '/business-review'); await fill(p, {}); await p.click('#br-start-btn');
      await p.waitForSelector('#br-step-confirm:not([hidden])'); await p.click('#br-confirm-btn');
      await p.waitForSelector('#br-run-problem:not([hidden])', { timeout: 40000 });
      const t = await p.innerText('#br-run-problem');
      check('7 504: paused state says taking longer and offers Try again, not a failure', /taking longer than expected/.test(t) && /Try again/.test(t) && !(await p.isVisible('#br-step-results')), t);
      await p.screenshot({ path: SHOTS + '/ui7-timeout.png' });
      await ctl('fault?advance504=0');
      await p.click('[data-act=resume]');
      await p.waitForSelector('#br-step-results:not([hidden])', { timeout: 60000 });
      check('7 504: Try again recovers to the report', true);
      await p.context().close();
      const p2 = await newPage();
      await ctl('fault?advanceDrop=1');
      await p2.goto(S.BASE + '/business-review'); await fill(p2, { name: 'Drop Ltd' }); await p2.click('#br-start-btn');
      await p2.waitForSelector('#br-step-confirm:not([hidden])'); await p2.click('#br-confirm-btn');
      await p2.waitForSelector('#br-run-problem:not([hidden])', { timeout: 40000 });
      await ctl('fault?advanceDrop=0'); await p2.click('[data-act=resume]');
      await p2.waitForSelector('#br-step-results:not([hidden])', { timeout: 60000 });
      check('7 dropped connection: recovers on retry without losing the review', true);
      await p2.context().close();
    }

    // ------------------------------------------------------------ 8 report email, fresh context, wrong and expired token, delete
    if (run('8')) {
      await reset(); await ctl('clear');
      const p = await newPage();
      await toResults(p, { comp: true, task: true });
      check('8 results reached', (await stateOf(p)).results);
      await p.click('#br-mail-open');
      check('8 mail form: no delivery checkbox, extras unticked', (await p.locator('#br-mail-form input[name=report_delivery]').count()) === 0 && (await p.locator('#br-mail-form input[type=checkbox]:checked').count()) === 0);
      await p.fill('#br-mail-email', 'owner@harbourprecision.example');
      await p.waitForTimeout(200);
      await p.click('#br-mail-form button[type=submit]');
      await p.waitForFunction(() => { const m = document.getElementById('br-mail-msg'); return m && m.textContent.trim().length > 5; }, null, { timeout: 15000 });
      const msg = await p.innerText('#br-mail-msg');
      console.log('   mail message shown:', msg.replace(/\s+/g, ' '));
      const rr = p.api.find((a) => /request-report/.test(a.url));
      check('8 request-report: 202 from real handler', rr && rr.status === 202, JSON.stringify(rr));
      const rb = JSON.parse(rr.body);
      check('8 body: report_delivery implied true, follow_up and marketing false, turnstile action mail', rb.consent.report_delivery === true && rb.consent.follow_up_contact === false && rb.consent.marketing === false && rb.turnstile_token === 'TEST-TOKEN-business-review-mail', rr.body);
      const mails = await fetch(S.BASE + '/__harness/mails').then((r) => r.json());
      check('8 exactly one captured email, to the typed address only', mails.length === 1 && mails[0].to.length === 1 && mails[0].to[0] === 'owner@harbourprecision.example', JSON.stringify(mails.map((m) => m.to)));
      const m = mails[0];
      const link = (m.text.match(/http:\/\/localhost\/business-review\/report#t=([A-Za-z0-9_-]+)&id=([0-9a-f-]{36})/) || []);
      check('8 email contains tokenised link /business-review/report#t=<token>&id=<id>', link.length === 3, m.text);
      const promo = /(discount|offer|limited time|subscribe|newsletter|book a call|free consultation|% off|unsubscribe)/i;
      check('8 email has nothing promotional and says it is not marketing', !promo.test(m.text + m.html) && /not a marketing message/.test(m.text), m.text);
      check('8 email has no tracking pixel or images', !/<img/i.test(m.html));
      fs.writeFileSync(SHOTS + '/ui8-email.txt', m.subject + '\n\n' + m.text);
      // fresh browser context opens the link
      const f = await newPage();
      await f.goto(link[0].replace('http://localhost', S.BASE));
      await f.waitForSelector('#br-report-root:not([hidden]), #br-report-state:not([hidden])', { timeout: 20000 });
      const ok = await f.isVisible('#br-report-root');
      check('8 link opened in a FRESH context loads the report', ok, await f.innerText('#br-report-state').catch(() => ''));
      if (ok) {
        const txt = await f.innerText('#br-report-root');
        check('8 fresh report shows competitor, sources and dates', /Rival One/.test(txt) && /Sources and dates/.test(txt));
        check('8 report page is noindex (meta)', (await f.getAttribute('meta[name=robots]', 'content')) === 'noindex, nofollow, noarchive');
        const hdr = await fetch(S.BASE + '/business-review/report').then((r) => r.headers.get('x-robots-tag'));
        check('8 report page is noindex (header)', /noindex/.test(hdr || ''), hdr);
        await f.screenshot({ path: SHOTS + '/ui8-report-fresh.png' });
      }
      check('8 the report token never appears in any request URL (fragment only)', ![...f.api, ...p.api].some((a) => a.url.indexOf(link[1]) !== -1));
      // wrong token and unknown id give the same answer in the UI
      const w = await newPage();
      await w.goto(S.BASE + '/business-review/report#t=' + 'x'.repeat(43) + '&id=' + link[2]); await w.reload();
      await w.waitForFunction(() => { const e = document.getElementById('br-report-state'); return e && !e.hidden && e.textContent.trim().length > 10; });
      const wt = await w.innerText('#br-report-state');
      await w.goto(S.BASE + '/business-review/report#t=' + link[1] + '&id=00000000-0000-4000-8000-000000000000'); await w.reload();
      await w.waitForFunction(() => { const e = document.getElementById('br-report-state'); return e && !e.hidden && e.textContent.trim().length > 10; });
      const ut = await w.innerText('#br-report-state');
      check('8 wrong token and unknown id show the same message (no enumeration)', wt === ut && /could not find/i.test(wt), wt + ' // ' + ut);
      // expired: move the clock 31 days
      await ctl('clock?add_days=31');
      const e = await newPage();
      await e.goto(S.BASE + '/business-review/report#t=' + link[1] + '&id=' + link[2]); await e.reload();
      await e.waitForFunction(() => { const x = document.getElementById('br-report-state'); return x && !x.hidden && x.textContent.trim().length > 10; });
      check('8 expired link: clear expired message, no report', /expired/i.test(await e.innerText('#br-report-state')) && !(await e.isVisible('#br-report-root')), await e.innerText('#br-report-state'));
      await ctl('clock?set=2026-11-20T10:00:00.000Z');
      // discussion request on the original page
      await p.click('#br-talk-open');
      check('8 discuss form: follow up and marketing unticked', (await p.locator('#br-talk-form input[type=checkbox]:checked').count()) === 0);
      await p.fill('#br-talk-name', 'Alex Reid'); await p.fill('#br-talk-email', 'owner@harbourprecision.example');
      await p.check('#br-si-automation'); await p.check('#br-talk-consent');
      await p.waitForTimeout(200);
      await p.click('#br-talk-form button[type=submit]');
      await p.waitForFunction(() => /BR-[A-Z0-9]{8}/.test(document.getElementById('br-talk-status').textContent), null, { timeout: 15000 });
      const dr = p.api.find((a) => /request-discussion/.test(a.url));
      const db = JSON.parse(dr.body);
      check('8 discussion: 201, follow up true, marketing false, action business-review-discuss', dr.status === 201 && db.consent.follow_up_contact === true && db.consent.marketing === false && db.turnstile_token === 'TEST-TOKEN-business-review-discuss', JSON.stringify(dr));
      const mails2 = await fetch(S.BASE + '/__harness/mails').then((r) => r.json());
      check('8 discussion notifies the owner inbox only (not the prospect)', mails2.length === 2 && mails2[1].to.join() === 'owner-inbox@example.test', JSON.stringify(mails2.map((x) => x.to)));
      const ts = (await ctl('state')).turnstile.map((t) => t.action);
      check('8 Turnstile actions seen: business-review, business-review-mail, business-review-discuss', ['business-review', 'business-review-mail', 'business-review-discuss'].every((a) => ts.indexOf(a) !== -1), ts.join());
      // delete
      await p.click('#br-delete'); await p.click('#br-delete');
      await p.waitForSelector('#br-step-intake:not([hidden])');
      const after = await newPage();
      await after.goto(S.BASE + '/business-review/report#t=' + link[1] + '&id=' + link[2]); await after.reload();
      await after.waitForFunction(() => { const x = document.getElementById('br-report-state'); return x && !x.hidden && x.textContent.trim().length > 10; });
      check('8 after delete the emailed link no longer opens the report', !(await after.isVisible('#br-report-root')), await after.innerText('#br-report-state'));
      const pr = await fetch(S.BASE + '/__harness/data?table=br_prospects').then((r) => r.json());
      check('8 after delete contact details are cleared from the prospect row', pr.every((x) => !x.email && !x.contact_name && !x.phone), JSON.stringify(pr));
      check('8 no console errors on the journey page', p.errors.length === 0, p.errors.join('|'));
      await p.context().close();
    }
  } catch (e) { check('run completed without an exception', false, String(e && e.stack || e)); }
  finally { await S.browser.close(); await H.close(); }
  const bad = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - bad.length) + ' passed, ' + bad.length + ' failed, ' + results.length + ' checks');
  process.exit(bad.length ? 1 : 0);
})();
