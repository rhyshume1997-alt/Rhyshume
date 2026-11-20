'use strict';
/*
Business review: admin router function (Vercel), owner only. Reached through the rewrite /api/business-review/admin/:path* (listed first).
Inputs : HTTP requests described in docs/business-review/CONTRACT.md section 4, with the owner's Supabase access token as a Bearer token
         (the sweep route also accepts the cron secret).
Outputs: JSON envelope responses. All behaviour lives in api/_lib/br/admin.js.
Must not change: this file stays a thin entry point. No secrets here; the owner check is in admin.js.
*/
const { buildDeps } = require('./_lib/br/deps');
const { createAdminHandler } = require('./_lib/br/admin');

module.exports = function handler(req, res) {
  return createAdminHandler(buildDeps(process.env))(req, res);
};
module.exports.createHandler = function (env, overrides) { return createAdminHandler(buildDeps(env, overrides)); };
