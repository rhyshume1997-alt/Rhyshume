import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";

/**
 * Shopify checkout handoff, tested safely: a second copy of the preview build is started with CHECKOUT_ENABLED=true and pointed at the
 * FAKE Shopify (tests/fake-shopify.cjs), never a real store. The default preview and live builds keep checkout OFF.
 * The fake answers cartCreate and keeps the lines it was given, so the test can read back exactly what would go to Shopify.
 */
const PORT = 3205;
const BASE = `http://localhost:${PORT}`;
const FAKE = "http://localhost:4470";
let server: ChildProcess;
let visitor = 0;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  server = spawn("pnpm", ["start", "-p", String(PORT)], {
    env: { ...process.env, NEXT_DIST_DIR: ".next-preview", CHECKOUT_ENABLED: "true", SHOPIFY_STORE_DOMAIN: "shop.test", SHOPIFY_STOREFRONT_TOKEN: "x", SHOPIFY_API_BASE: FAKE, TURNSTILE_ALLOW_TEST_KEYS: "true" },
    stdio: "ignore",
  });
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

test("checkout is off by default on the preview build", async ({ request, baseURL }) => {
  const r = await request.post(`${baseURL}/api/checkout`, { headers: { Origin: baseURL! }, data: { lines: [{ h: "p0", q: 1 }], ...adult } });
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
  expect((await (await post({ lines: [{ h: soldOut.handle, q: 20 }], ...adult })).json()).reason).toBe("empty");
  expect((await (await post({ lines: [], ...adult })).json()).reason).toBe("empty");
});

test("handoff with sizes: the chosen 1 litre variant is sent, a 250ml id falls back to 500ml, never the 250ml", async () => {
  const all = (await (await fetch(FAKE, { method: "POST", body: JSON.stringify({ query: "{ products { nodes { handle title variants } } }" }) })).json()).data.products.nodes as { handle: string; title: string; variants: { nodes: { id: string; title: string }[] } }[];
  const p = all.find((n) => /SIZE TEST DRAUGHT LAGER/i.test(n.title))!;
  const id = (t: string) => p.variants.nodes.find((v) => v.title === t)!.id;
  let r = await post({ lines: [{ h: p.handle, q: 4, v: id("1 litre") }], ...adult }); // 4 x 9.00 = 36, over the minimum
  expect((await r.json()).ok).toBe(true);
  expect((await lastCart())!.lines).toEqual([{ merchandiseId: id("1 litre"), quantity: 4 }]);
  r = await post({ lines: [{ h: p.handle, q: 7, v: id("250ml") }], ...adult }); // asks for the 250ml: refused as a size, 500ml used
  expect((await r.json()).ok).toBe(true);
  expect((await lastCart())!.lines).toEqual([{ merchandiseId: id("500ml"), quantity: 7 }]);
  r = await post({ lines: [{ h: p.handle, q: 7 }], ...adult }); // no size named: 500ml, the default
  expect((await lastCart())!.lines[0].merchandiseId).toBe(id("500ml"));
});
