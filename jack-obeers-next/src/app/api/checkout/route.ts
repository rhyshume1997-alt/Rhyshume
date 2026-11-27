import { NextResponse } from "next/server";
import { clientIp, rateLimit, sameOrigin } from "@/lib/antispam";
import { endpoint, forBasket, getCatalogue } from "@/lib/catalogue";
import { pickVariant } from "@/lib/variants";
import { MAX_PER_LINE, MIN_ORDER_GBP } from "@/lib/limits";

// Checkout is OFF unless CHECKOUT_ENABLED is exactly "true" in Vercel.
// Do not turn it on until the licence and age-check for selling alcohol are confirmed.

const CART_CREATE = `
mutation CartCreate($lines: [CartLineInput!]!, $attributes: [AttributeInput!]) {
  cartCreate(input: { lines: $lines, attributes: $attributes }) {
    cart { checkoutUrl }
    userErrors { message }
  }
}`;

export async function POST(req: Request) {
  if (process.env.CHECKOUT_ENABLED !== "true") {
    return NextResponse.json({ ok: false, reason: "off" }, { status: 503 });
  }
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !token) return NextResponse.json({ ok: false, reason: "off" }, { status: 503 });

  // Anti-spam: only this site's own pages, only small JSON, and a limit per visitor so nobody can fill Shopify with carts.
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, reason: "origin" }, { status: 403 });
  if (!(req.headers.get("content-type") || "").includes("application/json")) return NextResponse.json({ ok: false, reason: "bad" }, { status: 415 });
  if (Number(req.headers.get("content-length") || 0) > 20_000) return NextResponse.json({ ok: false, reason: "bad" }, { status: 413 });
  const limit = rateLimit(`checkout:${clientIp(req.headers)}`, 8, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: false, reason: "slow" }, { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } });

  let body: { lines?: { h?: string; q?: number; v?: string }[]; dob?: string; ageConfirmed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad" }, { status: 400 });
  }

  // Age declaration is checked on the server too. Photo ID is still checked at collection or delivery.
  // The date must be exactly YYYY-MM-DD, a real calendar day, and a believable age (18 to 120). Anything else is refused: the text is
  // later saved on the Shopify cart, so only a clean date is ever allowed through.
  const dobText = typeof body.dob === "string" ? body.dob : "";
  const dob = new Date(`${dobText}T00:00:00Z`);
  const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(dobText) && !Number.isNaN(dob.getTime()) && dob.toISOString().slice(0, 10) === dobText;
  const now = new Date();
  let age = cleanDate ? now.getUTCFullYear() - dob.getUTCFullYear() : -1;
  if (age >= 0 && (now.getUTCMonth() < dob.getUTCMonth() || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate()))) age--;
  if (body.ageConfirmed !== true || age < 18 || age > 120) return NextResponse.json({ ok: false, reason: "age" }, { status: 400 });

  const catalogue = await getCatalogue();
  if (!catalogue.live) return NextResponse.json({ ok: false, reason: "off" }, { status: 503 });

  // Prices and variants always come from Shopify, never from the browser. Nothing is quietly dropped or cut: a basket this route
  // cannot sell exactly as it stands is refused with a reason, so the customer is never checked out with something different.
  const lines: { merchandiseId: string; quantity: number }[] = [];
  const perVariant = new Map<string, number>();
  let subtotal = 0;
  if ((body.lines || []).length > 50) return NextResponse.json({ ok: false, reason: "quantity" }, { status: 400 });
  const wanted = body.lines || [];
  for (const l of wanted) {
    const q = Number(l.q);
    if (!Number.isInteger(q) || q < 1 || q > MAX_PER_LINE) return NextResponse.json({ ok: false, reason: "quantity" }, { status: 400 });
    const p = forBasket(catalogue.all).find((x) => x.handle === l.h);
    // The size comes from the basket line when it names one of this product's online sizes that is on sale, otherwise the default.
    // A line that names a size we do not offer (or that is sold out) is refused, never swapped for another size.
    const named = typeof l.v === "string" && l.v ? l.v : null;
    const picked = p ? pickVariant(p.variants, named) : undefined;
    if (!p || !picked || !picked.available || (named && picked.id !== named)) return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 409 });
    // The same product and size in two lines still counts as one: the cap applies to the total.
    const total = (perVariant.get(picked.id) || 0) + q;
    if (total > MAX_PER_LINE) return NextResponse.json({ ok: false, reason: "quantity" }, { status: 400 });
    perVariant.set(picked.id, total);
    lines.push({ merchandiseId: picked.id, quantity: q });
    subtotal += picked.price * q;
  }
  if (!lines.length) return NextResponse.json({ ok: false, reason: "empty" }, { status: 400 });

  if (subtotal < MIN_ORDER_GBP) return NextResponse.json({ ok: false, reason: "min" }, { status: 400 });

  const res = await fetch(endpoint(domain), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({ query: CART_CREATE, variables: { lines, attributes: [{ key: "age_declared_dob", value: dobText }, { key: "id_check", value: "Photo ID required at collection or delivery. 18+ only." }] } }),
    cache: "no-store",
  });
  const json: { data?: { cartCreate?: { cart?: { checkoutUrl?: string }; userErrors?: unknown[] } } } = await res.json();
  const url = json.data?.cartCreate?.cart?.checkoutUrl;
  // The customer is sent to this address, so it must be a secure web address.
  if (!res.ok || !url || !/^https:\/\//i.test(url)) return NextResponse.json({ ok: false, reason: "shopify" }, { status: 502 });
  return NextResponse.json({ ok: true, url });
}
