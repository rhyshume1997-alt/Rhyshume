import demo from "@/data/demo-products.json";
import profiles from "@/data/profiles.json";

export type Variant = { id: string; title: string; price: number; available: boolean };

export type Category = "beer" | "cider" | "wine" | "events" | "subscriptions" | "other";

export type Profile = { match: string; brewery: string; style: string; blurb: string; flavour: string[] };

/** How a glass is drawn. These colours are design choices, not facts about the drink. */
export type GlassSpec = { colour: string; head: string; haze: boolean };

export type Product = {
  handle: string;
  title: string;
  collection: string;
  productType: string;
  tags: string[];
  descriptor: string;
  description: string;
  kind: string;
  flavour: { sweet: number; bitter: number; fruity: number; body: number } | null;
  pairings: string[];
  abv: string;
  allergens: string;
  image: string | null;
  variants: Variant[];
  blurb?: string;
  sample?: boolean;
  // added for the beer range
  category: Category;
  /** The title with the ABV part removed, in title case. */
  name: string;
  /** The brewery, from the profile if there is one, otherwise Shopify's vendor. */
  brewery: string;
  abvNum: number | null;
  /** Style tags from Shopify that match the filter chips. */
  styles: string[];
  /** The one style shown on the card. */
  style: string;
  profile: Profile | null;
  glass: GlassSpec;
  /** The number at the end of the variant id, for a cart permalink. */
  variantNumericId: string | null;
};

export type Catalogue = {
  collections: Record<string, { title: string; lede: string }>;
  /** Drinks only (beer, cider, wine). The older shelf code uses this. */
  products: Product[];
  /** Every product Shopify returned, including event tickets and subscriptions. */
  all: Product[];
  live: boolean;
};

/* ------------------------------------------------------------------ */
/* Classifying and describing a product                               */
/* ------------------------------------------------------------------ */

/** The style chips, most specific first. A tag counts if it equals one of these, ignoring case. */
export const STYLE_CHIPS = ["Lager", "Pale Ale", "IPA", "Sour", "Stout", "Porter", "Ale", "Cider"] as const;

export function categoryOf(productType: string): Category {
  const t = productType.trim().toLowerCase();
  if (!t) return "other";
  if (t.includes("event") || t.includes("ticket")) return "events";
  if (t.includes("subscription") || t.includes("membership")) return "subscriptions";
  if (t.includes("cider")) return "cider";
  if (t.includes("wine") || t.includes("prosecco") || t.includes("sparkling")) return "wine";
  if (t.includes("beer") || t.includes("lager") || t.includes("ale") || t.includes("stout") || t.includes("ipa") || t.includes("porter") || t.includes("sour")) return "beer";
  return "other";
}

function titleCase(s: string): string {
  const x = s.trim();
  if (!x || x !== x.toUpperCase()) return x;
  return x.toLowerCase().replace(/(^|[\s\-/(])([a-zà-ÿ])/g, (_m, a: string, b: string) => a + b.toUpperCase()).replace(/\b(ipa|neipa|abv|ml|cl)\b/gi, (m) => (m.toLowerCase() === "ml" || m.toLowerCase() === "cl" ? m.toLowerCase() : m.toUpperCase()));
}

const ABV_RE = /\(?\s*\bABV:?\s*([\d]+(?:[.,]\d+)?)\s*%\s*\)?|\(?\s*([\d]+(?:[.,]\d+)?)\s*%\s*ABV\s*\)?/i;

/** Pulls the ABV out of a title such as "... ABV 5.0%". Returns the number and the title without that part. */
export function parseAbv(title: string): { abv: number | null; rest: string } {
  const m = title.match(ABV_RE);
  if (!m) return { abv: null, rest: title.trim() };
  const n = Number((m[1] || m[2]).replace(",", "."));
  const rest = title.replace(ABV_RE, "").replace(/\s*[-–,|]\s*$/, "").replace(/\s{2,}/g, " ").trim();
  return { abv: Number.isFinite(n) ? n : null, rest };
}

export function profileFor(title: string, category: Category): Profile | null {
  if (category !== "beer") return null;
  const t = title.toLowerCase();
  const list = profiles as Profile[];
  return list.find((p) => t.includes(p.match.toLowerCase())) || null;
}

/** The glass colour by style. Design choices from Rhys, not facts. */
export function glassFor(blob: string): GlassSpec {
  const t = blob.toLowerCase();
  // whole words only, so "ipa" does not match "principal"
  const has = (...w: string[]) =>
    w.some((x) => new RegExp("(^|[^a-z0-9\\u00e0-\\u00ff])" + x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^a-z0-9\\u00e0-\\u00ff])").test(t));
  const FOAM = "#FBF1D6";
  if (has("cherry") && has("sour")) return { colour: "#8E1B2E", head: FOAM, haze: false };
  if (has("stout", "porter")) return { colour: "#1E1410", head: "#C9A66B", haze: false };
  if (has("neipa", "ipa", "hazy")) return { colour: "#E8B23A", head: FOAM, haze: true };
  if (has("sour")) return { colour: "#D6455D", head: FOAM, haze: false };
  if (has("bitter")) return { colour: "#B8651B", head: FOAM, haze: false };
  if (has("pale ale", "ale")) return { colour: "#E0A030", head: FOAM, haze: false };
  if (has("lager", "pilsner", "helles", "ipl")) return { colour: "#F2C94C", head: FOAM, haze: false };
  if (has("blonde")) return { colour: "#F5D76E", head: FOAM, haze: false };
  if (has("cider")) return { colour: "#EBC85A", head: FOAM, haze: false };
  if (has("ros\u00e9", "rose")) return { colour: "#E7A1A8", head: FOAM, haze: false };
  if (has("sparkling", "prosecco", "champagne", "cava")) return { colour: "#EFE2A0", head: FOAM, haze: false };
  if (has("red", "merlot", "malbec", "shiraz", "rioja", "cabernet", "pinot noir")) return { colour: "#7B1E2B", head: "#E9C9CF", haze: false };
  if (has("white", "chardonnay", "sauvignon", "pinot grigio", "riesling", "wine")) return { colour: "#E8D98A", head: FOAM, haze: false };
  return { colour: "#E0A030", head: FOAM, haze: false };
}

type Raw = {
  handle: string;
  title: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  image: string | null;
  variants: Variant[];
};

const OWN_NAMES = ["jack o' beers", "jack o’beers", "jack o'beers", "jack o’ beers", "jack o beers", "jack o' beers & deli", "jack o’beers & deli"];

function enrich(r: Raw, sample = false): Product {
  const category = categoryOf(r.productType);
  const { abv, rest } = parseAbv(r.title);
  const profile = profileFor(r.title, category);
  const styles = STYLE_CHIPS.filter((s) => r.tags.some((t) => t.trim().toLowerCase() === s.toLowerCase()));
  const vendor = OWN_NAMES.includes(r.vendor.trim().toLowerCase()) ? "" : r.vendor.trim();
  const style = profile ? profile.style : styles[0] || (category === "beer" ? "" : r.productType.trim());
  const buy = r.variants.find((v) => v.available) || r.variants[0];
  const blob = [profile ? profile.style : "", ...r.tags, r.title, r.productType].join(" ");
  const col: Record<Category, string> = { beer: "beers", cider: "ciders", wine: "wines", events: "events", subscriptions: "subscriptions", other: "other" };
  return {
    handle: r.handle,
    title: r.title.trim(),
    collection: col[category],
    productType: r.productType.trim(),
    tags: r.tags,
    descriptor: profile ? profile.brewery : vendor || r.productType.trim(),
    description: r.description || "",
    kind: "bottle",
    flavour: null,
    pairings: [],
    abv: abv !== null ? `${abv}%` : "",
    allergens: "",
    image: r.image,
    variants: r.variants,
    blurb: profile ? profile.blurb : undefined,
    sample,
    category,
    name: titleCase(rest) || r.title.trim(),
    brewery: profile ? profile.brewery : vendor,
    abvNum: abv,
    styles: [...styles],
    style,
    profile,
    glass: glassFor(blob),
    variantNumericId: buy ? buy.id.split("/").pop() || null : null,
  };
}

/* ------------------------------------------------------------------ */
/* Shopify                                                            */
/* ------------------------------------------------------------------ */

const API_VERSION = "2025-07";
const PAGE_SIZE = 100;
const MAX_PAGES = 40; // 4,000 products, far more than the shop has

const QUERY = `
query Catalogue($cursor: String) {
  products(first: ${PAGE_SIZE}, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      handle
      title
      description
      productType
      vendor
      tags
      featuredImage { url }
      variants(first: 20) { nodes { id title availableForSale price { amount } } }
    }
  }
}`;

type ShopifyProduct = {
  handle: string;
  title: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  featuredImage: { url: string } | null;
  variants: { nodes: { id: string; title: string; availableForSale: boolean; price: { amount: string } }[] };
};

type Page = { errors?: unknown; data: { products: { nodes: ShopifyProduct[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } };

/** Where the Storefront API lives. SHOPIFY_API_BASE exists only so tests can point at a fake server. */
function endpoint(domain: string): string {
  return `${process.env.SHOPIFY_API_BASE || `https://${domain}`}/api/${API_VERSION}/graphql.json`;
}

/** Every product Shopify will show on the Storefront API, page by page with the cursor. Drafts are never returned. */
async function fetchAll(domain: string, token: string): Promise<ShopifyProduct[]> {
  const out: ShopifyProduct[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res: Response = await fetch(endpoint(domain), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
      body: JSON.stringify({ query: QUERY, variables: { cursor } }),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Shopify ${res.status}`);
    const json: Page = await res.json();
    if (json.errors) throw new Error(`Shopify errors: ${JSON.stringify(json.errors).slice(0, 200)}`);
    const conn = json.data.products;
    out.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  return out;
}

function fromNode(n: ShopifyProduct): Product | null {
  const variants = n.variants.nodes.map((v) => ({ id: v.id, title: v.title, price: Number(v.price.amount), available: v.availableForSale }));
  if (!variants.length) return null;
  return enrich({ handle: n.handle, title: n.title, description: n.description, productType: n.productType, vendor: n.vendor, tags: n.tags, image: n.featuredImage ? n.featuredImage.url : null, variants });
}

const SAMPLE = demo as unknown as { collections: Catalogue["collections"]; products: Omit<Product, "category" | "name" | "brewery" | "abvNum" | "styles" | "style" | "profile" | "glass" | "variantNumericId">[] };

function sampleCatalogue(): Catalogue {
  const products = SAMPLE.products.map((p) =>
    enrich({ handle: p.handle, title: p.title, description: p.description, productType: p.collection === "ciders" ? "Hard Cider" : p.collection === "wines" ? "Wine" : "Beer", vendor: "", tags: p.tags, image: p.image, variants: p.variants }, true),
  );
  return { collections: SAMPLE.collections, products, all: products, live: false };
}

/**
 * The only place the site asks for products.
 *
 * With SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN set, every product comes from the shop's Storefront API
 * (read only), followed page by page. Without them, or if Shopify cannot be reached, the SAMPLE catalogue is returned.
 */
export async function getCatalogue(): Promise<Catalogue> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  const sample = sampleCatalogue();
  if (!domain || !token) return sample;
  try {
    const all = (await fetchAll(domain, token)).map(fromNode).filter((p): p is Product => !!p);
    if (!all.length) return sample;
    const products = all.filter((p) => p.category === "beer" || p.category === "cider" || p.category === "wine");
    return { collections: SAMPLE.collections, products, all, live: true };
  } catch (e) {
    console.error("Shopify catalogue failed, using sample data", e);
    return sample;
  }
}

/** The link that puts one of a variant in a cart and goes straight to Shopify checkout. */
export function buyLink(p: Product): string | null {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain || !p.variantNumericId) return null;
  return `https://${domain}/cart/${p.variantNumericId}:1`;
}

/** Checkout stays off until CHECKOUT_ENABLED is exactly "true". It is the same switch the older checkout uses. */
export function checkoutOn(): boolean {
  return process.env.CHECKOUT_ENABLED === "true";
}

/* ------------------------------------------------------------------ */
/* Events                                                             */
/* ------------------------------------------------------------------ */

export type ShopEvent = {
  handle: string;
  title: string;
  description: string;
  image: string | null;
  price: number;
  available: boolean;
  /** YYYY-MM-DD, from a tag on the Shopify product written as date:2026-12-05 */
  date: string | null;
  /** HH:MM, from a tag written as time:19:00 */
  time: string | null;
  /** Cart permalink, when the product has a variant */
  buy?: string | null;
  sample?: boolean;
};

const SAMPLE_EVENTS: ShopEvent[] = [
  { handle: "sample-event", title: "Sample event: tasting night", description: "A made-up example so you can see how an event looks. Real events come from the shop.", image: null, price: 0, available: false, date: "2099-01-01", time: "19:00", sample: true },
];

/**
 * Events are products in Shopify of type "Event Tickets" (or "Event") with a tag date:YYYY-MM-DD and optionally time:HH:MM.
 * Tickets are that product's variants, sold through Shopify checkout. Nothing is stored on this site.
 */
export async function getEvents(): Promise<{ events: ShopEvent[]; live: boolean }> {
  const cat = await getCatalogue();
  if (!cat.live) return { events: SAMPLE_EVENTS, live: false };
  const events: ShopEvent[] = cat.all
    .filter((p) => p.category === "events")
    .map((p) => {
      const date = p.tags.map((t) => t.match(/^date:(\d{4}-\d{2}-\d{2})$/i)).find(Boolean);
      const time = p.tags.map((t) => t.match(/^time:(\d{2}:\d{2})$/i)).find(Boolean);
      const v = p.variants;
      return {
        handle: p.handle,
        title: p.title,
        description: p.description,
        image: p.image,
        price: v.length ? Math.min(...v.map((x) => x.price)) : 0,
        available: v.some((x) => x.available),
        date: date ? date[1] : null,
        time: time ? time[1] : null,
        buy: buyLink(p),
      };
    });
  return { events, live: true };
}
