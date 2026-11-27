import { expect, test } from "@playwright/test";
import { clientIp, ipBucket, MAX_TRACKED_KEYS, rateLimit } from "../src/lib/antispam";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { categoryOf, eventDate, hiddenReason } from "../src/lib/categories";
import { sizesOf } from "../src/lib/variants";

/** Rate limit, what the website hides, and stock: logic that does not need a browser. */

test.describe("rate limit", () => {
  test("a visitor cannot choose their own address when the platform supplies one", () => {
    const a = clientIp(new Headers({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "10.0.0.1" }));
    const b = clientIp(new Headers({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "10.0.0.99, 1.2.3.4" }));
    expect(a).toBe("203.0.113.7");
    expect(b).toBe(a); // changing x-forwarded-for does not give a fresh allowance
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.4", "x-forwarded-for": "10.0.0.1" }))).toBe("198.51.100.4");
    // only with no platform header (local runs, tests) is x-forwarded-for used, and with nothing at all everyone shares one bucket
    expect(clientIp(new Headers({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" }))).toBe("10.0.0.1");
    expect(clientIp(new Headers())).toBe("unknown");
  });

  test("counts, refuses over the limit, and lets a visitor back in when the window has passed", async () => {
    const key = "t:basic:" + Math.random();
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 80).ok).toBe(true);
    const over = rateLimit(key, 3, 80);
    expect(over.ok).toBe(false);
    expect(over.retryAfterMs).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 120));
    expect(rateLimit(key, 3, 80).ok).toBe(true);
  });

  test("flooding with made-up keys cannot wipe a counter that is at its limit, and memory stays bounded", () => {
    const victim = "login:name:owner:" + Math.random();
    for (let i = 0; i < 6; i++) rateLimit(victim, 6, 15 * 60_000); // wrong passwords: now at its limit
    expect(rateLimit(victim, 6, 15 * 60_000).ok).toBe(false);
    // the old rule emptied the whole table at 5,000 keys; send far more than the new cap
    for (let i = 0; i < MAX_TRACKED_KEYS * 1.5; i++) rateLimit("flood:" + i, 6, 15 * 60_000);
    expect(rateLimit(victim, 6, 15 * 60_000).ok).toBe(false); // still limited
  });
});

test.describe("what the website hides, and why", () => {
  const today = "2026-11-27";
  test("the category rule", () => {
    expect(categoryOf("IPA")).toBe("beer");
    expect(categoryOf("Hard Cider")).toBe("cider");
    expect(categoryOf("Wine")).toBe("wine");
    expect(categoryOf("Event Tickets")).toBe("events");
    expect(categoryOf("Subscription Services")).toBe("subscriptions");
    expect(categoryOf("Hamper")).toBe("hampers");
    expect(categoryOf("Deli")).toBe("deli");
    expect(categoryOf("")).toBe("other");
    expect(categoryOf("Gift Card")).toBe("other");
  });
  test("beer styles with none of the older keywords are beer: Pilsner, Pilsener, Pils, Blonde, Bitter", () => {
    for (const t of ["Pilsner", "pilsner", "Czech Pilsner", "Pilsener", "Pils", "Blonde", "Blonde Beer", "Golden Blonde", "Bitter", "Best Bitter", "Yorkshire Bitter", "  BITTER  "]) expect(categoryOf(t), t).toBe("beer");
  });
  test("look-alikes and everything else keep their old category: Cocktail Bitters and other products stay excluded", () => {
    for (const t of ["Cocktail Bitters", "Bitters", "Aromatic Bitters", "Pilsners Glass", "Blondes", "Merchandise", "Gift Card", "Artwork", "Spirits", "Soft Drink", "Coffee", ""]) expect(categoryOf(t), JSON.stringify(t)).toBe("other");
    // the older rules still win where they applied before
    expect(categoryOf("Bitter Cider")).toBe("cider");
    expect(categoryOf("Blonde Wine")).toBe("wine");
    expect(categoryOf("Pilsner Hamper")).toBe("hampers");
    expect(categoryOf("Pilsner Tickets")).toBe("events");
    expect(categoryOf("Bitter Ale")).toBe("beer");
    for (const [t, c] of [["Lager", "beer"], ["IPA", "beer"], ["Hard Cider", "cider"], ["Wine", "wine"], ["Deli", "deli"], ["Hamper", "hampers"], ["Event Tickets", "events"], ["Subscription Services", "subscriptions"]] as const) expect(categoryOf(t)).toBe(c);
  });
  test("a product with one of those types is no longer hidden by the website's visibility rule", () => {
    for (const t of ["Pilsner", "Blonde", "Bitter"]) expect(hiddenReason({ category: categoryOf(t), tags: [], productType: t }, "2026-11-27")).toBeNull();
    expect(hiddenReason({ category: categoryOf("Cocktail Bitters"), tags: [], productType: "Cocktail Bitters" }, "2026-11-27")).toMatch(/Cocktail Bitters/);
  });
  test("an unknown or blank product type, a subscription, an undated or past event are hidden with a reason; everything else is shown", () => {
    expect(hiddenReason({ category: "other", tags: [], productType: "Gift Card" }, today)).toMatch(/Gift Card/);
    expect(hiddenReason({ category: "other", tags: [], productType: "" }, today)).toMatch(/blank/);
    expect(hiddenReason({ category: "subscriptions", tags: [], productType: "Subscription Services" }, today)).toMatch(/not sold through the basket/);
    expect(hiddenReason({ category: "events", tags: [], productType: "Event" }, today)).toMatch(/no date/);
    expect(hiddenReason({ category: "events", tags: ["date:2020-01-01"], productType: "Event" }, today)).toMatch(/has passed/);
    expect(hiddenReason({ category: "events", tags: ["date:2031-01-01"], productType: "Event" }, today)).toBeNull();
    expect(hiddenReason({ category: "events", tags: ["date:2026-11-27"], productType: "Event" }, today)).toBeNull(); // today is still on
    for (const c of ["beer", "cider", "wine", "deli", "hampers"] as const) expect(hiddenReason({ category: c, tags: [], productType: c }, today)).toBeNull();
    expect(eventDate(["x", "date:2031-02-03", "time:19:00"])).toBe("2031-02-03");
    expect(eventDate(["date:soon"])).toBeNull();
  });
});

test("the 500 ml and 1 litre choice stays inactive for every variant set the real shop has today (single 'Default Title' variants)", () => {
  for (const title of ["Default Title", "Default", "", "750ml", "440ml", "Case of 12"]) {
    expect(sizesOf([{ id: "a", title, price: 5, available: true }])).toEqual([]);
  }
  // two variants that are not the online sizes: still no picker
  expect(sizesOf([{ id: "a", title: "Small", price: 5, available: true }, { id: "b", title: "Large", price: 8, available: true }])).toEqual([]);
  // only one online size (no 1 litre yet): no picker, nothing to choose
  expect(sizesOf([{ id: "a", title: "250ml", price: 3, available: true }, { id: "b", title: "500ml", price: 5.5, available: true }])).toEqual([]);
});

test.describe("IPv6 visitors are counted by /64", () => {
  test("one /64 is one visitor; IPv4, mapped and different ranges are kept apart; junk is left alone", () => {
    expect(ipBucket("2001:db8:abcd:12::1")).toBe(ipBucket("2001:0db8:abcd:0012:ffff:ffff:ffff:ffff"));
    expect(ipBucket("2001:db8:abcd:12::1")).not.toBe(ipBucket("2001:db8:abcd:13::1"));
    expect(ipBucket("2001:db8:abcd:12::1")).toBe("2001:db8:abcd:12::/64");
    expect(ipBucket("::1")).toBe("0:0:0:0::/64");
    expect(ipBucket("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
    expect(ipBucket("::ffff:203.0.113.9")).toBe("203.0.113.9");
    expect(ipBucket("203.0.113.9")).toBe("203.0.113.9");
    expect(ipBucket("unknown")).toBe("unknown");
    expect(ipBucket("not:an:ip")).toBe("not:an:ip");
  });
  test("a visitor who rotates through addresses in their own /64 gets one allowance, not a new one each time", () => {
    const key = (n: number) => "checkout:" + clientIp(new Headers({ "x-vercel-forwarded-for": `2001:db8:1:2::${n.toString(16)}` }));
    let allowed = 0;
    for (let i = 1; i <= 20; i++) if (rateLimit(key(i), 8, 60_000).ok) allowed++;
    expect(allowed).toBe(8);
  });
});

test.describe("privacy: no date of birth is kept", () => {
  const ROOT = join(__dirname, "..", "src");
  const src: { path: string; code: string }[] = [];
  (function walk(d: string) { for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) walk(f); else if (/\.(ts|tsx)$/.test(n)) src.push({ path: f.slice(ROOT.length + 1).replace(/\\/g, "/"), code: readFileSync(f, "utf8") }); } })(ROOT);
  const strip = (c: string) => c.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  test("no code saves a date of birth on a cart, order, log, storage or cookie", () => {
    expect(src.filter((f) => /age_declared_dob/.test(strip(f.code))).map((f) => f.path)).toEqual([]);
    const route = strip(src.find((f) => f.path === "app/api/checkout/route.ts")!.code);
    const attrs = route.slice(route.indexOf("function ageAttributes"), route.indexOf("export async function POST"));
    expect(attrs).not.toMatch(/dob|birth/i);
    expect(route).not.toMatch(/console\./); // the request body is never logged
    expect(route.match(/dobText|\bdob\b/g)!.length).toBeGreaterThan(0); // it is still checked
    // in the browser script the date is read for the age check and sent to the route, and goes nowhere else
    const rev5 = strip(src.find((f) => f.path === "lib/rev5.ts")!.code);
    const lines = rev5.split("\n").filter((l) => /age-dob/.test(l));
    for (const l of lines) expect(l, "the date of birth must not be written to storage or a cookie").not.toMatch(/localStorage|sessionStorage|document\.cookie|\bls\(/);
    expect(rev5).not.toMatch(/(localStorage|sessionStorage)[^;]{0,80}(dob|age-dob)/);
  });
});

test("audit script: given the admin's product export, it names every active product the website does not show, with the reason", async () => {
  const FAKE = "http://localhost:4470";
  const nodes = (await (await fetch(FAKE, { method: "POST", body: JSON.stringify({ query: "{ products { nodes { handle title productType } } }" }) })).json()).data.products.nodes as { handle: string; title: string; productType: string }[];
  const pick = (re: RegExp) => nodes.find((n) => re.test(n.title))!;
  const rows = [
    ["Handle", "Title", "Type", "Published", "Status"],
    [pick(/Raspberry Sour/i).handle, "Raspberry Sour", "Beer", "TRUE", "active"],
    [pick(/Draught Club/i).handle, "Draught Club: The Regular", "Subscription Services", "TRUE", "active"],
    [pick(/Undated Sample Event/i).handle, "Undated Sample Event", "Event Tickets", "TRUE", "active"],
    ["ghost-gift-card", "Gift card, \"Christmas\"", "Gift Card", "FALSE", "active"],
    ["ghost-on-other-channel", "Not on the website's channel", "Beer", "TRUE", "active"],
    ["an-old-draft", "Old draft", "Beer", "FALSE", "draft"],
  ];
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const dir = mkdtempSync(join(tmpdir(), "audit-"));
  const file = join(dir, "products_export.csv");
  writeFileSync(file, csv);
  const run = spawnSync("node", [join(__dirname, "..", "scripts", "shopify-audit.mjs"), "--admin-csv", file], { env: { ...process.env, SHOPIFY_STORE_DOMAIN: "shop.test", SHOPIFY_STOREFRONT_TOKEN: "dummy", SHOPIFY_API_BASE: FAKE }, encoding: "utf8" });
  const report = JSON.parse(run.stdout);
  const cmp = report.adminComparison;
  expect(cmp.activeInAdminExport).toBe(5);
  expect(cmp.draftsOrArchivedIgnored).toBe(1);
  expect(cmp.shownOnWebsite).toBe(1);
  expect(cmp.notShownOnWebsite).toBe(4);
  const by = Object.fromEntries(cmp.notShown.map((n: { handle: string; why: string }) => [n.handle, n.why]));
  expect(by["ghost-gift-card"]).toMatch(/NOT published to the Online Store/);
  expect(by["ghost-on-other-channel"]).toMatch(/did not return it/);
  expect(by[pick(/Draught Club/i).handle]).toMatch(/subscription/);
  expect(by[pick(/Undated Sample Event/i).handle]).toMatch(/no date/);
  expect(JSON.stringify(report)).not.toMatch(/dummy/); // the token is never printed
});
