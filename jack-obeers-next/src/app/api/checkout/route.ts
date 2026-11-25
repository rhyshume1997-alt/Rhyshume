import { NextResponse } from "next/server";
import { getCatalogue } from "@/lib/catalogue";

// Checkout is OFF unless CHECKOUT_ENABLED is exactly "true" in Vercel.
// Do not turn it on until the licence and age-check for selling alcohol are confirmed.
const MIN_ORDER_GBP = 35;
const API_VERSION = "2025-07";

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

  let body: { lines?: { h?: string; q?: number }[]; dob?: string; ageConfirmed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad" }, { status: 400 });
  }

  // Age declaration is checked on the server too. Photo ID is still checked at collection or delivery.
  const dob = new Date(`${body.dob || ""}T00:00:00Z`);
  const now = new Date();
  let age = Number.isNaN(dob.getTime()) ? -1 : now.getUTCFullYear() - dob.getUTCFullYear();
  if (age >= 0 && (now.getUTCMonth() < dob.getUTCMonth() || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate()))) age--;
  if (body.ageConfirmed !== true || age < 18) return NextResponse.json({ ok: false, reason: "age" }, { status: 400 });

  const catalogue = await getCatalogue();
  if (!catalogue.live) return NextResponse.json({ ok: false, reason: "off" }, { status: 503 });

  // Prices and variants always come from Shopify, never from the browser.
  const lines: { merchandiseId: string; quantity: number }[] = [];
  let subtotal = 0;
  for (const l of (body.lines || []).slice(0, 50)) {
    const p = catalogue.products.find((x) => x.handle === l.h);
    const v = p && (p.variants.find((x) => x.available) || null);
    const q = Math.max(1, Math.min(24, Math.floor(Number(l.q) || 1)));
    if (v) {
      lines.push({ merchandiseId: v.id, quantity: q });
      subtotal += v.price * q;
    }
  }
  if (!lines.length) return NextResponse.json({ ok: false, reason: "empty" }, { status: 400 });

  if (subtotal < MIN_ORDER_GBP) return NextResponse.json({ ok: false, reason: "min" }, { status: 400 });

  const res = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({ query: CART_CREATE, variables: { lines, attributes: [{ key: "age_declared_dob", value: String(body.dob) }, { key: "id_check", value: "Photo ID required at collection or delivery. 18+ only." }] } }),
    cache: "no-store",
  });
  const json: { data?: { cartCreate?: { cart?: { checkoutUrl?: string }; userErrors?: unknown[] } } } = await res.json();
  const url = json.data?.cartCreate?.cart?.checkoutUrl;
  if (!res.ok || !url) return NextResponse.json({ ok: false, reason: "shopify" }, { status: 502 });
  return NextResponse.json({ ok: true, url });
}
