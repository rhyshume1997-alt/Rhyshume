'use strict';
/*
Business review: rule based recommendation engine with a visible prioritisation model. No model calls, no randomness.
Inputs : active evidence (API shaped), the review inputs, automation opportunities. Outputs: recommendations in the five part shape
         (found, why it may matter, what could change, what to check before implementation, which service could address it).
Model  : each rule states severity 1 to 3 (how serious the observation is on its own) and effort low|medium|high; confidence comes from the
         evidence state (verified observation = high, customer supplied or inference = medium or low). score = severity x confidence weight
         (high 3, medium 2, low 1). Tier: high if score is 6 or more, medium if 3 to 5, low below 3. Effort only orders items with equal
         scores. Ranks are 1..n and unique. No revenue, traffic or ranking figures exist anywhere in this model.
Types  : technical_issue (a clear observation), commercial_hypothesis (an inference, text starts "This is an inference:", cites only
         inference or customer supplied evidence), opportunity (something not tested or not present that a service could address).
Must not change: the transparency of the model, the ban on outcome promises, the fixed CTA hrefs.
*/
const { METRICS, fmtDate, displayValue } = require('./metrics');

const SERVICES = {
  websites: { key: 'websites', label: 'Website development and redesign', cta: { label: 'Discuss my results', href: '/contact?from=business-review' } },
  seo: { key: 'seo', label: 'Technical SEO and local search', cta: { label: 'Explore SEO support', href: '/seo-and-ai-visibility' } },
  ai_visibility: { key: 'ai_visibility', label: 'AI search visibility assessment', cta: { label: 'Explore SEO support', href: '/seo-and-ai-visibility' } },
  automation: { key: 'automation', label: 'Business process automation', cta: { label: 'Discuss an automation', href: '/automation' } },
  engineering: { key: 'engineering', label: 'Engineering workflows and system governance', cta: { label: 'Talk about an engineering system', href: '/engineering' } },
  care_plan: { key: 'care_plan', label: 'Care plan', cta: { label: 'Discuss my results', href: '/contact?from=business-review' } }
};
const ALLOWED_HREFS = ['/contact?from=business-review', '/seo-and-ai-visibility', '/websites', '/automation', '/engineering', '/contact'];
const WEIGHT = { high: 3, medium: 2, low: 1 };
const EFFORT_ORDER = { low: 0, medium: 1, high: 2 };
const LH = 'Lighthouse scores are not Google ranking scores.';

function tierOf(score) { return score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low'; }
function ruleText(sev, conf, effort, why) {
  return 'Severity ' + sev + ' x confidence ' + conf + ' = ' + (sev * WEIGHT[conf]) + ' (high if 6 or more, medium if 3 to 5, low below 3). ' + why + ' Effort (' + effort + ') only orders items with the same score.';
}
const sec = function (ms) { return (Math.round(ms / 100) / 10).toFixed(1) + ' s'; };

// Rules receive helpers: g(key) -> business evidence row or null (measured states only), raw(key) -> any state, date(row)
function rules(ctx) {
  const g = ctx.g, date = ctx.date;
  const R = [];
  const add = function (r) { R.push(r); };
  const v = function (k) { const e = g(k); return e ? e.value.v : undefined; };

  // reading the site
  (function () {
    const e = ctx.raw('page.status');
    if (e && e.evidence_state === 'unavailable') {
      add({ key: 'site_not_read', title: 'Your website could not be read during this review', type: 'technical_issue', sev: 2, conf: 'medium', effort: 'medium', svc: 'websites', ev: [e],
        found: 'The review could not read your home page on ' + date(e) + ' (' + (e.reason_code || 'no reason recorded') + '). That may be a fault with the site, or the site may block automated tools, so nothing further could be measured.',
        why: 'If the site is slow, down or unreachable for some visitors they may not be able to use it. We cannot say how often this happens from one attempt.',
        change: 'Check that the site loads reliably, and whether a firewall or security setting blocks automated visitors.', check: ['Repeat the check later in case the problem was temporary.', 'Ask your host whether automated requests are blocked.'], caveats: ['One attempt from one location.'] });
    }
    if (e && e.evidence_state === 'not_tested' && e.reason_code === 'blocked_by_robots') {
      add({ key: 'site_blocks_review_bot', title: 'Your website asks automated tools not to read it', type: 'opportunity', sev: 1, conf: 'high', effort: 'low', svc: 'seo', ev: [e],
        found: 'Your robots.txt file asked automated tools, including this review, not to read the home page, so the page was not read on ' + date(e) + '.',
        why: 'This is sometimes intended, for example on a site that is not finished. If it is not intended it may also affect search engines. We cannot tell from here which applies.',
        change: 'Review the robots.txt rules and remove any that block pages you want found.', check: ['Confirm whether the block is intended.', 'Check which tools the rule applies to.'], caveats: [] });
    }
  })();
  const robots = g('robots.blocks_crawl');
  if (robots && robots.value.v === true) add({ key: 'robots_blocks_home', title: 'Your robots.txt file blocks automated reading of the home page', type: 'technical_issue', sev: 3, conf: 'high', effort: 'low', svc: 'seo', ev: [robots],
    found: 'The robots.txt file read on ' + date(robots) + ' tells automated tools not to read the home page.',
    why: 'Search engines generally follow these rules, so a block may stop pages being read. If the block is intended this is not a problem.', change: 'Edit robots.txt so only the pages you want hidden are blocked.', check: ['Confirm whether the block is intended, for example for a site under construction.', 'Check which tools the rule applies to.'], caveats: ['The rule shown applies to this review bot and the general rules; other tools may be treated differently.'] });

  const https = g('https.enabled');
  if (https && https.value.v === false) add({ key: 'no_https', title: 'Your home page was not served over HTTPS', type: 'technical_issue', sev: 3, conf: 'high', effort: 'low', svc: 'websites', ev: [https],
    found: 'The home page was served without HTTPS in the check on ' + date(https) + '.',
    why: 'Browsers may show a warning on pages that are not secure, and visitors may be unwilling to send details. Search engines list secure addresses as one signal among many.', change: 'Install a certificate and redirect all pages to the secure address.', check: ['Check how your hosting handles certificates.', 'Check that links and images load securely after the change.'], caveats: [] });
  const redir = g('https.http_redirects_to_https');
  if (https && https.value.v === true && redir && redir.value.v === false) add({ key: 'http_not_redirected', title: 'The plain http address does not redirect to HTTPS', type: 'technical_issue', sev: 2, conf: 'high', effort: 'low', svc: 'websites', ev: [redir],
    found: 'Requesting the http address returned a page rather than a redirect to the secure address in the check on ' + date(redir) + '.',
    why: 'People who type or follow an old http link may land on a page that is not secure, and search engines may see two versions of the site.', change: 'Add a permanent redirect from http to https.', check: ['Check the redirect keeps the page path.'], caveats: ['Only the home page address was tested.'] });
  const sm = g('sitemap.present');
  if (sm && sm.value.v === false) add({ key: 'no_sitemap', title: 'No XML sitemap was found', type: 'opportunity', sev: 1, conf: 'high', effort: 'low', svc: 'seo', ev: [sm],
    found: 'No sitemap was found at the usual address or in robots.txt in the check on ' + date(sm) + '.',
    why: 'A sitemap helps search engines discover pages, mainly on larger sites. Small sites are often found without one.', change: 'Generate a sitemap and name it in robots.txt.', check: ['Check whether your platform can produce one.'], caveats: ['A sitemap kept at an unusual address would not have been found.'] });

  const tp = g('page.title.present');
  if (tp && tp.value.v === false) add({ key: 'missing_title', title: 'The home page has no title', type: 'technical_issue', sev: 3, conf: 'high', effort: 'low', svc: 'seo', ev: [tp],
    found: 'No title tag was found on the home page in the check on ' + date(tp) + '.', why: 'The title is what browser tabs and search results usually show. Without one a search engine has to guess.', change: 'Write a clear title that names the business and what it does.', check: ['Check the title reads well to a customer.'], caveats: [] });
  const tl = g('page.title.length');
  if (tl && (tl.value.v < 15 || tl.value.v > 70)) add({ key: 'title_length', title: 'The home page title may be too short or too long', type: 'technical_issue', sev: 1, conf: 'high', effort: 'low', svc: 'seo', ev: [tl],
    found: 'The home page title is ' + tl.value.v + ' characters long (checked ' + date(tl) + ').', why: 'Search results often cut off long titles, and very short titles may say little. There is no single correct length.', change: 'Tighten or expand the title so the key words come first.', check: ['Check how the title currently shows in search results.'], caveats: [] });
  const md = g('page.meta_description.present');
  if (md && md.value.v === false) add({ key: 'missing_meta_description', title: 'The home page has no meta description', type: 'technical_issue', sev: 2, conf: 'high', effort: 'low', svc: 'seo', ev: [md],
    found: 'No meta description was found on the home page in the check on ' + date(md) + '.', why: 'The description may be shown under your title in search results. Search engines sometimes write their own instead.', change: 'Write a short description that says what you do and where.', check: ['Check it reads naturally and is not copied from another page.'], caveats: [] });
  const h1 = g('page.h1.count');
  if (h1 && h1.value.v === 0) add({ key: 'missing_h1', title: 'The home page has no main heading', type: 'technical_issue', sev: 2, conf: 'high', effort: 'low', svc: 'websites', ev: [h1],
    found: 'No H1 heading was found on the home page in the check on ' + date(h1) + '.', why: 'A main heading tells visitors and search engines what the page is about.', change: 'Add one clear main heading that describes the business.', check: ['Check headings made with images instead of text.'], caveats: ['A heading drawn by script after loading may not have been seen.'] });
  else if (h1 && h1.value.v > 1) add({ key: 'multiple_h1', title: 'The home page has more than one main heading', type: 'technical_issue', sev: 1, conf: 'high', effort: 'low', svc: 'websites', ev: [h1],
    found: 'The home page has ' + h1.value.v + ' H1 headings (checked ' + date(h1) + ').', why: 'More than one is allowed, but one clear main heading is the usual convention and keeps the structure easy to follow.', change: 'Keep one H1 and use lower levels for the rest.', check: ['Check the theme or template that creates them.'], caveats: [] });
  const ho = g('page.heading_order.valid');
  if (ho && ho.value.v === false) add({ key: 'heading_order', title: 'The headings skip a level or do not start at H1', type: 'technical_issue', sev: 1, conf: 'high', effort: 'low', svc: 'websites', ev: [ho],
    found: 'The heading order on the home page does not follow a logical sequence (checked ' + date(ho) + ').', why: 'A clear heading structure helps people using screen readers and helps search engines follow the page.', change: 'Reorder headings so levels follow on without gaps.', check: ['Check headings used only for styling.'], caveats: [] });
  const cp = g('page.canonical.present'), cs = g('page.canonical.self');
  if (cp && cp.value.v === false) add({ key: 'missing_canonical', title: 'The home page does not declare a canonical address', type: 'technical_issue', sev: 1, conf: 'high', effort: 'low', svc: 'seo', ev: [cp],
    found: 'No canonical link was found on the home page in the check on ' + date(cp) + '.', why: 'It helps search engines treat several addresses for one page as the same page.', change: 'Add a canonical link pointing to the preferred address.', check: ['Decide which address is the preferred one (with or without www).'], caveats: [] });
  if (cs && cs.value.v === false) add({ key: 'canonical_elsewhere', title: 'The home page names a different page as its canonical address', type: 'technical_issue', sev: 2, conf: 'medium', effort: 'low', svc: 'seo', ev: [cs],
    found: 'The canonical address on the home page does not match the address that was read (checked ' + date(cs) + ').', why: 'This can be deliberate. If it is not, search engines may favour a different address.', change: 'Check the canonical address is the one you want shown.', check: ['Confirm whether this is intended.'], caveats: ['Differences in www or trailing slashes are ignored; this is a real difference.'] });
  const vp = g('page.viewport.present');
  if (vp && vp.value.v === false) add({ key: 'no_viewport', title: 'The home page has no mobile viewport setting', type: 'technical_issue', sev: 2, conf: 'high', effort: 'low', svc: 'websites', ev: [vp],
    found: 'No viewport setting was found in the home page code on ' + date(vp) + '.', why: 'Without it many phones show the page zoomed out. Search engines treat mobile friendly pages as one signal among many.', change: 'Add the viewport setting and check the layout on a phone.', check: ['Test the page on a real phone after the change.'], caveats: ['This is a code check, not a test on a real phone.'] });
  const sd = g('structured_data.present'), sdp = g('structured_data.json_ld_parses');
  if (sdp && sdp.value.v === false) add({ key: 'invalid_json_ld', title: 'Some structured data on the home page is not valid JSON', type: 'technical_issue', sev: 2, conf: 'high', effort: 'low', svc: 'seo', ev: [sdp],
    found: 'At least one JSON-LD block on the home page could not be read as JSON (checked ' + date(sdp) + ').', why: 'Search engines may ignore structured data they cannot read.', change: 'Correct the syntax and test the result in a structured data testing tool.', check: ['Check which plugin or template writes it.'], caveats: ['Only syntax was checked, not schema rules.'] });
  else if (sd && sd.value.v === false) add({ key: 'no_structured_data', title: 'No structured data was found on the home page', type: 'opportunity', sev: 1, conf: 'high', effort: 'medium', svc: 'seo', ev: [sd],
    found: 'No JSON-LD structured data was found on the home page in the check on ' + date(sd) + '.', why: 'Structured data describes the business in a form search engines can read. It does not guarantee any special display.', change: 'Add LocalBusiness or Organization details that match what the page says.', check: ['Check the details match your Google Business Profile.'], caveats: ['Only JSON-LD was checked.'] });
  const bl = g('links.broken.count');
  if (bl && bl.value.v > 0) add({ key: 'broken_links', title: 'Some links on your site did not work', type: 'technical_issue', sev: bl.value.v >= 3 ? 2 : 1, conf: 'high', effort: 'low', svc: 'websites', ev: [bl],
    found: bl.value.v + ' of the sampled links returned an error or did not respond in the check on ' + date(bl) + '.', why: 'Visitors who reach a dead page may leave. Search engines may also spend time on pages that do not exist.', change: 'Fix or remove the links listed in the evidence.', check: ['Re-test the links, as a failure can be temporary.', 'Check the full site, as only a sample was tested.'], caveats: ['A controlled sample, not every link on the site.'] });
  const cr = g('contact.route.present');
  if (cr && cr.value.v === false) add({ key: 'no_contact_route', title: 'No visible way to make an enquiry was found', type: 'technical_issue', sev: 3, conf: 'medium', effort: 'low', svc: 'websites', ev: [cr],
    found: 'No email link, phone link, enquiry form or contact page link was found on the pages read on ' + date(cr) + '.', why: 'If visitors cannot see how to get in touch they may not. A form added by script after loading would not have been seen.', change: 'Add a clear contact route to the header and the home page.', check: ['Check for forms or buttons that appear only after the page loads.'], caveats: ['Detected from page code; may miss routes added by script.'] });
  const sp = g('content.service_pages.estimate');
  if (sp && sp.value.v < 3) add({ key: 'few_service_pages', title: 'Few separate service pages were found', type: 'commercial_hypothesis', sev: 1, conf: 'medium', effort: 'medium', svc: 'seo', ev: [sp],
    found: 'This is an inference: the pages read linked to about ' + sp.value.v + ' pages that look like service or product pages (checked ' + date(sp) + ').',
    why: 'Separate pages for each service can give search engines and visitors more specific pages to land on. Whether that would help your business is a hypothesis, not a measurement.', change: 'Consider a page for each main service, written for how customers search.', check: ['Check whether your services are described on one page already.', 'Decide which services matter most commercially.'], caveats: ['An estimate from link text and addresses, not a content review.'] });

  // speed
  const lcp = g('psi.mobile.lcp_ms');
  if (lcp && lcp.value.v > 2500) add({ key: 'slow_mobile_loading', title: 'Your home page was slow to show its main content on the mobile test', type: 'technical_issue', sev: lcp.value.v > 4000 ? 3 : 2, conf: 'high', effort: 'medium', svc: 'websites', ev: [lcp],
    found: 'Largest Contentful Paint was ' + sec(lcp.value.v) + ' in the mobile test recorded on ' + date(lcp) + '.',
    why: 'Slow pages can frustrate visitors and Google lists page experience as one signal among many. We cannot say how much it affects your enquiries.', change: 'Compress and resize images, reduce render blocking scripts, review hosting.', check: ['Confirm with a second test and real visitor data if you have it.', 'Check what your current platform allows.'], caveats: [LH] });
  const cls = g('psi.mobile.cls');
  if (cls && cls.value.v > 0.1) add({ key: 'layout_shift', title: 'The page layout moved around while loading on the mobile test', type: 'technical_issue', sev: cls.value.v > 0.25 ? 2 : 1, conf: 'high', effort: 'medium', svc: 'websites', ev: [cls],
    found: 'Cumulative Layout Shift was ' + (Math.round(cls.value.v * 1000) / 1000) + ' in the mobile test recorded on ' + date(cls) + '. Google suggests 0.1 or less.', why: 'Content that jumps as it loads can cause mis-taps and is a page experience signal among many.', change: 'Reserve space for images and embeds and avoid inserting content above what is already shown.', check: ['Confirm with a second test.'], caveats: [LH] });
  const tbt = g('psi.mobile.tbt_ms');
  if (tbt && tbt.value.v > 200) add({ key: 'blocking_time', title: 'The page was slow to respond while loading on the mobile test', type: 'technical_issue', sev: tbt.value.v > 600 ? 2 : 1, conf: 'high', effort: 'medium', svc: 'websites', ev: [tbt],
    found: 'Total Blocking Time was ' + Math.round(tbt.value.v) + ' ms in the mobile test recorded on ' + date(tbt) + '. Google suggests 200 ms or less.', why: 'Heavy scripts can make a page feel unresponsive while it loads.', change: 'Reduce or defer scripts that are not needed straight away.', check: ['Check which scripts are third party.'], caveats: [LH] });
  const seoS = g('psi.mobile.seo_score');
  if (seoS && seoS.value.v < 90) add({ key: 'lighthouse_seo_checks', title: 'Some basic search friendliness checks did not pass', type: 'technical_issue', sev: 1, conf: 'high', effort: 'low', svc: 'seo', ev: [seoS],
    found: 'The Lighthouse SEO checks scored ' + Math.round(seoS.value.v) + ' out of 100 in the mobile test recorded on ' + date(seoS) + '.', why: 'The checks cover basics such as titles, descriptions, link text and crawlability.', change: 'Work through the failed checks listed in the full Lighthouse report.', check: ['Run the full report to see which checks failed.'], caveats: [LH, 'It is a basic checklist, not a measure of search ranking.'] });
  const acc = g('psi.mobile.accessibility_score');
  if (acc && acc.value.v < 90) add({ key: 'lighthouse_accessibility', title: 'Automatic accessibility checks found items to review', type: 'technical_issue', sev: 2, conf: 'high', effort: 'medium', svc: 'websites', ev: [acc],
    found: 'The Lighthouse accessibility checks scored ' + Math.round(acc.value.v) + ' out of 100 in the mobile test recorded on ' + date(acc) + '.', why: 'Accessible pages are easier for more people to use. Automatic checks find only part of the possible problems.', change: 'Review the failed checks, for example contrast, labels and image descriptions.', check: ['Test with a keyboard and a screen reader as well.'], caveats: [LH, 'A high score would not mean the page is accessible.'] });
  const bp = g('psi.mobile.best_practices_score');
  if (bp && bp.value.v < 90) add({ key: 'lighthouse_best_practices', title: 'General good practice checks found items to review', type: 'technical_issue', sev: 1, conf: 'high', effort: 'medium', svc: 'websites', ev: [bp],
    found: 'The Lighthouse best practices checks scored ' + Math.round(bp.value.v) + ' out of 100 in the mobile test recorded on ' + date(bp) + '.', why: 'These checks cover things such as secure connections and errors in the browser console.', change: 'Review the failed checks in the full report.', check: ['Run the full report to see which checks failed.'], caveats: [LH] });

  // not tested areas: honest opportunities, not findings
  const loc = ctx.raw('local.gbp.profile');
  if (loc && (loc.evidence_state === 'not_tested' || loc.evidence_state === 'unavailable') && ctx.goals.indexOf('google_visibility') !== -1) add({ key: 'local_search_untested', title: 'Local search was not tested in this review', type: 'opportunity', sev: 1, conf: 'medium', effort: 'medium', svc: 'seo', ev: [loc],
    found: 'Google Business Profile details, review ratings and Maps position were not tested because no supported data source is connected in this review.', why: 'You said you want help with Google visibility. A local search assessment would need access to verified data, which this free review does not have.', change: 'A separate assessment could review your Business Profile and how consistent your business details are across the web.', check: ['Decide whether you want a paid assessment.'], caveats: ['Nothing was measured, so no conclusion about your local search position is made.'] });
  const ai = ctx.raw('ai.visibility.summary');
  if (ai && (ai.evidence_state === 'not_tested' || ai.evidence_state === 'unavailable')) add({ key: 'ai_visibility_untested', title: 'AI search visibility has not been tested', type: 'opportunity', sev: 1, conf: ctx.goals.indexOf('ai_search_visibility') !== -1 ? 'medium' : 'low', effort: 'medium', svc: 'ai_visibility', ev: [ai],
    found: 'This review has not tested whether AI search tools name your business. It is awaiting a supported test.', why: 'People increasingly ask AI tools for recommendations. Answers vary between runs and tools, so a proper test needs repeated questions and recorded answers.', change: 'A separate assessment could ask customer style questions several times and record exactly what each tool says.', check: ['Decide which questions matter for your customers.'], caveats: ['No result is shown because none was measured. There is no single score.'] });
  return R;
}

function automationRec(ops, evCustomer, date) {
  if (!ops || !ops.length) return [];
  const o = ops[0];
  return [{ key: 'automation_opportunity', title: 'A possible workflow for the task you described: ' + o.workflow_title, type: 'opportunity', sev: 1, conf: o.confidence === 'high' ? 'medium' : o.confidence === 'medium' ? 'medium' : 'low', effort: 'medium', svc: 'automation', ev: evCustomer ? [evCustomer] : [],
    found: 'You described: "' + String(o.task_text).slice(0, 200) + '". This may fit a ' + o.workflow_title.toLowerCase() + '.',
    why: 'Repeated manual steps can be consistent and recorded when a workflow handles them. We do not know how your business works today, so this is a possibility, not a finding.', change: o.description, check: o.unknowns.map(function (u) { return 'Tell us about: ' + u.toLowerCase(); }), caveats: [o.not_included] }];
}

function evAny(rows, key) {
  const list = rows.filter(function (r) { return r.metric_key === key && !r.superseded_by && r.subject.kind === 'business'; });
  return list.length ? list[list.length - 1] : null;
}

function generate(input) {
  const rows = input.evidence;
  const measured = function (r) { return r && ['verified_public_observation', 'verified_authenticated_account_data', 'customer_supplied', 'reasonable_inference'].indexOf(r.evidence_state) !== -1 && r.value; };
  const ctx = {
    g: function (k) { const r = evAny(rows, k); return measured(r) ? r : null; },
    raw: function (k) { return evAny(rows, k); },
    date: function (r) { return fmtDate(r.observed_at); },
    goals: input.goals || []
  };
  let list = rules(ctx);
  const custom = evAny(rows, 'customer.automation_task');
  list = list.concat(automationRec(input.opportunities, custom, ctx.date));
  // build objects
  const out = list.map(function (r) {
    const score = r.sev * WEIGHT[r.conf];
    const svc = SERVICES[r.svc];
    const evIds = r.ev.map(function (e) { return e.id; });
    if (r.type === 'commercial_hypothesis') {
      const allowed = ['reasonable_inference', 'customer_supplied'];
      if (!r.ev.length || r.ev.some(function (e) { return allowed.indexOf(e.evidence_state) === -1; })) return null;
      if (r.found.indexOf('This is an inference:') !== 0) return null;
    }
    return {
      _score: score, _effort: r.effort,
      id: 'rec-' + r.key.replace(/_/g, '-'), key: r.key, title: r.title, issue_type: r.type, found: r.found, evidence_ids: evIds,
      why_it_may_matter: r.why, what_could_change: r.change, check_before_implementation: r.check,
      service: { key: svc.key, label: svc.label, cta: { label: svc.cta.label, href: svc.cta.href } },
      priority: { rank: 0, tier: tierOf(score), basis: { severity: r.sev, confidence: r.conf, effort: r.effort, rule: ruleText(r.sev, r.conf, r.effort, r.type === 'technical_issue' ? 'A measured observation.' : r.type === 'commercial_hypothesis' ? 'An inference, not a measurement.' : 'Something not tested or not present, not a fault.') } },
      caveats: r.caveats
    };
  }).filter(Boolean);
  const tierRank = { high: 0, medium: 1, low: 2 };
  out.sort(function (a, b) {
    return tierRank[a.priority.tier] - tierRank[b.priority.tier] || b._score - a._score || EFFORT_ORDER[a._effort] - EFFORT_ORDER[b._effort] || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  });
  out.forEach(function (r, i) { r.priority.rank = i + 1; delete r._score; delete r._effort; });
  return out;
}

// Owner revision: hide recommendations or add notes. Returns a new list re-ranked; the stored original is never edited.
function applyOverrides(recs, overrides) {
  const o = (overrides && overrides.recommendations) || [];
  const byKey = {};
  o.forEach(function (x) { if (x && typeof x.key === 'string') byKey[x.key] = x; });
  const kept = recs.filter(function (r) { return !(byKey[r.key] && byKey[r.key].hide === true); }).map(function (r) {
    const c = JSON.parse(JSON.stringify(r));
    if (byKey[r.key] && typeof byKey[r.key].owner_note === 'string' && byKey[r.key].owner_note.trim()) c.owner_note = byKey[r.key].owner_note.trim().slice(0, 600);
    return c;
  });
  kept.forEach(function (r, i) { r.priority.rank = i + 1; });
  return kept;
}

module.exports = { generate, applyOverrides, tierOf, SERVICES, ALLOWED_HREFS, WEIGHT };
