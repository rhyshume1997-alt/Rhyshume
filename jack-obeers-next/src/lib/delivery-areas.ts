/**
 * Postcode eligibility for local delivery. CONFIGURATION ONLY, NOT ENFORCEMENT.
 *
 * The accepted list comes from Michael and has NOT been supplied, so DELIVERY_POSTCODES is empty and the check answers
 * "unconfigured" for everything. Nothing on the site calls it yet: it is ready to be wired in once a list is approved.
 * Nothing here invents coverage: no postcode is accepted unless it is in the supplied list.
 *
 * IMPORTANT: this runs on the website. It can only tell a visitor what the list says. It cannot stop anyone reaching Shopify's
 * checkout, and Shopify's own shipping settings decide what a checkout will accept. Any message built on this must say so
 * (see DELIVERY-PLAN.md). Never describe it as a restriction.
 *
 * List entries may be written three ways (spaces and case are ignored):
 *   a whole postcode ("G62 8PG"), a postcode sector (written WITH a space: "G62 8", every postcode starting that way), or an outward
 *   code ("G62", every postcode in that district). Use the most specific form Michael can give.
 */
export const DELIVERY_POSTCODES: string[] = [];

export type PostcodeResult =
  | { status: "invalid" } // not shaped like a UK postcode
  | { status: "unconfigured" } // no approved list yet: says nothing about eligibility
  | { status: "listed"; matched: string } // the supplied list covers it
  | { status: "not-listed" }; // the supplied list does not cover it

const FULL = /^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/; // outward + inward, spaces removed
const squash = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** A tidy form such as "G62 8PG", or null when the text is not shaped like a UK postcode. */
export function normalisePostcode(input: string): string | null {
  const m = FULL.exec(squash(input || ""));
  return m ? `${m[1]} ${m[2]}` : null;
}

/**
 * Does one list entry cover this postcode? The entry is classified from how it is written, so "G61" (a whole district) cannot be
 * confused with "G6 1" (one sector of the G6 district): a sector is written with a space between the outward code and its digit.
 */
function covers(entry: string, pc: string): boolean {
  const full = squash(pc);
  const outward = full.slice(0, -3);
  const raw = entry.trim().toUpperCase();
  const sector = /^([A-Z]{1,2}\d[A-Z\d]?)\s+(\d)$/.exec(raw);
  if (sector) return outward === sector[1] && full.charAt(outward.length) === sector[2];
  const e = squash(raw);
  if (FULL.test(e)) return e === full; // a whole postcode
  if (/^[A-Z]{1,2}\d[A-Z\d]?$/.test(e)) return e === outward; // an outward code (a district)
  return false;
}

export function checkPostcode(input: string, list: readonly string[] = DELIVERY_POSTCODES): PostcodeResult {
  const pc = normalisePostcode(input);
  if (!pc) return { status: "invalid" };
  if (!list.length) return { status: "unconfigured" };
  const hit = list.find((e) => covers(e, pc));
  return hit ? { status: "listed", matched: hit } : { status: "not-listed" };
}
