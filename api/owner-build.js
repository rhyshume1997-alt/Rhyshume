'use strict';

/*
  POST /api/owner-build   (JSON: { key, website, competitor? })
  Rhys only. Builds one concept for one prospect website with the same engine as the public /upgrade button,
  but with no Turnstile and no Sheet limits, saves it under a private random link, and returns that link.

  Environment variables (Vercel, Project Settings, Environment Variables):
    OWNER_BUILD_KEY        required  a long random string only Rhys knows. Without it nothing is built.
    ANTHROPIC_API_KEY      required  same capped key the public button uses
    BLOB_READ_WRITE_TOKEN  required  added by Vercel when a Blob store is connected to the project
    OWNER_BOOK_URL         optional  an https booking link for the "Book 20 minutes" button
*/

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const live = require('./upgrade-live');
const upgrade = require('./upgrade');
const blob = require('./_lib/blob');
const preview = require('../tools/preview');
const rich = require('../tools/concept-rich');

const REPLY_EMAIL = 'rhys@rhyshume.co.uk';
const BUDGET_MS = 100 * 1000;
const BASE = 'https://www.rhyshume.co.uk';
let fails = 0;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function keyOk(given) {
  const want = process.env.OWNER_BUILD_KEY || '';
  if (want.length < 16) return false;
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { ok: false }); }
  if (fails >= 20) return json(res, 429, { ok: false, error: 'locked' }); // a warm instance stops guessing after 20 wrong keys
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body && typeof body === 'object' ? body : {};
  if (!keyOk(body.key)) { fails++; return json(res, 401, { ok: false, error: 'key' }); }

  const missing = ['ANTHROPIC_API_KEY', 'BLOB_READ_WRITE_TOKEN'].filter(function (n) { return !process.env[n]; });
  if (missing.length) { console.error('owner-build: missing env var(s): ' + missing.join(', ')); return json(res, 500, { ok: false, error: 'setup' }); }

  const site = upgrade.cleanWebsite(body.website);
  if (!site) return json(res, 400, { ok: false, error: 'bad_website' });

  const comp = body.competitor ? upgrade.cleanWebsite(body.competitor) : null;
  if (body.competitor && !comp) return json(res, 400, { ok: false, error: 'bad_competitor' });
  const competitorUrl = comp ? comp.url : undefined;
  const deadline = Date.now() + BUDGET_MS;
  const slug = 'own-' + crypto.randomBytes(5).toString('hex');
  const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'owner-'));
  try {
    const result = await preview.run({
      url: site.url, competitor: competitorUrl, slug: slug, apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || undefined,
      fetchImpl: live.makeFetch(deadline), outRoot: outRoot, measure: false
    });
    const cta = { mail: 'mailto:' + REPLY_EMAIL + '?subject=' + encodeURIComponent('Re: the concept for ' + site.domain), book: process.env.OWNER_BOOK_URL || '' };
    const html = rich.renderRich(result.content, result.brand, result.points, { cta: cta, evidence: result.evidence });
    const id = crypto.randomBytes(12).toString('hex');
    await blob.put(id, html);
    console.log('owner-build: saved a concept for ' + site.domain);
    return json(res, 200, {
      ok: true, host: site.host, link: BASE + '/c/' + id, problems: result.evidence ? result.evidence.problems.length : 0, compared: !!(result.evidence && result.evidence.compare),
      warnings: (result.warnings || []).filter(function (w) { return !/screenshot|competitor/i.test(w); })
    });
  } catch (e) {
    const reason = String(e && e.message ? e.message : e).slice(0, 200);
    console.error('owner-build: failed for ' + site.domain + ': ' + reason);
    return json(res, /Could not fetch|not an HTML|does not exist|not a public|Too many redirects|ran out of time/i.test(reason) ? 422 : 500, { ok: false, error: 'build', note: reason });
  } finally {
    try { fs.rmSync(outRoot, { recursive: true, force: true }); } catch (e) { /* cleared when the instance recycles */ }
  }
};
