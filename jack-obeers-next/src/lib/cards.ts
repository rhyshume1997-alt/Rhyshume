import { buyLink, safePairings, STYLE_CHIPS, type Category, type GlassSpec, type Product, type Profile } from "@/lib/catalogue";

export type Card = {
  handle: string;
  category: Category;
  name: string;
  brewery: string;
  abv: number | null;
  style: string;
  styles: string[];
  price: number;
  available: boolean;
  buy: string | null;
  glass: GlassSpec;
  profile: Profile | null;
  /** Deli items only, from the allowed list. Suggestions until pairingConfirmed is true. */
  pairing: string[];
  pairingConfirmed: boolean;
  sample: boolean;
  /** Only set when Shopify says 5 or fewer are left. */
  low: number | null;
  /** Shopify's stock for the variant that checkout uses, or null when Shopify is not sharing stock. Never invented. */
  stock: number | null;
};

/** "Only N left" shows only when Shopify says so: at least 1 and at most 5. Nothing is ever invented. */
export const LOW_STOCK_AT = 5;
export function lowStock(v: { stock?: number | null } | undefined): number | null {
  const n = v ? v.stock : null;
  return typeof n === "number" && n >= 1 && n <= LOW_STOCK_AT ? n : null;
}

/** Small print under a name: capital first letter. All-caps names become Title Case; mixed case is left alone. */
export function tidy(x: string | null | undefined): string {
  const t = (x || "").trim();
  if (!t) return "";
  const cased = t === t.toUpperCase() && /[A-Z]/.test(t) ? t.toLowerCase().replace(/(^|[\s(\-/])([a-z])/g, (_m, a, b) => a + b.toUpperCase()) : t;
  return cased.charAt(0).toUpperCase() + cased.slice(1);
}

/** Shopify's stock for the variant that checkout uses (the first on sale), or null when it is not shared. */
export function stockOf(p: Product): number | null {
  const v = p.variants.find((x) => x.available) || p.variants[0];
  return v && typeof v.stock === "number" ? v.stock : null;
}

export function toCard(p: Product): Card {
  const v = p.variants.find((x) => x.available) || p.variants[0];
  return {
    handle: p.handle,
    category: p.category,
    name: p.name,
    brewery: tidy(p.brewery),
    abv: p.abvNum,
    style: tidy(p.style),
    styles: p.styles,
    price: v ? v.price : 0,
    available: p.variants.some((x) => x.available),
    buy: buyLink(p),
    glass: p.glass,
    profile: p.profile ? { ...p.profile, flavour: (p.profile.flavour || []).map(tidy) } : null,
    pairing: safePairings(p.profile),
    pairingConfirmed: !!(p.profile && p.profile.pairingConfirmed),
    sample: !!p.sample,
    low: lowStock(v),
    stock: v && typeof v.stock === "number" ? v.stock : null,
  };
}

export function rangeOf(all: Product[], category: Category): { cards: Card[]; chips: string[] } {
  const items = all.filter((p) => p.category === category).sort((a, b) => a.name.localeCompare(b.name));
  return { cards: items.map(toCard), chips: STYLE_CHIPS.filter((c) => items.some((p) => p.styles.includes(c))) };
}
