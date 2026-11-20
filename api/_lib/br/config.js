'use strict';
/*
Business review: configuration.
Inputs : an env object (defaults to process.env). Nothing is read at import time.
Outputs: a plain config object with flags, caps and defaults. Every paid or outbound feature is OFF unless its flag and key are set.
Must not change: defaults that keep paid providers off (AI daily cap 0, discovery off, AI off). No secret value is ever logged or returned.
*/

const CONTRACT_VERSION = '1.0';
const GENERATOR_VERSION = 'br-gen-1.0.0';
const BOT_UA = 'RhysHumeReviewBot/1.0 (+https://www.rhyshume.co.uk/business-review/bot)';
const BOT_TOKEN = 'RhysHumeReviewBot';

function flag(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'on' || s === 'yes';
}
function explicitOff(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  return s === '0' || s === 'false' || s === 'off' || s === 'no';
}
function int(v, dflt, min, max) {
  const n = parseInt(String(v == null ? '' : v).trim(), 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
function str(v) { return String(v == null ? '' : v).trim(); }

function loadConfig(env) {
  env = env || process.env;
  return {
    contractVersion: CONTRACT_VERSION,
    generatorVersion: GENERATOR_VERSION,
    botUserAgent: BOT_UA,
    botToken: BOT_TOKEN,
    siteOrigin: str(env.BR_SITE_ORIGIN) || 'https://www.rhyshume.co.uk',
    supabaseUrl: str(env.SUPABASE_URL).replace(/\/+$/, ''),
    serviceKey: str(env.SUPABASE_SERVICE_ROLE_KEY),
    ownerEmail: str(env.BR_OWNER_EMAIL).toLowerCase(),
    salt: str(env.BR_SALT),
    tokenDays: int(env.BR_TOKEN_DAYS, 30, 1, 90),
    dailyReviews: int(env.BR_DAILY_REVIEWS, 150, 1, 10000),
    requireApproval: flag(env.BR_REQUIRE_APPROVAL),
    cronSecret: str(env.CRON_SECRET),
    turnstileSecret: str(env.TURNSTILE_SECRET_KEY),
    turnstileHostnames: ['rhyshume.co.uk', 'www.rhyshume.co.uk'],
    psi: {
      // PageSpeed Insights: the only provider allowed to run by default, and only when a key exists.
      // BR_PSI=0 is a kill switch. Without PSI_API_KEY it reports not_configured and never calls the shared anonymous pool.
      key: str(env.PSI_API_KEY),
      enabled: !explicitOff(env.BR_PSI),
      dailyCalls: int(env.BR_PSI_DAILY_CALLS, 150, 0, 25000),
      maxCallsPerReview: 4
    },
    discovery: {
      enabled: flag(env.BR_DISCOVERY),
      placesKey: str(env.GOOGLE_PLACES_API_KEY),
      dailyCapPence: int(env.BR_PLACES_DAILY_CAP_PENCE, 0, 0, 100000)
    },
    ai: {
      enabled: flag(env.BR_AI_VISIBILITY),
      publicRuns: flag(env.BR_AI_PUBLIC),
      dailyCapPence: int(env.BR_AI_DAILY_CAP_PENCE, 0, 0, 1000000),
      maxCallsPerReview: int(env.BR_AI_MAX_CALLS_PER_REVIEW, 36, 0, 72),
      maxPencePerReview: int(env.BR_AI_MAX_PENCE_PER_REVIEW, 150, 0, 100000)
    },
    email: {
      enabled: flag(env.BR_EMAIL),
      resendKey: str(env.RESEND_API_KEY),
      from: str(env.CONTACT_FROM) || 'Rhys Hume <hello@rhyshume.co.uk>',
      contactTo: str(env.CONTACT_TO).split(',').map(function (s) { return s.trim(); }).filter(Boolean)
    },
    limits: { maxCompetitors: 3 }
  };
}

function storageConfigured(cfg) { return !!(cfg.supabaseUrl && cfg.serviceKey && /^https:\/\//.test(cfg.supabaseUrl)); }

module.exports = { loadConfig, storageConfigured, flag, explicitOff, CONTRACT_VERSION, GENERATOR_VERSION, BOT_UA, BOT_TOKEN };
