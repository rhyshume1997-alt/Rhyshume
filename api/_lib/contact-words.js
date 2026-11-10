'use strict';

/*
Site specific spam words for rhyshume.co.uk, layered on top of antispam.classify.

antispam.js stays exactly as shared between sites. Its built in lists catch generic SEO and marketing pitches
and give credit for machining words (my clients are engineering firms, so that credit still applies).
This file adds what is specific to a web, automation and grants freelancer:

PITCHES   phrases people use when they are selling to me, not asking me for something (+3 each, capped at +9)
GENUINE   phrases only a real customer would use (-2 each, capped at -4)

Generic industry words like "engineering" or "manufacturing" are not in GENUINE on purpose. A pitch aimed at my
niche uses them too, so they would hide a real pitch.
A single PITCHES hit scores 3, under the threshold of 4, so one odd phrase never holds a real enquiry on its own.
*/

const PITCHES = [
  /\bwe (can|could|will|would love to|specialis[e]|specializ[e]|offer|provide)\b[^.\n]{0,50}\byour (website|site|business|company|brand|online)/i,
  /\b(our|we are an?|we're an?)\s+(ai|automation|marketing|web|seo|digital|software|design)\s+(agency|company|studio|team)\b/i,
  /\b(hire|dedicated)\s+(a\s+|our\s+)?(wordpress |shopify |react |php |full[- ]?stack )?(developers?|programmers?|designers?|dev(elopment)? team)\b/i,
  /\b(white[- ]?label|offshore|nearshore)\b/i,
  /\b(wordpress|shopify|woocommerce|magento|wix|squarespace)\s+(development|developer|expert|agency|specialist|store)\b/i,
  /\b(guaranteed|100%\s*guaranteed)\s+(grant|funding|approval|results|rankings|traffic|leads|roi)\b/i,
  /\bgrant\s+(writing|writer|consult\w+|funding|application)\s+(services|agency|company|specialists?|experts?)\b/i,
  /\bclaim (your|the)\s+(grant|funding|rebate|refund)\b/i,
  /\b(buy|purchase)\s+(web\s*)?(traffic|followers|links|backlinks|domains?|reviews)\b/i,
  /\b(expired|expiring)\s+domain\b|\bdomain\b[^.\n]{0,20}\b(expires?|expired|expiring|suspend\w*)\b/i,
  /\b(partnership|collaboration|sponsored|advertis\w+)\s+(proposal|opportunity|post|content|space)\b/i,
  /\b(email|contact|lead|business)\s+(lists?|databases?)\b/i,
  /\b(limited|special|exclusive)\s+(time\s+)?(offer|discount|deal)\b/i,
  /\bclick\s+(the\s+)?(link|here)\b|\bvisit\s+(the\s+)?link\b/i,
  /\bpassive income\b|\bearn\s+[$£€]\s?\d/i
];

const GENUINE = [
  /\bquote (request )?forms?\b/i,
  /\bdrawing uploads?\b/i,
  /\btolra\b/i,
  /\bjob (management|tracking|scheduling)\b/i,
  /\bcouncil (digital )?grants?\b/i,
  /\bbusiness (growth fund|gateway)\b/i,
  /\b(east dunbartonshire|north lanarkshire|lanarkshire|dunbartonshire)\b/i,
  /\b(validation|validate[ds]?|csv|iq\/?oq|gamp|part 11|21 cfr|gmp)\b/i,
  /\b(xero|crm|mes|erp)\b/i
];

/*
sub: { name, company, message }
Returns { delta, reasons } where delta is added to the score from antispam.classify.
*/
function adjust(sub) {
  const text = [sub.company, sub.name, sub.message].join(' \n ');
  let delta = 0;
  const reasons = [];

  let pitches = 0;
  PITCHES.forEach(function (re) { if (re.test(text)) pitches += 1; });
  if (pitches) {
    const pts = Math.min(pitches * 3, 9);
    delta += pts;
    reasons.push('selling to me x' + pitches + ' (+' + pts + ')');
  }

  let genuine = 0;
  GENUINE.forEach(function (re) { if (re.test(text)) genuine += 1; });
  if (genuine) {
    const pts = Math.min(genuine * 2, 4);
    delta -= pts;
    reasons.push('customer words x' + genuine + ' (-' + pts + ')');
  }

  return { delta: delta, reasons: reasons };
}

/*
Runs the shared scoring, then this site's adjustment, and returns one verdict:
{ score, reasons, quarantine }
*/
function classifyEnquiry(antispam, sub, opts) {
  const threshold = (opts && opts.threshold) || 4;
  const base = antispam.classify(sub, { threshold: threshold });
  const extra = adjust(sub);
  const score = base.score + extra.delta;
  return {
    score: score,
    reasons: base.reasons.concat(extra.reasons),
    quarantine: score >= threshold
  };
}

module.exports = {
  adjust: adjust,
  classifyEnquiry: classifyEnquiry
};
