/**
 * Which part of the website a Shopify product belongs to, from its Shopify product type. Pure and dependency free, so the website and
 * the read-only audit script (scripts/shopify-audit.mjs) use the SAME rule and can never disagree about what is shown.
 *
 * A product type that matches nothing is "other": no shelf, page, basket or search shows it. That is by design (there is no page for
 * it), but it means a product with an unrecognised or blank type is silently invisible, so hiddenReason() below exists to say so.
 */
export type Category = "beer" | "cider" | "wine" | "events" | "subscriptions" | "deli" | "hampers" | "other";

export function categoryOf(productType: string): Category {
  const t = productType.trim().toLowerCase();
  if (!t) return "other";
  if (t.includes("event") || t.includes("ticket")) return "events";
  if (t.includes("subscription") || t.includes("membership")) return "subscriptions";
  if (t.includes("hamper")) return "hampers";
  if (t.includes("deli") || t.includes("food") || t.includes("snack") || t.includes("cheese") || t.includes("pie") || t.includes("chutney") || t.includes("preserve")) return "deli";
  if (t.includes("cider")) return "cider";
  if (t.includes("wine") || t.includes("prosecco") || t.includes("sparkling")) return "wine";
  if (t.includes("beer") || t.includes("lager") || t.includes("ale") || t.includes("stout") || t.includes("ipa") || t.includes("porter") || t.includes("sour")) return "beer";
  // Beer styles whose names contain none of the words above: a product typed Pilsner, Blonde or Bitter is a beer, not "other".
  // Whole words only, so "Cocktail Bitters" (a mixer) and anything else that merely contains these letters stays excluded.
  if (/\b(pilsner|pilsener|pils|blonde|bitter)\b/.test(t)) return "beer";
  return "other";
}

/** The date of an event product, from its tag date:YYYY-MM-DD, or null. */
export function eventDate(tags: string[]): string | null {
  for (const t of tags) {
    const m = /^date:(\d{4}-\d{2}-\d{2})$/i.exec(t.trim());
    if (m) return m[1];
  }
  return null;
}

/**
 * Why the website does not show a product Shopify returned, or null when it shows it. These are the only reasons, and all are by design:
 *  - other: the product type is blank or not one the site knows, so no page lists it
 *  - subscriptions: subscription and membership products are not sold through the basket (they are joined another way)
 *  - events: an event with no date tag, or a date that has passed, is not listed
 * (A product Shopify returns with no variants is dropped even earlier, when it is read. Drafts, archived products and products not
 * published to the sales channel the website's token reads are never returned by Shopify at all, so the website cannot know of them.)
 */
export function hiddenReason(p: { category: Category; tags: string[]; productType: string }, today: string): string | null {
  if (p.category === "other") return p.productType.trim() ? `product type "${p.productType.trim()}" is not one the website lists` : "product type is blank";
  if (p.category === "subscriptions") return "subscription and membership products are not sold through the basket";
  if (p.category === "events") {
    const d = eventDate(p.tags);
    if (!d) return "event has no date tag (date:YYYY-MM-DD)";
    if (d < today) return `event date ${d} has passed`;
  }
  return null;
}
