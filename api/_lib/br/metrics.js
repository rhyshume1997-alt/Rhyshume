'use strict';
/*
Business review: the catalogue of metric keys (CONTRACT section 5).
Inputs : none. Outputs: METRICS (label, group, what it means, standing limitations, display, comparison direction).
Must not change: existing keys (clients and stored evidence depend on them). New keys may be added here and in CONTRACT.md only.
Wording rules: states what was observed, never what it causes. No ISO edition years. No claims about rankings.
*/
function fmtMs(ms) { const n = Number(ms); if (!Number.isFinite(n)) return '-'; return n >= 1000 ? (Math.round(n / 100) / 10).toFixed(1) + ' s' : Math.round(n) + ' ms'; }
function fmtBool(v) { return v ? 'Yes' : 'No'; }
function fmtScore(v) { return Math.round(Number(v)) + ' out of 100'; }
function fmtNum(v) { return String(v); }
function fmtCls(v) { return (Math.round(Number(v) * 1000) / 1000).toString(); }
function fmtList(v) { return Array.isArray(v) ? (v.length ? v.join(', ') : 'None') : String(v); }
function fmtChars(v) { return v + ' characters'; }

const LIGHTHOUSE_NOTE = 'Lighthouse scores are lab test results, not Google ranking scores.';
const ONE_RUN = 'Single lab run; results vary between runs.';
const LAB = 'Lab data, not what real visitors experienced.';
const HOME_ONLY = 'Based on the home page only.';

function m(group, label, what, limits, fmt, extra) {
  return Object.assign({ category: 'technical', group: group, label: label, what_it_means: what, limitations: limits || [], display: fmt || fmtNum }, extra || {});
}

const METRICS = {
  'https.enabled': m('basics', 'Uses HTTPS', 'Whether the home page was served over an encrypted connection after any redirects.', [], fmtBool, { comparable: true, better: 'true', type: 'boolean' }),
  'https.http_redirects_to_https': m('basics', 'Plain http address redirects to HTTPS', 'Whether the plain http address sends visitors on to the secure address.', ['Checked for the home page address only.'], fmtBool, { type: 'boolean' }),
  'page.status': m('basics', 'Home page response code', 'The HTTP status code the home page returned. 200 means it loaded normally.', [HOME_ONLY], fmtNum, { type: 'number' }),
  'page.response_ms': m('basics', 'Home page response time (single request)', 'How long one request for the home page took from the review server. This is not the same as how fast the page looks to a visitor.', ['One request from one location; varies with network conditions.'], fmtMs, { comparable: true, better: 'lower', type: 'number', unit: 'ms' }),
  'robots.present': m('search', 'Has a robots.txt file', 'Whether the site publishes a robots.txt file that tells automated tools which pages to avoid.', [], fmtBool, { type: 'boolean' }),
  'robots.blocks_crawl': m('search', 'robots.txt blocks automated reading of the home page', 'Whether the robots.txt rules tell automated tools (including this review) not to read the home page.', ['Applies to the review bot and to the general rules; other bots may be treated differently.'], fmtBool, { type: 'boolean' }),
  'sitemap.present': m('search', 'Has an XML sitemap', 'Whether a sitemap listing the pages of the site was found at a standard location or named in robots.txt.', [], fmtBool, { comparable: true, better: 'true', type: 'boolean' }),
  'sitemap.url_count': m('search', 'Addresses listed in the sitemap', 'How many page addresses the sitemap lists.', ['Counted from the first sitemap file read; sitemap indexes are not followed.'], fmtNum, { type: 'number' }),
  'page.title.present': m('onpage', 'Home page has a title', 'Whether the home page has a title tag, which is what browser tabs and search results usually show.', [HOME_ONLY], fmtBool, { comparable: true, better: 'true', type: 'boolean' }),
  'page.title.length': m('onpage', 'Home page title length', 'The number of characters in the home page title. Very short or very long titles are often shortened in search results.', [HOME_ONLY, 'There is no single correct length.'], fmtChars, { type: 'number', unit: 'characters' }),
  'page.meta_description.present': m('onpage', 'Home page has a meta description', 'Whether the home page has a short description that search engines may show under the title.', [HOME_ONLY, 'Search engines may write their own description instead.'], fmtBool, { comparable: true, better: 'true', type: 'boolean' }),
  'page.meta_description.length': m('onpage', 'Home page meta description length', 'The number of characters in the meta description.', [HOME_ONLY, 'There is no single correct length.'], fmtChars, { type: 'number', unit: 'characters' }),
  'page.h1.count': m('onpage', 'Main headings (H1) on the home page', 'How many top level headings the home page has. One clear main heading is the usual convention.', [HOME_ONLY], fmtNum, { type: 'number' }),
  'page.heading_order.valid': m('onpage', 'Headings follow a logical order', 'Whether headings start at H1 and never skip a level going down (for example H1 straight to H3).', [HOME_ONLY], fmtBool, { type: 'boolean' }),
  'page.canonical.present': m('onpage', 'Home page declares a canonical address', 'Whether the page names its preferred address, which helps search engines treat duplicate addresses as one.', [HOME_ONLY], fmtBool, { type: 'boolean' }),
  'page.canonical.self': m('onpage', 'Canonical address points to the page itself', 'Whether the declared canonical address matches the address that was read.', [HOME_ONLY], fmtBool, { type: 'boolean' }),
  'page.viewport.present': m('onpage', 'Has a mobile viewport setting', 'Whether the page declares how to fit a phone screen. Without it pages often display zoomed out on phones.', [HOME_ONLY, 'This is a code check, not a test on a real phone.'], fmtBool, { comparable: true, better: 'true', type: 'boolean' }),
  'structured_data.present': m('structured', 'Has structured data (JSON-LD)', 'Whether the home page contains machine readable descriptions of the business such as LocalBusiness or Organization.', [HOME_ONLY, 'Only JSON-LD is checked, not microdata or RDFa.'], fmtBool, { comparable: true, better: 'true', type: 'boolean' }),
  'structured_data.types': m('structured', 'Structured data types found', 'The schema types declared in the JSON-LD found on the home page.', [HOME_ONLY], fmtList, { type: 'list' }),
  'structured_data.json_ld_parses': m('structured', 'Structured data is valid JSON', 'Whether every JSON-LD block could be read as valid JSON. This does not test it against schema.org rules or Google features.', ['Syntax check only; eligibility for rich results was not tested.'], fmtBool, { type: 'boolean' }),
  'nav.internal_links.count': m('navigation', 'Internal links on the home page', 'The number of different pages on the same site that the home page links to.', [HOME_ONLY], fmtNum, { type: 'number' }),
  'links.checked.count': m('navigation', 'Links checked', 'How many internal links were tested within the crawl limit.', ['A controlled sample, not every link on the site.'], fmtNum, { type: 'number' }),
  'links.broken.count': m('navigation', 'Broken links found in the sample', 'How many of the tested internal links returned an error or did not respond.', ['Only the sampled links were tested; a link that fails once may work later.'], fmtNum, { type: 'number' }),
  'content.service_pages.estimate': m('content', 'Service or product pages linked from the home page (estimate)', 'A rough count of pages whose address or link text suggests a service, product or capability.', ['This is an inference from link text and page addresses; it cannot judge quality or completeness.'], fmtNum, { type: 'number', category: 'technical' }),
  'contact.route.present': m('content', 'Has a visible way to make an enquiry', 'Whether an email link, phone link, enquiry form or contact page link was found on the pages read.', ['Detected from page code; whether messages actually arrive was not tested.'], fmtBool, { comparable: true, better: 'true', type: 'boolean' }),
  'contact.route.kinds': m('content', 'Enquiry routes found', 'Which kinds of enquiry route were found.', ['Detected from page code; whether messages actually arrive was not tested.'], fmtList, { type: 'list' }),
  'psi.mobile.performance_score': m('speed', 'Lighthouse performance score (mobile)', 'Lighthouse summarises several speed measurements into a score out of 100 for a simulated mobile phone.', [LIGHTHOUSE_NOTE, ONE_RUN, LAB], fmtScore, { comparable: true, better: 'higher', type: 'number', unit: 'score' }),
  'psi.mobile.seo_score': m('speed', 'Lighthouse SEO checks score (mobile)', 'A score out of 100 for a set of basic search friendliness checks run by Lighthouse.', [LIGHTHOUSE_NOTE, 'It is a basic checklist, not a measure of search ranking.', ONE_RUN], fmtScore, { comparable: true, better: 'higher', type: 'number', unit: 'score' }),
  'psi.mobile.accessibility_score': m('speed', 'Lighthouse accessibility score (mobile)', 'A score out of 100 for the automatic accessibility checks Lighthouse can run.', [LIGHTHOUSE_NOTE, 'Automatic checks find only some accessibility problems; a high score does not mean the page is accessible.', ONE_RUN], fmtScore, { comparable: true, better: 'higher', type: 'number', unit: 'score' }),
  'psi.mobile.best_practices_score': m('speed', 'Lighthouse best practices score (mobile)', 'A score out of 100 for general good practice checks such as secure connections and browser errors.', [LIGHTHOUSE_NOTE, ONE_RUN], fmtScore, { comparable: true, better: 'higher', type: 'number', unit: 'score' }),
  'psi.mobile.lcp_ms': m('speed', 'Largest Contentful Paint (mobile lab test)', 'How long the main content took to appear on a simulated mid range phone. Google suggests 2.5 seconds or less as good.', [ONE_RUN, LAB], fmtMs, { comparable: true, better: 'lower', type: 'number', unit: 'ms' }),
  'psi.mobile.cls': m('speed', 'Cumulative Layout Shift (mobile lab test)', 'How much the page layout jumped around while loading. Google suggests 0.1 or less as good.', [ONE_RUN, LAB], fmtCls, { comparable: true, better: 'lower', type: 'number', unit: 'score' }),
  'psi.mobile.tbt_ms': m('speed', 'Total Blocking Time (mobile lab test)', 'How long the page was too busy to respond to taps and clicks while loading. Google suggests 200 ms or less as good.', [ONE_RUN, LAB], fmtMs, { comparable: true, better: 'lower', type: 'number', unit: 'ms' }),
  'psi.mobile.fcp_ms': m('speed', 'First Contentful Paint (mobile lab test)', 'How long it took for anything to appear on screen on a simulated mobile phone.', [ONE_RUN, LAB], fmtMs, { comparable: true, better: 'lower', type: 'number', unit: 'ms' }),
  'psi.mobile.speed_index_ms': m('speed', 'Speed Index (mobile lab test)', 'How quickly the visible parts of the page filled in on a simulated mobile phone.', [ONE_RUN, LAB], fmtMs, { comparable: true, better: 'lower', type: 'number', unit: 'ms' }),
  'psi.field.available': m('speed', 'Real visitor data available', 'Whether Google returned data from real Chrome visitors for this address. Many small sites do not have enough visitors for it.', ['Absence of real visitor data says nothing about quality.'], fmtBool, { type: 'boolean' }),
  'local.gbp.profile': { category: 'local', group: 'local', label: 'Google Business Profile', what_it_means: 'Details of the Google Business Profile such as categories and completeness.', limitations: ['No supported data source is connected in this release.'], display: fmtNum, type: 'object' },
  'local.maps_position': { category: 'local', group: 'local', label: 'Google Maps ranking position', what_it_means: 'Where the business appears in Google Maps for a search.', limitations: ['There is no supported source for Maps ranking, so it was not measured.'], display: fmtNum, type: 'number' },
  'local.rating': { category: 'local', group: 'local', label: 'Review rating', what_it_means: 'The average rating shown on the business listing.', limitations: ['No supported data source is connected in this release.'], display: fmtNum, type: 'number' },
  'local.review_count': { category: 'local', group: 'local', label: 'Number of reviews', what_it_means: 'How many reviews the business listing has.', limitations: ['No supported data source is connected in this release.'], display: fmtNum, type: 'number' },
  'ai.visibility.summary': { category: 'ai_visibility', group: 'ai', label: 'AI search visibility', what_it_means: 'Whether AI search tools name the business when asked customer style questions.', limitations: ['Needs repeated runs against a supported tool; answers vary between runs.'], display: fmtNum, type: 'object' },
  'customer.goals': { category: 'customer_supplied', group: 'customer', label: 'What you want help with', what_it_means: 'The goals you chose on the form.', limitations: ['Supplied by you and not checked.'], display: fmtList, type: 'list' },
  'customer.automation_task': { category: 'customer_supplied', group: 'customer', label: 'Task that takes too much time', what_it_means: 'The task you described.', limitations: ['Supplied by you and not checked.'], display: fmtNum, type: 'string' }
};

const GROUPS = [
  { key: 'basics', label: 'Basics' }, { key: 'search', label: 'Search engine access' }, { key: 'onpage', label: 'Page structure' },
  { key: 'structured', label: 'Structured data' }, { key: 'navigation', label: 'Navigation and links' }, { key: 'content', label: 'Content and enquiry routes' },
  { key: 'speed', label: 'Speed and quality tests' }
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

function isKnownMetric(key) { return Object.prototype.hasOwnProperty.call(METRICS, key); }
function displayValue(key, value) {
  if (!value || value.v === undefined || value.v === null) return '';
  const d = METRICS[key];
  try { return d ? d.display(value.v) : String(value.v); } catch (e) { return String(value.v); }
}

module.exports = { METRICS, GROUPS, isKnownMetric, displayValue, fmtMs, fmtDate, LIGHTHOUSE_NOTE };
