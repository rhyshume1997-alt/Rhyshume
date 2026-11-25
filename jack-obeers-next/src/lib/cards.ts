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
};

export function toCard(p: Product): Card {
  const v = p.variants.find((x) => x.available) || p.variants[0];
  return {
    handle: p.handle,
    category: p.category,
    name: p.name,
    brewery: p.brewery,
    abv: p.abvNum,
    style: p.style,
    styles: p.styles,
    price: v ? v.price : 0,
    available: p.variants.some((x) => x.available),
    buy: buyLink(p),
    glass: p.glass,
    profile: p.profile,
    pairing: safePairings(p.profile),
    pairingConfirmed: !!(p.profile && p.profile.pairingConfirmed),
    sample: !!p.sample,
  };
}

export function rangeOf(all: Product[], category: Category): { cards: Card[]; chips: string[] } {
  const items = all.filter((p) => p.category === category).sort((a, b) => a.name.localeCompare(b.name));
  return { cards: items.map(toCard), chips: STYLE_CHIPS.filter((c) => items.some((p) => p.styles.includes(c))) };
}
