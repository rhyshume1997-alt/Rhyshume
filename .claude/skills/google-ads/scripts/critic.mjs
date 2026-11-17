// Google Ads skill · the ad critic. Scores one responsive search ad out of 20: ten checks,
// two points each, every lost point with its reason. The same ad always gets the same score.
//
// It reads what can be counted (how many lines, what they say, what's repeated, what's pinned,
// what breaks Google's editorial rules). Whether a line is true, or right for the business, is
// for Claude and the person: references/ads.md.

export const LIMITS = { headline: 30, description: 90, path: 15, headlines: 15, descriptions: 4, minHeadlines: 3, minDescriptions: 2 };

const STOP = new Set(("a an the and or of for to in on at by with from your you our we us is are be it this that as near me my " +
  "il lo la i gli le un una di da in con su per tra fra e o che del della dei delle al alla " +
  "el los las un una de del en con por para y o que " +
  "le les des du de la un une et ou en pour avec sur " +
  "der die das ein eine und oder in mit von zu für auf im den dem").split(" "));

export const words = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").match(/[a-z0-9]+/g) || [];
export const keyWords = (s) => words(s).filter((w) => !STOP.has(w) && w.length > 1);
const stem = (w) => (w.length > 4 ? w.replace(/(ing|ers|er|es|s)$/, "").replace(/e$/, "") : w);

/** The words as typed (accents kept), lowercased: what a negative keyword must be written as. */
export const typed = (s) => String(s || "").toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
/** The same word without its accents, for comparing only. */
export const bare = (w) => String(w).normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
export const isStop = (w) => STOP.has(bare(w));

/**
 * What the reader sees where an ad uses Google's insertions: {KeyWord:Default Text} shows its
 * default text; {LOCATION(City)}, {COUNTDOWN(...)} and customizers show something short.
 */
export const shown = (s) => String(s || "").replace(/\{keyword:([^}]*)\}/gi, "$1").replace(/\{[^}]*\}/g, "…");

/** Google's display length: most characters count 1, wide ones (CJK and the like) count 2. */
export function width(s) {
  let n = 0;
  for (const ch of String(s || "")) n += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? 2 : 1;
  return n;
}

// What a line is doing. English first, with the common words of Italian, Spanish, French and German.
const ANGLES = {
  action: /\b(get|book|call|order|shop|buy|start|request|schedule|try|claim|compare|join|sign up|download|contact|reserve|apply|find|see|browse|learn|talk|visit|save|upgrade|hire|prenota|chiama|chiamaci|chiamami|scrivici|richiedi|scopri|acquista|ordina|contattaci|vieni|compra|reserva|llama|llámanos|contáctanos|solicita|descubre|pide|réservez|appelez|contactez|demandez|découvrez|commandez|achetez|jetzt|buchen|anrufen|kontaktieren|anfragen|bestellen|kaufen|entdecken)\b/i,
  offer: /([$€£¥]\s?\d|\d\s?[$€£]|\b\d{1,3}\s?% ?(off|di sconto|de descuento|de réduction|rabatt)?|\bfree\b|\bgratis\b|\bgratuit|\bkostenlos|\boff\b|\bsale\b|\bdeal|\bdiscount|\bsconto|\bofferta|\boferta|\boffre|\bangebot|\bquote\b|\bestimate|\bpreventivo|\bpresupuesto|\bdevis\b|\btrial\b|\bprova\b|\bshipping\b|\bspedizione|\benv[ií]o|\blivraison|\bversand|\bfrom\b\s*[$€£]|\bfinanc|\ba rate\b|\brateizz|\btasso zero|\bcuotas\b|\bsin intereses|\bratenzahlung)/i,
  proof: /(\b\d[\d,.]*\+?\s?(years|yrs|reviews|customers|clients|jobs|projects|stars?|anni|recensioni|clienti|años|reseñas|clientes|ans|avis|jahre|bewertungen|kunden)\b|\bsince \d{4}|\bdal \d{4}|\bdesde \d{4}|\bdepuis \d{4}|\bseit \d{4}|\b\d(\.\d)?\s?(★|stars?|\/5)|★|\brated\b|\baward|\bcertified|\blicensed|\binsured|\bguarantee|\bwarranty|\bgarantit|\bgaranzia|\bgarant[ií]a|\bgarantie|\bcertificat|\bzertifiziert|\btrusted\b|\bfamily[- ]owned|\blocal(ly)? owned|\banni di esperienza|\byears of experience|\baños de experiencia|\bans d'expérience|\bjahre erfahrung)/i,
  speed: /\b(today|same[- ]day|24\/7|24 ?h|24 hours?|fast|now|in \d+ (min|minutes|hours|days)|next[- ]day|emergency|instant|oggi|subito|in giornata|hoy|urgente|aujourd'hui|rapide|heute|sofort|schnell)\b/i,
};
const SHOUT = /\b\p{Lu}{4,}\b/gu;
// Capitals for effect. One acronym in a normal line (HVAC, ADHD, CCTV) is not shouting.
const HYPE = new Set(["FREE", "SALE", "BEST", "CHEAP", "DEAL", "DEALS", "HUGE", "SAVE", "HURRY", "TODAY", "LIMITED", "AMAZING", "GRATIS", "OFFERTA", "SCONTO", "OFERTA", "PROMO", "RABATT", "SOLDES"]);

function similar(a, b) {
  const A = new Set(keyWords(a).map(stem)), B = new Set(keyWords(b).map(stem));
  if (!A.size || !B.size) return 0;
  let both = 0; for (const w of A) if (B.has(w)) both++;
  return both / Math.min(A.size, B.size);
}

/** Things Google's editors reject or limit, and plain mistakes. */
export function trips(text, kind, brand = []) {
  const out = [];
  const t = shown(text);
  const max = kind === "headline" ? LIMITS.headline : kind === "description" ? LIMITS.description : LIMITS.path;
  if (width(t) > max) out.push(`${width(t)} characters, the limit is ${max}`);
  if (kind === "headline" && /!/.test(t)) out.push("an exclamation mark in a headline (Google refuses it)");
  if (kind === "description" && (t.match(/!/g) || []).length > 1) out.push("more than one exclamation mark");
  if (/([!?.,*])\1{1,}/.test(t.replace(/\.\.\./g, ""))) out.push("repeated punctuation");
  const allow = new Set(brand.map((b) => b.toUpperCase()).flatMap((b) => b.split(/\s+/)));
  const caps = (t.match(SHOUT) || []).filter((w) => !allow.has(w));
  const loud = caps.filter((w) => HYPE.has(w));
  if (loud.length) out.push(`a word in capitals for effect (${loud[0]})`);
  else if (caps.length >= 2) out.push(`words in capitals (${caps.slice(0, 2).join(" ")})`);
  // A phone number: 8+ digits in a row of digit groups that aren't years.
  const groups = (t.match(/\+?\d[\d\s().-]{6,}\d/g) || []).filter((g) => (g.match(/\d/g) || []).length >= 8 && !(g.match(/\d+/g) || []).every((x) => /^(19|20)\d{2}$/.test(x)));
  if (groups.length) out.push("a phone number in the text (use a call asset)");
  if (/\bclick here\b/i.test(t)) out.push('"click here" (Google refuses it)');
  if (/\{keyword:\s*\}/i.test(String(text || ""))) out.push("keyword insertion with no default text");
  if (/\[[^\]]*\]/.test(String(text || ""))) out.push("a [bracket] still to fill");
  return out;
}

/**
 * @param ad  { headlines:[{text,pinned}], descriptions:[{text,pinned}], finalUrl, path1, path2, strength }
 * @param ctx { keywords:[text], brand:[text], where:[text], group }
 */
export function critique(ad, ctx = {}) {
  const line = (x) => (typeof x === "string" ? { text: x, raw: x } : { ...x, raw: x.text });
  const H = (ad.headlines || []).map(line).filter((h) => h.text).map((h) => ({ ...h, text: shown(h.text) }));
  const D = (ad.descriptions || []).map(line).filter((d) => d.text).map((d) => ({ ...d, text: shown(d.text) }));
  const brand = ctx.brand || [];
  const checks = [];
  const add = (id, name, points, note) => checks.push({ id, name, points, note });

  // 1. enough headlines
  add("headlines", "Enough headlines", H.length >= 10 ? 2 : H.length >= 6 ? 1 : 0,
    H.length >= 10 ? `${H.length} of 15` : `${H.length} of 15: Google mixes them to find what works, so ${H.length < 6 ? "this gives it almost nothing to test" : "a few more gives it more to test"}`);

  // 2. enough descriptions
  add("descriptions", "Enough descriptions", D.length >= 4 ? 2 : D.length === 3 ? 1 : 0,
    D.length >= 4 ? "4 of 4" : `${D.length} of 4`);

  // 3. says what was searched
  const kws = (ctx.keywords || []).slice(0, 5);
  const groupWords = keyWords(ctx.group || "");
  const target = kws.length ? [...new Set(kws.flatMap((k) => keyWords(k)).map(stem))] : [...new Set(groupWords.map(stem))];
  if (!target.length) add("match", "Says what they searched", 1, "no keywords to compare with, so not judged");
  else {
    const top = keyWords(kws[0] || ctx.group || "").map(stem);
    const hits = H.filter((h) => { const hw = new Set(keyWords(h.text).map(stem)); const n = top.filter((w) => hw.has(w)).length; return top.length && n >= Math.min(2, top.length); }).length;
    const loose = H.filter((h) => { const hw = keyWords(h.text).map(stem); return hw.some((w) => target.includes(w)); }).length;
    add("match", "Says what they searched", hits >= 2 ? 2 : hits === 1 || loose >= 2 ? 1 : 0,
      hits >= 2 ? `"${kws[0] || ctx.group}" is in ${hits} headlines` : hits === 1 ? `"${kws[0] || ctx.group}" is in only 1 headline: put it in 2 or 3` : `no headline says "${kws[0] || ctx.group}", the thing they typed`);
  }

  // 4. different from each other
  const pairs = [];
  for (let i = 0; i < H.length; i++) for (let j = i + 1; j < H.length; j++) if (similar(H[i].text, H[j].text) >= 0.75) pairs.push([H[i].text, H[j].text]);
  add("distinct", "Each headline says something new", pairs.length === 0 ? 2 : pairs.length <= 2 ? 1 : 0,
    pairs.length === 0 ? "no repeats" : `${pairs.length} near-repeat${pairs.length > 1 ? "s" : ""}: "${pairs[0][0]}" / "${pairs[0][1]}"`);

  // 5. a reason to pick you
  const all = [...H, ...D];
  const proofH = H.filter((h) => ANGLES.proof.test(h.text)).length;
  const proofAny = all.filter((x) => ANGLES.proof.test(x.text)).length;
  add("proof", "A reason to pick you", proofH >= 2 ? 2 : proofAny >= 1 ? 1 : 0,
    proofH >= 2 ? `${proofH} headlines carry proof` : proofAny ? "proof in one line only: years, reviews, a guarantee or a licence belong in 2 headlines" : "nothing a competitor couldn't also say: no years, reviews, rating, guarantee or licence");

  // 6. an offer or a price
  const offerH = H.filter((h) => ANGLES.offer.test(h.text)).length;
  const offerD = D.filter((d) => ANGLES.offer.test(d.text)).length;
  add("offer", "An offer or a price", offerH >= 1 && offerD >= 1 ? 2 : offerH + offerD >= 1 ? 1 : 0,
    offerH >= 1 && offerD >= 1 ? "in a headline and a description" : offerH + offerD ? "only once: say it in a headline and again in a description" : "no price, offer, free quote or delivery promise anywhere");

  // 7. tells them what to do
  const actH = H.filter((h) => ANGLES.action.test(h.text)).length;
  const actD = D.filter((d) => ANGLES.action.test(d.text)).length;
  add("action", "Tells them what to do", actH >= 1 && actD >= 1 ? 2 : actH + actD >= 1 ? 1 : 0,
    actH >= 1 && actD >= 1 ? "in a headline and a description" : actH + actD ? `only in ${actH ? "a headline" : "a description"}` : "no line says what to do next (call, book, get a quote, shop)");

  // 8. lands on the right page
  const url = ad.finalUrl || "";
  let u = null; try { u = new URL(url); } catch {}
  const specific = (kws[0] ? keyWords(kws[0]).length : groupWords.length) >= 2;
  const home = !!u && (u.pathname === "/" || u.pathname === "");
  const pageBad = [];
  if (ad.finalUrl === undefined) { add("page", "Lands on the right page", 1, "no landing page given, so not judged"); }
  else {
    if (/[\[\]]|the-page-about-this/.test(url)) { u = null; pageBad.push("the landing page is still a placeholder"); }
    else if (!u) pageBad.push("no working landing page address");
    else {
      if (u.protocol === "http:") pageBad.push("the page opens on http, not https");
      if (home && specific) pageBad.push(`it sends people to the home page, not a page about "${kws[0] || ctx.group}"`);
    }
    if (!ad.path1 && !ad.path2) pageBad.push("the two path fields are empty (free words in the address line)");
    add("page", "Lands on the right page", !u ? 0 : pageBad.length === 0 ? 2 : pageBad.length === 1 ? 1 : 0, pageBad.length ? pageBad.join("; ") : `${u.hostname}${u.pathname}`);
  }

  // 9. free to test
  const pinnedH = H.filter((h) => h.pinned && !/UNSPECIFIED|UNKNOWN/.test(h.pinned));
  const slots = {}; for (const h of pinnedH) (slots[h.pinned] ||= []).push(h);
  const lonely = Object.values(slots).filter((s) => s.length === 1).length;
  const frozen = H.length > 0 && pinnedH.length === H.length;
  add("pins", "Google can test it", frozen || lonely >= 2 ? 0 : lonely === 1 || pinnedH.length > 4 ? 1 : 2,
    !pinnedH.length ? "nothing pinned" : frozen ? "every headline is pinned: Google can't test anything" : lonely ? `${lonely} position${lonely > 1 ? "s" : ""} pinned to a single headline: pin 2 or 3 to the same position instead` : `${pinnedH.length} pinned, with a choice in each position`);

  // 10. clean
  const bad = [];
  for (const h of H) for (const t of trips(h.raw, "headline", brand)) bad.push(`"${h.raw}": ${t}`);
  for (const d of D) for (const t of trips(d.raw, "description", brand)) bad.push(`"${d.raw.slice(0, 40)}${d.raw.length > 40 ? "…" : ""}": ${t}`);
  for (const p of [ad.path1, ad.path2]) if (p) for (const t of trips(p, "path", brand)) bad.push(`path "${p}": ${t}`);
  add("clean", "Google's editorial rules", bad.length === 0 ? 2 : bad.length === 1 ? 1 : 0, bad.length ? bad.slice(0, 4).join("; ") : "clean");

  const score = checks.reduce((s, c) => s + c.points, 0);

  // Notes that don't move the score.
  const notes = [];
  const speed = all.some((x) => ANGLES.speed.test(x.text));
  if (!speed) notes.push("no line about speed or availability (today, 24/7, same day), if you have one to claim");
  if (brand.length && !H.some((h) => brand.some((b) => h.text.toLowerCase().includes(b.toLowerCase())))) notes.push("your name isn't in any headline");
  if (H.length < LIMITS.minHeadlines || D.length < LIMITS.minDescriptions) notes.push(`Google needs at least ${LIMITS.minHeadlines} headlines and ${LIMITS.minDescriptions} descriptions to run it`);

  const lost = checks.filter((c) => c.points < 2).sort((a, b) => a.points - b.points);
  return { score, max: 20, checks, lost, notes, errors: bad, counts: { headlines: H.length, descriptions: D.length } };
}

export const verdict = (score) => (score >= 17 ? "strong" : score >= 14 ? "good" : score >= 10 ? "weak" : "poor");
