// Google Ads skill · what gets read from the account.
//
// One list, used three ways: the export script runs these inside Google Ads (AdsApp.search),
// Google's connector or the API can run the same ones, and the engine reads the rows.
// Every query is read-only. {RANGE} is the last N full days, {PREV} the N days before.
//
// Each query runs on its own: one Google has renamed or switched off for an account lands in
// the export's "errors" list and the rest still arrive. `core: true` marks the ones the check
// can't do without; `quiet: true` the ones not worth a line when Google refuses them.
// Field names checked against Google Ads API v26 (October 2026).

export const DAYS = 30;

/** The LIMIT a query was written with: a result that long was cut short, and the engine says so. */
export const limitOf = (gaql) => { const m = gaql.match(/ LIMIT (\d+)$/); return m ? +m[1] : null; };

export const QUERIES = [
  { name: "customer", core: true, gaql:
    "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.auto_tagging_enabled FROM customer" },

  // Settings: no metrics and no dates, so a campaign that hasn't spent yet still shows up.
  { name: "campaigns", core: true, gaql:
    "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.advertising_channel_sub_type, " +
    "campaign.bidding_strategy_type, campaign.bidding_strategy, campaign.target_cpa.target_cpa_micros, campaign.maximize_conversions.target_cpa_micros, " +
    "campaign.target_roas.target_roas, campaign.maximize_conversion_value.target_roas, " +
    "campaign.network_settings.target_google_search, campaign.network_settings.target_search_network, " +
    "campaign.network_settings.target_content_network, campaign.network_settings.target_partner_search_network, " +
    "campaign.geo_target_type_setting.positive_geo_target_type, campaign.geo_target_type_setting.negative_geo_target_type, " +
    "campaign.campaign_budget, campaign_budget.amount_micros, campaign_budget.explicitly_shared " +
    "FROM campaign WHERE campaign.status != 'REMOVED'" },

  // The newer switches, apart: Google added and renamed these in 2025-2026.
  { name: "campaignAiMax", gaql:
    "SELECT campaign.id, campaign.ai_max_setting.enable_ai_max FROM campaign WHERE campaign.status != 'REMOVED'" },
  { name: "campaignBroad", quiet: true, gaql:
    "SELECT campaign.id, campaign.keyword_match_type FROM campaign WHERE campaign.status != 'REMOVED'" },
  { name: "campaignAssetAutomation", gaql:
    "SELECT campaign.id, campaign.asset_automation_settings FROM campaign WHERE campaign.status != 'REMOVED'" },

  { name: "campaignStats", core: true, gaql:
    "SELECT campaign.id, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.conversions_value, " +
    "metrics.search_impression_share, metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share " +
    "FROM campaign WHERE segments.date BETWEEN {RANGE} AND campaign.status != 'REMOVED'" },
  { name: "campaignStatsPrev", quiet: true, gaql:
    "SELECT campaign.id, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.conversions_value " +
    "FROM campaign WHERE segments.date BETWEEN {PREV} AND campaign.status != 'REMOVED'" },

  // Where the money went: Google's own results, search partners, the Display Network.
  { name: "networks", gaql:
    "SELECT campaign.id, segments.ad_network_type, metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.conversions_value " +
    "FROM campaign WHERE segments.date BETWEEN {RANGE} AND campaign.status != 'REMOVED'" },
  // People in the place, or people only interested in it.
  { name: "geoTypes", gaql:
    "SELECT campaign.id, geographic_view.location_type, geographic_view.country_criterion_id, metrics.cost_micros, metrics.clicks, metrics.conversions " +
    "FROM geographic_view WHERE segments.date BETWEEN {RANGE}" },
  { name: "hours", quiet: true, gaql:
    "SELECT campaign.id, segments.hour, metrics.cost_micros, metrics.clicks, metrics.conversions " +
    "FROM campaign WHERE segments.date BETWEEN {RANGE} AND campaign.status = 'ENABLED'" },

  // Places, languages, schedules and campaign-level negative keywords.
  { name: "campaignCriteria", gaql:
    "SELECT campaign.id, campaign_criterion.type, campaign_criterion.negative, campaign_criterion.status, " +
    "campaign_criterion.location.geo_target_constant, campaign_criterion.language.language_constant, " +
    "campaign_criterion.proximity.radius, campaign_criterion.proximity.radius_units, campaign_criterion.proximity.address.city_name, " +
    "campaign_criterion.keyword.text, campaign_criterion.keyword.match_type, " +
    "campaign_criterion.ad_schedule.day_of_week, campaign_criterion.ad_schedule.start_hour, campaign_criterion.ad_schedule.end_hour " +
    "FROM campaign_criterion WHERE campaign_criterion.type IN ('LOCATION', 'LANGUAGE', 'PROXIMITY', 'KEYWORD', 'AD_SCHEDULE') AND campaign.status != 'REMOVED'" },
  { name: "brandExclusions", quiet: true, gaql:
    "SELECT campaign.id, campaign_criterion.type, campaign_criterion.negative FROM campaign_criterion WHERE campaign_criterion.type = 'BRAND_LIST' AND campaign.status != 'REMOVED'" },

  { name: "conversionActions", core: true, gaql:
    "SELECT conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type, conversion_action.category, " +
    "conversion_action.primary_for_goal, conversion_action.counting_type, conversion_action.include_in_conversions_metric, " +
    "conversion_action.click_through_lookback_window_days, conversion_action.attribution_model_settings.attribution_model, " +
    "conversion_action.value_settings.default_value, conversion_action.value_settings.always_use_default_value " +
    "FROM conversion_action WHERE conversion_action.status != 'REMOVED'" },
  { name: "conversionStats", gaql:
    "SELECT segments.conversion_action, segments.conversion_action_name, metrics.conversions, metrics.all_conversions, metrics.conversions_value " +
    "FROM customer WHERE segments.date BETWEEN {RANGE}" },

  // Which conversion actions each campaign's results are made of (to take page views out).
  { name: "conversionsByCampaign", quiet: true, gaql:
    "SELECT campaign.id, segments.conversion_action, segments.conversion_action_name, metrics.conversions, metrics.conversions_value " +
    "FROM campaign WHERE segments.date BETWEEN {RANGE} AND campaign.status != 'REMOVED'" },

  { name: "adGroups", gaql:
    "SELECT campaign.id, ad_group.id, ad_group.name, ad_group.status, ad_group.type " +
    "FROM ad_group WHERE ad_group.status = 'ENABLED' AND campaign.status = 'ENABLED'" },
  { name: "keywords", gaql:
    "SELECT campaign.id, ad_group.id, ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, " +
    "ad_group_criterion.status, ad_group_criterion.quality_info.quality_score, ad_group_criterion.quality_info.creative_quality_score, " +
    "ad_group_criterion.quality_info.post_click_quality_score, ad_group_criterion.quality_info.search_predicted_ctr, " +
    "metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.conversions_value " +
    "FROM keyword_view WHERE segments.date BETWEEN {RANGE} AND ad_group_criterion.negative = FALSE AND ad_group_criterion.status = 'ENABLED' AND ad_group.status = 'ENABLED' AND campaign.status = 'ENABLED' " +
    "ORDER BY metrics.cost_micros DESC LIMIT 5000" },
  { name: "adGroupNegatives", gaql:
    "SELECT campaign.id, ad_group.id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type " +
    "FROM ad_group_criterion WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.negative = TRUE AND ad_group_criterion.status != 'REMOVED' AND campaign.status = 'ENABLED' LIMIT 10000" },
  { name: "sharedSets", gaql:
    "SELECT shared_set.id, shared_set.name, shared_set.type, shared_set.member_count FROM shared_set WHERE shared_set.status = 'ENABLED'" },
  { name: "campaignSharedSets", gaql:
    "SELECT campaign.id, shared_set.id, shared_set.type FROM campaign_shared_set WHERE campaign_shared_set.status = 'ENABLED'" },
  { name: "sharedNegatives", gaql:
    "SELECT shared_set.id, shared_criterion.keyword.text, shared_criterion.keyword.match_type FROM shared_criterion WHERE shared_criterion.type = 'KEYWORD' LIMIT 10000" },

  { name: "ads", core: true, gaql:
    "SELECT campaign.id, ad_group.id, ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status, ad_group_ad.ad.final_urls, " +
    "ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions, " +
    "ad_group_ad.ad.responsive_search_ad.path1, ad_group_ad.ad.responsive_search_ad.path2, " +
    "ad_group_ad.ad_strength, ad_group_ad.policy_summary.approval_status, " +
    "metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions " +
    "FROM ad_group_ad WHERE segments.date BETWEEN {RANGE} AND ad_group_ad.status = 'ENABLED' AND ad_group.status = 'ENABLED' AND campaign.status = 'ENABLED'" },
  // Ads that have not been shown yet have no row above.
  { name: "adsAll", gaql:
    "SELECT campaign.id, ad_group.id, ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status, ad_group_ad.ad.final_urls, " +
    "ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions, " +
    "ad_group_ad.ad.responsive_search_ad.path1, ad_group_ad.ad.responsive_search_ad.path2, " +
    "ad_group_ad.ad_strength, ad_group_ad.policy_summary.approval_status " +
    "FROM ad_group_ad WHERE ad_group_ad.status = 'ENABLED' AND ad_group.status = 'ENABLED' AND campaign.status = 'ENABLED'" },

  { name: "searchTerms", gaql:
    "SELECT campaign.id, ad_group.id, search_term_view.search_term, search_term_view.status, " +
    "metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.conversions_value " +
    "FROM search_term_view WHERE segments.date BETWEEN {RANGE} AND metrics.clicks > 0 ORDER BY metrics.cost_micros DESC LIMIT 5000" },

  // Which searches came from your keywords and which from AI Max.
  { name: "matchSources", quiet: true, gaql:
    "SELECT campaign.id, segments.search_term_match_source, metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.conversions_value " +
    "FROM search_term_view WHERE segments.date BETWEEN {RANGE} AND metrics.clicks > 0 ORDER BY metrics.cost_micros DESC LIMIT 5000" },

  // The extras under an ad: sitelinks, callouts, snippets, images, calls.
  { name: "customerAssets", gaql:
    "SELECT customer_asset.field_type, customer_asset.status FROM customer_asset WHERE customer_asset.status = 'ENABLED'" },
  { name: "campaignAssets", gaql:
    "SELECT campaign.id, campaign_asset.field_type, campaign_asset.status FROM campaign_asset WHERE campaign_asset.status = 'ENABLED' AND campaign.status = 'ENABLED'" },
  { name: "adGroupAssets", gaql:
    "SELECT campaign.id, ad_group.id, ad_group_asset.field_type, ad_group_asset.status FROM ad_group_asset WHERE ad_group_asset.status = 'ENABLED' AND campaign.status = 'ENABLED'" },

  // What Google is allowed to change by itself.
  { name: "autoApply", gaql:
    "SELECT recommendation_subscription.type, recommendation_subscription.status FROM recommendation_subscription" },

  { name: "assetGroups", quiet: true, gaql:
    "SELECT campaign.id, asset_group.id, asset_group.name, asset_group.status, asset_group.ad_strength FROM asset_group WHERE asset_group.status = 'ENABLED' AND campaign.status = 'ENABLED'" },
];

/** yyyy-mm-dd for a Date, in UTC (the script works out the account's own "yesterday" itself). */
export const ymd = (d) => d.toISOString().slice(0, 10);

/** The two date ranges, ending the day before `today`. */
export function ranges(today = new Date(), days = DAYS) {
  const day = 86400000;
  const end = new Date(today.getTime() - day);
  const start = new Date(end.getTime() - (days - 1) * day);
  const pEnd = new Date(start.getTime() - day);
  const pStart = new Date(pEnd.getTime() - (days - 1) * day);
  return { from: ymd(start), to: ymd(end), prevFrom: ymd(pStart), prevTo: ymd(pEnd) };
}

export function fill(gaql, r) {
  return gaql.replace("{RANGE}", `'${r.from}' AND '${r.to}'`).replace("{PREV}", `'${r.prevFrom}' AND '${r.prevTo}'`);
}
