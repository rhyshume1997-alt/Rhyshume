'use strict';
/*
Business review: public router function (Vercel). Reached through the rewrite /api/business-review/:path* in vercel.json.
Inputs : HTTP requests described in docs/business-review/CONTRACT.md section 3. The route comes from req.query.route, or from req.url.
Outputs: JSON envelope responses. All behaviour lives in api/_lib/br/ (routes.js, steps.js, providers).
Must not change: this file stays a thin entry point. Environment variables are read per request, never at import time. No secrets here.
*/
const { buildDeps } = require('./_lib/br/deps');
const { createPublicHandler } = require('./_lib/br/routes');

module.exports = function handler(req, res) {
  return createPublicHandler(buildDeps(process.env))(req, res);
};
module.exports.createHandler = function (env, overrides) { return createPublicHandler(buildDeps(env, overrides)); };
