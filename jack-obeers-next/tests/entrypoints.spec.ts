import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Every way a purchase can start, found by reading the source. If someone adds a new one this fails and it has to be reviewed against the
 * basket rules (the minimum order, the age declaration, the 24 limit, and Shopify's prices) before it is allowed.
 */
const ROOT = join(__dirname, "..", "src");
const files: { path: string; code: string }[] = [];
(function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(name)) files.push({ path: relative(ROOT, full).replace(/\\/g, "/"), code: readFileSync(full, "utf8") });
  }
})(ROOT);

// drop comments, so a sentence that mentions an old link does not count
const strip = (c: string) => c.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const code = files.map((f) => ({ path: f.path, code: strip(f.code) }));
const where = (re: RegExp) => code.filter((f) => re.test(f.code)).map((f) => f.path).sort();

test("only one file talks to Shopify's cart: the website's own checkout route", () => {
  expect(where(/cartCreate|cartLinesAdd|checkoutUrl/)).toEqual(["app/api/checkout/route.ts"]);
});

test("nothing builds a Shopify cart or checkout link (the old /cart/VARIANT:1 permalink skipped the minimum and the age check)", () => {
  expect(where(/\/cart\/[$`"'0-9{]/)).toEqual([]);
  expect(where(/\/checkouts?\/[$`"'0-9{]/)).toEqual([]);
  expect(where(/myshopify\.com\/(cart|checkout)/)).toEqual([]);
  expect(where(/permalink/i)).toEqual([]);
});

test("the checkout route is called from one place, and the only navigation to Shopify uses the address that route returns", () => {
  expect(where(/\/api\/checkout/)).toEqual(["lib/rev5.ts"]);
  expect(where(/\bj\.url\b/)).toEqual(["lib/rev5.ts"]);
});

test("every Add and Buy control is in a known file, and Buy now and Buy tickets are buttons, never links", () => {
  const known = ["app/events/page.tsx", "app/product/[handle]/page.tsx", "components/AddToBasket.tsx", "components/HomeSections.tsx", "components/ProductGrid.tsx", "lib/rev5.ts"];
  const withControls = where(/data-add|data-buy/);
  expect(withControls.filter((p) => !known.includes(p)), "a new place starts a purchase: review it against the basket rules").toEqual([]);
  for (const f of code) expect(/<a\b[^>]*data-(buy|add)/.test(f.code), `${f.path} makes a link into a purchase control`).toBe(false);
  // the one handler for Buy now puts the item in the basket and opens it; it does not navigate
  const rev5 = code.find((f) => f.path === "lib/rev5.ts")!.code;
  const buy = rev5.slice(rev5.indexOf("data-buy]'"), rev5.indexOf("data-buy]'") + 260);
  expect(buy).toContain("add(");
  expect(buy).not.toMatch(/location|window\.open|href/);
});

test("who may switch checkout on: only the CHECKOUT_ENABLED flag, read in three known places", () => {
  expect(where(/CHECKOUT_ENABLED/)).toEqual(["app/api/checkout/route.ts", "app/events/page.tsx", "lib/catalogue.ts"]);
  expect(where(/NEXT_PUBLIC_/)).not.toContain("app/api/checkout/route.ts");
  // the Shopify token is server only: never a NEXT_PUBLIC value, and never in a file that runs in the browser
  expect(where(/NEXT_PUBLIC_[A-Z_]*SHOPIFY/)).toEqual([]);
  const browser = files.filter((f) => /^["']use client["']/m.test(f.code) || f.path === "lib/rev5.ts").map((f) => f.path);
  for (const p of browser) expect(code.find((f) => f.path === p)!.code, p).not.toMatch(/SHOPIFY_STOREFRONT_TOKEN|SHOPIFY_ADMIN_TOKEN/);
});
