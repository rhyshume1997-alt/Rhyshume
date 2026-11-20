/* DEV ONLY (not shipped). Shared Playwright helpers for the full stack runs (run-ui.js, run-workbook.js, run-site.js). */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const SHOTS = process.env.SHOTS || '/tmp/br-fullstack-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const check = (name, cond, extra) => { results.push({ name, ok: !!cond }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ' + (extra || ''))); };
const STUB = "window.turnstile={_n:0,_cb:{},render:function(el,o){var id='w'+(++this._n);this._cb[id]=o;setTimeout(function(){o.callback('TEST-TOKEN-'+o.action)},60);return id},reset:function(id){var o=this._cb[id];if(o)setTimeout(function(){o.callback('TEST-TOKEN-'+o.action)},60)}};";
let ipn = 0;
const S = { BASE: '', browser: null };
const ctl = (q) => fetch(S.BASE + '/__harness/' + q).then((r) => r.json());

async function newPage(opts) {
  const ctx = await S.browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { 'X-Forwarded-For': '198.51.100.' + (++ipn % 250 + 1) } }, opts || {}));
  await ctx.route('https://challenges.cloudflare.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  const external = [];
  await ctx.route((u) => !/^(localhost|127\.0\.0\.1)$/.test(u.hostname) && u.hostname !== 'challenges.cloudflare.com', (r) => { external.push(r.request().url()); r.abort(); });
  const page = await ctx.newPage();
  page.external = external; page.errors = []; page.api = [];
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e));
  page.on('response', async (r) => { const u = r.url(); if (/\/api\/business-review/.test(u)) page.api.push({ method: r.request().method(), url: u.replace(S.BASE, ''), status: r.status(), body: r.request().postData() }); });
  return page;
}
async function fill(p, o) {
  o = o || {};
  await p.fill('#br-name', o.name || 'Harbour Precision Ltd');
  if (o.noWebsite) await p.check('#br-no-website'); else await p.fill('#br-website', o.website || 'http://good-harbour.test/');
  await p.fill('#br-location', o.location || 'Glasgow');
  await p.fill('#br-category', o.category || 'CNC machining');
  if (o.comp) { await p.fill('#br-comp-name-in', o.comp.name || 'Rival One'); await p.fill('#br-comp-site-in', o.comp.site || 'http://rival-one.test/'); }
  if (o.task) await p.click('.br-chip[data-task=chasing_quotations]');
}
async function toConfirm(p, o) { await p.goto(S.BASE + '/business-review'); await fill(p, o); await p.click('#br-start-btn'); await p.waitForSelector('#br-step-confirm:not([hidden]), #br-intake-error:not([hidden])', { timeout: 20000 }); }
async function toResults(p, o) { await toConfirm(p, o); await p.click('#br-confirm-btn'); await p.waitForSelector('#br-step-results:not([hidden]), #br-run-problem:not([hidden])', { timeout: 60000 }); }
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const stateOf = (p) => p.evaluate(() => { const g = (id) => document.getElementById(id); return { results: g('br-step-results') && !g('br-step-results').hidden, problem: g('br-run-problem') && !g('br-run-problem').hidden }; });

module.exports = { S, newPage, fill, toConfirm, toResults, check, results, overflow, stateOf, ctl, SHOTS };
