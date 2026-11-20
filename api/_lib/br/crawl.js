'use strict';
/*
Business review: controlled crawl of one site through the safe fetcher.
Inputs : a start URL, a role ('business' or 'competitor'), a fetcher (createSafeFetcher result), limits and a deadline.
Outputs: a bounded JSON snapshot (no raw HTML): robots state, home page features, redirect check, sitemap, a few key pages, a link sample.
Rules  : robots.txt is fetched first for every origin and honoured for every request; at most 25 requests in total for a business
         (competitors: 4); one request at a time; at least minIntervalMs between requests to the same host (crawl-delay honoured up to
         5 s); every loop has a constant bound; redirects are followed hop by hop through the fetcher so each hop is re-validated and
         re-checked against robots; the declared user agent is always used.
Must not change: the request caps, the sequential behaviour, the robots rules, the bounds.
*/
const robots = require('./robots');
const html = require('./html');
const { BOT_UA, BOT_TOKEN } = require('./config');

const LIMITS = {
  business: { maxRequests: 25, maxPages: 7, maxLinkChecks: 15, totalMs: 40000, checkHttp: true },
  competitor: { maxRequests: 4, maxPages: 0, maxLinkChecks: 0, totalMs: 20000, checkHttp: false }
};
const HTML_TYPES = ['text/html', 'application/xhtml+xml'];
const SITEMAP_TYPES = ['application/xml', 'text/xml', 'text/plain', 'application/xhtml+xml', 'text/html', 'application/octet-stream'];
const MAX_HOPS = 4;
const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|pptx?|mp[34]|avi|mov|css|js|ico|xml|json|txt|rar|7z)(\?|$)/i;
const KEYWORDS = [
  [/contact|get-in-touch|enquir|quote|book/i, 6], [/service|what-we-do|solutions|capabilit|offer/i, 5], [/about|who-we-are|company/i, 3],
  [/product|work|projects|portfolio|pricing|price|repair|install|machin|manufactur|treatment|menu/i, 2]
];

const sleepDefault = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
function normHost(h) { return String(h || '').toLowerCase().replace(/^www\./, ''); }

function summarise(url, res, ms, observedAt) {
  const f = html.scan(res.body);
  const ld = html.analyseJsonLd(f.jsonld);
  const desc = f.metas.find(function (x) { return x.key === 'description'; });
  const internal = [];
  const seen = new Set();
  let base = res.finalUrl || url;
  try { if (f.baseHref) base = new URL(f.baseHref, base).href; } catch (e) { /* ignore */ }
  const finalHost = (function () { try { return normHost(new URL(res.finalUrl || url).hostname); } catch (e) { return ''; } })();
  let navCount = 0;
  f.links.forEach(function (l) {
    const href = String(l.href || '').trim();
    if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript|data|sms|whatsapp):/i.test(href)) return;
    let u;
    try { u = new URL(href, base); } catch (e) { return; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    if (normHost(u.hostname) !== finalHost) return;
    u.hash = '';
    const key = u.href;
    if (seen.has(key)) return;
    seen.add(key);
    if (l.inNav) navCount++;
    if (internal.length < 80) internal.push({ url: key, text: l.text.slice(0, 80), nav: !!l.inNav });
  });
  const heads = f.headings.slice(0, 60);
  return {
    url: res.finalUrl || url, status: res.status, ms: ms, observed_at: observedAt, content_type: (res.headers['content-type'] || '').split(';')[0],
    bytes: res.bytes, title: f.title, title_count: f.titleCount, meta_description: desc ? desc.content : null,
    headings: heads, h1_count: f.headings.filter(function (h) { return h.level === 1; }).length,
    canonical: f.canonical, canonical_count: f.canonicalCount, viewport: f.viewport, lang: f.lang,
    jsonld: ld, internal_links: internal, internal_link_count: internal.length, nav_link_count: navCount,
    forms: f.forms.slice(0, 10), mailto: f.mailto, tel: f.tel, text_length: f.textLength, img_count: f.imgCount,
    noindex: /noindex/.test(f.robotsMeta || '') || /noindex/i.test(res.headers['x-robots-tag'] || '')
  };
}

async function crawlSite(opts) {
  const role = opts.role === 'competitor' ? 'competitor' : 'business';
  const L = Object.assign({}, LIMITS[role], opts.limits || {});
  const fetcher = opts.fetcher;
  const now = opts.now || function () { return new Date(); };
  const sleep = opts.sleep || sleepDefault;
  const minInterval = opts.minIntervalMs == null ? 1000 : opts.minIntervalMs;
  const started = Date.now();
  const deadline = Math.min(opts.deadline || Infinity, started + L.totalMs);
  const stamp = function () { return now().toISOString(); };
  const snap = {
    version: 1, role: role, started_at: stamp(), finished_at: null, start_url: null, user_agent: BOT_UA,
    limits: { max_requests: L.maxRequests, max_pages: L.maxPages, max_link_checks: L.maxLinkChecks, total_ms: L.totalMs, min_interval_ms: minInterval },
    requests: 0, truncated: [], robots: null, home: null, http_redirect: { state: 'not_checked' }, sitemap: { state: 'not_checked' }, pages: [],
    links: { candidates: 0, checked: [], broken: 0, skipped_robots: 0, observed_at: null }
  };
  const parsedStart = fetcher.parseUrl(opts.url);
  if (!parsedStart.ok) { snap.home = { ok: false, code: 'url_not_allowed', reason: parsedStart.reason }; snap.finished_at = stamp(); return snap; }
  snap.start_url = parsedStart.url;

  const robotsByOrigin = {};
  const lastAt = {};
  const ropts = { agentToken: BOT_TOKEN, userAgent: BOT_UA };

  async function budgetOk() {
    if (snap.requests >= L.maxRequests) { if (snap.truncated.indexOf('request_cap') === -1) snap.truncated.push('request_cap'); return false; }
    if (Date.now() >= deadline - 300) { if (snap.truncated.indexOf('time_budget') === -1) snap.truncated.push('time_budget'); return false; }
    return true;
  }
  async function pace(host, delayMs) {
    const gap = Math.max(minInterval, delayMs || 0);
    const wait = (lastAt[host] || 0) + gap - Date.now();
    if (wait > 0 && gap > 0) await sleep(Math.min(wait, gap));
    lastAt[host] = Date.now();
  }
  async function robotsFor(p) {
    if (robotsByOrigin[p.origin]) return robotsByOrigin[p.origin];
    if (!(await budgetOk())) return { kind: 'unavailable', reason: 'request_cap', agentToken: BOT_TOKEN, sitemaps: [] };
    await pace(p.hostname, 0);
    snap.requests++;
    const t0 = Date.now();
    const st = await robots.fetchRobots(fetcher, p.origin, Object.assign({ deadline: deadline, timeoutMs: 8000 }, ropts));
    st.observed_at = stamp();
    st.ms = Date.now() - t0;
    robotsByOrigin[p.origin] = st;
    return st;
  }

  // One polite GET: robots check, budget, spacing, manual redirects (each hop validated by the fetcher and checked against robots).
  async function politeGet(url, o) {
    o = o || {};
    let current = url;
    const chain = [];
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const p = fetcher.parseUrl(current);
      if (!p.ok) return { ok: false, code: 'url_not_allowed', reason: p.reason, chain: chain };
      const rs = await robotsFor(p);
      if (rs.kind === 'unavailable') return { ok: false, code: 'robots_unavailable', chain: chain, finalUrl: p.url };
      if (!robots.isAllowed(rs, p.path)) return { ok: false, code: 'blocked_by_robots', chain: chain, finalUrl: p.url };
      if (!(await budgetOk())) return { ok: false, code: 'budget', chain: chain };
      await pace(p.hostname, robots.crawlDelayMs(rs));
      snap.requests++;
      const t0 = Date.now();
      const res = await fetcher.request(p.url, {
        followRedirects: false, maxBytes: o.maxBytes || 1572864, timeoutMs: 8000, deadline: deadline, userAgent: BOT_UA,
        allowedTypes: o.types === undefined ? HTML_TYPES : o.types, method: o.method || 'GET'
      });
      const ms = Date.now() - t0;
      lastAt[p.hostname] = Date.now();
      if (!res.ok) return Object.assign({ chain: chain, ms: ms, finalUrl: p.url }, res);
      if (res.status >= 300 && res.status < 400 && res.headers.location && o.follow !== false) {
        if (hop >= MAX_HOPS) return { ok: false, code: 'too_many_redirects', chain: chain };
        let next;
        try { next = new URL(res.headers.location, p.url).href; } catch (e) { return { ok: false, code: 'site_unreachable', chain: chain }; }
        chain.push({ url: p.url, status: res.status, to: next.split(':')[0] });
        if (chain.some(function (c) { return c.url === next; }) || next === p.url) return { ok: false, code: 'redirect_loop', chain: chain };
        current = next;
        continue;
      }
      return Object.assign({}, res, { finalUrl: p.url, chain: chain, ms: ms, scheme: p.protocol.replace(':', ''), host: p.hostname });
    }
    return { ok: false, code: 'too_many_redirects', chain: chain };
  }

  // ---- home page (this also fetches robots for the start origin first)
  const homeRes = await politeGet(parsedStart.url);
  const homeP = fetcher.parseUrl(parsedStart.url);
  const startRobots = robotsByOrigin[homeP.origin] || null;
  snap.robots = startRobots ? {
    kind: startRobots.kind, status: startRobots.status == null ? null : startRobots.status, reason: startRobots.reason || null,
    sitemaps: (startRobots.sitemaps || []).slice(0, 5), observed_at: startRobots.observed_at, ms: startRobots.ms,
    blocks_home: startRobots.kind === 'unavailable' ? null : !robots.isAllowed(startRobots, homeP.path)
  } : null;
  if (!homeRes.ok) {
    snap.home = { ok: false, code: homeRes.code, reason: homeRes.reason || null, requested_url: parsedStart.url, final_url: homeRes.finalUrl || null, chain: homeRes.chain || [], observed_at: stamp() };
    snap.finished_at = stamp();
    return snap;
  }
  const homeObserved = stamp();
  const homeSummary = summarise(parsedStart.url, homeRes, homeRes.ms, homeObserved);
  snap.home = {
    ok: true, requested_url: parsedStart.url, final_url: homeRes.finalUrl, status: homeRes.status, ms: homeRes.ms, observed_at: homeObserved,
    chain: homeRes.chain, scheme: homeRes.scheme, https_downgrade: homeRes.chain.some(function (c) { return c.to === 'http'; }) && homeRes.scheme === 'http',
    page: homeSummary
  };
  const finalP = fetcher.parseUrl(homeRes.finalUrl);
  const finalOrigin = finalP.ok ? finalP.origin : homeP.origin;
  const finalRobots = robotsByOrigin[finalOrigin] || startRobots;

  // ---- plain http redirect check (business only; root path only; uses the same host's robots decision for "/")
  if (L.checkHttp && finalP.ok && finalP.protocol === 'https:' && (await budgetOk()) && robots.isAllowed(finalRobots, '/')) {
    await pace(finalP.hostname, robots.crawlDelayMs(finalRobots));
    snap.requests++;
    const r = await fetcher.request('http://' + finalP.hostname + '/', { method: 'HEAD', followRedirects: false, timeoutMs: 6000, deadline: deadline, userAgent: BOT_UA });
    lastAt[finalP.hostname] = Date.now();
    if (!r.ok) snap.http_redirect = { state: 'unreachable', code: r.code, observed_at: stamp() };
    else {
      const loc = String(r.headers.location || '');
      const toHttps = r.status >= 300 && r.status < 400 && /^https:\/\//i.test(new URL(loc || 'x:', 'http://' + finalP.hostname + '/').href);
      snap.http_redirect = { state: toHttps ? 'redirects' : 'no_redirect', status: r.status, observed_at: stamp() };
    }
  }

  // ---- sitemap
  if (await budgetOk()) {
    let smUrl = finalOrigin + '/sitemap.xml';
    const listed = (finalRobots && finalRobots.sitemaps || []).find(function (s) { try { return normHost(new URL(s).hostname) === normHost(finalP.hostname); } catch (e) { return false; } });
    if (listed) smUrl = listed;
    const r = await politeGet(smUrl, { types: SITEMAP_TYPES, maxBytes: 512000 });
    if (r.ok && r.status >= 200 && r.status < 300) {
      let count = 0;
      const body = r.body || '';
      let at = 0;
      for (let i = 0; i < 50000; i++) { at = body.indexOf('<loc', at); if (at === -1) break; count++; at += 4; }
      const looksXml = /<urlset|<sitemapindex/i.test(body);
      snap.sitemap = looksXml
        ? { state: 'present', url: r.finalUrl, status: r.status, url_count: count, kind: /<sitemapindex/i.test(body) ? 'index' : 'urlset', observed_at: stamp(), listed_in_robots: !!listed }
        : { state: 'absent', url: smUrl, status: r.status, observed_at: stamp(), note: 'not_a_sitemap' };
    } else if (r.ok) snap.sitemap = { state: 'absent', url: smUrl, status: r.status, observed_at: stamp() };
    else if (r.code === 'blocked_by_robots') snap.sitemap = { state: 'not_checked', reason: 'blocked_by_robots', observed_at: stamp() };
    else if (r.code === 'bad_content_type') snap.sitemap = { state: 'absent', url: smUrl, observed_at: stamp(), note: 'not_a_sitemap' };
    else snap.sitemap = { state: 'unavailable', reason: r.code, observed_at: stamp() };
  }

  // ---- key pages chosen from the home page navigation
  const fetchedUrls = new Set([homeRes.finalUrl]);
  if (L.maxPages > 0) {
    const cands = homeSummary.internal_links.filter(function (l) { return !SKIP_EXT.test(l.url); }).map(function (l, i) {
      let score = l.nav ? 2 : 0;
      KEYWORDS.forEach(function (k) { if (k[0].test(l.url) || k[0].test(l.text)) score += k[1]; });
      return { l: l, score: score, i: i };
    }).sort(function (a, b) { return b.score - a.score || a.i - b.i; });
    const picked = cands.filter(function (c) { return c.score > 0; }).slice(0, L.maxPages);
    for (let i = 0; i < picked.length && snap.pages.length < L.maxPages; i++) {
      if (!(await budgetOk())) break;
      const u = picked[i].l.url;
      if (fetchedUrls.has(u)) continue;
      const r = await politeGet(u);
      if (r.ok && r.status >= 200 && r.status < 300) { fetchedUrls.add(r.finalUrl); snap.pages.push(summarise(u, r, r.ms, stamp())); }
      else snap.pages.push({ url: u, status: r.ok ? r.status : null, failed: r.ok ? null : r.code, observed_at: stamp() });
    }
  }

  // ---- link sample
  if (L.maxLinkChecks > 0) {
    const all = [];
    const seen = new Set(fetchedUrls);
    [homeSummary].concat(snap.pages.filter(function (p) { return p.internal_links; })).forEach(function (pg) {
      pg.internal_links.forEach(function (l) { if (!seen.has(l.url) && all.length < 200) { seen.add(l.url); all.push(l.url); } });
    });
    snap.links.candidates = all.length;
    for (let i = 0; i < all.length && snap.links.checked.length < L.maxLinkChecks; i++) {
      if (!(await budgetOk())) break;
      let r = await politeGet(all[i], { method: 'HEAD', follow: true, types: null });
      if (r.ok && (r.status === 405 || r.status === 501 || r.status === 403) && (await budgetOk())) r = await politeGet(all[i], { method: 'GET', maxBytes: 200000, types: null });
      if (!r.ok && (r.code === 'blocked_by_robots' || r.code === 'budget' || r.code === 'robots_unavailable')) { snap.links.skipped_robots++; continue; }
      const status = r.ok ? r.status : null;
      const broken = !r.ok || status >= 400;
      snap.links.checked.push({ url: all[i], status: status, broken: broken, code: r.ok ? null : r.code });
      if (broken) snap.links.broken++;
    }
    snap.links.observed_at = stamp();
  }
  snap.finished_at = stamp();
  return snap;
}

module.exports = { crawlSite, LIMITS, summarise, normHost };

// A small probe used by POST /start: robots.txt plus the home page only (2 requests), same rules as the full crawl.
function probeSite(opts) {
  return crawlSite(Object.assign({}, opts, { role: 'business', limits: { maxRequests: 2, maxPages: 0, maxLinkChecks: 0, totalMs: 12000, checkHttp: false } }));
}
module.exports.probeSite = probeSite;
