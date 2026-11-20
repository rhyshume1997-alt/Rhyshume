'use strict';
/*
Business review: cost constants in pence, used as WORST CASE amounts for budget checks (br_budget_spend).
Inputs : none. Outputs: constants. Each line says where its figure came from and when. All are estimates with a margin.
Must not change without re-reading the provider's current price page: a wrong low figure weakens the budget stop.
Sources : DECISIONS.md section 5 (search summaries of provider pricing pages, 20 Nov 2026). NOT verified against the live price pages.
*/
module.exports = {
  CHECKED: '2026-11-20',
  PSI_PENCE_PER_CALL: 0,          // PageSpeed Insights API: free within quota (search summary; terms and quota to be read by the owner)
  PSI_BUDGET_UNIT: 1,              // PSI is capped by number of calls per day: each call spends 1 "unit" against BR_PSI_DAILY_CALLS
  PLACES_TEXT_SEARCH_PENCE: 4,     // Places Text Search at the Enterprise tier is about $35 per 1,000 requests (about 2.8p) plus margin (search summary)
  OSM_PENCE_PER_CALL: 0,           // Nominatim public instance is free but limited to 1 request a second
  AI_PENCE_PER_CALL_WORST: 5,      // one search grounded answer is about 1 to 5 pence all in (DECISIONS 5c); worst case used
  AI_PENCE_PER_CALL_LOW: 1,
  MAX_AI_QUESTIONS: 12,
  MAX_AI_RUNS_PER_QUESTION: 3,
  MAX_AI_TOOLS: 2
};
