'use strict';
/*
Business review: rate limits and daily caps backed by the database counters (br_rate_hit), which work across all instances.
Inputs : a store, a salt, visitor ip, bucket names. Outputs: { allowed, retry_after_s }.
Rules  : raw IP addresses are never stored (sha256 with the salt); a failing counter FAILS CLOSED (request refused) so an outage
         cannot be used to bypass limits.
Must not change: fail closed behaviour, hashed bucket keys.
*/
const { visitorHash, sha256Hex } = require('./token');

async function hit(store, bucket, max, windowS) {
  try {
    const r = await store.rpc('br_rate_hit', { p_bucket: bucket, p_max: max, p_window_seconds: windowS });
    if (!r || typeof r.allowed !== 'boolean') return { allowed: false, retry_after_s: 60, failed: true };
    return { allowed: r.allowed, retry_after_s: r.retry_after_s || 0, hits: r.hits };
  } catch (e) {
    return { allowed: false, retry_after_s: 60, failed: true };
  }
}

// Start limits (DECISIONS section 7): 4 per hour and 10 per day per visitor, 3 per day per target host.
async function checkStart(store, cfg, ip, host) {
  const v = visitorHash(cfg.salt, ip).slice(0, 32);
  const h1 = await hit(store, 'start:ip:' + v + ':h', 4, 3600);
  if (!h1.allowed) return { ok: false, kind: 'rate', retry_after_s: h1.retry_after_s || 60 };
  const d1 = await hit(store, 'start:ip:' + v + ':d', 10, 86400);
  if (!d1.allowed) return { ok: false, kind: 'rate', retry_after_s: d1.retry_after_s || 3600 };
  if (host) {
    const hh = await hit(store, 'start:host:' + sha256Hex(cfg.salt + '|' + host).slice(0, 32), 3, 86400);
    if (!hh.allowed) return { ok: false, kind: 'rate', retry_after_s: hh.retry_after_s || 3600 };
  }
  const day = new Date().toISOString().slice(0, 10);
  const g = await hit(store, 'start:global:' + day, cfg.dailyReviews, 86400);
  if (!g.allowed) return { ok: false, kind: 'daily', retry_after_s: g.retry_after_s || 3600 };
  return { ok: true };
}

module.exports = { hit, checkStart };
