import { expect, test } from "@playwright/test";
import { clientIp, MAX_TRACKED_KEYS, rateLimit } from "../src/lib/antispam";
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
