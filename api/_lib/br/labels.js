'use strict';
/*
Business review: fixed wording owned by the server (step labels, evidence state labels, reason messages).
Inputs : none. Outputs: constant maps and small helpers.
Must not change: the evidence state labels (exact strings in CONTRACT section 1) and the step order and keys.
*/
const STEP_ORDER = ['site_fetch', 'site_analysis', 'psi_business', 'competitor_discovery', 'competitor_fetch', 'psi_competitors', 'local_search', 'ai_visibility', 'automation_map', 'report_build'];
const STEP_LABELS = {
  site_fetch: 'Reading your website',
  site_analysis: 'Checking titles, headings and structure',
  psi_business: 'Running a mobile speed test on your site',
  competitor_discovery: 'Finding comparison businesses',
  competitor_fetch: 'Reading the comparison websites',
  psi_competitors: 'Running the same speed test on comparison sites',
  local_search: 'Local search',
  ai_visibility: 'AI search visibility',
  automation_map: 'Mapping possible automations',
  report_build: 'Building your report'
};
const EVIDENCE_STATES = ['verified_public_observation', 'verified_authenticated_account_data', 'customer_supplied', 'reasonable_inference', 'not_tested', 'unavailable'];
const EVIDENCE_LABELS = {
  verified_public_observation: 'Verified public observation',
  verified_authenticated_account_data: 'Verified authenticated account data',
  customer_supplied: 'Customer supplied information',
  reasonable_inference: 'Reasonable inference',
  not_tested: 'Not tested',
  unavailable: 'Unavailable'
};
const GOALS = ['more_enquiries', 'google_visibility', 'ai_search_visibility', 'improve_website', 'automate_admin', 'quoting_followups', 'something_else'];
const LOCATION_KINDS = ['local', 'regional', 'national'];
const SERVICE_KEYS = ['websites', 'seo', 'ai_visibility', 'automation', 'engineering', 'care_plan', 'none'];

// Reasons that are "by design" in this release: they do not make a review partial on their own.
const BY_DESIGN_REASONS = ['not_configured', 'no_supported_source', 'not_run_in_free_review', 'no_website', 'no_task_given', 'disabled', 'no_competitors'];

const REASON_MESSAGES = {
  no_website: 'No website address was given, so the website checks were not run.',
  blocked_by_robots: 'The website asks automated tools not to read this page, so it was not read.',
  robots_unavailable: 'The robots.txt file could not be read reliably, so the site was not read.',
  site_unreachable: 'The website could not be reached.',
  unresolvable: 'The website address could not be found.',
  timeout: 'The check did not finish in time.',
  too_large: 'The page was too large to read.',
  bad_content_type: 'The address did not return a web page.',
  not_configured: 'This check is not switched on.',
  disabled: 'This check is switched off.',
  budget_exhausted: 'The daily allowance for this check has been used.',
  no_supported_source: 'No supported data source is connected for this check.',
  not_run_in_free_review: 'Not run in the free review.',
  no_competitors: 'No comparison business was chosen.',
  no_task_given: 'No task was described.',
  provider_error: 'The testing service returned an error.',
  too_many_redirects: 'The website redirected too many times.',
  redirect_loop: 'The website redirected in a loop.',
  url_not_allowed: 'That address cannot be checked.',
  no_json_ld: 'No structured data was found to test.',
  not_collected: 'This was not collected for comparison sites.',
  http_not_reachable: 'The plain http address did not respond.',
  http_error: 'The website returned an error page for the home page.',
  not_present: 'This item is not present on the page.',
  step_not_finished: 'The review stopped before this check finished.'
};

function reasonMessage(code) { return REASON_MESSAGES[code] || 'This was not measured.'; }

module.exports = { STEP_ORDER, STEP_LABELS, EVIDENCE_STATES, EVIDENCE_LABELS, GOALS, LOCATION_KINDS, SERVICE_KEYS, BY_DESIGN_REASONS, REASON_MESSAGES, reasonMessage };
