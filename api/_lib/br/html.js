'use strict';
/*
Business review: small dependency free HTML scanner.
Inputs : an HTML string (already size capped by the fetcher).
Outputs: a plain features object: title, meta, canonical, headings, links, JSON-LD blocks, forms, viewport, lang, text length.
Rules  : linear scan, no backtracking regexes, every collection has a hard cap, malformed markup never throws.
Must not change: the caps (they bound CPU and memory on hostile pages).
*/
const CAPS = { tag: 8192, links: 1500, headings: 200, jsonld: 20, jsonldBytes: 200000, forms: 20, metas: 100, text: 400000 };

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', pound: '£', euro: '€', copy: '©', ndash: '-', mdash: '-', hellip: '...', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"' };
function decode(s) {
  return String(s).replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, function (m, e) {
    if (e.charAt(0) === '#') {
      const n = e.charAt(1).toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!Number.isFinite(n) || n < 1 || n > 0x10ffff || (n >= 0xd800 && n < 0xe000)) return '';
      try { return String.fromCodePoint(n); } catch (x) { return ''; }
    }
    const v = ENT[e.toLowerCase()];
    return v === undefined ? m : v;
  });
}
function squash(s) { return decode(s).replace(/\s+/g, ' ').trim(); }

const RAW_TEXT = { script: 1, style: 1, textarea: 1, title: 1 };
const VOID = { meta: 1, link: 1, br: 1, hr: 1, img: 1, input: 1, base: 1, area: 1, col: 1, source: 1, track: 1, wbr: 1, embed: 1 };

// Parses attributes from the inside of a tag (after the name). Linear scan.
function parseAttrs(s) {
  const attrs = {};
  let i = 0;
  const n = s.length;
  let count = 0;
  while (i < n && count < 40) {
    while (i < n && /[\s\/]/.test(s[i])) i++;
    if (i >= n) break;
    let j = i;
    while (j < n && !/[\s=\/>]/.test(s[j])) j++;
    const name = s.slice(i, j).toLowerCase();
    i = j;
    while (i < n && /\s/.test(s[i])) i++;
    let val = '';
    if (s[i] === '=') {
      i++;
      while (i < n && /\s/.test(s[i])) i++;
      if (s[i] === '"' || s[i] === "'") {
        const q = s[i];
        const end = s.indexOf(q, i + 1);
        if (end === -1) { val = s.slice(i + 1); i = n; } else { val = s.slice(i + 1, end); i = end + 1; }
      } else {
        let k = i;
        while (k < n && !/\s/.test(s[k])) k++;
        val = s.slice(i, k);
        i = k;
      }
    }
    if (name && !(name in attrs)) { attrs[name] = decode(val); count++; }
  }
  return attrs;
}

function scan(html) {
  const src = String(html || '');
  const lower = src.toLowerCase();
  let navDepth = 0;
  let badTags = 0;
  const out = {
    title: null, titleCount: 0, metas: [], canonical: null, canonicalCount: 0, lang: null, viewport: null, robotsMeta: null,
    headings: [], links: [], jsonld: [], forms: [], baseHref: null, textLength: 0, htmlSeen: false, imgCount: 0, imgMissingAlt: 0,
    mailto: false, tel: false, truncated: false
  };
  let pos = 0;
  const n = src.length;
  let textLen = 0;
  let openHeading = null;
  let openAnchor = null;
  let openForm = null;
  let titleOpen = false;
  let titleBuf = '';
  let guard = 0;
  while (pos < n && guard++ < 200000) {
    const lt = src.indexOf('<', pos);
    if (lt === -1) { if (textLen < CAPS.text) textLen += n - pos; break; }
    if (lt > pos) {
      const text = src.slice(pos, lt);
      if (textLen < CAPS.text) textLen += text.trim().length;
      if (openHeading) openHeading.text += text;
      if (openAnchor) openAnchor.text += text;
      if (titleOpen) titleBuf += text;
    }
    if (src.startsWith('<!--', lt)) {
      const e = src.indexOf('-->', lt + 4);
      pos = e === -1 ? n : e + 3;
      continue;
    }
    if (src[lt + 1] === '!' || src[lt + 1] === '?') {
      const e = src.indexOf('>', lt + 2);
      pos = e === -1 ? n : e + 1;
      continue;
    }
    const closing = src[lt + 1] === '/';
    const nameStart = lt + (closing ? 2 : 1);
    const m = /^[a-zA-Z][a-zA-Z0-9:-]*/.exec(src.slice(nameStart, nameStart + 40));
    if (!m) { pos = lt + 1; continue; }
    const name = m[0].toLowerCase();
    // find end of tag, honouring quotes, bounded by CAPS.tag
    let k = nameStart + m[0].length;
    let q = null;
    const limit = Math.min(n, lt + CAPS.tag);
    let endTag = -1;
    for (; k < limit; k++) {
      const ch = src[k];
      if (q) { if (ch === q) q = null; }
      else if (ch === '"' || ch === "'") q = ch;
      else if (ch === '>') { endTag = k; break; }
    }
    if (endTag === -1) { out.truncated = true; pos = lt + 1; if (++badTags > 100) break; continue; }
    const inner = src.slice(nameStart + m[0].length, endTag);
    pos = endTag + 1;
    if (closing) {
      if (/^h[1-6]$/.test(name) && openHeading) {
        openHeading.text = squash(openHeading.text);
        if (out.headings.length < CAPS.headings) out.headings.push({ level: openHeading.level, text: openHeading.text.slice(0, 300) });
        openHeading = null;
      } else if (name === 'a' && openAnchor) {
        openAnchor.text = squash(openAnchor.text).slice(0, 200);
        if (out.links.length < CAPS.links) out.links.push(openAnchor);
        openAnchor = null;
      } else if (name === 'title' && titleOpen) {
        titleOpen = false;
        out.title = squash(titleBuf);
      } else if (name === 'form' && openForm) { openForm = null; }
      else if (name === 'nav' && navDepth > 0) navDepth--;
      continue;
    }
    const attrs = parseAttrs(inner);
    if (name === 'nav') navDepth++;
    if (name === 'html') { out.htmlSeen = true; if (attrs.lang) out.lang = attrs.lang.slice(0, 20); }
    else if (name === 'title') {
      out.titleCount++;
      if (out.title === null && !titleOpen) { titleOpen = true; titleBuf = ''; }
      const e = lower.indexOf('</title', pos);
      if (e === -1) { titleBuf += src.slice(pos, Math.min(n, pos + 500)); pos = Math.min(n, pos + 500); }
      else { titleBuf += src.slice(pos, e); pos = e; }
    }
    else if (name === 'meta') {
      const key = (attrs.name || attrs.property || attrs['http-equiv'] || '').toLowerCase();
      if (key && out.metas.length < CAPS.metas) out.metas.push({ key: key, content: (attrs.content || '').slice(0, 1000) });
      if (key === 'viewport' && out.viewport === null) out.viewport = attrs.content || '';
      if (key === 'robots' && out.robotsMeta === null) out.robotsMeta = (attrs.content || '').toLowerCase();
    }
    else if (name === 'link') {
      const rel = (attrs.rel || '').toLowerCase().split(/\s+/);
      if (rel.indexOf('canonical') !== -1) { out.canonicalCount++; if (out.canonical === null) out.canonical = attrs.href || ''; }
    }
    else if (name === 'base') { if (out.baseHref === null && attrs.href) out.baseHref = attrs.href; }
    else if (/^h[1-6]$/.test(name)) { openHeading = { level: parseInt(name.charAt(1), 10), text: '' }; }
    else if (name === 'a') {
      if (openAnchor) { openAnchor.text = squash(openAnchor.text).slice(0, 200); if (out.links.length < CAPS.links) out.links.push(openAnchor); }
      openAnchor = { href: (attrs.href || '').slice(0, 600), text: '', rel: (attrs.rel || '').toLowerCase(), inNav: navDepth > 0 };
      const h = (attrs.href || '').trim().toLowerCase();
      if (h.indexOf('mailto:') === 0) out.mailto = true;
      if (h.indexOf('tel:') === 0) out.tel = true;
    }
    else if (name === 'img') { out.imgCount++; if (!('alt' in attrs)) out.imgMissingAlt++; }
    else if (name === 'form') {
      openForm = { action: (attrs.action || '').slice(0, 300), method: (attrs.method || 'get').toLowerCase(), inputs: [] };
      if (out.forms.length < CAPS.forms) out.forms.push(openForm);
    }
    else if ((name === 'input' || name === 'textarea' || name === 'select') && openForm && openForm.inputs.length < 40) {
      openForm.inputs.push({ tag: name, type: (attrs.type || (name === 'input' ? 'text' : name)).toLowerCase(), name: (attrs.name || '').toLowerCase().slice(0, 60) });
    }
    else if (name === 'script') {
      const type = (attrs.type || '').toLowerCase().split(';')[0].trim();
      const e = lower.indexOf('</script', pos);
      const bodyEnd = e === -1 ? Math.min(n, pos + CAPS.jsonldBytes) : e;
      if (type === 'application/ld+json' && out.jsonld.length < CAPS.jsonld) {
        out.jsonld.push(src.slice(pos, Math.min(bodyEnd, pos + CAPS.jsonldBytes)));
      }
      pos = e === -1 ? n : e;
      const close = src.indexOf('>', pos);
      pos = close === -1 ? n : close + 1;
    }
    else if (name === 'style' || name === 'textarea') {
      const e = lower.indexOf('</' + name, pos);
      pos = e === -1 ? n : e;
      const close = src.indexOf('>', pos);
      pos = close === -1 ? n : close + 1;
    }
  }
  if (openAnchor && out.links.length < CAPS.links) { openAnchor.text = squash(openAnchor.text).slice(0, 200); out.links.push(openAnchor); }
  if (openHeading && out.headings.length < CAPS.headings) out.headings.push({ level: openHeading.level, text: squash(openHeading.text).slice(0, 300) });
  if (titleOpen && out.title === null) out.title = squash(titleBuf);
  out.textLength = textLen;
  return out;
}

// Parses each JSON-LD block. Returns { blocks, parsed, failed, types }.
function analyseJsonLd(blocks) {
  let parsed = 0, failed = 0;
  const types = [];
  const names = [];
  const addTypes = function (node, depth) {
    if (!node || typeof node !== 'object' || depth > 6) return;
    if (Array.isArray(node)) { node.slice(0, 200).forEach(function (x) { addTypes(x, depth + 1); }); return; }
    const t = node['@type'];
    if (typeof t === 'string') { if (types.indexOf(t) === -1 && types.length < 40) types.push(t.slice(0, 80)); }
    else if (Array.isArray(t)) t.forEach(function (x) { if (typeof x === 'string' && types.indexOf(x) === -1 && types.length < 40) types.push(x.slice(0, 80)); });
    if (typeof node.name === 'string' && node.name.trim() && names.length < 5 && /Organization|LocalBusiness|Corporation|Store|Service|Company|Business|Electrician|Plumber|Restaurant|CafeOrCoffeeShop|ProfessionalService|HomeAndConstructionBusiness/i.test(JSON.stringify(t || ''))) names.push(node.name.trim().slice(0, 160));
    if (node['@graph']) addTypes(node['@graph'], depth + 1);
  };
  (blocks || []).forEach(function (b) {
    try { const j = JSON.parse(String(b).trim()); parsed++; addTypes(j, 0); } catch (e) { failed++; }
  });
  return { blocks: (blocks || []).length, parsed: parsed, failed: failed, types: types, names: names };
}

module.exports = { scan, analyseJsonLd, decode, squash, CAPS };
