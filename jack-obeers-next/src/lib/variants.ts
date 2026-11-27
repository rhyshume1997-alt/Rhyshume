/**
 * Which variant (size) a customer buys. Pure functions, shared by the basket script, the product data and the checkout route,
 * so the price shown, the stock limit and the variant sent to Shopify always agree.
 *
 * Today every product has one variant, so nothing changes. When Shopify gives a product more than one (for example 500ml and
 * 1 litre), the basket can carry the chosen variant id in the line's `v`. With no choice, the first variant that is on sale is
 * used, which is what checkout has always done. Prices and stock always come from Shopify: nothing here invents a size or a price.
 */
export type SizeVariant = { id: string; title: string; price: number; available: boolean; stock?: number | null };

/** The chosen variant if it exists and is on sale, otherwise the first one on sale, otherwise the first. */
export function pickVariant<T extends SizeVariant>(variants: T[], wanted?: string | null): T | undefined {
  const hit = wanted ? variants.find((v) => v.id === wanted && v.available) : undefined;
  return hit || variants.find((v) => v.available) || variants[0];
}

/** Shopify names a single-variant product "Default Title". That is not a size, so it is never shown. */
export function sizeLabel(v: SizeVariant, all: SizeVariant[]): string {
  const t = (v.title || "").trim();
  return all.length > 1 && t && !/^default title$/i.test(t) ? t : "";
}

/** The sizes Shopify offers for a product, for a future size picker. Empty when there is only one. */
export function sizesOf<T extends SizeVariant>(variants: T[]): { id: string; label: string; price: number; available: boolean }[] {
  if (variants.length < 2) return [];
  return variants.map((v) => ({ id: v.id, label: sizeLabel(v, variants), price: v.price, available: v.available }));
}
