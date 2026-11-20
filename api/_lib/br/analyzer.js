'use strict';
/*
Business review: turns a crawl snapshot into evidence drafts. Pure function: same snapshot in, same drafts out.
Inputs : a crawl snapshot (crawl.js), { competitorId?, category? }.
Outputs: an array of evidence drafts (see evidence.js buildRow). Each carries state, source, observed_at, exact measurement inputs.
Rules  : a failed or blocked fetch produces not_tested or unavailable rows with a reason code, never a guessed value; heuristics are
         labelled reasonable_inference; nothing here calls the network.
Must not change: metric keys (metrics.js) and the rule that unmeasured things are not_tested or unavailable, never defaulted.
*/
const { BOT_UA } = require('./config');

const PAGE_METRICS = ['https.enabled', 'page.status', 'page.response_ms', 'page.title.present', 'page.meta_description.present', 'page.h1.count',
  'page.heading_order.valid', 'page.canonical.present', 'page.viewport.present', 'structured_data.present', 'nav.internal_links.count', 'contact.route.present'];
const NOT_TESTED_CODES = ['blocked_by_robots', 'robots_unavailable'];

function headingOrderValid(headings) {
  if (!headings.length) return null;
  if (headings[0].level !== 1) return false;
  for (let i = 1; i < headings.length; i++) if (headings[i].level > headings[i - 1].level + 1) return false;
  return true;
}

function normUrl(u) {
  try { const x = new URL(u); return (x.protocol + '//' + x.hostname.toLowerCase().replace(/^www\./, '') + (x.pathname.replace(/\/+$/, '') || '') + x.search); } catch (e) { return null; }
}

function contactKinds(pages) {
  const kinds = [];
  const add = function (k) { if (kinds.indexOf(k) === -1) kinds.push(k); };
  pages.forEach(function (p) {
    if (p.mailto) add('email_link');
    if (p.tel) add('phone_link');
    (p.forms || []).forEach(function (f) {
      const types = f.inputs.map(function (i) { return i.type; });
      if (types.indexOf('textarea') !== -1 || types.indexOf('email') !== -1 || types.indexOf('tel') !== -1) add('form');
    });
    (p.internal_links || []).forEach(function (l) { if (/contact|enquir|get[- ]in[- ]touch|request[- ]a[- ]quote|quote|book/i.test(l.url + ' ' + l.text)) add('contact_page_link'); });
  });
  return kinds;
}

const EXCLUDE = /contact|about|privacy|terms|cookie|login|sign-?in|cart|basket|checkout|blog|news|faq|sitemap|accessibility|careers|jobs/i;
const SERVICE = /service|what-we-do|solutions|capabilit|product|repair|install|treatment|machining|manufactur|maintenance|design|testing|inspection|fabrication|cleaning|installation|cutting|finishing/i;
function servicePageEstimate(pages, category) {
  const words = String(category || '').toLowerCase().split(/[^a-z]+/).filter(function (w) { return w.length > 3; });
  const seen = new Set();
  pages.forEach(function (p) {
    (p.internal_links || []).forEach(function (l) {
      const key = normUrl(l.url);
      if (!key || seen.has(key)) return;
      let path = '';
      try { path = new URL(l.url).pathname; } catch (e) { return; }
      if (path === '/' || path === '') return;
      const hay = path + ' ' + l.text;
      if (EXCLUDE.test(path) || EXCLUDE.test(l.text)) return;
      if (SERVICE.test(hay) || words.some(function (w) { return hay.toLowerCase().indexOf(w) !== -1; })) seen.add(key);
    });
  });
  return seen.size;
}

function analyzeSnapshot(snap, opts) {
  const o = opts || {};
  const competitorId = o.competitorId || null;
  const role = snap.role;
  const home = snap.home || { ok: false, code: 'site_unreachable' };
  const homeUrl = home.final_url || home.requested_url || snap.start_url || null;
  const drafts = [];
  const method = {
    summary: 'Public pages fetched directly with a declared user agent, robots.txt honoured, sequentially, within a request cap.',
    settings: { user_agent: BOT_UA, max_requests: snap.limits ? snap.limits.max_requests : null, requests_used: snap.requests, robots_honoured: true, role: role }
  };
  const source = function (url) { return { kind: 'own_fetch', name: 'Public pages fetched directly', url: url || homeUrl }; };
  function add(key, state, value, extra) {
    const e = extra || {};
    const d = { metric_key: key, competitor_id: competitorId, state: state, observed_at: e.observed_at || (home && home.observed_at) || snap.finished_at || snap.started_at,
      source: source(e.url), method: method, inputs: Object.assign({ requested_url: snap.start_url, final_url: homeUrl }, e.inputs || {}), limitations: e.limitations || [] };
    if (state === 'not_tested' || state === 'unavailable') d.reason_code = e.reason;
    else d.value = value;
    drafts.push(d);
  }

  const robotsObserved = snap.robots && snap.robots.observed_at;
  // robots rows first: they are known even when the page itself could not be read
  if (snap.robots) {
    if (snap.robots.kind === 'unavailable') {
      add('robots.present', 'unavailable', null, { reason: snap.robots.reason || 'robots_unavailable', observed_at: robotsObserved, url: (homeUrl || snap.start_url || '').replace(/^(https?:\/\/[^/]+).*$/, '$1/robots.txt'), inputs: { robots_status: snap.robots.status } });
    } else {
      add('robots.present', 'verified_public_observation', snap.robots.kind === 'present', { observed_at: robotsObserved, inputs: { robots_status: snap.robots.status } });
      if (snap.robots.blocks_home !== null && snap.robots.blocks_home !== undefined) add('robots.blocks_crawl', 'verified_public_observation', !!snap.robots.blocks_home, { observed_at: robotsObserved, inputs: { robots_status: snap.robots.status } });
    }
  }

  if (!home.ok) {
    const code = home.code || 'site_unreachable';
    const state = NOT_TESTED_CODES.indexOf(code) !== -1 ? 'not_tested' : 'unavailable';
    PAGE_METRICS.forEach(function (k) { add(k, state, null, { reason: code, observed_at: home.observed_at || snap.finished_at, inputs: { failure_code: code, redirect_chain_length: (home.chain || []).length } }); });
    return drafts;
  }

  const pg = home.page;
  if (home.status >= 400) {
    // The server answered, but with an error page. Its status is a real observation; nothing is read from the error page's content.
    add('https.enabled', 'verified_public_observation', home.scheme === 'https', { inputs: { redirect_chain: home.chain.map(function (c) { return { status: c.status, to: c.to_scheme || c.to }; }) } });
    add('page.status', 'verified_public_observation', home.status);
    add('page.response_ms', 'verified_public_observation', home.ms, { limitations: ['Measured from the review server for one request.'] });
    PAGE_METRICS.filter(function (k) { return ['https.enabled', 'page.status', 'page.response_ms'].indexOf(k) === -1; }).forEach(function (k) { add(k, 'unavailable', null, { reason: 'http_error', inputs: { http_status: home.status } }); });
    return drafts;
  }
  add('https.enabled', 'verified_public_observation', home.scheme === 'https', { inputs: { redirect_chain: home.chain.map(function (c) { return { status: c.status, to: c.to_scheme || c.to }; }), https_downgrade: !!home.https_downgrade } });
  if (role === 'business') {
    const hr = snap.http_redirect || { state: 'not_checked' };
    if (hr.state === 'redirects') add('https.http_redirects_to_https', 'verified_public_observation', true, { observed_at: hr.observed_at, inputs: { http_status: hr.status } });
    else if (hr.state === 'no_redirect') add('https.http_redirects_to_https', 'verified_public_observation', false, { observed_at: hr.observed_at, inputs: { http_status: hr.status } });
    else if (hr.state === 'unreachable') add('https.http_redirects_to_https', 'not_tested', null, { reason: 'http_not_reachable', observed_at: hr.observed_at });
    else add('https.http_redirects_to_https', 'not_tested', null, { reason: 'step_not_finished' });
  }
  add('page.status', 'verified_public_observation', home.status);
  add('page.response_ms', 'verified_public_observation', home.ms, { limitations: ['Measured from the review server for one request.'] });

  // sitemap
  const sm = snap.sitemap || { state: 'not_checked' };
  const smOpts = { observed_at: sm.observed_at, url: sm.url || undefined, inputs: { sitemap_url: sm.url || null, status: sm.status == null ? null : sm.status } };
  if (sm.state === 'present') {
    add('sitemap.present', 'verified_public_observation', true, smOpts);
    add('sitemap.url_count', 'verified_public_observation', sm.url_count, smOpts);
  } else if (sm.state === 'absent') add('sitemap.present', 'verified_public_observation', false, smOpts);
  else if (sm.state === 'unavailable') add('sitemap.present', 'unavailable', null, Object.assign({ reason: sm.reason || 'site_unreachable' }, smOpts));
  else add('sitemap.present', 'not_tested', null, Object.assign({ reason: sm.reason || 'step_not_finished' }, smOpts));

  // on page
  add('page.title.present', 'verified_public_observation', !!(pg.title && pg.title.length), { inputs: { title_tag_count: pg.title_count } });
  if (pg.title && pg.title.length) add('page.title.length', 'verified_public_observation', pg.title.length, { inputs: { title: pg.title.slice(0, 200) } });
  const md = pg.meta_description;
  add('page.meta_description.present', 'verified_public_observation', !!(md && md.trim().length));
  if (md && md.trim().length) add('page.meta_description.length', 'verified_public_observation', md.trim().length);
  add('page.h1.count', 'verified_public_observation', pg.h1_count, { inputs: { h1_texts: pg.headings.filter(function (h) { return h.level === 1; }).map(function (h) { return h.text.slice(0, 120); }).slice(0, 5) } });
  const ord = headingOrderValid(pg.headings);
  if (ord === null) add('page.heading_order.valid', 'not_tested', null, { reason: 'not_present' });
  else add('page.heading_order.valid', 'verified_public_observation', ord, { inputs: { heading_levels: pg.headings.map(function (h) { return h.level; }).slice(0, 60) } });
  add('page.canonical.present', 'verified_public_observation', !!pg.canonical, { inputs: { canonical: pg.canonical ? String(pg.canonical).slice(0, 300) : null, canonical_tag_count: pg.canonical_count } });
  if (pg.canonical) {
    let abs = null;
    try { abs = new URL(pg.canonical, home.final_url).href; } catch (e) { abs = null; }
    add('page.canonical.self', 'verified_public_observation', !!abs && normUrl(abs) === normUrl(home.final_url), { inputs: { canonical_resolved: abs } });
  }
  add('page.viewport.present', 'verified_public_observation', pg.viewport !== null && pg.viewport !== undefined, { inputs: { viewport: pg.viewport } });

  // structured data (home page)
  const ld = pg.jsonld;
  add('structured_data.present', 'verified_public_observation', ld.blocks > 0, { inputs: { json_ld_blocks: ld.blocks } });
  if (ld.blocks > 0) {
    add('structured_data.types', 'verified_public_observation', ld.types, { inputs: { json_ld_blocks: ld.blocks } });
    add('structured_data.json_ld_parses', 'verified_public_observation', ld.failed === 0, { inputs: { blocks_parsed: ld.parsed, blocks_failed: ld.failed } });
  }

  // navigation and links
  add('nav.internal_links.count', 'verified_public_observation', pg.internal_link_count, { inputs: { links_inside_nav_elements: pg.nav_link_count, capped_at: 80 } });
  const allPages = [pg].concat(snap.pages.filter(function (p) { return p.internal_links; }));
  if (role === 'business') {
    const lk = snap.links;
    add('links.checked.count', 'verified_public_observation', lk.checked.length, { observed_at: lk.observed_at, inputs: { candidates: lk.candidates, sampled: lk.checked.map(function (c) { return c.url; }).slice(0, 15), limit: snap.limits.max_link_checks } });
    add('links.broken.count', 'verified_public_observation', lk.broken, { observed_at: lk.observed_at, inputs: { broken: lk.checked.filter(function (c) { return c.broken; }).map(function (c) { return { url: c.url, status: c.status, code: c.code }; }).slice(0, 15) } });
    add('content.service_pages.estimate', 'reasonable_inference', servicePageEstimate(allPages, o.category), { inputs: { pages_read: allPages.length, category: o.category || null, method: 'link text and address keywords' }, limitations: ['This is an inference from link text and addresses, not a content review.'] });
  }
  const kinds = contactKinds(allPages);
  add('contact.route.present', 'verified_public_observation', kinds.length > 0, { inputs: { pages_read: allPages.length } });
  add('contact.route.kinds', 'verified_public_observation', kinds, { inputs: { pages_read: allPages.length } });
  return drafts;
}

module.exports = { analyzeSnapshot, headingOrderValid, servicePageEstimate, contactKinds, PAGE_METRICS };
