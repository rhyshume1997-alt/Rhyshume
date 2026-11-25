import { getEvents, type ShopEvent } from "@/lib/catalogue";

/**
 * Where events are created and deleted. Server only.
 *
 * mock     Kept in memory. For trying the owners page without touching Shopify. Resets when the server restarts.
 * shopify  Events are Shopify products with the type "Event" and tags date:YYYY-MM-DD and time:HH:MM.
 *          Needs SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN (an Admin API token, server only, never in the
 *          browser) with the permissions read_products, write_products and write_publications.
 *          SHOPIFY_PUBLICATION_ID is the id of the Headless channel, so the event shows on the website.
 *          THE SHOPIFY CODE BELOW HAS NOT BEEN RUN AGAINST A REAL STORE. Test it on a development store first.
 * Choose with EVENTS_BACKEND=shopify. Anything else is mock.
 */

export type OwnerEvent = {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or ""
  price: number; // pounds per ticket
  createdBy: string;
};

export type NewEvent = Omit<OwnerEvent, "id" | "createdBy">;

const ADMIN_VERSION = "2025-07";

export function eventsBackend(): "mock" | "shopify" {
  return process.env.EVENTS_BACKEND === "shopify" && process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_TOKEN ? "shopify" : "mock";
}

/* ---------- mock ---------- */
const g = globalThis as unknown as { __joEvents?: OwnerEvent[] };
const mock = (): OwnerEvent[] => (g.__joEvents ||= []);

/* ---------- shopify ---------- */
async function admin<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${ADMIN_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN as string },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify admin ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors || !json.data) throw new Error("Shopify admin error");
  return json.data;
}

function tag(tags: string[], key: string): string {
  const t = tags.find((x) => x.toLowerCase().startsWith(key + ":"));
  return t ? t.slice(key.length + 1) : "";
}

type ShopifyEventNode = { id: string; title: string; descriptionHtml: string; tags: string[]; variants: { nodes: { id: string; price: string }[] } };

async function listShopify(): Promise<OwnerEvent[]> {
  const d = await admin<{ products: { nodes: ShopifyEventNode[] } }>(
    `query { products(first: 100, query: "product_type:Event") { nodes { id title descriptionHtml tags variants(first: 1) { nodes { id price } } } } }`,
    {},
  );
  return d.products.nodes.map((n) => ({
    id: n.id,
    title: n.title,
    description: n.descriptionHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    date: tag(n.tags, "date"),
    time: tag(n.tags, "time"),
    price: Number(n.variants.nodes[0]?.price || 0),
    createdBy: "",
  }));
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function createShopify(e: NewEvent): Promise<string> {
  const tags = [`date:${e.date}`, ...(e.time ? [`time:${e.time}`] : [])];
  const made = await admin<{ productCreate: { product: { id: string; variants: { nodes: { id: string }[] } } | null; userErrors: { message: string }[] } }>(
    `mutation($product: ProductCreateInput!) { productCreate(product: $product) { product { id variants(first: 1) { nodes { id } } } userErrors { message } } }`,
    { product: { title: e.title, descriptionHtml: `<p>${esc(e.description)}</p>`, productType: "Event", tags, status: "ACTIVE" } },
  );
  const p = made.productCreate.product;
  if (!p || made.productCreate.userErrors.length) throw new Error("Shopify would not create the event");
  const variant = p.variants.nodes[0];
  if (variant) {
    await admin(
      `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { message } } }`,
      { productId: p.id, variants: [{ id: variant.id, price: e.price.toFixed(2) }] },
    );
  }
  if (process.env.SHOPIFY_PUBLICATION_ID) {
    await admin(
      `mutation($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { message } } }`,
      { id: p.id, input: [{ publicationId: process.env.SHOPIFY_PUBLICATION_ID }] },
    );
  }
  return p.id;
}

async function deleteShopify(id: string): Promise<void> {
  if (!id.startsWith("gid://shopify/Product/")) throw new Error("Not a product id");
  // only ever delete an Event, so a wrong id can never remove a drink from the shop
  const check = await admin<{ product: { productType: string } | null }>(`query($id: ID!) { product(id: $id) { productType } }`, { id });
  if (!check.product || check.product.productType.trim().toLowerCase() !== "event") throw new Error("Not an event");
  await admin(`mutation($input: ProductDeleteInput!) { productDelete(input: $input) { userErrors { message } } }`, { input: { id } });
}

/* ---------- what the owners page uses ---------- */
export async function listOwnerEvents(): Promise<OwnerEvent[]> {
  const list = eventsBackend() === "shopify" ? await listShopify() : mock();
  return [...list].sort((a, b) => a.date.localeCompare(b.date));
}

export async function createOwnerEvent(e: NewEvent, by: string): Promise<void> {
  if (eventsBackend() === "shopify") { await createShopify(e); return; }
  mock().push({ ...e, id: "mock-" + Math.random().toString(36).slice(2, 10), createdBy: by });
}

export async function deleteOwnerEvent(id: string): Promise<void> {
  if (eventsBackend() === "shopify") { await deleteShopify(id); return; }
  g.__joEvents = mock().filter((x) => x.id !== id);
}

/** What the public Events page shows. In mock mode that is the mock list, otherwise the Shopify Storefront API. */
export async function getPublicEvents(): Promise<{ events: ShopEvent[]; live: boolean }> {
  if (eventsBackend() === "mock" && mock().length) {
    return {
      live: false,
      events: mock().map((e) => ({ handle: e.id, title: e.title, description: e.description, image: null, price: e.price, available: false, date: e.date, time: e.time || null, sample: true })),
    };
  }
  return getEvents();
}
