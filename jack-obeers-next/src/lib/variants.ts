/**
 * Which variant (size) a customer buys. Pure functions, shared by the basket script, the product data, the cards and the
 * checkout route, so the price shown, the stock limit and the variant sent to Shopify always agree.
 *
 * ONLINE SIZES (Michael's direction): draught products are sold online in two sizes only, 500ml and 1 litre. A product is
 * "size managed" when it has more than one variant and at least one of them is named like one of those sizes. For such a
 * product only the 500ml and 1 litre variants can be bought: a 250ml variant, if Shopify has one, is never offered or sold.
 * Products with a single variant, or with variants that are not these sizes (a wine called "750ml", a "Default Title"), behave
 * exactly as before. Nothing here creates a size or a price: every price and every stock figure comes from Shopify.
 */
export type SizeVariant = { id: string; title: string; price: number; available: boolean; stock?: number | null };
export type OnlineSize = "500ml" | "1 litre";

const HALF = /^(500\s*ml|0?\.5\s*l(itres?)?|half\s+a?\s*litre)$/i;
const ONE = /^(1\s*l(itres?)?|1000\s*ml|1\.0\s*l(itres?)?)$/i;

/** "500ml" or "1 litre" when a variant is named like one of the two online sizes, otherwise null. */
export function onlineSizeOf(title: string): OnlineSize | null {
  const t = (title || "").trim();
  return HALF.test(t) ? "500ml" : ONE.test(t) ? "1 litre" : null;
}

/** The variants that can be bought online. For a size-managed product, only 500ml and 1 litre, in that order. Otherwise all of them. */
export function buyable<T extends SizeVariant>(variants: T[]): T[] {
  if (variants.length < 2 || !variants.some((v) => onlineSizeOf(v.title))) return variants;
  return (["500ml", "1 litre"] as OnlineSize[]).flatMap((s) => variants.filter((v) => onlineSizeOf(v.title) === s));
}

/** True when the product has online sizes to choose between. Used to keep per-size stock figures from being shown or enforced. */
export function sizeManaged(variants: SizeVariant[]): boolean {
  return variants.length > 1 && variants.some((v) => onlineSizeOf(v.title));
}

/**
 * The variant the customer buys: the one they chose if it can be bought and is on sale, otherwise 500ml if it is on sale, otherwise
 * the first one on sale, otherwise the first (sold out). Same rule on the card, in the basket and at checkout.
 */
export function pickVariant<T extends SizeVariant>(variants: T[], wanted?: string | null): T | undefined {
  const pool = buyable(variants);
  const chosen = wanted ? pool.find((v) => v.id === wanted && v.available) : undefined;
  if (chosen) return chosen;
  return pool.find((v) => onlineSizeOf(v.title) === "500ml" && v.available) || pool.find((v) => v.available) || pool[0];
}

/** True when the variant the customer would buy is on sale. */
export function isAvailable(variants: SizeVariant[]): boolean {
  const v = pickVariant(variants);
  return !!v && v.available;
}

/** Shopify names a single-variant product "Default Title". That is not a size, so it is never shown. */
export function sizeLabel(v: SizeVariant, all: SizeVariant[]): string {
  const s = onlineSizeOf(v.title);
  if (s && sizeManaged(all)) return s;
  const t = (v.title || "").trim();
  return all.length > 1 && t && !/^default title$/i.test(t) ? t : "";
}

/** The sizes to offer in a picker: only for a size-managed product with two or more online sizes. Empty otherwise. */
export function sizesOf<T extends SizeVariant>(variants: T[]): { id: string; label: OnlineSize; price: number; available: boolean }[] {
  const pool = buyable(variants);
  if (!sizeManaged(variants) || pool.length < 2) return [];
  return pool.map((v) => ({ id: v.id, label: onlineSizeOf(v.title) as OnlineSize, price: v.price, available: v.available }));
}
