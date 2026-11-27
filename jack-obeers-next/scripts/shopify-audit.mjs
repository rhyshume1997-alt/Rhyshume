#!/usr/bin/env node
/**
 * Read-only audit of what the website's Shopify Storefront token can actually see. It changes NOTHING in Shopify: it only reads.
 * It never creates a cart or an order, never prints the token, and never writes a file.
 *
 *   SHOPIFY_STORE_DOMAIN=your-shop.myshopify.com SHOPIFY_STOREFRONT_TOKEN=... node scripts/shopify-audit.mjs
 *
 * (Copy the two values from Vercel, Project Settings, Environment Variables. Run it on your own computer, not in a chat.)
 *
 * It answers, for the headless website specifically (an installed app is NOT evidence that it works here):
 *   1. How many products the Storefront API returns, how many have more than one variant, which variant titles exist,
 *      how many are unavailable. (Draft products are never returned by the Storefront API.)
 *   2. Whether the token can read stock numbers (quantityAvailable).
 *   3. Whether the token can read selling plans, and if so which plan groups are attached to which products. This is what proves a
 *      subscription plan (such as the Appstle Beer Club plan) is really offered to the headless site, as opposed to only existing in the app.
 *   4. Whether ABV and allergen metafields exist and are exposed to the Storefront API (custom.abv, custom.allergens and a few common names).
 *   5. Whether Storefront cart-related selling plan fields are readable on variants (sellingPlanAllocations).
 *   6. websiteVisibility: for every product the Storefront API returns, which part of the website shows it, and for any it does NOT show,
 *      the exact reason (blank or unknown product type, subscription or membership product, undated or past event, no variant). Compare its
 *      handles with the Shopify admin's list of active products: anything in the admin but missing here is not published to the sales
 *      channel this token reads, so the website cannot see it.
 */
import { categoryOf, hiddenReason } from "../src/lib/categories.ts"; // the website's own rule (needs Node 22.18 or newer, which strips types)

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
if (!domain || !token) { console.error("Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN."); process.exit(1); }
const URL_ = `${process.env.SHOPIFY_API_BASE || `https://${domain}`}/api/2025-07/graphql.json`;

async function gql(query, variables = {}) {
  const res = await fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token }, body: JSON.stringify({ query, variables }) });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { return { ok: false, error: `HTTP ${res.status}, not JSON` }; }
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  if (json.errors && !json.data) return { ok: false, error: json.errors.map((e) => e.message).join("; ").slice(0, 300) };
  return { ok: true, data: json.data, partialErrors: json.errors ? json.errors.map((e) => e.message).slice(0, 3) : [] };
}
async function all(buildQuery) {
  const out = []; let cursor = null;
  for (let i = 0; i < 40; i++) {
    const r = await gql(buildQuery, { cursor });
    if (!r.ok) return { ok: false, error: r.error, nodes: out };
    const conn = r.data.products; out.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break; cursor = conn.pageInfo.endCursor;
  }
  return { ok: true, nodes: out };
}
const onSale = (x) => (typeof x.availableForSale === "boolean" ? x.availableForSale : x.variants.nodes.some((v) => v.availableForSale));
const count = (arr) => arr.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {});

const BASE = `query($cursor:String){ products(first:100, after:$cursor){ pageInfo{hasNextPage endCursor} nodes{ handle title productType tags availableForSale variants(first:20){ nodes{ title availableForSale price{amount} } } } } }`;
const STOCK = `query($cursor:String){ products(first:100, after:$cursor){ pageInfo{hasNextPage endCursor} nodes{ handle variants(first:20){ nodes{ quantityAvailable } } } } }`;
const PLANS = `query($cursor:String){ products(first:100, after:$cursor){ pageInfo{hasNextPage endCursor} nodes{ handle sellingPlanGroups(first:5){ nodes{ name options{ name values } sellingPlans(first:5){ nodes{ id name options{ name value } } } } } } } }`;
const ALLOC = `query($cursor:String){ products(first:100, after:$cursor){ pageInfo{hasNextPage endCursor} nodes{ handle variants(first:1){ nodes{ sellingPlanAllocations(first:3){ nodes{ sellingPlan{ id name } } } } } } } }`;
const META_KEYS = [["custom", "abv"], ["custom", "allergens"], ["custom", "allergen_info"], ["custom", "style"], ["custom", "tasting_notes"], ["specs", "abv"], ["my_fields", "abv"]];
const META = `query($cursor:String){ products(first:100, after:$cursor){ pageInfo{hasNextPage endCursor} nodes{ handle metafields(identifiers:[${META_KEYS.map(([n, k]) => `{namespace:"${n}",key:"${k}"}`).join(",")}]){ namespace key value } } } }`;

const report = { checkedAt: new Date().toISOString(), store: domain.replace(/\..*/, "") + ".…", readOnly: true };

const base = await all(BASE);
report.catalogue = { ok: base.ok, error: base.error };
if (base.ok) {
  const p = base.nodes;
  const multi = p.filter((x) => x.variants.nodes.length > 1);
  report.catalogue = {
    ok: true, products: p.length, availableForSale: p.filter(onSale).length, unavailable: p.filter((x) => !onSale(x)).length,
    byProductType: count(p.map((x) => x.productType || "(none)")),
    withMoreThanOneVariant: multi.length, variantTitles: count(p.flatMap((x) => x.variants.nodes.map((v) => v.title))),
    multiVariantExamples: multi.slice(0, 5).map((x) => ({ handle: x.handle, variants: x.variants.nodes.map((v) => `${v.title} ${v.price.amount} ${v.availableForSale ? "on sale" : "sold out"}`) })),
    note: "Draft and archived products are not returned by the Storefront API, so they cannot appear on the website.",
  };
}

if (base.ok) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = base.nodes.map((x) => {
    const category = categoryOf(x.productType || "");
    const noVariant = x.variants.nodes.length === 0;
    const why = noVariant ? "no variant (dropped when read)" : hiddenReason({ category, tags: x.tags || [], productType: x.productType || "" }, today);
    return { handle: x.handle, title: x.title, productType: x.productType || "", category, hiddenBecause: why };
  });
  report.websiteVisibility = {
    returnedByStorefrontApi: rows.length,
    shownOnWebsite: rows.filter((r) => !r.hiddenBecause).length,
    byCategory: count(rows.map((r) => r.category)),
    hiddenByDesign: rows.filter((r) => r.hiddenBecause),
    note: "The Storefront API returns only products that are active AND published to this token's sales channel. A product that is active in the Shopify admin but missing from this list is not published to that channel, so the website cannot see it.",
  };
}

const stock = await all(STOCK);
report.stock = stock.ok ? { readable: stock.nodes.some((x) => x.variants.nodes.some((v) => typeof v.quantityAvailable === "number")), note: "false means the token lacks Read inventory (unauthenticated_read_product_inventory) or nothing is tracked." } : { readable: false, error: stock.error };

const plans = await all(PLANS);
if (!plans.ok) report.sellingPlans = { readable: false, error: plans.error, note: "The token cannot read selling plans (needs unauthenticated_read_selling_plans), so the website cannot offer or verify a subscription plan yet." };
else {
  const withPlans = plans.nodes.filter((x) => x.sellingPlanGroups && x.sellingPlanGroups.nodes.length);
  const groups = {};
  for (const x of withPlans) for (const g of x.sellingPlanGroups.nodes) (groups[g.name] ||= { options: g.options, plans: g.sellingPlans.nodes.map((s) => ({ id: s.id, name: s.name, options: s.options })), products: 0 }).products++;
  report.sellingPlans = { readable: true, productsWithAPlanGroup: withPlans.length, groups, note: "These are the plan groups the headless Storefront API offers. A plan that exists in Appstle but is missing here is NOT available to this website." };
}
const alloc = await all(ALLOC);
report.sellingPlanAllocationsOnVariants = alloc.ok ? { readable: true, productsWithAllocations: alloc.nodes.filter((x) => x.variants.nodes[0] && x.variants.nodes[0].sellingPlanAllocations && x.variants.nodes[0].sellingPlanAllocations.nodes.length).length } : { readable: false, error: alloc.error };

const meta = await all(META);
if (!meta.ok) report.metafields = { readable: false, error: meta.error };
else {
  const found = {};
  for (const x of meta.nodes) for (const m of x.metafields || []) if (m && m.value) { const k = `${m.namespace}.${m.key}`; found[k] = (found[k] || 0) + 1; }
  report.metafields = { readable: true, tried: META_KEYS.map(([n, k]) => `${n}.${k}`), productsWithValueByKey: found, note: "Empty means none of these keys has a value that is exposed to the Storefront API. A metafield must be defined and set to be visible to the Storefront API in Shopify admin (Settings, Custom data)." };
}
console.log(JSON.stringify(report, null, 2));
