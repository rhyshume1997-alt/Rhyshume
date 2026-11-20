'use strict';
/*
Business review: dependency wiring for the two router functions.
Inputs : an env object and optional overrides (tests inject a memory store, a stub fetcher, fake clocks).
Outputs: the deps object used by routes.js and admin.js.
Must not change: production defaults (strict safe fetcher, real Supabase store only when both variables exist, real Turnstile check).
         Overrides exist for tests only; the production entry files never pass any.
*/
const { loadConfig, storageConfigured } = require('./config');
const { createSupabaseStore } = require('./db');
const { defaultFetcher } = require('./safe-fetch');
const antispam = require('../antispam');
const { registry } = require('./providers/index');

function buildDeps(env, overrides) {
  const cfg = loadConfig(env);
  const o = overrides || {};
  const deps = {
    cfg: cfg,
    store: o.store || createSupabaseStore({ url: cfg.supabaseUrl, serviceKey: cfg.serviceKey, fetchImpl: o.fetchImpl }),
    storageConfigured: o.store ? true : storageConfigured(cfg),
    fetcher: o.fetcher || defaultFetcher,
    fetchImpl: o.fetchImpl || (function () { return fetch.apply(null, arguments); }),
    now: o.now || function () { return new Date(); },
    sleep: o.sleep,
    minIntervalMs: o.minIntervalMs,
    registry: o.registry || registry(),
    softMs: o.softMs, hardMs: o.hardMs,
    verifyTurnstile: o.verifyTurnstile || function (args) {
      return antispam.verifyTurnstile({ secret: cfg.turnstileSecret, token: args.token, ip: args.ip, expectedAction: args.action, allowedHostnames: cfg.turnstileHostnames, fetchImpl: o.fetchImpl });
    }
  };
  return deps;
}

module.exports = { buildDeps };
