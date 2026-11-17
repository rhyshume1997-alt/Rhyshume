// Google Ads skill · the rules, in plain sight. No network, no files: an export goes in,
// findings and options come out. The same export always gives the same check.
//
//   normalize(export)            rows as Google returns them → one model of the account
//   check(model, brief)          → { totals, first, settings, searches, keywords, ads, options }
//   render(result)               → the check as text
//
// Three kinds of line. WRONG: the setting is not what the brief asks for, or it spent money
// and brought nothing. CHECK: it might be right, the person decides. OK: as asked.

import { critique, verdict, keyWords, words, typed, bare, isStop } from "./critic.mjs";

export const RULES = {
  days: 30,
  // A keyword or a search that spent this many times the target with nothing back gets cut.
  off_multiple: 3,
  // ...and from this many times the target it's worth a look.
  look_multiple: 1,
  // With no target to compare with: clicks with nothing back.
  off_clicks: 40,
  // A network or a kind of location is "worse" from this many times the main cost per result.
  worse: 1.3,
  // Google: judge Target CPA over 30 days with at least 30 conversions; Target ROAS needs 15 in 30 days.
  bid_learn: 15,
  bid_judge: 30,
  // A network, a kind of place or AI Max is judged only once this many times the target went there
  // with nothing back, or twice that with results that cost more.
  segment_floor: 1,
  // Google bills at most 30.4 × the average daily budget in a month, and up to 2 × on one day.
  month_days: 30.4,
  day_burst: 2,
  budget_over: 1.1,
  lost_budget: 0.2,
  qs_low: 3,
  group_keywords: 20,
  rsa_max: 3,
  sitelinks: 4,
  tracking_clicks: 100,
  ad_pass: 14,
  target_tight: 0.7,
  night: [22, 6],
};

export const GOALS = {
  leads: { one: "lead", many: "leads", count: "ONE_PER_CLICK" },
  sales: { one: "sale", many: "sales", count: "MANY_PER_CLICK" },
  calls: { one: "call", many: "calls", count: "ONE_PER_CLICK" },
  visits: { one: "visit", many: "visits", count: "ONE_PER_CLICK" },
};

// ---------------------------------------------------------------- reading rows
const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
/** Reads "campaign.network_settings.target_search_network" from a row in either spelling. */
export function pick(row, path) {
  let o = row;
  for (const part of path.split(".")) {
    if (o == null) return undefined;
    const c = camel(part);
    o = o[c] !== undefined ? o[c] : o[part];
  }
  return o;
}
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const micros = (v) => num(v) / 1e6;
const idOf = (v) => (v == null ? "" : String(v));
const lastId = (resource) => String(resource || "").split("/").pop();
const blank = () => ({ cost: 0, clicks: 0, impr: 0, conv: 0, value: 0 });
function addStats(into, r) {
  into.cost += micros(pick(r, "metrics.cost_micros"));
  into.clicks += num(pick(r, "metrics.clicks"));
  into.impr += num(pick(r, "metrics.impressions"));
  into.conv += num(pick(r, "metrics.conversions"));
  into.value += num(pick(r, "metrics.conversions_value"));
  return into;
}
export const fmtId = (id) => { const s = String(id || "").replace(/\D/g, ""); return s.length === 10 ? `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}` : String(id || ""); };

export function normalize(exp) {
  if (!exp || typeof exp !== "object" || !exp.data) throw new Error("This isn't an export from the skill's script (no \"data\" in it).");
  const d = exp.data;
  const rows = (n) => (Array.isArray(d[n]) ? d[n] : []);
  const failed = new Set((exp.errors || []).map((e) => e.query));
  const has = (n) => Array.isArray(d[n]) && !failed.has(n);
  const names = exp.names || {};
  const cust = rows("customer")[0] || {};
  const account = {
    id: fmtId(pick(cust, "customer.id") ?? exp.account?.id),
    name: pick(cust, "customer.descriptive_name") || exp.account?.name || "",
    currency: pick(cust, "customer.currency_code") || exp.account?.currency || "USD",
    tz: pick(cust, "customer.time_zone") || exp.account?.timeZone || "",
    autoTagging: pick(cust, "customer.auto_tagging_enabled"),
  };

  const campaigns = new Map();
  for (const r of rows("campaigns")) {
    const id = idOf(pick(r, "campaign.id"));
    campaigns.set(id, {
      id,
      name: pick(r, "campaign.name") || id,
      status: pick(r, "campaign.status") || "ENABLED",
      channel: pick(r, "campaign.advertising_channel_type") || "UNKNOWN",
      sub: pick(r, "campaign.advertising_channel_sub_type") || "",
      bidding: pick(r, "campaign.bidding_strategy_type") || "UNKNOWN",
      tcpa: micros(pick(r, "campaign.target_cpa.target_cpa_micros")) || micros(pick(r, "campaign.maximize_conversions.target_cpa_micros")) || null,
      troas: num(pick(r, "campaign.target_roas.target_roas")) || num(pick(r, "campaign.maximize_conversion_value.target_roas")) || null,
      budgetDay: micros(pick(r, "campaign_budget.amount_micros")),
      sharedBudget: !!pick(r, "campaign_budget.explicitly_shared"), portfolio: !!pick(r, "campaign.bidding_strategy"),
      budgetKey: pick(r, "campaign.campaign_budget") || pick(r, "campaign_budget.resource_name") || `own:${id}`,
      net: {
        google: pick(r, "campaign.network_settings.target_google_search"),
        partners: pick(r, "campaign.network_settings.target_search_network"),
        display: pick(r, "campaign.network_settings.target_content_network"),
      },
      geo: {
        pos: pick(r, "campaign.geo_target_type_setting.positive_geo_target_type") || "UNSPECIFIED",
        neg: pick(r, "campaign.geo_target_type_setting.negative_geo_target_type") || "UNSPECIFIED",
      },
      aiMax: undefined, broad: undefined, autoText: undefined, urlExpansion: undefined, brandExcluded: undefined,
      ...blank(), is: null, lostBudget: null, lostRank: null,
      prev: null, byNetwork: {}, byGeo: {}, byHour: null, bySource: null, byAction: null,
      locations: [], excluded: [], radius: [], languages: [], schedule: [], negatives: [], lists: [], assets: {},
      groups: [], terms: [],
    });
  }
  const C = (r) => campaigns.get(idOf(pick(r, "campaign.id")));

  for (const r of rows("campaignAiMax")) { const c = C(r); if (c) c.aiMax = !!pick(r, "campaign.ai_max_setting.enable_ai_max"); }
  for (const r of rows("campaignBroad")) { const c = C(r); if (c) c.broad = pick(r, "campaign.keyword_match_type") === "BROAD"; }
  for (const r of rows("campaignAssetAutomation")) {
    const c = C(r); if (!c) continue;
    const list = pick(r, "campaign.asset_automation_settings") || [];
    const on = (t) => { const s = list.find((x) => (x.assetAutomationType || x.asset_automation_type) === t); return s ? (s.assetAutomationStatus || s.asset_automation_status) === "OPTED_IN" : undefined; };
    c.autoText = on("TEXT_ASSET_AUTOMATION");
    c.urlExpansion = on("FINAL_URL_EXPANSION_TEXT_ASSET_AUTOMATION");
  }
  for (const r of rows("brandExclusions")) { const c = C(r); if (c && pick(r, "campaign_criterion.negative")) c.brandExcluded = true; }
  if (has("brandExclusions")) for (const c of campaigns.values()) if (c.brandExcluded === undefined) c.brandExcluded = false;

  for (const r of rows("campaignStats")) {
    const c = C(r); if (!c) continue;
    addStats(c, r);
    const share = (p) => { const v = pick(r, p); return v == null || v === "" ? null : num(v); };
    c.is = share("metrics.search_impression_share");
    c.lostBudget = share("metrics.search_budget_lost_impression_share");
    c.lostRank = share("metrics.search_rank_lost_impression_share");
  }
  for (const r of rows("campaignStatsPrev")) { const c = C(r); if (c) addStats((c.prev ||= blank()), r); }
  for (const r of rows("networks")) { const c = C(r); if (c) addStats((c.byNetwork[pick(r, "segments.ad_network_type") || "UNKNOWN"] ||= blank()), r); }
  for (const r of rows("geoTypes")) { const c = C(r); if (c) addStats((c.byGeo[pick(r, "geographic_view.location_type") || "UNKNOWN"] ||= blank()), r); }
  for (const r of rows("matchSources")) { const c = C(r); if (c) addStats(((c.bySource ||= {})[/AI_MAX/.test(pick(r, "segments.search_term_match_source") || "") ? "aiMax" : "yours"] ||= blank()), r); }
  for (const r of rows("conversionsByCampaign")) { const c = C(r); if (!c) continue; const e = ((c.byAction ||= {})[lastId(pick(r, "segments.conversion_action"))] ||= { conv: 0, value: 0 }); e.conv += num(pick(r, "metrics.conversions")); e.value += num(pick(r, "metrics.conversions_value")); }
  for (const r of rows("hours")) { const c = C(r); if (c) addStats(((c.byHour ||= {})[num(pick(r, "segments.hour"))] ||= blank()), r); }

  for (const r of rows("campaignCriteria")) {
    const c = C(r); if (!c) continue;
    if ((pick(r, "campaign_criterion.status") || "ENABLED") === "REMOVED") continue;
    const type = pick(r, "campaign_criterion.type"); const neg = !!pick(r, "campaign_criterion.negative");
    if (type === "LOCATION") {
      const res = pick(r, "campaign_criterion.location.geo_target_constant");
      const name = names.geo?.[res] || names.geo?.[lastId(res)] || `place ${lastId(res)}`;
      (neg ? c.excluded : c.locations).push(name);
    } else if (type === "PROXIMITY") {
      const rad = num(pick(r, "campaign_criterion.proximity.radius")); const unit = String(pick(r, "campaign_criterion.proximity.radius_units") || "").toLowerCase().startsWith("mi") ? "mi" : "km";
      c.radius.push(`${rad} ${unit} around ${pick(r, "campaign_criterion.proximity.address.city_name") || "a point"}`);
    } else if (type === "LANGUAGE") {
      const res = pick(r, "campaign_criterion.language.language_constant");
      c.languages.push(names.languages?.[res] || names.languages?.[lastId(res)] || `language ${lastId(res)}`);
    } else if (type === "KEYWORD" && neg) {
      c.negatives.push({ text: String(pick(r, "campaign_criterion.keyword.text") || "").toLowerCase(), match: pick(r, "campaign_criterion.keyword.match_type") || "BROAD" });
    } else if (type === "AD_SCHEDULE") {
      c.schedule.push({ day: pick(r, "campaign_criterion.ad_schedule.day_of_week"), from: num(pick(r, "campaign_criterion.ad_schedule.start_hour")), to: num(pick(r, "campaign_criterion.ad_schedule.end_hour")) });
    }
  }

  // Negative keyword lists.
  const sets = new Map();
  for (const r of rows("sharedSets")) if (/NEGATIVE_KEYWORDS$/.test(pick(r, "shared_set.type") || "")) sets.set(idOf(pick(r, "shared_set.id")), { name: pick(r, "shared_set.name"), words: [], everywhere: pick(r, "shared_set.type") === "ACCOUNT_LEVEL_NEGATIVE_KEYWORDS" });
  for (const r of rows("sharedNegatives")) { const s = sets.get(idOf(pick(r, "shared_set.id"))); if (s) s.words.push({ text: String(pick(r, "shared_criterion.keyword.text") || "").toLowerCase(), match: pick(r, "shared_criterion.keyword.match_type") || "BROAD" }); }
  for (const r of rows("campaignSharedSets")) { const c = C(r); const s = sets.get(idOf(pick(r, "shared_set.id"))); if (c && s) c.lists.push(s); }
  // The account-level list applies to every Search campaign without being attached to any.
  for (const s of sets.values()) if (s.everywhere) for (const c of campaigns.values()) if (!c.lists.includes(s)) c.lists.push(s);

  // Ad groups, keywords, ads.
  const groups = new Map();
  const G = (r) => {
    const id = idOf(pick(r, "ad_group.id")); if (!id) return null;
    let g = groups.get(id);
    if (!g) { g = { id, name: pick(r, "ad_group.name") || `ad group ${id}`, campaignId: idOf(pick(r, "campaign.id")), type: pick(r, "ad_group.type") || "", keywords: [], ads: [], negatives: [], assets: {} }; groups.set(id, g); const c = campaigns.get(g.campaignId); if (c) c.groups.push(g); }
    else if (pick(r, "ad_group.name")) g.name = pick(r, "ad_group.name");
    return g;
  };
  for (const r of rows("adGroups")) G(r);
  for (const r of rows("keywords")) {
    const g = G(r); if (!g) continue;
    g.keywords.push({
      id: idOf(pick(r, "ad_group_criterion.criterion_id")), groupId: g.id, campaignId: g.campaignId,
      text: String(pick(r, "ad_group_criterion.keyword.text") || ""), match: pick(r, "ad_group_criterion.keyword.match_type") || "BROAD",
      qs: num(pick(r, "ad_group_criterion.quality_info.quality_score")) || null,
      qsAd: pick(r, "ad_group_criterion.quality_info.creative_quality_score") || null,
      qsPage: pick(r, "ad_group_criterion.quality_info.post_click_quality_score") || null,
      qsCtr: pick(r, "ad_group_criterion.quality_info.search_predicted_ctr") || null,
      ...addStats(blank(), r),
    });
  }
  for (const r of rows("adGroupNegatives")) { const g = G(r); if (g) g.negatives.push({ text: String(pick(r, "ad_group_criterion.keyword.text") || "").toLowerCase(), match: pick(r, "ad_group_criterion.keyword.match_type") || "BROAD" }); }

  const adSeen = new Map();
  const readAd = (r, withStats) => {
    const g = G(r); if (!g) return;
    const id = idOf(pick(r, "ad_group_ad.ad.id")); const key = `${g.id}~${id}`;
    let a = adSeen.get(key);
    if (!a) {
      const line = (x) => ({ text: String(x?.text || ""), pinned: x?.pinnedField || x?.pinned_field || null });
      a = {
        id, groupId: g.id, campaignId: g.campaignId, type: pick(r, "ad_group_ad.ad.type") || "",
        headlines: (pick(r, "ad_group_ad.ad.responsive_search_ad.headlines") || []).map(line),
        descriptions: (pick(r, "ad_group_ad.ad.responsive_search_ad.descriptions") || []).map(line),
        finalUrl: (pick(r, "ad_group_ad.ad.final_urls") || [])[0] || "",
        path1: pick(r, "ad_group_ad.ad.responsive_search_ad.path1") || "", path2: pick(r, "ad_group_ad.ad.responsive_search_ad.path2") || "",
        strength: pick(r, "ad_group_ad.ad_strength") || "", approval: pick(r, "ad_group_ad.policy_summary.approval_status") || "",
        ...blank(),
      };
      adSeen.set(key, a); g.ads.push(a);
    }
    if (withStats) addStats(a, r);
  };
  for (const r of rows("ads")) readAd(r, true);
  for (const r of rows("adsAll")) readAd(r, false);

  for (const r of rows("searchTerms")) {
    const c = C(r); if (!c) continue;
    c.terms.push({ text: String(pick(r, "search_term_view.search_term") || "").toLowerCase(), status: pick(r, "search_term_view.status") || "NONE", groupId: idOf(pick(r, "ad_group.id")), ...addStats(blank(), r) });
  }

  // The extras under an ad: counted per campaign (account-wide ones count for every campaign).
  const acctAssets = {};
  for (const r of rows("customerAssets")) { const t = pick(r, "customer_asset.field_type"); acctAssets[t] = (acctAssets[t] || 0) + 1; }
  for (const c of campaigns.values()) c.assets = { ...acctAssets };
  for (const r of rows("campaignAssets")) { const c = C(r); if (c) { const t = pick(r, "campaign_asset.field_type"); c.assets[t] = (c.assets[t] || 0) + 1; } }
  for (const r of rows("adGroupAssets")) { const c = C(r); if (c) { const t = pick(r, "ad_group_asset.field_type"); c.assets[t] = (c.assets[t] || 0) + 1; } }

  const conversionActions = rows("conversionActions").map((r) => ({
    id: idOf(pick(r, "conversion_action.id")), name: pick(r, "conversion_action.name") || "", status: pick(r, "conversion_action.status") || "ENABLED",
    type: pick(r, "conversion_action.type") || "", category: pick(r, "conversion_action.category") || "DEFAULT",
    primary: pick(r, "conversion_action.primary_for_goal") !== false && pick(r, "conversion_action.include_in_conversions_metric") !== false,
    counting: pick(r, "conversion_action.counting_type") || "", conv: 0, all: 0, value: 0,
  }));
  for (const r of rows("conversionStats")) {
    const id = lastId(pick(r, "segments.conversion_action")); const nm = pick(r, "segments.conversion_action_name");
    const a = conversionActions.find((x) => x.id === id) || conversionActions.find((x) => x.name === nm);
    if (a) { a.conv += num(pick(r, "metrics.conversions")); a.all += num(pick(r, "metrics.all_conversions")); a.value += num(pick(r, "metrics.conversions_value")); }
  }

  const autoApply = has("autoApply") ? rows("autoApply").filter((r) => (pick(r, "recommendation_subscription.status") || "") === "ENABLED").map((r) => pick(r, "recommendation_subscription.type")) : null;
  const assetGroups = rows("assetGroups").map((r) => ({ campaignId: idOf(pick(r, "campaign.id")), name: pick(r, "asset_group.name") || "", strength: pick(r, "asset_group.ad_strength") || "" }));

  return {
    account, days: exp.days || RULES.days, range: exp.range || null, made: exp.made || null,
    campaigns: [...campaigns.values()], conversionActions, autoApply, assetGroups,
    known: { networks: has("networks"), geo: has("geoTypes"), terms: has("searchTerms"), assets: has("customerAssets") || has("campaignAssets"), tracking: has("conversionActions"), keywords: has("keywords"), ads: has("ads") || has("adsAll") },
    errors: exp.errors || [], truncated: new Set(exp.truncated || []),
  };
}

// ---------------------------------------------------------------- words
export function moneyFn(currency) {
  let whole, cents;
  try {
    whole = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 });
    cents = new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch { whole = { format: (n) => `${Math.round(n)} ${currency}` }; cents = { format: (n) => `${n.toFixed(2)} ${currency}` }; }
  return (n, exact = false) => (exact || (Math.abs(n) < 20 && !Number.isInteger(n)) ? cents.format(n) : whole.format(n));
}
const plural = (n, one, many) => `${fmtN(n)} ${Math.abs(n - 1) < 1e-9 ? one : many}`;
const fmtN = (n) => (Number.isInteger(n) ? n.toLocaleString("en-US") : (Math.round(n * 10) / 10).toLocaleString("en-US"));
const pct = (x) => `${Math.round(x * 100)}%`;
const q = (s) => `"${s}"`;

const BID = {
  MANUAL_CPC: "Manual CPC", ENHANCED_CPC: "Enhanced CPC", TARGET_SPEND: "Maximize clicks", MAXIMIZE_CONVERSIONS: "Maximize conversions",
  MAXIMIZE_CONVERSION_VALUE: "Maximize conversion value", TARGET_CPA: "Target CPA", TARGET_ROAS: "Target ROAS",
  TARGET_IMPRESSION_SHARE: "Target impression share", MANUAL_CPM: "Manual CPM", MANUAL_CPV: "Manual CPV", UNKNOWN: "bidding not read",
};
const SMART = new Set(["MAXIMIZE_CONVERSIONS", "MAXIMIZE_CONVERSION_VALUE", "TARGET_CPA", "TARGET_ROAS"]);
const CHANNEL = { SEARCH: "Search", PERFORMANCE_MAX: "Performance Max", DISPLAY: "Display", SHOPPING: "Shopping", VIDEO: "Video", DEMAND_GEN: "Demand Gen", LOCAL: "Local", SMART: "Smart", MULTI_CHANNEL: "App", HOTEL: "Hotel", TRAVEL: "Travel", LOCAL_SERVICES: "Local Services" };
const AUTO_APPLY = {
  KEYWORD: "add new keywords", USE_BROAD_MATCH_KEYWORD: "switch your keywords to broad match", KEYWORD_MATCH_TYPE: "change keyword match types",
  SEARCH_PARTNERS_OPT_IN: "turn on search partners", DISPLAY_EXPANSION_OPT_IN: "turn on the Display Network",
  TARGET_CPA_OPT_IN: "change your bidding to Target CPA", TARGET_ROAS_OPT_IN: "change your bidding to Target ROAS",
  MAXIMIZE_CONVERSIONS_OPT_IN: "change your bidding to Maximize conversions", MAXIMIZE_CONVERSION_VALUE_OPT_IN: "change your bidding to Maximize conversion value",
  MAXIMIZE_CLICKS_OPT_IN: "change your bidding to Maximize clicks", ENHANCED_CPC_OPT_IN: "change your bidding",
  RAISE_TARGET_CPA_BID_TOO_LOW: "raise your target cost", RAISE_TARGET_CPA: "raise your target cost", RAISE_TARGET_CPA_PERFORMANCE_BID_TOO_LOW: "raise your target cost",
  LOWER_TARGET_ROAS: "lower your target return", LOWER_TARGET_ROAS_PERFORMANCE_BID_TOO_LOW: "lower your target return",
  SET_TARGET_CPA: "set a target cost", SET_TARGET_ROAS: "set a target return", FORECASTING_SET_TARGET_ROAS: "change your target return", FORECASTING_SET_TARGET_CPA: "change your target cost",
  RESPONSIVE_SEARCH_AD: "create new ads", TEXT_AD: "create new ads", RESPONSIVE_SEARCH_AD_ASSET: "add headlines and descriptions to your ads", RESPONSIVE_SEARCH_AD_IMPROVE_AD_STRENGTH: "rewrite your ads for Ad Strength",
  SITELINK_ASSET: "add sitelinks", CALLOUT_ASSET: "add callouts", CALL_ASSET: "add call assets", LEAD_FORM_ASSET: "add lead forms", DYNAMIC_IMAGE_EXTENSION_OPT_IN: "add images from your site",
  OPTIMIZE_AD_ROTATION: "change ad rotation", PERFORMANCE_MAX_OPT_IN: "create Performance Max campaigns", PERFORMANCE_MAX_FINAL_URL_OPT_IN: "turn on final URL expansion",
  UPGRADE_SMART_SHOPPING_CAMPAIGN_TO_PERFORMANCE_MAX: "move campaigns to Performance Max", UPGRADE_LOCAL_CAMPAIGN_TO_PERFORMANCE_MAX: "move campaigns to Performance Max",
  MIGRATE_DYNAMIC_SEARCH_ADS_CAMPAIGN_TO_PERFORMANCE_MAX: "move campaigns to Performance Max", CUSTOM_AUDIENCE_OPT_IN: "add audiences", OPTIMIZE_FOR_NEW_CUSTOMERS: "bid for new customers only",
};
// Changes that spend more or widen who sees the ads, as opposed to tidying.
const AUTO_APPLY_RISKY = /KEYWORD|BROAD|OPT_IN|TARGET|PERFORMANCE_MAX|RESPONSIVE_SEARCH_AD|TEXT_AD|NEW_CUSTOMERS/;

const LEAD_CATS = new Set(["SUBMIT_LEAD_FORM", "CONTACT", "PHONE_CALL_LEAD", "BOOK_APPOINTMENT", "REQUEST_QUOTE", "SIGNUP", "IMPORTED_LEAD", "QUALIFIED_LEAD", "CONVERTED_LEAD", "MESSAGE_LEAD", "GET_DIRECTIONS"]);
const SALE_CATS = new Set(["PURCHASE", "STORE_SALE", "SUBSCRIBE_PAID"]);
const SOFT_CATS = new Set(["PAGE_VIEW", "ENGAGEMENT", "OUTBOUND_CLICK", "ADD_TO_CART", "BEGIN_CHECKOUT", "YOUTUBE_FOLLOW_ON_VIEWS"]);

// Words that rarely come from a buyer. Proposed only when they spent money and nothing came back,
// and never when the word is in the campaign's own keywords or the brief. Claude and the person
// read them before any is blocked: a training company wants "course".
export const WASTE_WORDS = new Set(("job jobs career careers salary salaries hiring vacancy vacancies internship apprenticeship resume " +
  "diy homemade tutorial course courses training certification exam " +
  "pdf template templates example examples sample samples definition meaning wiki wikipedia reddit quora youtube " +
  "clipart login " +
  "lavoro stipendio tutorial trabajo empleo sueldo curso emploi salaire formation stellenangebote gehalt ausbildung").split(/\s+/).filter(Boolean));

export function briefOf(b = {}) {
  const goal = GOALS[b.goal] ? b.goal : "leads";
  return {
    business: b.business || "", goal,
    target_cost: num(b.target_cost) || null, target_roas: num(b.target_roas) || null,
    monthly_budget: num(b.monthly_budget) || null,
    where: (b.where || []).filter(Boolean), reach: b.reach === "interested" ? "interested" : "there",
    languages: (b.languages || []).filter(Boolean), brand: (b.brand || []).filter(Boolean),
    hours: Array.isArray(b.hours) && b.hours.length === 2 ? b.hours.map(num) : null,
    allow: { search_partners: false, display_network: false, ai_max: false, ai_text: false, url_expansion: false, auto_apply: false, ...(b.allow || {}) },
    targets: b.targets && typeof b.targets === "object" ? b.targets : {}, keep: (b.keep || []).map((w) => String(w).toLowerCase()),
    set: !!b.goal,
  };
}

// ---------------------------------------------------------------- the check
export function check(model, briefIn = {}) {
  const brief = briefOf(briefIn);
  const goal = GOALS[brief.goal];
  const money = moneyFn(model.account.currency);
  const live = model.campaigns.filter((c) => c.status === "ENABLED").map((c) => ({ ...c }));
  // Results that aren't results (page views and the like counted as conversions) are taken out
  // of the campaign totals where the export says which campaign they came from.
  const actsAll = model.conversionActions.filter((a) => a.status === "ENABLED" && a.primary);
  const softActs = actsAll.filter((a) => SOFT_CATS.has(a.category));
  const softConv = softActs.reduce((s, a) => s + a.conv, 0); const primConv = actsAll.reduce((s, a) => s + a.conv, 0);
  const softValue = softActs.reduce((s, a) => s + a.value, 0);
  const inflated = softConv > 0 && primConv > 0 && softConv / primConv >= 0.2;
  let perCampaign = false;
  if (inflated) {
    const softIds = new Set(softActs.map((a) => a.id));
    for (const c of live) if (c.byAction) {
      perCampaign = true;
      const real = Object.entries(c.byAction).filter(([id]) => !softIds.has(id)).reduce((t, [, v]) => (t.conv += v.conv, t.value += v.value, t), { conv: 0, value: 0 });
      c.counted = c.conv; c.conv = real.conv; c.value = real.value;
    }
  }
  // Below campaign level (networks, places, searches, keywords) the export can't take them out.
  const distorted = inflated;
  const totals = live.reduce((t, c) => (t.cost += c.cost, t.clicks += c.clicks, t.impr += c.impr, t.conv += c.conv, t.value += c.value, t), blank());
  const prevLive = live.filter((c) => c.prev);
  const prev = prevLive.length ? prevLive.reduce((t, c) => (t.cost += c.prev.cost, t.conv += c.prev.conv, t.value += c.prev.value, t.clicks += c.prev.clicks, t), blank()) : null;
  const counted = totals.conv;
  if (inflated && !perCampaign) { totals.conv = Math.max(0, totals.conv - softConv); totals.value = Math.max(0, totals.value - softValue); }
  const cpa = (s) => (s.conv > 0 ? s.cost / s.conv : null);
  // What one result may cost: the brief's number, or what the return target implies, or nothing.
  const aov = totals.conv > 0 && totals.value > 0 ? totals.value / totals.conv : null;
  const ref = brief.target_cost || (brief.target_roas && aov ? aov / brief.target_roas : null);
  // A campaign can have its own limit: brief.targets = { "part of the campaign's name": 150 }.
  const refFor = (c) => { const k = Object.keys(brief.targets).find((n) => c.name.toLowerCase().includes(n.toLowerCase())); return (k && num(brief.targets[k])) || ref; };
  const m2 = (n) => (Number.isInteger(n) ? money(n) : money(n, true));
  const CANT = "whether it pays can't be judged until the tracking is fixed";
  // Has enough gone to a network, a kind of place or AI Max to judge it? Nothing back: 1× the
  // limit. Results that cost more: 2×. With no limit known, any spend with nothing back counts.
  const enough = (seg, lim) => !lim || seg.cost >= lim * RULES.segment_floor * (seg.conv > 0 ? 2 : 1);
  const TOO_LITTLE = "too little spent there to judge";
  const each = (s) => (s.conv > 0 ? `${money(s.cost / s.conv, true)} each` : `no ${goal.many}`);
  const got = (s) => (s.conv > 0 ? plural(Math.round(s.conv * 10) / 10, goal.one, goal.many) : `0 ${goal.many}`);

  const first = [];      // stop-everything items
  const settings = [];   // per campaign: { campaign, head, lines: [finding] }
  const options = [];
  const opt = (o) => { options.push(o); return o; };
  const F = (tag, key, name, text, extra = {}) => ({ tag, key, name, text, ...extra });

  // ---- tracking: without it every other number is noise
  const acts = model.conversionActions.filter((a) => a.status === "ENABLED");
  const prim = acts.filter((a) => a.primary);
  const track = [];
  if (model.known.tracking) {
    if (!acts.length) first.push(F("WRONG", "track:none", "Conversion tracking", `No conversion is set up. Google can't tell a click that became a ${goal.one} from one that didn't, and neither can this check. Set one up first: Goals → Conversions → Summary → New conversion action.`));
    else if (!prim.length) first.push(F("WRONG", "track:noprimary", "Conversion tracking", `${plural(acts.length, "conversion action", "conversion actions")}, none of them primary. Bidding and the "Conversions" column only see primary ones: Goals → Conversions → Summary → open the one that is a real ${goal.one} → set it to Primary.`));
    else {
      if (totals.clicks >= RULES.tracking_clicks && totals.conv === 0) first.push(F("WRONG", "track:silent", "Conversion tracking", `${fmtN(totals.clicks)} clicks and ${money(totals.cost)} in ${model.days} days, 0 ${goal.many} counted. Either the tag is broken or nothing works: check the tag first (Goals → Conversions → Summary → the action → "Tag setup", then do a test ${goal.one} yourself).`));
      const soft = prim.filter((a) => SOFT_CATS.has(a.category));
      if (inflated) first.push(F("WRONG", "track:inflated", "Conversion tracking", `Google counted ${fmtN(Math.round(primConv))} results, and ${fmtN(Math.round(softConv))} of them (${pct(softConv / primConv)}) are ${soft.map((a) => q(a.name)).join(", ")}, not ${goal.many}. The totals${perCampaign ? " and each campaign's line" : ""} on this page leave them out; the lines about networks, places, searches and keywords can't, so those say "counted". Fix this first (option 1), then check again in two weeks.`, { dup: true }));
      if (soft.length) track.push(F("WRONG", "track:soft", "What counts as a conversion", `${soft.map((a) => q(a.name)).join(", ")} ${soft.length > 1 ? "are" : "is"} counted as a result (${soft[0].category.toLowerCase().replace(/_/g, " ")})${softConv > 0 ? `: ${fmtN(softConv)} of the ${fmtN(Math.round(primConv))} results Google counted` : ""}. Google is bidding for those, not for ${goal.many}.`, { optionTitle: `Stop counting ${soft.map((a) => q(a.name)).join(", ")} as a result`, fix: "Goals → Conversions → Summary → open it → change \"Primary\" to \"Secondary\". It stays in the reports and stops steering the bidding.", conv: soft.reduce((s, a) => s + a.conv, 0) }));
      if (brief.goal !== "sales") {
        const many = prim.filter((a) => LEAD_CATS.has(a.category) && a.counting === "MANY_PER_CLICK" && !SOFT_CATS.has(a.category));
        if (many.length) track.push(F("WRONG", "track:count", "How conversions are counted", `${many.map((a) => q(a.name)).join(", ")} count${many.length > 1 ? "" : "s"} every time: one person who gets in touch three times counts as 3 ${goal.many}. For ${goal.many}, Google's own advice is "One".`, { optionTitle: `Count ${many.map((a) => q(a.name)).join(", ")} once per click`, fix: "Goals → Conversions → Summary → open it → Count → One." }));
      } else {
        const one = prim.filter((a) => SALE_CATS.has(a.category) && a.counting === "ONE_PER_CLICK");
        if (one.length) track.push(F("WRONG", "track:count", "How conversions are counted", `${one.map((a) => q(a.name)).join(", ")} counts one sale per click. A customer who orders twice counts once. For sales, Google's own advice is "Every".`, { optionTitle: `Count every sale in ${one.map((a) => q(a.name)).join(", ")}`, fix: "Goals → Conversions → Summary → open it → Count → Every." }));
        if (totals.conv > 0 && totals.value === 0) track.push(F("WRONG", "track:value", "Sale amounts", `${got(totals)} counted, with no amounts. Without the order value there is no return on ad spend, and Google can't bid for bigger orders.`, { fix: "Send the order total with the purchase tag (your shop platform's Google channel does it; Shopify, WooCommerce and Wix each have the setting)." }));
      }
      // The same result counted by two sources.
      const fam = (a) => (/ANALYTICS|FIREBASE/.test(a.type) ? "Analytics" : /^WEBPAGE/.test(a.type) ? "the website tag" : /UPLOAD/.test(a.type) ? "an upload" : a.type);
      const byCat = {};
      for (const a of prim) if (!SOFT_CATS.has(a.category) && a.conv > 0) (byCat[a.category] ||= []).push(a);
      for (const [cat, list] of Object.entries(byCat)) {
        const fams = new Set(list.map(fam));
        if (list.length >= 2 && fams.has("Analytics") && fams.has("the website tag")) track.push(F("CHECK", `track:double:${cat}`, "Counted twice?", `${list.map((a) => `${q(a.name)} (${fmtN(a.conv)}, from ${fam(a)})`).join(" and ")} are both primary and both ${cat.toLowerCase().replace(/_/g, " ")}. If they fire on the same action, every ${goal.one} counts twice and the real cost per ${goal.one} is double what you see.`, { fix: "Goals → Conversions → Summary: keep one as Primary, set the other to Secondary." }));
      }
    }
  }
  if (model.account.autoTagging === false) track.push(F("WRONG", "track:autotag", "Auto-tagging", "off: clicks arrive without Google's click ID, so conversions can't be tied back to the ad that earned them.", { optionTitle: "Switch on auto-tagging", fix: "Admin → Account settings → Auto-tagging → tick \"Tag the URL that people click through from my ad\"." }));
  if (model.autoApply && model.autoApply.length && !brief.allow.auto_apply) {
    const risky = model.autoApply.filter((t) => AUTO_APPLY_RISKY.test(t));
    const say = (t) => AUTO_APPLY[t] || String(t).toLowerCase().replace(/_/g, " ");
    const list = [...new Set((risky.length ? risky : model.autoApply).map(say))];
    track.push(F(risky.length ? "WRONG" : "CHECK", "auto:apply", "Auto-apply recommendations", `on for ${plural(model.autoApply.length, "kind of change", "kinds of change")}: Google may ${listAnd(list.slice(0, 4))}${list.length > 4 ? `, and ${list.length - 4} more` : ""} without asking you.`, { optionTitle: "Switch off auto-apply recommendations", fix: "Recommendations → \"Automatically apply recommendations\" at the top → Manage → untick everything → Save. You still see every recommendation and choose." }));
  }

  // Are the budgets already more than the month allows? Then no raise is proposed anywhere.
  const seenB = new Set(); let dailyAll = 0;
  for (const c of live) { if (seenB.has(c.budgetKey)) continue; seenB.add(c.budgetKey); dailyAll += c.budgetDay; }
  const budgetOver = !!brief.monthly_budget && dailyAll * RULES.month_days > brief.monthly_budget * RULES.budget_over;

  // ---- settings, campaign by campaign
  const searchLive = live.filter((c) => c.channel === "SEARCH");
  for (const c of live) {
    const lines = [];
    const main = c.byNetwork.SEARCH || null;
    const mainCpa = main ? cpa(main) : cpa(c);
    const K = (k) => `${k}:${c.id}`;

    if (c.channel === "SEARCH") {
      // Search partners
      if (c.net.partners === true) {
        const p = c.byNetwork.SEARCH_PARTNERS;
        if (brief.allow.search_partners) lines.push(F("OK", K("partners"), "Search partners", "on, as you asked"));
        else if (!model.known.networks) lines.push(F("CHECK", K("partners"), "Search partners", "on: your ads also show in the search boxes of other sites. The export couldn't split what it cost.", { fix: `Campaigns → ${q(c.name)} → Settings → Networks → untick "Include Google search partners".`, op: { type: "network", campaignId: c.id, campaign: c.name, field: "target_search_network", label: "search partners off", say: `search partners off in ${c.name}` } }));
        else if (!p || p.cost === 0) lines.push(F("CHECK", K("partners"), "Search partners", `on, and it spent nothing there in ${model.days} days. Harmless so far; off keeps it that way.`, { op: { type: "network", campaignId: c.id, campaign: c.name, field: "target_search_network", label: "search partners off", say: `search partners off in ${c.name}` }, fix: `Campaigns → ${q(c.name)} → Settings → Networks → untick "Include Google search partners".` }));
        else {
          const pc = cpa(p);
          if (distorted && pc !== null) lines.push(F("CHECK", K("partners"), "Search partners", `on · ${money(p.cost)} went to other sites' search boxes (${fmtN(p.conv)} results counted there); ${CANT}.`, { fix: `Campaigns → ${q(c.name)} → Settings → Networks → untick "Include Google search partners".`, op: { type: "network", campaignId: c.id, campaign: c.name, field: "target_search_network", label: "search partners off", say: `search partners off in ${c.name}` } }));
          else {
          const worse = pc === null || (mainCpa !== null && pc > mainCpa * RULES.worse) || (mainCpa === null && ref && pc > ref);
          if (worse && !enough(p, refFor(c))) lines.push(F("CHECK", K("partners"), "Search partners", `on · ${money(p.cost)} went to other sites' search boxes, ${got(p)}: ${TOO_LITTLE}.`, { op: { type: "network", campaignId: c.id, campaign: c.name, field: "target_search_network", label: "search partners off", say: `search partners off in ${c.name}` }, fix: `Campaigns → ${q(c.name)} → Settings → Networks → untick "Include Google search partners".` }));
          else if (worse) lines.push(F("WRONG", K("partners"), "Search partners", `on · ${money(p.cost)} went to other sites' search boxes, ${got(p)}${pc ? ` (${money(pc, true)} each` : ""}${pc && mainCpa ? `; ${money(mainCpa, true)} on Google itself)` : pc ? ")" : ""}${!pc && mainCpa ? ` (Google itself: ${money(mainCpa, true)} each)` : ""}`, { money: p.cost, op: { type: "network", campaignId: c.id, campaign: c.name, field: "target_search_network", label: "search partners off", say: `search partners off in ${c.name}` }, fix: `Campaigns → ${q(c.name)} → Settings → Networks → untick "Include Google search partners".`, wrong: "Some partner sites do bring cheap results. It switches back on in one click, and this check will show what you missed." }));
          else lines.push(F("OK", K("partners"), "Search partners", `on, and earning its place: ${money(pc, true)} per ${goal.one} there${mainCpa ? `, ${money(mainCpa, true)} on Google itself` : ""}. Keep it.`));
          }
        }
      } else if (c.net.partners === false) lines.push(F("OK", K("partners"), "Search partners", "off"));

      // Display Network inside a Search campaign
      if (c.net.display === true) {
        const p = c.byNetwork.CONTENT;
        if (brief.allow.display_network) lines.push(F("OK", K("display"), "Display Network", "on, as you asked"));
        else lines.push(F("WRONG", K("display"), "Display Network", `on in a Search campaign${p && p.cost > 0 ? ` · ${money(p.cost)} went to banners on websites and apps, ${got(p)}` : ": leftover budget goes to banners on websites and apps, shown to people who weren't searching"}`, { money: p?.cost || 0, op: { type: "network", campaignId: c.id, campaign: c.name, field: "target_content_network", label: "Display Network off", say: `Display Network off in ${c.name}` }, fix: `Campaigns → ${q(c.name)} → Settings → Networks → untick "Include Google Display Network".`, wrong: "If you want banners, a separate Display or Demand Gen campaign with its own budget shows what they really bring." }));
      } else if (c.net.display === false) lines.push(F("OK", K("display"), "Display Network", "off"));
    }

    // Who counts as "in" the place
    if (["SEARCH", "SHOPPING", "DISPLAY", "PERFORMANCE_MAX"].includes(c.channel)) {
      const interest = c.byGeo.AREA_OF_INTEREST; const presence = c.byGeo.LOCATION_OF_PRESENCE;
      const wide = c.geo.pos === "PRESENCE_OR_INTEREST" || c.geo.pos === "SEARCH_INTEREST";
      const place = brief.where.length ? brief.where.join(", ") : "your area";
      if (wide && brief.reach === "there") {
        const pc = presence ? cpa(presence) : null; const ic = interest ? cpa(interest) : null;
        const fine = !distorted && interest && interest.cost > 0 && ic !== null && pc !== null && ic <= pc * RULES.worse;
        const outside = c.locations.length ? `outside ${c.locations[0].split(",")[0]}${c.locations.length > 1 ? " and the other places it targets" : ""}` : `not in ${place}`;
        if (fine) lines.push(F("CHECK", K("geo"), "Location option", `"Presence or interest": also people ${outside} who search about it. Not what you asked for, but it pays: ${money(interest.cost)} there, ${got(interest)} at ${money(ic, true)} each (people in the area: ${money(pc, true)}). Your call.`, { money: 0, fix: `Campaigns → ${q(c.name)} → Settings → Locations → Location options → "Presence".`, op: { type: "geo", campaignId: c.id, campaign: c.name, label: "location option set to Presence", say: `location option set to Presence in ${c.name}` } }));
        else lines.push(F(["SEARCH", "PERFORMANCE_MAX"].includes(c.channel) && (!interest || interest.cost === 0 || enough(interest, refFor(c))) && !(distorted && interest?.conv > 0) ? "WRONG" : "CHECK", K("geo"), "Location option", `"Presence or interest": your ads also reach people who are ${outside}, only searching about it${interest && interest.cost > 0 ? ` · ${money(interest.cost)} went to them, ${distorted && interest.conv > 0 ? `${fmtN(interest.conv)} results counted` : got(interest)}` : model.known.geo ? " · nothing spent on them yet" : ""}`, { money: distorted && interest?.conv > 0 ? 0 : interest?.cost || 0, op: { type: "geo", campaignId: c.id, campaign: c.name, label: "location option set to Presence", say: `location option set to Presence in ${c.name}` }, fix: `Campaigns → ${q(c.name)} → Settings → Locations → Location options → "Presence: People in or regularly in your included locations".`, wrong: "If out-of-towners do buy from you (hotels, movers, real estate, events), tell me and the brief changes to keep them." }));
      } else if (!wide && c.geo.pos === "PRESENCE" && brief.reach === "interested") {
        lines.push(F("CHECK", K("geo"), "Location option", `"Presence": only people physically in ${place}. You said people elsewhere searching about it count too; they don't see your ads now.`, { fix: `Campaigns → ${q(c.name)} → Settings → Locations → Location options → "Presence or interest".` }));
      } else if (c.geo.pos === "PRESENCE") lines.push(F("OK", K("geo"), "Location option", "Presence: people in the place"));
      else if (wide) lines.push(F("OK", K("geo"), "Location option", "Presence or interest, as you asked"));

      // Where
      const shown = [...c.locations, ...c.radius];
      if (!shown.length && model.truncated.has("campaignCriteria")) { /* the list was cut short: no verdict */ }
      else if (!shown.length) lines.push(F(brief.where.length ? "WRONG" : "CHECK", K("where"), "Locations", `none set: this campaign can show in every country${brief.where.length ? `. You said ${brief.where.join(", ")}` : ""}`, { fix: `Campaigns → ${q(c.name)} → Settings → Locations → enter your places.` }));
      else if (brief.where.length) {
        const hayWords = words(shown.join(" "));
        // "Milano" is Google's "Milan": the same first letters count as the same place.
        const same = (x, y) => { if (x === y) return true; const n = Math.min(x.length, y.length); if (n < 4) return false; let i = 0; while (i < n && x[i] === y[i]) i++; return i >= Math.max(4, Math.ceil(n * 0.8)); };
        const hit = brief.where.some((w) => words(w).some((x) => x.length > 2 && hayWords.some((y) => same(x, y))));
        const list = shown.slice(0, 4).join("; ") + (shown.length > 4 ? `; +${shown.length - 4} more` : "");
        const wholeCountry = c.locations.length > 0 && c.locations.every((n) => !n.includes(",")) && !c.radius.length;
        if (hit) lines.push(F("OK", K("where"), "Locations", list));
        else if (wholeCountry) lines.push(F("WRONG", K("where"), "Locations", `shows in all of ${list}. You said ${brief.where.join(", ")}.`, { optionTitle: `Narrow ${q(c.name)} from ${list} to ${brief.where.join(", ")}`, fix: `Campaigns → ${q(c.name)} → Settings → Locations → remove ${list}, enter ${brief.where.join(", ")} (or a radius around your address).`, wrong: "If people across the whole country do come to you, tell me and the brief changes." }));
        else lines.push(F("CHECK", K("where"), "Locations", `shows in ${list}. You said ${brief.where.join(", ")}. Is that the same place?`, { fix: `Campaigns → ${q(c.name)} → Settings → Locations.` }));
      }
      if (brief.languages.length && c.languages.length) {
        const hay = c.languages.join(" ").toLowerCase();
        if (!brief.languages.some((l) => hay.includes(l.toLowerCase()))) lines.push(F("CHECK", K("lang"), "Languages", `set to ${c.languages.join(", ")}. You said ${brief.languages.join(", ")}.`, { fix: `Campaigns → ${q(c.name)} → Settings → Languages.` }));
      }
    }

    if (c.channel === "SEARCH") {
      // AI Max and its parts
      const few = c.conv < RULES.bid_judge;
      if (c.aiMax === true && brief.allow.ai_max) lines.push(F("OK", K("aimax"), "AI Max", "on, as you asked"));
      else if (c.aiMax === true) {
        const parts = [c.autoText === true && !brief.allow.ai_text ? "it may rewrite your ad text" : null, c.urlExpansion === true && !brief.allow.url_expansion ? "it may send clicks to other pages of your site" : null].filter(Boolean);
        const ai = c.bySource?.aiMax; const mine = c.bySource?.yours;
        const off = `Campaigns → Settings → ${q(c.name)} → AI Max → switch it off (that also stops text customization and final URL expansion). To keep the wider matching only: leave it on and switch off those two inside it.`;
        const base = `on: Google shows your ads on searches beyond your keywords${parts.length === 2 ? ", and may rewrite your ad text and pick other pages of your site" : parts.length ? `, and ${parts[0]}` : ""}`;
        if (model.truncated.has("matchSources")) lines.push(F("CHECK", K("aimax"), "AI Max", `${base}. This account has more searches than the export carries, so what AI Max's own searches cost can't be added up here: read Campaigns → Insights and reports → Search terms, filtered by match type "AI Max".`, { fix: off }));
        else if (ai && ai.cost > 0) {
          const ac = cpa(ai); const mc = mine ? cpa(mine) : mainCpa;
          const good = ac !== null && (mc === null ? (!ref || ac <= ref) : ac <= mc * RULES.worse);
          if (distorted && ac !== null) lines.push(F("CHECK", K("aimax"), "AI Max", `${base} · ${money(ai.cost)} went to searches it picked itself (${fmtN(ai.conv)} results counted); ${CANT}.`, { fix: off }));
          else if (!good && !enough(ai, refFor(c))) lines.push(F("CHECK", K("aimax"), "AI Max", `${base} · ${money(ai.cost)} went to searches it picked itself, ${got(ai)}: ${TOO_LITTLE}.`, { fix: off }));
          else if (good) lines.push(F("CHECK", K("aimax"), "AI Max", `${base}. It pays so far: ${money(ai.cost)} on its own searches, ${got(ai)} at ${money(ac, true)} each${mc ? ` (your keywords: ${money(mc, true)})` : ""}. Keep it${parts.length ? ", and decide about the text and page parts" : ""}.`, { fix: off }));
          else lines.push(F("WRONG", K("aimax"), "AI Max", `${base} · ${money(ai.cost)} went to searches it picked itself, ${got(ai)}${ac ? ` at ${money(ac, true)} each` : ""}${mc ? ` (your keywords: ${money(mc, true)} each)` : ""}`, { money: ai.cost, op: { type: "aimax", campaignId: c.id, campaign: c.name, label: "AI Max off", say: `AI Max off in ${c.name}` }, fix: off, wrong: "AI Max can find searches your keywords miss. Once the campaign is steady, switch it back on as a test for 4 weeks and read what it matched." }));
        } else lines.push(F(few ? "WRONG" : "CHECK", K("aimax"), "AI Max", `${base}${few ? `. With ${got(c)} in ${model.days} days it has little to learn from` : ". It has data to work with here; read its searches before deciding"}. Google switches it on in every new Search campaign.`, { op: few ? { type: "aimax", campaignId: c.id, campaign: c.name, label: "AI Max off", say: `AI Max off in ${c.name}` } : undefined, fix: off, wrong: "AI Max can find searches your keywords miss. Once the campaign is steady, switch it on as a test for 4 weeks and read what it matched." }));
      } else if (c.aiMax === false) lines.push(F("OK", K("aimax"), "AI Max", "off"));
      if (c.aiMax !== true && c.broad === true && !brief.allow.ai_max) lines.push(F("CHECK", K("broad"), "Broad match for the whole campaign", "on: every keyword is treated as broad match, whatever you typed. Google is moving these campaigns to AI Max.", { fix: `Campaigns → Settings → ${q(c.name)} → Broad match keywords → off.` }));
    }
    if (c.channel === "PERFORMANCE_MAX") {
      if (c.urlExpansion === true && !brief.allow.url_expansion) lines.push(F("CHECK", K("urlexp"), "Final URL expansion", "on: Google may send clicks to any page of your site (the blog, the careers page), not the one you chose.", { fix: `Campaigns → ${q(c.name)} → Settings → Final URL expansion → off, or keep it and exclude the pages that can't sell.` }));
      if (brief.brand.length && c.brandExcluded === false) lines.push(F("CHECK", K("brand"), "Your own name", `no brand exclusion: Performance Max can buy searches for ${q(brief.brand[0])}, people who were coming to you anyway, and count them as its results.`, { fix: `Campaigns → ${q(c.name)} → Settings → Brand exclusions → add your brand list.` }));
      const poor = model.assetGroups.filter((g) => g.campaignId === c.id && g.strength === "POOR");
      if (poor.length) lines.push(F("CHECK", K("ag"), "Asset groups", `${poor.map((g) => q(g.name)).join(", ")} rated Poor: missing images, video or text. Google fills the gaps with auto-made ones.`, {}));
    }

    // Bidding against the data there is
    const bidName = BID[c.bidding] || c.bidding.toLowerCase().replace(/_/g, " ");
    const smart = SMART.has(c.bidding);
    const noTracking = model.known.tracking && (!prim.length || (totals.conv === 0 && totals.clicks >= RULES.tracking_clicks));
    if (smart && noTracking) lines.push(F("WRONG", K("bid"), "Bidding", `${bidName}, with no conversions coming in: Google is bidding for something it can't see. Fix the tracking first; until then use Maximize clicks with a top bid.`, { fix: `Campaigns → ${q(c.name)} → Settings → Bidding → Change bid strategy → Maximize clicks → set a maximum CPC bid limit.` }));
    else if (c.bidding === "TARGET_ROAS" && totals.conv < RULES.bid_learn) lines.push(F("CHECK", K("bid"), "Bidding", `Target ROAS, and the account has ${got(totals)} in ${model.days} days. Google asks for at least ${RULES.bid_learn} in 30 days before Target ROAS; under that the bids swing.`, { fix: `Campaigns → ${q(c.name)} → Settings → Bidding. Either keep it and wait, or use Maximize conversion value with no target until it passes ${RULES.bid_learn}: with no target Google spends the whole budget, so set the budget to what you can afford first.` }));
    else if (smart && c.tcpa && inflated && (perCampaign ? cpa(c) : cpa(totals)) && c.tcpa < (perCampaign ? cpa(c) : cpa(totals)) * RULES.target_tight) lines.push(F("WRONG", K("bid"), "Bidding", `the target is ${money(c.tcpa, true)}, set while page views were counted as results. A real ${goal.one} costs about ${money(perCampaign ? cpa(c) : cpa(totals), true)}${perCampaign ? " here" : " across the account"}. The day the tracking is fixed, this target will choke the campaign.`, { optionTitle: `Raise the target in ${q(c.name)} to about ${money((perCampaign ? cpa(c) : cpa(totals)) * 0.9, true)}, the same day the tracking is fixed`, fix: `Campaigns → ${q(c.name)} → Settings → Bidding → set the target near ${money((perCampaign ? cpa(c) : cpa(totals)) * 0.9, true)}. Do it together with option 1, not before.`, top: 2, wrong: "A higher target lets Google pay more per click. It is the real cost today, only hidden; step it down 10 to 15% at a time once real results come in." }));
    else if (smart && c.tcpa && cpa(c) && c.tcpa < cpa(c) * RULES.target_tight) lines.push(F("CHECK", K("bid"), "Bidding", `the target is ${money(c.tcpa, true)} per ${goal.one}; it has really cost ${money(cpa(c), true)}. A target that far under holds your ads back${c.lostRank ? ` (you miss ${pct(c.lostRank)} of searches on rank)` : ""}.`, { fix: `Set the target near what it costs now (${money(cpa(c) * 0.9, true)}), then step down 10 to 15% at a time, two weeks apart.` }));
    else if (smart && c.conv < RULES.bid_learn && c.cost > 0) lines.push(F("CHECK", K("bid"), "Bidding", `${bidName} with ${got(c)} in ${model.days} days: little for Google to learn from. Either wait (keep the budget steady), or use Maximize clicks with a top bid until it reaches ${RULES.bid_learn}.`, {}));
    else if ((c.bidding === "TARGET_SPEND" || c.bidding === "MANUAL_CPC" || c.bidding === "ENHANCED_CPC") && c.conv >= RULES.bid_judge) lines.push(F("CHECK", K("bid"), "Bidding", `${bidName}, and ${got(c)} in ${model.days} days: enough for Google to bid for ${goal.many} instead of clicks.`, { fix: `Campaigns → ${q(c.name)} → Settings → Bidding → Maximize conversions${ref ? `, then a target of ${money(Math.max(ref, cpa(c) || ref), true)} once it settles` : ""}.` }));
    else if (c.bidding === "TARGET_IMPRESSION_SHARE" && !/brand/i.test(c.name)) lines.push(F("CHECK", K("bid"), "Bidding", "Target impression share: it pays for position, not for results. Right for your own brand name, rarely for anything else.", {}));
    else if (c.bidding !== "UNKNOWN") lines.push(F("OK", K("bid"), "Bidding", `${bidName}${c.tcpa ? `, target ${money(c.tcpa, true)}` : ""}${c.troas ? `, target ${c.troas.toFixed(2)}×` : ""}${c.portfolio && !c.tcpa && !c.troas ? " (a shared strategy: its target isn't in the export)" : ""}`));

    // Runs out of budget
    if (c.lostBudget !== null && c.lostBudget >= RULES.lost_budget && c.channel === "SEARCH") {
      const cc = cpa(c); const roas = c.cost > 0 && c.value > 0 ? c.value / c.cost : null;
      const byReturn = brief.goal === "sales" && brief.target_roas && roas !== null;
      const lim = refFor(c);
      const good = byReturn ? roas >= brief.target_roas : cc !== null && lim && cc <= lim;
      const bad = byReturn ? roas < brief.target_roas : cc !== null && lim && cc > lim;
      const now = byReturn ? `it returns ${roas.toFixed(2)}× (you want ${brief.target_roas}×)` : cc !== null && lim ? `each ${goal.one} costs ${money(cc, true)} (your limit: ${money(lim, true)})` : "";
      if (inflated && !perCampaign) lines.push(F("CHECK", K("lost"), "Budget", `runs out: it misses ${pct(c.lostBudget)} of the searches it could show on. Whether it deserves more can't be judged until the tracking is fixed.`, {}));
      else if (good && budgetOver) lines.push(F("CHECK", K("lost"), "Budget", `runs out (misses ${pct(c.lostBudget)} of searches) while ${now}. It deserves more, but your budgets already add up to more than your month: move money here from a campaign that does worse, don't add.`, {}));
      else if (good && c.sharedBudget) lines.push(F("CHECK", K("lost"), "Budget", `runs out: it misses ${pct(c.lostBudget)} of the searches it could show on, while ${now}. Its budget is shared with other campaigns, so a raise here raises it for all of them: decide that by hand.`, { fix: "Tools → Budgets and bidding → Shared budgets." }));
      else if (good) {
        const up = Math.round(c.budgetDay * 1.2 * 100) / 100;
        lines.push(F("CHECK", K("lost"), "Budget", `runs out: it misses ${pct(c.lostBudget)} of the searches it could show on, while ${now}. More budget here buys more of the same.`, { op: { type: "budget", campaignId: c.id, campaign: c.name, from: c.budgetDay, to: up, say: `daily budget of ${c.name} from ${m2(c.budgetDay)} to ${m2(up)}` }, optionTitle: `Raise ${q(c.name)} from ${m2(c.budgetDay)} to ${m2(up)} a day (+20%)`, wrong: "The extra searches may cost a little more each than the ones you get now. One 20% step, then look again in two weeks." }));
      } else if (bad) lines.push(F("CHECK", K("lost"), "Budget", `runs out (misses ${pct(c.lostBudget)} of searches), and ${now}. More budget would buy more of the dear ones. Lower the bids or the target instead, so the same money buys more clicks.`, {}));
      else lines.push(F("CHECK", K("lost"), "Budget", `runs out: it misses ${pct(c.lostBudget)} of the searches it could show on.`, {}));
    }

    // Shown outside the hours someone answers
    if (brief.hours && c.byHour) {
      const [open, close] = brief.hours; const inH = (h) => (open <= close ? h >= open && h < close : h >= open || h < close);
      const out = blank(); const inn = blank();
      for (const [h, s] of Object.entries(c.byHour)) { const t = inH(+h) ? inn : out; t.cost += s.cost; t.conv += s.conv; }
      if (out.cost > 0 && c.cost > 0 && out.cost / c.cost >= 0.1 && (out.conv === 0 || (cpa(inn) && cpa(out) > cpa(inn) * RULES.worse))) lines.push(F("CHECK", K("hours"), "Ad schedule", `${money(out.cost)} (${pct(out.cost / c.cost)}) was spent outside ${open}:00 to ${close}:00, ${got(out)}${c.schedule.length ? "" : ". No schedule is set, so the ads run all night"}.`, { money: out.conv === 0 ? out.cost : 0, fix: `Campaigns → ${q(c.name)} → Ad schedule → add your opening hours.` }));
    }

    if (brief.hours && c.channel === "SEARCH" && !c.schedule.length && !lines.some((l) => l.key === K("hours"))) lines.push(F("CHECK", K("hours"), "Ad schedule", `none: the ads run day and night, and you answer from ${brief.hours[0]}:00 to ${brief.hours[1]}:00.${c.byHour ? "" : " The export has no split by hour, so I can't say what the other hours cost."}`, { fix: `Campaigns → ${q(c.name)} → Ad schedule → add your opening days and hours.` }));

    // Extras under the ad
    if (c.channel === "SEARCH" && model.known.assets) {
      const a = c.assets; const miss = [];
      const sl = a.SITELINK || 0;
      if (sl < RULES.sitelinks) miss.push(sl ? `${sl} sitelink${sl > 1 ? "s" : ""} (Google suggests ${RULES.sitelinks} or more)` : "no sitelinks");
      if (!a.CALLOUT) miss.push("no callouts");
      if (!a.STRUCTURED_SNIPPET) miss.push("no structured snippets");
      if (!a.AD_IMAGE) miss.push("no images");
      if ((brief.goal === "calls" || brief.goal === "leads") && !a.CALL) miss.push(brief.goal === "calls" ? "no call asset, and calls are the goal" : "no call asset");
      const hard = (brief.goal === "calls" && !a.CALL) || sl === 0;
      if (miss.length) lines.push(F(hard ? "WRONG" : "CHECK", K("assets"), "Extras under your ads", `${miss.join(", ")}. They make the ad bigger at no extra cost per click.`, { fix: "Assets → + → add them at account level so every campaign gets them.", extras: true }));
      else lines.push(F("OK", K("assets"), "Extras under your ads", `${sl} sitelinks, callouts, snippets, images`, { extras: true }));
    }
    const heavy = c.cost >= Math.max(totals.cost * 0.1, (ref || 0) * RULES.off_multiple);
    if (c.channel === "SEARCH" && model.known.terms && heavy && !/brand/i.test(c.name) && !c.negatives.length && !c.lists.length && !c.groups.some((g) => g.negatives.length)) lines.push(F("CHECK", K("noneg"), "Negative keywords", "none at all: nothing stops this campaign showing on searches you'd never want.", {}));

    // The whole campaign spent several times the limit and brought nothing.
    const limit = refFor(c) || cpa(totals);
    if (c.conv === 0 && limit && c.cost >= limit * RULES.look_multiple && c.cost < limit * RULES.off_multiple && !noTracking) lines.push(F("CHECK", K("dead"), "Results", `${money(c.cost)} in ${model.days} days and 0 ${goal.many} so far (${(c.cost / limit).toFixed(1)}× ${refFor(c) ? "your limit" : `what a ${goal.one} costs you elsewhere`}). Not enough to cut on the numbers alone; say what it's for, or watch it.`, {}));
    const direct = ["SEARCH", "SHOPPING", "PERFORMANCE_MAX"].includes(c.channel);
    if (c.conv === 0 && limit && c.cost >= limit * RULES.off_multiple && !noTracking && !direct) lines.push(F("CHECK", K("dead"), "Results", `${money(c.cost)} in ${model.days} days and 0 ${goal.many} (${(c.cost / limit).toFixed(1)}× ${refFor(c) ? "your limit" : `what a ${goal.one} costs you elsewhere`}). ${CHANNEL[c.channel] || "This kind of"} campaigns are often run to be seen, not to bring ${goal.many} directly: if that's not why this one runs, pause it.`, { fix: `Campaigns → tick ${q(c.name)} → Edit → Pause.` }));
    if (c.conv === 0 && limit && c.cost >= limit * RULES.off_multiple && !noTracking && direct) lines.push(F("WRONG", K("dead"), "Results", `${money(c.cost)} in ${model.days} days and 0 ${goal.many}: ${(c.cost / limit).toFixed(1)}× ${refFor(c) ? `your limit of ${money(refFor(c), true)}` : `what a ${goal.one} costs you elsewhere (${money(limit, true)})`}.`, { money: c.cost, op: { type: "pauseCampaign", campaignId: c.id, campaign: c.name, say: `campaign ${c.name} paused` }, optionTitle: `Pause ${q(c.name)} (${money(c.cost)} in ${model.days} days, 0 ${goal.many})`, fix: `Campaigns → tick ${q(c.name)} → Edit → Pause.`, wrong: `If it brings ${goal.many} Google can't count (phone calls nobody tracks, walk-ins), it looks dead and isn't. Paused isn't deleted: it comes back in one click.` }));

    const head = inflated && !perCampaign ? `${q(c.name)} · ${CHANNEL[c.channel] || c.channel} · ${m2(c.budgetDay)} a day · ${money(c.cost)} spent, ${fmtN(Math.round(c.conv))} results counted (page views among them)` : `${q(c.name)} · ${CHANNEL[c.channel] || c.channel} · ${m2(c.budgetDay)} a day · ${money(c.cost)} spent, ${got(c)}${cpa(c) ? ` at ${money(cpa(c), true)}` : ""}${c.counted !== undefined && c.counted !== c.conv ? ` (Google counted ${fmtN(Math.round(c.counted))})` : ""}`;
    settings.push({ campaign: c, head, lines, deep: ["SEARCH", "PERFORMANCE_MAX"].includes(c.channel) });
  }

  // The same thing in several campaigns (the extras, the languages, no schedule) is said once.
  for (const name of ["Extras under your ads", "Languages", "Ad schedule"]) {
    const same = settings.map((s) => ({ s, l: s.lines.find((x) => x.name === name && x.tag !== "OK") })).filter((x) => x.l);
    if (same.length > 1 && same.every((x) => x.l.text === same[0].l.text && x.l.tag === same[0].l.tag)) {
      for (const x of same) x.s.lines = x.s.lines.filter((y) => y !== x.l);
      const l = same[0].l;
      track.push({ ...l, key: `${l.key.split(":")[0]}:all`, extras: true, op: undefined, text: l.extras ? l.text : `${l.text} (${same.length} campaigns: ${same.map((x) => x.s.campaign.name).join(", ")})`, fix: (l.fix || "").replace(`${q(same[0].s.campaign.name)} → `, "each campaign → ") });
    }
  }

  // ---- budgets against the month
  const budgetLines = [];
  const daily = dailyAll;
  const monthMax = daily * RULES.month_days;
  if (brief.monthly_budget && monthMax > brief.monthly_budget * RULES.budget_over) budgetLines.push(F("WRONG", "budget:month", "Budgets", `your daily budgets add up to ${m2(daily)}, which Google may bill as ${money(monthMax)} a month (30.4 × the daily amount). You said ${money(brief.monthly_budget)}.`, { fix: `Lower the daily budgets until they add up to ${money(brief.monthly_budget / RULES.month_days, true)}: Campaigns → the budget column → the pencil.`, optionTitle: `Bring the daily budgets down from ${m2(daily)} to ${money(brief.monthly_budget / RULES.month_days, true)} in total, to fit ${money(brief.monthly_budget)} a month` }));
  else if (brief.monthly_budget && daily > 0) budgetLines.push(F("OK", "budget:month", "Budgets", `${m2(daily)} a day in total, at most ${money(monthMax)} a month (you said ${money(brief.monthly_budget)}). One day can reach ${m2(daily * RULES.day_burst)}: Google may spend up to twice the daily budget.`));

  // ---- searches that paid nothing
  const searches = [];
  for (const c of searchLive) {
    const terms = c.terms.filter((t) => !/EXCLUDED/.test(t.status));
    if (!terms.length) continue;
    const kwWords = new Set(); const kwTexts = new Set();
    for (const g of c.groups) for (const k of g.keywords) { kwTexts.add(k.text.toLowerCase()); for (const w of keyWords(k.text)) kwWords.add(w); }
    for (const w of [...brief.brand, ...brief.where, brief.business, ...brief.keep].flatMap((s) => keyWords(s))) kwWords.add(w);
    const blocked = new Set([...c.negatives, ...c.lists.flatMap((l) => l.words), ...c.groups.flatMap((g) => g.negatives)].map((n) => n.text));
    const isBlocked = (t) => [...blocked].some((b) => b && (t === b || ` ${t} `.includes(` ${b} `)));
    const open = terms.filter((t) => !isBlocked(t.text));
    const sum = open.reduce((s, t) => (s.cost += t.cost, s.conv += t.conv, s.clicks += t.clicks, s), blank());
    const zero = open.filter((t) => t.conv === 0);
    const zeroCost = zero.reduce((s, t) => s + t.cost, 0);
    const cRef = refFor(c) || cpa(c);

    // Words that keep appearing in searches that paid nothing. A word is written the way people
    // typed it (accents kept: to Google "università" and "universita" are two negatives) and
    // compared without them.
    const byWord = new Map();
    for (const t of open) for (const w of new Set(typed(t.text))) {
      const plain = bare(w);
      if (w.length < 2 || isStop(w) || kwWords.has(plain) || /^\d+$/.test(w)) continue;
      const e = byWord.get(w) || { word: w, cost: 0, conv: 0, clicks: 0, terms: [] };
      e.cost += t.cost; e.conv += t.conv; e.clicks += t.clicks; e.terms.push(t); byWord.set(w, e);
    }
    // A word blocks more than a search does, so it needs at least as much behind it: 3× the
    // target across 2+ searches. Words that are almost never a buyer (jobs, salary, diy…) need
    // half the target: the doubt there is the money, not the meaning.
    const wordNeg = [];
    for (const e of byWord.values()) {
      if (e.conv > 0 || e.cost <= 0) continue;
      const known = WASTE_WORDS.has(bare(e.word));
      const knownOk = known && (cRef ? e.cost >= cRef * 0.5 : e.clicks >= RULES.off_clicks / 4);
      const heavy = e.terms.length >= 2 && (cRef ? e.cost >= cRef * RULES.off_multiple : e.clicks >= RULES.off_clicks);
      if (knownOk || heavy) wordNeg.push({ ...e, why: known ? "rarely a buyer" : `in ${e.terms.length} searches, ${cRef ? `${(e.cost / cRef).toFixed(1)}× ${refFor(c) ? "your target" : `what a ${goal.one} costs here`}` : `${e.clicks} clicks`}` });
    }
    wordNeg.sort((a, b) => b.cost - a.cost);
    const covered = new Set(wordNeg.flatMap((e) => e.terms.map((t) => t.text)));
    // single searches that spent several times the target
    const dead = zero.filter((t) => !covered.has(t.text) && (cRef ? t.cost >= cRef * RULES.off_multiple : t.clicks >= RULES.off_clicks)).sort((a, b) => b.cost - a.cost);
    // Worth a look: over the target, or simply among the biggest spenders that brought nothing.
    const rest = zero.filter((t) => !covered.has(t.text) && !dead.includes(t) && !brief.keep.includes(t.text)).sort((a, b) => b.cost - a.cost);
    const floor = Math.max(sum.cost * 0.02, 0.01);
    const look = rest.filter((t, i) => (cRef && t.cost >= cRef * RULES.look_multiple) || (i < 5 && t.cost >= floor && t.clicks >= 3));
    const winners = distorted ? [] : open.filter((t) => t.conv >= 2 && t.status === "NONE" && !kwTexts.has(t.text)).sort((a, b) => b.conv - a.conv).slice(0, 5);
    const wasted = [...covered].reduce((s, text) => s + (open.find((t) => t.text === text)?.cost || 0), 0) + dead.reduce((s, t) => s + t.cost, 0);
    const cut = model.truncated.has("searchTerms");
    const hidden = cut ? 0 : Math.max(0, (c.byNetwork.SEARCH ? c.byNetwork.SEARCH.cost + (c.byNetwork.SEARCH_PARTNERS?.cost || 0) : c.cost) - c.terms.reduce((s, t) => s + t.cost, 0));

    const negs = [
      ...wordNeg.slice(0, 12).map((e) => ({ text: e.word, match: "PHRASE", cost: e.cost, clicks: e.clicks, n: e.terms.length, why: e.why, sample: e.terms.sort((a, b) => b.cost - a.cost).slice(0, 2).map((t) => t.text) })),
      ...dead.slice(0, 10).map((t) => ({ text: t.text, match: "EXACT", cost: t.cost, clicks: t.clicks, n: 1, why: cRef ? `${(t.cost / cRef).toFixed(1)}× ${refFor(c) ? "your target" : `what a ${goal.one} costs here`}, nothing back` : `${t.clicks} clicks, nothing back`, sample: [] })),
    ];
    const block = { campaign: c, sum, zeroCost, wasted, negs, look: look.slice(0, 8), winners, hidden, shown: terms.length };
    searches.push(block);
    if (negs.length) opt({
      key: `neg:${c.id}`, money: wasted,
      title: `Block ${plural(negs.length, "search", "searches")} that never paid in ${q(c.name)} (${money(wasted)} in ${model.days} days, 0 ${goal.many})`,
      why: negs.slice(0, 4).map((n) => (n.match === "PHRASE" ? `"${n.text}"` : `[${n.text}]`)).join(", ") + (negs.length > 4 ? `, +${negs.length - 4} more` : ""),
      wrong: "A blocked word also blocks every future search containing it. Read the list first and say which to leave out; a negative comes off in one click.",
      ops: negs.map((n) => ({ type: "negative", campaignId: c.id, campaign: c.name, text: n.text, match: n.match, say: `${n.match === "PHRASE" ? `"${n.text}"` : `[${n.text}]`} blocked in ${c.name}` })),
      hand: `Campaigns → Audiences, keywords, and content → Search keywords → Negative search keywords → + → choose ${q(c.name)} → paste the list.`,
    });
  }

  // ---- keywords
  const keywords = { off: [], lowQs: [], crowded: [], broad: null };
  for (const c of searchLive) {
    const cRef = refFor(c) || cpa(c);
    for (const g of c.groups) {
      for (const k of g.keywords) {
        if (k.conv === 0 && (cRef ? k.cost >= cRef * RULES.off_multiple : k.clicks >= RULES.off_clicks)) keywords.off.push({ ...k, group: g.name, campaign: c.name, times: cRef ? k.cost / cRef : null, timesOf: refFor(c) ? "your target" : `what a ${goal.one} costs here` });
        else if (k.qs && k.qs <= RULES.qs_low && k.cost > 0 && (!cRef || k.cost >= cRef / 2)) keywords.lowQs.push({ ...k, group: g.name, campaign: c.name });
      }
      if (g.keywords.length > RULES.group_keywords) keywords.crowded.push({ group: g.name, campaign: c.name, n: g.keywords.length });
    }
  }
  keywords.off.sort((a, b) => b.cost - a.cost); keywords.lowQs.sort((a, b) => b.cost - a.cost);
  const allKw = searchLive.flatMap((c) => c.groups.flatMap((g) => g.keywords));
  const br = allKw.filter((k) => k.match === "BROAD").reduce((s, k) => (s.cost += k.cost, s.conv += k.conv, s), blank());
  const nb = allKw.filter((k) => k.match !== "BROAD").reduce((s, k) => (s.cost += k.cost, s.conv += k.conv, s), blank());
  if (br.cost > 0 && nb.cost > 0) keywords.broad = { broad: br, other: nb, worse: cpa(br) === null ? br.cost >= (ref || cpa(nb) || Infinity) : cpa(nb) !== null && cpa(br) > cpa(nb) * RULES.worse };
  if (keywords.off.length) {
    const sumOff = keywords.off.reduce((s, k) => s + k.cost, 0);
    opt({
      key: "kw:off", money: sumOff,
      title: `Pause ${plural(keywords.off.length, "keyword", "keywords")} that spent ${money(sumOff)} for 0 ${goal.many}`,
      why: keywords.off.slice(0, 3).map((k) => `${matchSay(k)} ${money(k.cost)}${k.times ? `, ${k.times.toFixed(1)}× ${k.timesOf}` : `, ${k.clicks} clicks`}`).join(" · "),
      wrong: "A keyword can go a month dry and still be a good one over a quarter. Paused isn't deleted: it comes back in one click with its history.",
      ops: keywords.off.map((k) => ({ type: "pauseKeyword", adGroupId: k.groupId, criterionId: k.id, campaign: k.campaign, text: k.text, say: `${matchSay(k)} paused in ${k.group}` })),
      hand: "Campaigns → Audiences, keywords, and content → Search keywords → tick them → Edit → Pause.",
    });
  }

  // ---- settings as options (after the lists so money decides the order)
  for (const s of settings) for (const l of s.lines) {
    if (l.tag === "OK" || (!l.op && !l.fix)) continue;
    if (l.tag === "CHECK" && !l.op) continue;
    opt({
      key: l.key, money: l.money || 0,
      title: l.optionTitle || (l.op ? `${cap(l.op.label || l.op.say)} in ${q(s.campaign.name)}${l.money ? ` (${money(l.money)} went there in ${model.days} days)` : ""}` : `${l.name}: fix it in ${q(s.campaign.name)}`),
      why: `${l.name}: ${l.text}`, wrong: l.wrong || "It's a setting: it goes back in one click.",
      ops: l.op ? [l.op] : [], hand: l.fix || "", soft: l.tag === "CHECK", top: l.top,
    });
  }
  for (const l of [...track, ...budgetLines]) if (l.tag === "WRONG" && !l.extras) opt({ key: l.key, money: 0, title: l.optionTitle || `Fix: ${l.name.toLowerCase()}`, why: l.text, wrong: "Nothing is lost: the old numbers stay in the reports.", ops: [], hand: l.fix || "", top: true });

  // ---- ads
  const ads = [];
  for (const c of searchLive) for (const g of c.groups) {
    const kws = [...g.keywords].sort((a, b) => b.cost - a.cost || b.impr - a.impr).map((k) => k.text);
    const rsas = g.ads.filter((a) => a.type === "RESPONSIVE_SEARCH_AD" || a.headlines.length);
    for (const a of rsas) {
      const res = critique({ headlines: a.headlines, descriptions: a.descriptions, finalUrl: a.finalUrl, path1: a.path1, path2: a.path2, strength: a.strength }, { keywords: kws, brand: brief.brand, where: brief.where, group: g.name });
      ads.push({ ad: a, group: g.name, campaign: c.name, keywords: kws.slice(0, 3), ...res });
    }
    const other = g.ads.filter((a) => !rsas.includes(a));
    if (!rsas.length && (g.keywords.length || other.length)) {
      ads.push({ ad: null, group: g.name, campaign: c.name, missing: true, old: other.map((a) => a.type), running: c.clicks > 0 });
      opt({ key: `noad:${g.id}`, money: 0, adSpend: g.keywords.reduce((t, k) => t + k.cost, 0), title: `Write a responsive search ad for ${q(g.name)} (it has none)`, why: "no responsive search ad in the ad group", wrong: "Nothing to lose: the ad group has no current-format ad to compete with.", ops: [], hand: "I write the lines and score them before you see them; you paste them in: Ads → + → Responsive search ad.", write: true });
    }
    else if (rsas.length > RULES.rsa_max) ads.push({ ad: null, group: g.name, campaign: c.name, tooMany: rsas.length });
    for (const a of g.ads) if (/DISAPPROVED/.test(a.approval)) ads.push({ ad: a, group: g.name, campaign: c.name, refused: true });
  }
  const scored = ads.filter((a) => a.score !== undefined).sort((a, b) => a.score - b.score || b.ad.cost - a.ad.cost);
  const weak = scored.filter((a) => a.score < RULES.ad_pass);
  for (const a of weak.slice(0, 3)) opt({
    key: `ad:${a.ad.groupId}:${a.ad.id}`, money: 0, adSpend: a.ad.cost,
    title: `Rewrite the ad in ${q(a.group)} (${a.score}/20${a.ad.cost ? `, ${money(a.ad.cost)} spent through it` : ""})`,
    why: a.lost.slice(0, 3).map((l) => l.note).join(" · "),
    wrong: "The new ad runs next to the old one; the numbers decide which stays.",
    ops: [], hand: "I write the new lines and score them before you see them; you paste them in: Ads → + → Responsive search ad.", write: true,
  });

  // most money first; things that stop everything before all else
  const rank = (o) => (o.top === 2 ? 0.5 : o.top ? 0 : o.write ? 3 : o.soft ? 2 : 1);
  options.sort((a, b) => rank(a) - rank(b) || (b.money || 0) - (a.money || 0) || (b.adSpend || 0) - (a.adSpend || 0));
  options.forEach((o, i) => (o.n = i + 1));

  const allLines = [...track, ...budgetLines, ...settings.flatMap((s) => s.lines)];
  const count = { wrong: allLines.filter((l) => l.tag === "WRONG").length + first.filter((f) => !f.dup).length, check: allLines.filter((l) => l.tag === "CHECK").length, ok: allLines.filter((l) => l.tag === "OK").length };
  return { account: model.account, days: model.days, range: model.range, brief, goal, ref, totals, counted, inflated, perCampaign, truncated: [...model.truncated], prev, first, track, budgetLines, settings, searches, keywords, ads, scored, weak, options, count, errors: model.errors, known: model.known, paused: model.campaigns.filter((c) => c.status === "PAUSED").length };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const listAnd = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
export const matchSay = (k) => (k.match === "EXACT" ? `[${k.text}]` : k.match === "PHRASE" ? `"${k.text}"` : `${k.text} (broad)`);

// ---------------------------------------------------------------- the check as text
export function render(r, { title = "Google Ads check", note = "", limit = 8, all = false } = {}) {
  const money = moneyFn(r.account.currency); const g = r.goal; const L = [];
  const cpa = (s) => (s.conv > 0 ? s.cost / s.conv : null);
  L.push(`${title}${note ? ` (${note})` : ""} · ${r.brief.business || r.account.name || r.account.id} · last ${r.days} days · nothing changed`);
  L.push("");
  const t = r.totals;
  let top = `${money(t.cost)} spent · ${plural(Math.round(t.conv * 10) / 10, g.one, g.many)}${cpa(t) ? ` · ${money(cpa(t), true)} each` : ""}`;
  if (r.brief.goal === "sales" && t.value > 0 && t.cost > 0) top += ` · ${money(t.value)} in sales (${(t.value / t.cost).toFixed(2)}× return)`;
  L.push(top);
  if (r.inflated) L.push(`(Google's own column says ${fmtN(Math.round(r.counted))}: it counts page views as results. See "Needs you first".)`);
  if (r.prev && r.prev.cost > 0 && !r.inflated) {
    const pc = cpa(r.prev); const nc = cpa(t);
    L.push(`The ${r.days} days before: ${money(r.prev.cost)} · ${plural(Math.round(r.prev.conv * 10) / 10, g.one, g.many)}${pc ? ` · ${money(pc, true)} each` : ""}${pc && nc ? ` (now ${Math.abs(nc / pc - 1) < 0.03 ? "about the same" : nc > pc ? `${pct(nc / pc - 1)} dearer` : `${pct(1 - nc / pc)} cheaper`})` : ""}`);
  }
  if (r.brief.set) L.push(`You want: ${g.many}${r.ref ? ` at ${money(r.ref, true)} or less` : ""}${r.brief.target_roas ? ` · ${r.brief.target_roas}× return` : ""}${r.brief.where.length ? ` · from people ${r.brief.reach === "interested" ? "in or searching about" : "in"} ${r.brief.where.join(", ")}` : ""}${r.brief.monthly_budget ? ` · ${money(r.brief.monthly_budget)} a month` : ""}`);
  else L.push("No brief yet: the settings are judged for a business that wants leads from people in its own area. Tell me what you want and the check gets exact.");
  L.push(`Settings: ${r.count.wrong} wrong · ${r.count.check} to check · ${r.count.ok} as you asked`);

  if (r.first.length) { L.push(""); L.push("Needs you first:"); for (const f of r.first) L.push(`  ! ${f.text}`); }

  const inOptions = new Set(r.options.map((o) => o.key));
  const line = (l) => { L.push(`  ${l.tag.padEnd(5)}  ${l.name}: ${l.text}`); if (l.fix && l.tag !== "OK" && !inOptions.has(l.key)) L.push(`         Fix: ${l.fix}`); };
  const acct = [...r.track, ...r.budgetLines];
  if (acct.length) { L.push(""); L.push("The account:"); for (const l of acct) line(l); }
  for (const s of r.settings) {
    if (!s.lines.length) continue;
    const order = { WRONG: 0, CHECK: 1, OK: 2 };
    const sorted = [...s.lines].sort((a, b) => order[a.tag] - order[b.tag]);
    const oks = sorted.filter((l) => l.tag === "OK"); const rest = sorted.filter((l) => l.tag !== "OK");
    L.push("");
    if (!rest.length) { L.push(`${s.head}`); L.push(`  OK     every setting checked is as you asked (${oks.map((l) => l.name.toLowerCase()).join(", ")})`); continue; }
    L.push(`${s.head}`);
    for (const l of rest) line(l);
    if (oks.length) L.push(`  OK     ${oks.map((l) => `${l.name}: ${l.text}`).join(" · ")}`);
  }
  const shallow = r.settings.filter((s) => !s.deep);
  if (shallow.length) { L.push(""); L.push(`  · ${shallow.map((s) => `"${s.campaign.name}"`).join(", ")}: ${shallow.length > 1 ? "these are" : "this is a"} ${[...new Set(shallow.map((s) => CHANNEL[s.campaign.channel] || s.campaign.channel))].join(" / ")} campaign${shallow.length > 1 ? "s" : ""}. Location and bidding are checked; the rest of this check is built for Search.`); }

  const busy = r.searches.filter((s) => s.negs.length || s.look.length || s.winners.length);
  if (busy.length) {
    L.push(""); L.push("Searches people really typed (WASTE: enough spent to block. LOOK: the biggest with nothing back; on topic or not is a judgement):");
    for (const s of busy) {
      L.push(`  "${s.campaign.name}": ${money(s.zeroCost)} of ${money(s.sum.cost)} (${s.sum.cost ? pct(s.zeroCost / s.sum.cost) : "0%"}) went to searches with 0 ${g.many}`);
      for (const n of s.negs.slice(0, limit)) L.push(`  WASTE  ${n.match === "PHRASE" ? `"${n.text}"` : `[${n.text}]`} · ${money(n.cost)} · 0 ${g.many} · ${n.why}${n.sample.length ? ` ("${n.sample[0]}")` : ""}`);
      if (s.negs.length > limit) L.push(`         +${s.negs.length - limit} more: gads searches`);
      for (const t of s.look.slice(0, all ? 8 : 3)) L.push(`  LOOK   "${t.text}" · ${money(t.cost)} · 0 ${g.many}`);
      for (const w of s.winners.slice(0, 1)) L.push(`  ADD    "${w.text}" · ${plural(Math.round(w.conv * 10) / 10, g.one, g.many)} at ${money(w.cost / w.conv, true)}, and it isn't a keyword yet`);
      if (s.hidden > s.campaign.cost * 0.15) L.push(`  · ${money(s.hidden)} went to searches Google doesn't list (too few people typed each one).`);
    }
  } else if (r.searches.length) { L.push(""); L.push(`Searches people really typed: nothing has spent enough with nothing back to block.`); }
  else if (r.known.terms === false) { L.push(""); L.push("Searches: not in this export."); }

  const k = r.keywords;
  if (k.off.length || k.lowQs.length || k.crowded.length || (k.broad && k.broad.worse)) {
    L.push(""); L.push("Keywords:");
    for (const x of k.off.slice(0, limit)) L.push(`  OFF    ${matchSay(x)} · ${money(x.cost)} · 0 ${g.many}${x.times ? ` · ${x.times.toFixed(1)}× ${x.timesOf}` : ` · ${x.clicks} clicks`}`);
    for (const x of k.lowQs.slice(0, 3)) L.push(`  LOW    ${matchSay(x)} · Quality Score ${x.qs}/10 · ${money(x.cost)}${qsSay(x) ? ` · ${qsSay(x)}` : ""}`);
    if (k.broad && k.broad.worse && !(k.off.length && k.off.every((x) => x.match === "BROAD") && k.off.reduce((s2, x) => s2 + x.cost, 0) >= k.broad.broad.cost)) L.push(`  · Broad match: ${money(k.broad.broad.cost)}, ${cpa(k.broad.broad) ? `${money(cpa(k.broad.broad), true)} per ${g.one}` : `0 ${g.many}`}. Phrase and exact: ${cpa(k.broad.other) ? `${money(cpa(k.broad.other), true)} per ${g.one}` : `0 ${g.many}`}.`);
    for (const x of k.crowded.slice(0, 2)) L.push(`  · "${x.group}" holds ${x.n} keywords: one ad can't answer that many different searches. Split it by theme.`);
  }

  if (r.ads.length) {
    L.push(""); L.push(`Your ads (each scored out of 20; ${RULES.ad_pass} passes):`);
    for (const a of r.ads.filter((x) => x.missing)) L.push(`  NONE   "${a.group}" has no responsive search ad${a.old?.length ? ` (only ${a.old.map(adTypeSay).join(", ")})` : ""}: ${a.running ? "whatever shows there is an older kind of ad, or nothing" : "nothing can show"}.`);
    for (const a of r.ads.filter((x) => x.refused)) L.push(`  NO     "${a.group}": an ad is disapproved by Google. Open it in Ads to read the reason.`);
    for (const a of r.weak.slice(0, 4)) {
      L.push(`  ${`${a.score}/20`.padEnd(5)}  "${a.group}" · ${verdict(a.score)}${a.ad.cost ? ` · ${money(a.ad.cost)} spent through it` : ""}`);
      for (const l of a.lost.filter((x) => x.id !== "clean").slice(0, 4)) L.push(`         ${l.points === 0 ? "✗" : "~"} ${l.name}: ${l.note}`);
      for (const e of a.errors.slice(0, 5)) L.push(`         ✗ Google would refuse ${e}`);
    }
    if (r.weak.length > 4) L.push(`         +${r.weak.length - 4} more under ${RULES.ad_pass}: gads critic`);
    const pass = r.scored.filter((a) => a.score >= RULES.ad_pass);
    if (pass.length) L.push(`  PASS   ${pass.slice(0, 5).map((a) => `"${a.group}" ${a.score}/20`).join(" · ")}${pass.length > 5 ? ` · +${pass.length - 5} more` : ""}`);
    for (const a of r.ads.filter((x) => x.tooMany)) L.push(`  · "${a.group}" runs ${a.tooMany} responsive search ads; Google allows 3 and splits the traffic thinner with each.`);
  }

  L.push("");
  if (r.options.length) {
    L.push("Options (say which ones, or none):");
    const shown = all ? r.options : r.options.slice(0, 9);
    for (const o of shown) {
      L.push(`  ${o.n}. ${o.title}`);
      L.push(`     If I'm wrong: ${o.wrong}`);
      if (!o.ops.length) L.push(`     ${o.write ? "How" : "By hand"}: ${o.hand}`);
    }
    if (r.options.length > shown.length) L.push(`  +${r.options.length - shown.length} smaller: gads check --all`);
    const inScript = shown.filter((o) => o.ops.length).map((o) => o.n);
    if (inScript.length) L.push(`  ${inScript.length > 1 ? `Options ${listAnd(inScript.map(String))} go` : `Option ${inScript[0]} goes`} in one change script: you paste it, press Preview, then Run.`);
  } else L.push("Nothing to change today: the settings match what you asked for, and no search or keyword has spent enough to judge.");
  const cutNames = { searchTerms: "search terms", keywords: "keywords", matchSources: "the AI Max split", campaignCriteria: "locations and schedules", adGroupNegatives: "negative keywords", sharedNegatives: "negative keyword lists" };
  const cut = r.truncated.filter((t) => cutNames[t]);
  if (cut.length) { L.push(""); L.push(`Cut short: this account has more ${listAnd([...new Set(cut.map((t) => cutNames[t]))])} than one export carries. The biggest spenders are all here; small ones may be missing, so "none" above means "none among those read".`); }
  const loud = r.errors.filter((e) => !e.quiet);
  if (loud.length) { L.push(""); L.push(`Not read (Google refused ${plural(loud.length, "part", "parts")} of the export): ${loud.map((e) => PART[e.query] || e.query).join(", ")}. Everything above is from what did arrive.`); }
  L.push("");
  L.push("Nothing changes in your account until you press Run in Google Ads.");
  return L.join("\n");
}

// The export's parts, in the person's words.
const PART = {
  campaignAiMax: "the AI Max switch (look at Campaigns → Settings → the campaign → AI Max)", autoApply: "auto-apply recommendations (look at Recommendations → Automatically apply recommendations)",
  campaignAssetAutomation: "text customization and final URL expansion", networks: "the split between Google, search partners and Display", geoTypes: "the split between people in the place and people interested in it",
  searchTerms: "search terms", keywords: "keywords", ads: "ads", adsAll: "ads", conversionActions: "the conversion setup", conversionStats: "results per conversion action",
  campaignCriteria: "locations, languages and schedules", customerAssets: "the extras under the ads", campaignAssets: "the extras under the ads", adGroupAssets: "the extras under the ads",
  adGroups: "ad groups", adGroupNegatives: "ad group negative keywords", sharedSets: "negative keyword lists", campaignSharedSets: "negative keyword lists", sharedNegatives: "negative keyword lists", campaignStats: "campaign totals", customer: "account details",
};

const qsSay = (k) => {
  const low = [];
  if (k.qsCtr === "BELOW_AVERAGE") low.push("expected click rate below average");
  if (k.qsAd === "BELOW_AVERAGE") low.push("ad relevance below average (the ad doesn't say what they typed)");
  if (k.qsPage === "BELOW_AVERAGE") low.push("landing page below average");
  return low.join(", ");
};
const adTypeSay = (t) => ({ EXPANDED_TEXT_AD: "an old expanded text ad", CALL_AD: "a call-only ad, a format Google is retiring", EXPANDED_DYNAMIC_SEARCH_AD: "a dynamic search ad" }[t] || String(t).toLowerCase().replace(/_/g, " "));

/** What changed since the last check: keys that were WRONG and no longer are, and new ones. */
export function since(prevKeys = [], r) {
  const now = new Set([...r.first, ...r.track, ...r.budgetLines, ...r.settings.flatMap((s) => s.lines)].filter((l) => l.tag === "WRONG").map((l) => l.key));
  const before = new Set(prevKeys);
  return { fixed: [...before].filter((k) => !now.has(k)), fresh: [...now].filter((k) => !before.has(k)), keys: [...now] };
}
