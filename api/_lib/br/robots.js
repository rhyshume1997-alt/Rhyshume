'use strict';
/*
Business review: robots.txt parsing and decisions (RFC 9309 style).
Inputs : robots.txt text, our agent token, a URL path.
Outputs: allow or disallow, plus crawl delay and sitemap hints. fetchRobots() turns a fetch result into a state.
Rules  : 2xx parse; 4xx = no restrictions (absent); 5xx, timeout or network error = treat as disallow all and record robots_unavailable
         (conservative choice, DECISIONS section 4.7); longest matching path wins, Allow wins a tie; '*' and '$' wildcards;
         only the first 500 KiB are parsed; crawl delay honoured up to 5 s. Specific agent group beats the '*' group.
Must not change: the conservative 5xx rule and the size cap.
*/
const MAX_ROBOTS_BYTES = 500 * 1024;
const MAX_CRAWL_DELAY_S = 5;

function parseRobots(text) {
  const src = String(text || '').slice(0, MAX_ROBOTS_BYTES);
  const lines = src.split(/\r\n|\n|\r/);
  const groups = [];
  const sitemaps = [];
  let cur = null;
  let lastWasAgent = false;
  for (let i = 0; i < lines.length && i < 20000; i++) {
    let line = lines[i];
    const hash = line.indexOf('#');
    if (hash !== -1) line = line.slice(0, hash);
    line = line.trim();
    if (!line) continue;
    const c = line.indexOf(':');
    if (c < 1) continue;
    const key = line.slice(0, c).trim().toLowerCase();
    const val = line.slice(c + 1).trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [], crawlDelay: null }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === 'sitemap') { if (/^https?:\/\//i.test(val) && sitemaps.length < 20) sitemaps.push(val); continue; }
    if (!cur) continue;
    if (key === 'allow' || key === 'disallow') {
      if (val === '' && key === 'disallow') continue; // empty Disallow allows everything
      if (cur.rules.length < MAX_RULES) cur.rules.push({ allow: key === 'allow', pattern: val });
    } else if (key === 'crawl-delay') {
      const n = parseFloat(val);
      if (Number.isFinite(n) && n >= 0) cur.crawlDelay = n;
    }
  }
  return { groups: groups, sitemaps: sitemaps };
}

// Linear style glob matcher (no regular expressions, so hostile patterns cannot cause catastrophic backtracking).
// '*' matches any run of characters, a trailing '$' anchors the end, otherwise the pattern matches a prefix of the path.
const MAX_PATTERN = 200, MAX_PATH = 2048, MAX_RULES = 1000;
function globMatch(pattern, path) {
  let pat = pattern, anchored = false;
  if (pat.length && pat.charAt(pat.length - 1) === '$') { anchored = true; pat = pat.slice(0, -1); }
  const p = path.slice(0, MAX_PATH);
  let pi = 0, si = 0, star = -1, mark = 0;
  while (si < p.length) {
    if (pi < pat.length && pat.charAt(pi) === '*') { star = pi++; mark = si; }
    else if (pi < pat.length && pat.charAt(pi) === p.charAt(si)) { pi++; si++; }
    else if (pi === pat.length && !anchored) return true;
    else if (star !== -1) { pi = star + 1; si = ++mark; }
    else return false;
  }
  while (pi < pat.length && pat.charAt(pi) === '*') pi++;
  return pi === pat.length;
}

function pickGroup(parsed, agentToken) {
  const token = String(agentToken || '').toLowerCase();
  let best = null, bestLen = -1, star = null;
  parsed.groups.forEach(function (g) {
    g.agents.forEach(function (a) {
      if (a === '*') { star = star || { agents: ['*'], rules: [], crawlDelay: null }; star.rules = star.rules.concat(g.rules); if (g.crawlDelay != null) star.crawlDelay = g.crawlDelay; return; }
      if (a && token.indexOf(a) !== -1 && a.length > bestLen) { best = { agents: [a], rules: [], crawlDelay: null }; bestLen = a.length; }
    });
  });
  if (best) {
    parsed.groups.forEach(function (g) {
      if (g.agents.indexOf(best.agents[0]) !== -1) { best.rules = best.rules.concat(g.rules); if (g.crawlDelay != null) best.crawlDelay = g.crawlDelay; }
    });
    return best;
  }
  return star;
}

function isAllowed(state, path) {
  if (!state || state.kind === 'absent') return true;
  if (state.kind === 'unavailable') return false;
  const group = pickGroup(state.parsed, state.agentToken);
  if (!group) return true;
  let p = String(path || '/');
  if (p.charAt(0) !== '/') p = '/' + p;
  let bestLen = -1, allow = true;
  group.rules.forEach(function (r) {
    if (r.pattern.length > MAX_PATTERN) return;
    if (globMatch(r.pattern, p)) {
      const len = r.pattern.length;
      if (len > bestLen || (len === bestLen && r.allow)) { bestLen = len; allow = r.allow; }
    }
  });
  return allow;
}

function crawlDelayMs(state) {
  if (!state || state.kind !== 'present') return 0;
  const g = pickGroup(state.parsed, state.agentToken);
  if (!g || g.crawlDelay == null) return 0;
  return Math.round(Math.min(MAX_CRAWL_DELAY_S, g.crawlDelay) * 1000);
}

/*
fetchRobots(fetcher, origin, opts): fetches origin + /robots.txt through the safe fetcher.
Returns state { kind: 'present'|'absent'|'unavailable', parsed?, agentToken, sitemaps, status, reason? }
*/
async function fetchRobots(fetcher, origin, opts) {
  const o = opts || {};
  const res = await fetcher.request(origin + '/robots.txt', {
    maxBytes: MAX_ROBOTS_BYTES, timeoutMs: o.timeoutMs || 8000, deadline: o.deadline, userAgent: o.userAgent,
    allowedTypes: ['text/plain', 'text/html', 'application/octet-stream', 'text/x-robots', ''], accept: 'text/plain,*/*;q=0.1'
  });
  if (!res.ok) {
    if (res.code === 'bad_content_type') return { kind: 'absent', agentToken: o.agentToken, sitemaps: [], status: null, reason: 'robots_not_text' };
    if (res.code === 'too_large') {
      return { kind: 'unavailable', agentToken: o.agentToken, sitemaps: [], status: null, reason: 'robots_too_large' };
    }
    return { kind: 'unavailable', agentToken: o.agentToken, sitemaps: [], status: null, reason: 'robots_unavailable' };
  }
  if (res.status >= 500) return { kind: 'unavailable', agentToken: o.agentToken, sitemaps: [], status: res.status, reason: 'robots_unavailable' };
  if (res.status >= 400 || res.status < 200) return { kind: 'absent', agentToken: o.agentToken, sitemaps: [], status: res.status };
  if (res.status >= 300) return { kind: 'absent', agentToken: o.agentToken, sitemaps: [], status: res.status };
  const parsed = parseRobots(res.body);
  return { kind: 'present', parsed: parsed, agentToken: o.agentToken, sitemaps: parsed.sitemaps, status: res.status, finalUrl: res.finalUrl };
}

module.exports = { globMatch, parseRobots, isAllowed, crawlDelayMs, fetchRobots, MAX_ROBOTS_BYTES, MAX_CRAWL_DELAY_S };
