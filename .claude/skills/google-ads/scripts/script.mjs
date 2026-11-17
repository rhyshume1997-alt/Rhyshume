// Google Ads skill · the two scripts the person pastes into Google Ads
// (Tools → Bulk actions → Scripts). This skill never holds a key to the account:
//
//   exportScript()            reads only. Saves one JSON file to the person's Google Drive.
//   changeScript(ops, meta)   the changes they chose, and nothing else. They press Preview
//                             (Google shows what would change and changes nothing), then Run.
//
// Both are plain Google Ads Scripts: AdsApp.search for reading, the classic methods and
// AdsApp.mutate for writing.

import { QUERIES, DAYS, limitOf } from "./queries.mjs";

const js = (v) => JSON.stringify(v, null, 2);

export function exportScript({ days = DAYS } = {}) {
  const list = QUERIES.map((q) => ({ name: q.name, gaql: q.gaql, ...(q.quiet ? { quiet: true } : {}), ...(limitOf(q.gaql) ? { limit: limitOf(q.gaql) } : {}) }));
  return `/**
 * Google Ads skill · EXPORT (read-only)
 *
 * What it does: reads your campaigns' settings, keywords, ads, search terms and conversion
 * setup for the last ${days} days and saves them as one file in your Google Drive:
 *   google-ads-export-<account>-<date>.json
 * It changes nothing in your account. It sends nothing anywhere else.
 *
 * How: Tools → Bulk actions → Scripts → + (New script) → delete what's there, paste this →
 * Authorize (Google asks once, for Google Ads and for Drive, so it can save the file) →
 * Run. It takes a minute or two. Then open Google Drive, download the file, and put it in
 * the gads/exports folder (or just drag it into Claude Code).
 *
 * To get a fresh file every week, set the script's Frequency to Weekly in the Scripts list.
 */
var DAYS = ${days};
var MAX_ROWS = 20000;
var QUERIES = ${js(list)};

function main() {
  var account = AdsApp.currentAccount();
  var tz = account.getTimeZone();
  var day = 24 * 60 * 60 * 1000;
  var now = new Date();
  function ymd(d) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); }
  var range = {
    from: ymd(new Date(now.getTime() - DAYS * day)), to: ymd(new Date(now.getTime() - day)),
    prevFrom: ymd(new Date(now.getTime() - 2 * DAYS * day)), prevTo: ymd(new Date(now.getTime() - (DAYS + 1) * day))
  };
  var out = {
    format: 'google-ads-export', v: 1, made: now.toISOString(), days: DAYS, range: range,
    account: { id: account.getCustomerId(), name: account.getName(), currency: account.getCurrencyCode(), timeZone: tz },
    data: {}, names: { geo: {}, languages: {} }, errors: [], truncated: []
  };

  for (var i = 0; i < QUERIES.length; i++) {
    var q = QUERIES[i];
    var gaql = q.gaql
      .replace('{RANGE}', "'" + range.from + "' AND '" + range.to + "'")
      .replace('{PREV}', "'" + range.prevFrom + "' AND '" + range.prevTo + "'");
    try {
      out.data[q.name] = read(gaql, q.name, out);
      if (q.limit && out.data[q.name].length >= q.limit && out.truncated.indexOf(q.name) < 0) out.truncated.push(q.name);
    } catch (e) {
      var err = { query: q.name, message: String(e).slice(0, 300) };
      if (q.quiet) err.quiet = true;
      out.errors.push(err);
    }
  }

  // The names of the places and languages the campaigns target.
  try {
    var ids = {};
    var crit = out.data.campaignCriteria || [];
    for (var c = 0; c < crit.length; c++) {
      var loc = crit[c].campaignCriterion && crit[c].campaignCriterion.location && crit[c].campaignCriterion.location.geoTargetConstant;
      if (loc) ids[String(loc).split('/').pop()] = true;
    }
    var all = Object.keys(ids);
    for (var s = 0; s < all.length; s += 200) {
      var part = all.slice(s, s + 200).join(', ');
      var geo = AdsApp.search('SELECT geo_target_constant.resource_name, geo_target_constant.canonical_name FROM geo_target_constant WHERE geo_target_constant.id IN (' + part + ')');
      while (geo.hasNext()) { var g = geo.next().geoTargetConstant; out.names.geo[g.resourceName] = g.canonicalName; }
    }
    var lang = AdsApp.search('SELECT language_constant.resource_name, language_constant.name FROM language_constant');
    while (lang.hasNext()) { var l = lang.next().languageConstant; out.names.languages[l.resourceName] = l.name; }
  } catch (e2) {
    out.errors.push({ query: 'names', message: String(e2).slice(0, 300), quiet: true });
  }

  var name = 'google-ads-export-' + account.getCustomerId() + '-' + ymd(now) + '.json';
  var file = DriveApp.createFile(name, JSON.stringify(out));
  var total = 0;
  for (var k in out.data) total += out.data[k].length;
  Logger.log('Saved ' + name + ' to your Google Drive (' + total + ' rows, nothing in the account was changed).');
  Logger.log('Open it: ' + file.getUrl());
  if (out.errors.length) Logger.log(out.errors.length + ' part(s) could not be read; the file says which. The check works with the rest.');
}

function read(gaql, name, out) {
  var rows = [];
  var it = AdsApp.search(gaql);
  while (it.hasNext()) {
    rows.push(it.next());
    if (rows.length >= MAX_ROWS) { out.truncated.push(name); break; }
  }
  return rows;
}
`;
}

/** What one operation will do, in the person's words. */
export function sayOp(op) {
  return op.say || op.type;
}

const KINDS = new Set(["negative", "pauseKeyword", "budget", "network", "geo", "aimax", "pauseCampaign"]);

/**
 * @param ops   from the check's options: negative, pauseKeyword, budget, network, geo
 * @param meta  { accountId, accountName, made, words }
 */
export function changeScript(ops, meta) {
  const bad = ops.filter((o) => !KINDS.has(o.type));
  if (bad.length) throw new Error(`The change script can't do "${bad[0].type}".`);
  if (!ops.length) throw new Error("No changes to write.");
  if (!meta?.accountId) throw new Error("The change script needs the account number it was written for.");
  const lines = ops.map((o, i) => ` *   ${String(i + 1).padStart(2)}. ${sayOp(o)}`).join("\n");
  const clean = ops.map((o) => {
    const { type, campaignId, campaign, text, match, adGroupId, criterionId, field, from, to } = o;
    return JSON.parse(JSON.stringify({ type, campaignId, campaign, text, match, adGroupId, criterionId, field, from, to, say: sayOp(o) }));
  });
  return `/**
 * Google Ads skill · CHANGES for account ${meta.accountId}${meta.accountName ? ` (${meta.accountName})` : ""}
 * Written ${meta.made || new Date().toISOString().slice(0, 10)}${meta.words ? `, after you said: "${String(meta.words).replace(/\*\//g, "* /").slice(0, 200)}"` : ""}
 *
 * It will do exactly this, and nothing else:
${lines}
 *
 * How: Tools → Bulk actions → Scripts → + (New script) → paste this → Authorize →
 * press PREVIEW first. Preview changes nothing: read the "Logs" tab (and "Changes") and
 * check every line matches the list above. Then press RUN.
 * It refuses to run in any other account, and it skips anything that was renamed or
 * changed since the check.
 */
var ACCOUNT = ${JSON.stringify(String(meta.accountId).replace(/\D/g, ""))};
var CHANGES = ${js(clean)};

function main() {
  var cid = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  if (cid !== ACCOUNT) {
    Logger.log('STOPPED. This script was written for account ' + ACCOUNT + ', and this is ' + cid + '. Nothing was changed.');
    return;
  }
  var preview = AdsApp.getExecutionInfo().isPreview();
  Logger.log(preview ? 'PREVIEW: nothing is being changed. This is what Run would do:' : 'RUNNING: making ' + CHANGES.length + ' change(s).');
  var ok = 0, skipped = 0;
  for (var i = 0; i < CHANGES.length; i++) {
    var c = CHANGES[i];
    try {
      apply(c, cid);
      ok++;
      Logger.log('  ok   ' + c.say);
    } catch (e) {
      skipped++;
      Logger.log('  !!   skipped: ' + c.say + ' (' + e + ')');
    }
  }
  Logger.log((preview ? 'Preview done: ' : 'Done: ') + ok + ' ' + (preview ? 'would change' : 'changed') + ', ' + skipped + ' skipped.');
}

function campaignOf(c) {
  var it = AdsApp.campaigns().withIds([Number(c.campaignId)]).get();
  if (!it.hasNext()) throw 'campaign not found';
  var camp = it.next();
  if (c.campaign && camp.getName() !== c.campaign) throw 'the campaign is now called "' + camp.getName() + '", not "' + c.campaign + '"';
  return camp;
}

function update(cid, c, fields, mask) {
  // Every kind of campaign, Performance Max included: look it up by its number.
  var found = AdsApp.search('SELECT campaign.id, campaign.name FROM campaign WHERE campaign.id = ' + Number(c.campaignId));
  if (!found.hasNext()) throw 'campaign not found';
  var name = found.next().campaign.name;
  if (c.campaign && name !== c.campaign) throw 'the campaign is now called "' + name + '", not "' + c.campaign + '"';
  var body = { resourceName: 'customers/' + cid + '/campaigns/' + c.campaignId };
  for (var k in fields) body[k] = fields[k];
  // Google's field masks are written one way in the docs and another in JSON; try both.
  // In a preview nothing may change: this kind of change is only announced, never sent.
  if (AdsApp.getExecutionInfo().isPreview()) return;
  var camel = mask.replace(/_([a-z])/g, function (m, x) { return x.toUpperCase(); });
  var res = AdsApp.mutate({ campaignOperation: { update: body, updateMask: mask } });
  if (!res.isSuccessful() && camel !== mask) res = AdsApp.mutate({ campaignOperation: { update: body, updateMask: camel } });
  if (!res.isSuccessful()) throw res.getErrorMessages().join('; ');
}

function apply(c, cid) {
  if (c.type === 'negative') {
    var text = String(c.text).replace(/[\\[\\]"]/g, '');
    campaignOf(c).createNegativeKeyword(c.match === 'EXACT' ? '[' + text + ']' : '"' + text + '"');
  } else if (c.type === 'pauseKeyword') {
    var it = AdsApp.keywords().withIds([[Number(c.adGroupId), Number(c.criterionId)]]).get();
    if (!it.hasNext()) throw 'keyword not found';
    var kw = it.next();
    var now = kw.getText().replace(/[\\[\\]"+]/g, '').toLowerCase();
    if (c.text && now !== String(c.text).replace(/[\\[\\]"+]/g, '').toLowerCase()) throw 'that keyword is now "' + kw.getText() + '"';
    kw.pause();
  } else if (c.type === 'budget') {
    var budget = campaignOf(c).getBudget();
    if (typeof budget.isExplicitlyShared === 'function' && budget.isExplicitlyShared()) throw 'this budget is shared with other campaigns: change it by hand';
    var amount = budget.getAmount();
    if (Math.abs(amount - c.from) > 0.011) throw 'the budget is now ' + amount + ', not ' + c.from + ' as in the check';
    if (c.to > c.from * 1.2 + 0.011) throw 'a raise of more than 20% in one step';
    budget.setAmount(c.to);
  } else if (c.type === 'network') {
    if (c.field === 'target_search_network') update(cid, c, { networkSettings: { targetSearchNetwork: false } }, 'network_settings.target_search_network');
    else if (c.field === 'target_content_network') update(cid, c, { networkSettings: { targetContentNetwork: false } }, 'network_settings.target_content_network');
    else throw 'unknown network setting';
  } else if (c.type === 'pauseCampaign') {
    update(cid, c, { status: 'PAUSED' }, 'status');
  } else if (c.type === 'aimax') {
    update(cid, c, { aiMaxSetting: { enableAiMax: false } }, 'ai_max_setting.enable_ai_max');
  } else if (c.type === 'geo') {
    update(cid, c, { geoTargetTypeSetting: { positiveGeoTargetType: 'PRESENCE' } }, 'geo_target_type_setting.positive_geo_target_type');
  } else {
    throw 'unknown change';
  }
}
`;
}
