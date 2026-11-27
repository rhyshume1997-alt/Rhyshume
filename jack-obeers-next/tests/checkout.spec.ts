import { expect, test } from "@playwright/test";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";

/**
 * Shopify checkout handoff, tested safely: a separate copy of the site is BUILT with CHECKOUT_ENABLED=true (the Buy now and Buy tickets
 * buttons only render in such a build) and pointed at the FAKE Shopify (tests/fake-shopify.cjs), never a real store. The default preview
 * and live builds keep checkout OFF. No chargeable order is ever placed: the fake only records the cart it is given.
 * The fake answers cartCreate and keeps the lines it was given, so the test can read back exactly what would go to Shopify.
 */
const PORT = 3205;
const BASE = `http://localhost:${PORT}`;
const FAKE = "http://localhost:4470";
let server: ChildProcess;
let visitor = 0;

test.describe.configure({ mode: "serial" });

test.use({ baseURL: BASE });

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(480_000);
  const env = { ...process.env, NEXT_DIST_DIR: ".next-checkout", CHECKOUT_ENABLED: "true", SHOPIFY_STORE_DOMAIN: "shop.test", SHOPIFY_STOREFRONT_TOKEN: "x", SHOPIFY_API_BASE: FAKE, TURNSTILE_ALLOW_TEST_KEYS: "true" };
  execFileSync("pnpm", ["build"], { env, stdio: "ignore", timeout: 420_000 });
  server = spawn("pnpm", ["start", "-p", String(PORT)], { env, stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE + "/")).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("checkout test server did not start");
});
test.afterAll(() => { server?.kill(); });

const post = (body: unknown, origin: string | null = BASE) =>
  fetch(BASE + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.0.0.${++visitor}`, ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) }); // a new visitor each time, so the 8-a-minute limit does not interfere
const adult = { dob: "1990-01-01", ageConfirmed: true };
const lastCart = async () => (await fetch(FAKE + "/__last-cart")).json() as Promise<{ lines: { merchandiseId: string; quantity: number }[]; attributes: { key: string; value: string }[] } | null>;

test("checkout is off by default on the preview build", async ({ request }) => {
  const baseURL = "http://localhost:3202";
  const r = await request.post(`${baseURL}/api/checkout`, { headers: { Origin: baseURL }, data: { lines: [{ h: "p0", q: 1 }], ...adult } });
  expect(r.status()).toBe(503);
  expect((await r.json()).reason).toBe("off");
});

test("handoff: a valid basket becomes a Shopify cart and the customer is sent to Shopify's checkout URL", async () => {
  const hamper = await (await fetch(FAKE, { method: "POST", body: JSON.stringify({ query: "{ products { nodes { handle title variants } } }" }) })).json();
  const nodes = hamper.data.products.nodes as { handle: string; title: string; variants: { nodes: { id: string }[] } }[];
  const beer = nodes.find((n) => /BEER HAMPER|Beer hamper/i.test(n.title))!;
  const r = await post({ lines: [{ h: beer.handle, q: 2 }], ...adult });
  expect(r.status).toBe(200);
  const j = await r.json();
  expect(j.ok).toBe(true);
  expect(j.url).toMatch(/^https:\/\/shop\.test\/checkouts\//);
  const cart = await lastCart();
  // the variant and quantity come from the site's own catalogue (Shopify's), the browser only names the product and a quantity
  expect(cart!.lines).toEqual([{ merchandiseId: beer.variants.nodes[0].id, quantity: 2 }]);
  expect(cart!.attributes.map((a) => a.key)).toContain("age_declared_dob");
});

test("handoff refuses: under the £35 minimum, no age declaration, under 18, foreign origin, sold out, empty", async () => {
  const all = (await (await fetch(FAKE, { method: "POST", body: JSON.stringify({ query: "{ products { nodes { handle title variants } } }" }) })).json()).data.products.nodes as { handle: string; title: string }[];
  const cheap = all.find((n) => /Salami beer sticks/i.test(n.title))!;
  const soldOut = all.find((n) => /SOLD OUT LAGER/i.test(n.title))!;
  expect((await (await post({ lines: [{ h: cheap.handle, q: 1 }], ...adult })).json()).reason).toBe("min");
  expect((await (await post({ lines: [{ h: cheap.handle, q: 20 }], dob: "1990-01-01", ageConfirmed: false })).json()).reason).toBe("age");
  const kid = new Date(); kid.setFullYear(kid.getFullYear() - 16);
  expect((await (await post({ lines: [{ h: cheap.handle, q: 20 }], dob: kid.toISOString().slice(0, 10), ageConfirmed: true })).json()).reason).toBe("age");
  expect((await post({ lines: [{ h: cheap.handle, q: 20 }], ...adult }, "https://evil.example")).status).toBe(403);
  expect((await (await post({ lines: [{ h: soldOut.handle, q: 20 }], ...adult })).json()).reason).toBe("unavailable");
  expect((await (await post({ lines: [], ...adult })).json()).reason).toBe("empty");
});

test("handoff with sizes: the chosen 1 litre variant is sent; a 250ml id or unknown id is refused, never swapped; no size named gives 500ml", async () => {
  const all = (await (await fetch(FAKE, { method: "POST", body: JSON.stringify({ query: "{ products { nodes { handle title variants } } }" }) })).json()).data.products.nodes as { handle: string; title: string; variants: { nodes: { id: string; title: string }[] } }[];
  const p = all.find((n) => /SIZE TEST DRAUGHT LAGER/i.test(n.title))!;
  const id = (t: string) => p.variants.nodes.find((v) => v.title === t)!.id;
  let r = await post({ lines: [{ h: p.handle, q: 4, v: id("1 litre") }], ...adult }); // 4 x 9.00 = 36, over the minimum
  expect((await r.json()).ok).toBe(true);
  expect((await lastCart())!.lines).toEqual([{ merchandiseId: id("1 litre"), quantity: 4 }]);
  r = await post({ lines: [{ h: p.handle, q: 7, v: id("250ml") }], ...adult }); // a size we do not sell online: refused, not swapped
  expect(r.status).toBe(409);
  expect((await r.json()).reason).toBe("unavailable");
  r = await post({ lines: [{ h: p.handle, q: 7, v: "gid://shopify/ProductVariant/1" }], ...adult });
  expect(r.status).toBe(409);
  r = await post({ lines: [{ h: p.handle, q: 7 }], ...adult }); // no size named: 500ml, the default
  expect((await r.json()).ok).toBe(true);
  expect((await lastCart())!.lines[0].merchandiseId).toBe(id("500ml"));
});

test("quantity: more than 24 of one item is refused (not cut), counted across lines, and a bad quantity is refused", async () => {
  const all = (await (await fetch(FAKE, { method: "POST", body: JSON.stringify({ query: "{ products { nodes { handle title variants } } }" }) })).json()).data.products.nodes as { handle: string; title: string }[];
  const beer = all.find((n) => /BEER HAMPER|Beer hamper/i.test(n.title))!;
  for (const q of [25, 99, 0, -1, 1.5, "abc", null]) {
    const r = await post({ lines: [{ h: beer.handle, q }], ...adult });
    expect(r.status, `q=${String(q)}`).toBe(400);
    expect((await r.json()).reason).toBe("quantity");
  }
  // two lines for the same product add up: 13 + 12 = 25
  const r = await post({ lines: [{ h: beer.handle, q: 13 }, { h: beer.handle, q: 12 }], ...adult });
  expect((await r.json()).reason).toBe("quantity");
  // exactly 24 is fine
  expect((await (await post({ lines: [{ h: beer.handle, q: 24 }], ...adult })).json()).ok).toBe(true);
  expect((await lastCart())!.lines).toEqual([expect.objectContaining({ quantity: 24 })]);
  // more than 50 lines is refused, not trimmed
  const many = Array.from({ length: 51 }, () => ({ h: beer.handle, q: 1 }));
  expect((await post({ lines: many, ...adult })).status).toBe(400);
});

test("a basket with something that cannot be sold is refused whole, not quietly reduced", async () => {
  const all = (await (await fetch(FAKE, { method: "POST", body: JSON.stringify({ query: "{ products { nodes { handle title } } }" }) })).json()).data.products.nodes as { handle: string; title: string }[];
  const beer = all.find((n) => /BEER HAMPER|Beer hamper/i.test(n.title))!;
  const gone = all.find((n) => /SOLD OUT LAGER/i.test(n.title))!;
  const r = await post({ lines: [{ h: beer.handle, q: 1 }, { h: gone.handle, q: 1 }], ...adult });
  expect(r.status).toBe(409);
  expect((await r.json()).reason).toBe("unavailable");
  expect((await post({ lines: [{ h: "no-such-product", q: 1 }], ...adult })).status).toBe(409);
});

const seen = (page: import("@playwright/test").Page) => page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));

test("Buy now is a button, not a Shopify link: there is no cart or checkout link anywhere on the site", async ({ page }) => {
  await seen(page);
  for (const path of ["/", "/beers", "/product/p6", "/beer-gift-boxes", "/events", "/draught-club"]) {
    await page.goto(path);
    const hrefs = await page.locator("a[href]").evaluateAll((els) => els.map((e) => e.getAttribute("href") || ""));
    expect(hrefs.filter((h) => /\/cart\/|\/checkouts?\/|myshopify\.com|shop\.test/.test(h)), path).toEqual([]);
  }
  await page.goto("/product/p6");
  const buy = page.locator("[data-buy]");
  await expect(buy).toHaveCount(1);
  expect(await buy.evaluate((e) => e.tagName)).toBe("BUTTON");
  // still visibly different from Add to basket
  const bg = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(await bg("[data-buy]")).not.toBe(await bg(".atb-add"));
});

test("Buy now puts one in the website basket and opens it, and the minimum order and age checks still apply", async ({ page }) => {
  await seen(page);
  await page.goto("/product/p6");
  const url = page.url();
  await page.locator("[data-buy]").click();
  expect(page.url()).toBe(url); // it did not leave the site
  await expect(page.locator("#cart")).toHaveAttribute("open", "");
  await expect(page.locator(".cartbtn .n").first()).toHaveText("1");
  await expect(page.locator("#min-msg")).toContainText(/Minimum order is £35/);
  await expect(page.locator("#cart-ck")).toBeDisabled(); // £4.20 is under the minimum
  await page.keyboard.press("Escape");
  // a hamper is over the minimum; checkout still waits for the age declaration, then goes through the website's own route
  await page.goto("/");
  await page.locator("#hampers [data-buy]").first().click();
  await expect(page.locator("#cart-ck")).toBeDisabled();
  await page.locator("#age-dob").fill("1990-01-01");
  await page.locator("#age-ok").check();
  await expect(page.locator("#cart-ck")).toBeEnabled();
  const sent: { lines: { h: string; q: number }[]; dob: string; ageConfirmed: boolean }[] = [];
  await page.route("**/api/checkout", async (route) => { sent.push(route.request().postDataJSON()); await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ ok: false, reason: "shopify" }) }); });
  await page.locator("#cart-ck").click();
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0].dob).toBe("1990-01-01");
  expect(sent[0].ageConfirmed).toBe(true);
  expect(sent[0].lines.some((l) => l.q === 1)).toBe(true);
});

test("the basket stops at 24 of one item and says so, and an older bigger basket is brought down to 24", async ({ page }) => {
  await seen(page);
  await page.goto("/product/p6");
  const plus = page.getByRole("button", { name: /one more/i });
  for (let i = 0; i < 23; i++) await plus.click();
  await expect(page.locator(".atb-n")).toHaveText("24");
  await plus.click({ force: true });
  await expect(page.locator(".atb-msg")).toHaveText(/Up to 24 of each item per order/);
  await page.locator(".atb-add").click();
  await expect(page.locator(".atb-add")).toHaveAttribute("data-state", "added");
  await expect(page.locator(".cartbtn .n").first()).toHaveText("24");
  await expect(page.locator(".atb-add")).toHaveAttribute("data-state", "idle", { timeout: 4000 });
  await page.locator(".atb-add").click(); // a 25th: refused, the basket stays at 24
  await expect(page.locator(".atb-add")).toHaveAttribute("data-state", "error");
  await expect(page.locator(".atb-msg.bad")).toContainText(/already has 24/);
  expect(((await page.evaluate(() => JSON.parse(localStorage.getItem("jo5_cart") || "[]"))) as { q: number }[])[0].q).toBe(24);
  // a basket saved before the limit, holding 30, is brought down on load
  await page.evaluate(() => localStorage.setItem("jo5_cart", JSON.stringify([{ h: "p6", q: 30 }])));
  await page.reload();
  await expect(page.locator(".cartbtn .n").first()).toHaveText("24");
});
