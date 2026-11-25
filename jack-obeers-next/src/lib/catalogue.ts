import demo from "@/data/demo-products.json";

export type Variant = { id: string; title: string; price: number; available: boolean };
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
};
export type Catalogue = {
  collections: Record<string, { title: string; lede: string }>;
  products: Product[];
  live: boolean;
};

const API_VERSION = "2025-07";

const QUERY = `
query Catalogue($cursor: String) {
  products(first: 100, after: $cursor) {
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

function sentence(t: string): string {
  const x = t.trim();
  if (!x) return x;
  const base = x === x.toUpperCase() ? x.toLowerCase() : x;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Which shelf a Shopify product sits on. Events and memberships are not drinks, so they return null. */
function shelfOf(type: string): { collection: string; productType: string } | null {
  const t = type.trim().toLowerCase();
  if (!t || t === "event") return null;
  if (t.includes("cider")) return { collection: "ciders", productType: "Cider" };
  if (t.includes("red wine")) return { collection: "wines", productType: "Red wine" };
  if (t.includes("wine") || t.includes("sparkling")) return { collection: "wines", productType: t.includes("sparkling") ? "Sparkling wine" : "White wine" };
  return { collection: "beers", productType: sentence(type) };
}

function toProduct(n: ShopifyProduct): Product | null {
  const shelf = shelfOf(n.productType);
  if (!shelf) return null;
  const variants = n.variants.nodes.map((v) => ({
    id: v.id,
    title: v.title,
    price: Number(v.price.amount),
    available: v.availableForSale,
  }));
  if (!variants.length) return null;
  const abv = n.title.match(/ABV:?\s*([\d.]+)\s*%/i);
  return {
    handle: n.handle,
    title: n.title.trim(),
    collection: shelf.collection,
    productType: shelf.productType,
    tags: n.tags,
    descriptor: n.vendor && n.vendor !== "Jack O' Beers" ? n.vendor : shelf.productType,
    description: n.description || "",
    kind: "bottle",
    flavour: null,
    pairings: [],
    abv: abv ? `${abv[1]}%` : "",
    allergens: "",
    image: n.featuredImage ? n.featuredImage.url : null,
    variants,
  };
}

async function fromShopify(domain: string, token: string): Promise<Product[]> {
  const out: Product[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 5; page++) {
    const res: Response = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
      body: JSON.stringify({ query: QUERY, variables: { cursor } }),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Shopify ${res.status}`);
    const json: { errors?: unknown; data: { products: { nodes: ShopifyProduct[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } } = await res.json();
    if (json.errors) throw new Error(`Shopify errors: ${JSON.stringify(json.errors).slice(0, 200)}`);
    const conn = json.data.products;
    for (const n of conn.nodes) {
      const p = toProduct(n);
      if (p) out.push(p);
    }
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  return out;
}

/**
 * The only place the site asks for products.
 *
 * With SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN set, products come from the shop's Storefront API
 * (read only: products, prices and stock). Without them, or if Shopify cannot be reached, it returns the
 * SAMPLE catalogue so the preview still works. Flavour scores, pairings and allergens are not in Shopify,
 * so they stay empty and the label panel shows "to be supplied". Checkout is not connected here.
 */
export async function getCatalogue(): Promise<Catalogue> {
  const sample = demo as unknown as Catalogue;
  const fallback: Catalogue = { ...sample, products: sample.products.map((p) => ({ ...p, sample: true })), live: false };
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !token) return fallback;
  try {
    const products = await fromShopify(domain, token);
    if (!products.length) return fallback;
    return { collections: sample.collections, products, live: true };
  } catch (e) {
    console.error("Shopify catalogue failed, using sample data", e);
    return fallback;
  }
}


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
  sample?: boolean;
};

const SAMPLE_EVENTS: ShopEvent[] = [
  { handle: "sample-event", title: "Sample event: tasting night", description: "A made-up example so you can see how an event looks. Real events come from the shop.", image: null, price: 0, available: false, date: "2099-01-01", time: "19:00", sample: true },
];

/**
 * Events are products in Shopify with the product type "Event" and a tag date:YYYY-MM-DD (and optionally time:HH:MM).
 * The owners add or delete an event by adding or deleting that product in Shopify. Tickets are that product's
 * variants, so they are sold through Shopify checkout. Nothing is stored on this site.
 */
export async function getEvents(): Promise<{ events: ShopEvent[]; live: boolean }> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !token) return { events: SAMPLE_EVENTS, live: false };
  try {
    const out: ShopEvent[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 5; page++) {
      const res: Response = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
        body: JSON.stringify({ query: QUERY, variables: { cursor } }),
        next: { revalidate: 300 },
      });
      if (!res.ok) throw new Error(`Shopify ${res.status}`);
      const json: { errors?: unknown; data: { products: { nodes: ShopifyProduct[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } } = await res.json();
      if (json.errors) throw new Error("Shopify errors");
      for (const n of json.data.products.nodes) {
        if (n.productType.trim().toLowerCase() !== "event") continue;
        const v = n.variants.nodes;
        const date = n.tags.map((t) => t.match(/^date:(\d{4}-\d{2}-\d{2})$/i)).find(Boolean);
        const time = n.tags.map((t) => t.match(/^time:(\d{2}:\d{2})$/i)).find(Boolean);
        out.push({
          handle: n.handle,
          title: n.title.trim(),
          description: n.description || "",
          image: n.featuredImage ? n.featuredImage.url : null,
          price: v.length ? Math.min(...v.map((x) => Number(x.price.amount))) : 0,
          available: v.some((x) => x.availableForSale),
          date: date ? date[1] : null,
          time: time ? time[1] : null,
        });
      }
      if (!json.data.products.pageInfo.hasNextPage) break;
      cursor = json.data.products.pageInfo.endCursor;
    }
    return { events: out, live: true };
  } catch (e) {
    console.error("Shopify events failed", e);
    return { events: SAMPLE_EVENTS, live: false };
  }
}
