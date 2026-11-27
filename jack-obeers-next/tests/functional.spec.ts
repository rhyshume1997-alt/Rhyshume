import { expect, test } from "@playwright/test";
import { buyable, isAvailable, onlineSizeOf, pickVariant, sizeLabel, sizeManaged, sizesOf } from "../src/lib/variants";
import { checkPostcode, DELIVERY_POSTCODES, normalisePostcode } from "../src/lib/delivery-areas";
import { clipDescription } from "../src/lib/catalogue";

/** Functional changes for the Rev 1 checklist: local delivery wording, Shopify descriptions, size-aware variants. Preview-mode build. */

test("home page: local delivery only, no UK-wide or international promise, click and collect kept", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));
  await page.goto("/");
  const t = (await page.locator("#services").textContent()) || "";
  expect(t).toMatch(/Local delivery/i);
  expect(t).toMatch(/Milngavie, Baljaffray and Strathblane/);
  expect(t).toMatch(/Click & collect/i);
  expect(t).not.toMatch(/UK|internationally|worldwide|nationwide|£4\.99|free from/i);
  // wording only: nothing claims a postcode is checked
  expect(t).not.toMatch(/postcode/i);
});

test("basket: the delivery note names the three local areas and says nothing about the UK", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));
  await page.goto("/beers");
  await page.locator(".pg-card [data-add]").first().click();
  await page.locator(".cartbtn").first().click();
  const t = await page.locator("#cart-body").innerText();
  expect(t).toMatch(/Local delivery only: Milngavie, Baljaffray and Strathblane/);
  expect(t).not.toMatch(/\bUK\b/);
});

test("the Shopify description shows on the product page and beats the built-in blurb", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));
  await page.goto("/beers");
  const href = await page.locator(".pg-card", { hasText: "Raspberry Sour" }).first().locator("a[href^='/product/']").first().getAttribute("href");
  await page.goto(href!);
  await expect(page.locator(".prod-body .lede")).toHaveText("Written in Shopify: tart raspberry, brewed in Glasgow.");
  // a product with no Shopify description falls back to the built-in blurb, and shows no invented allergen line
  await page.goto("/product/p6");
  await expect(page.locator(".prod-body .lede")).toBeVisible();
  expect(await page.locator("main").innerText()).not.toMatch(/allergen/i);
});

test("descriptions are plain text, tidied, and cut at a word", () => {
  expect(clipDescription("  Hello \n  world  ")).toBe("Hello world");
  expect(clipDescription("")).toBe("");
  const long = ("word ").repeat(200);
  const c = clipDescription(long);
  expect(c.length).toBeLessThanOrEqual(404);
  expect(c.endsWith("...")).toBe(true);
});

test("size variants: the chosen size if it is on sale, else the first on sale, never an invented size or price", () => {
  const v = [
    { id: "a", title: "250ml", price: 3, available: false },
    { id: "b", title: "500ml", price: 5.5, available: true },
    { id: "c", title: "1 litre", price: 9, available: true },
  ];
  expect(pickVariant(v, "c")?.price).toBe(9);
  expect(pickVariant(v, "a")?.id).toBe("b"); // chosen size sold out: falls back to the first on sale
  expect(pickVariant(v)?.id).toBe("b"); // no choice: same as checkout has always done
  expect(pickVariant(v, "nope")?.id).toBe("b");
  expect(pickVariant([{ id: "x", title: "Default Title", price: 4, available: false }])?.id).toBe("x");
  expect(pickVariant([])).toBeUndefined();
  expect(sizesOf(v).map((s) => s.label)).toEqual(["500ml", "1 litre"]); // 250ml is never offered online
  expect(sizesOf([v[0]])).toEqual([]);
  expect(sizeLabel({ id: "x", title: "Default Title", price: 1, available: true }, v)).toBe("");
  expect(sizeLabel(v[1], [v[1]])).toBe("");
});

test("size variants: only 500ml and 1 litre are sold online, 250ml is never offered, default is 500ml", () => {
  const v = [
    { id: "q", title: "250ml", price: 3, available: true },
    { id: "h", title: "500 ml", price: 5.5, available: true },
    { id: "l", title: "1 Litre", price: 9, available: true },
  ];
  expect(onlineSizeOf("500ml")).toBe("500ml");
  expect(onlineSizeOf("1L")).toBe("1 litre");
  expect(onlineSizeOf("1000ml")).toBe("1 litre");
  expect(onlineSizeOf("250ml")).toBeNull();
  expect(onlineSizeOf("750ml")).toBeNull();
  expect(buyable(v).map((x) => x.id)).toEqual(["h", "l"]);
  expect(pickVariant(v)?.id).toBe("h"); // never the 250ml, even though it is first
  expect(pickVariant(v, "q")?.id).toBe("h"); // a 250ml id in the basket is not honoured
  expect(pickVariant(v, "l")?.id).toBe("l");
  expect(sizesOf(v).map((s) => [s.label, s.price])).toEqual([["500ml", 5.5], ["1 litre", 9]]);
  // 500ml sold out: the 1 litre is the default; both sold out: not available, even though 250ml is
  const noHalf = [v[0], { ...v[1], available: false }, v[2]];
  expect(pickVariant(noHalf)?.id).toBe("l");
  const none = [v[0], { ...v[1], available: false }, { ...v[2], available: false }];
  expect(isAvailable(none)).toBe(false);
  // a lone wine called "750ml", and a Default Title product, behave as before
  expect(pickVariant([{ id: "w", title: "750ml", price: 12, available: true }])?.id).toBe("w");
  expect(sizeManaged([{ id: "w", title: "750ml", price: 12, available: true }])).toBe(false);
  expect(sizeManaged(v)).toBe(true);
  expect(sizesOf([v[1]])).toEqual([]); // one size only: no picker
});

test("postcode check: unconfigured until a list is supplied, never invents coverage, says nothing is enforced", () => {
  expect(checkPostcode("G62 8PG")).toEqual({ status: "unconfigured" });
  expect(checkPostcode("not a postcode")).toEqual({ status: "invalid" });
  expect(normalisePostcode("g628pg")).toBe("G62 8PG");
  const list = ["G62 8PG", "G61 4", "G63"];
  expect(checkPostcode("G62 8PG", list).status).toBe("listed"); // a whole postcode
  expect(checkPostcode("G62 8PH", list).status).toBe("not-listed"); // not the same whole postcode
  expect(checkPostcode("g61 4xy", list).status).toBe("listed"); // a sector
  expect(checkPostcode("G61 5XY", list).status).toBe("not-listed"); // another sector of the same district
  expect(checkPostcode("G63 0AA", list).status).toBe("listed"); // a whole district
  expect(checkPostcode("G6 3AB", list).status).toBe("not-listed"); // G6 is not G63
  expect(checkPostcode("G61 4XY", ["G6 1"]).status).toBe("not-listed"); // "G6 1" is sector 1 of G6, not the G61 district
  expect(checkPostcode("G6 1AB", ["G6 1"]).status).toBe("listed");
  expect(DELIVERY_POSTCODES).toEqual([]); // the shipped list is empty until Michael supplies one
});

/** Size variants in the browser. The test shop (FAKE_SIZES) has a draught lager with 250ml, 500ml and 1 litre. */
test.describe("online sizes", () => {
  const open = async (page: import("@playwright/test").Page) => {
    await page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));
    await page.goto("/beers");
    const href = await page.locator(".pg-card", { hasText: "Size Test Draught" }).first().locator("a[href^='/product/']").first().getAttribute("href");
    await page.goto(href!);
  };

  test("two sizes show, 500ml first and selected, 250ml never offered, no stock figure", async ({ page }) => {
    await open(page);
    const sizes = page.getByRole("group", { name: /Size of/ });
    await expect(sizes.getByRole("button")).toHaveText(["500ml £5.50", "1 litre £9.00"]);
    await expect(sizes.getByRole("button", { name: /500ml/ })).toHaveAttribute("aria-pressed", "true");
    expect(await page.locator("main").innerText()).not.toMatch(/250\s?ml|Only \d+ left/);
    // per-size stock would be wrong for one keg, so there is no cap: five presses of plus all work (stock is 7 per size in the test shop)
    for (let i = 0; i < 8; i++) await page.getByRole("button", { name: /one more/i }).click();
    await expect(page.locator(".atb-n")).toHaveText("9");
  });

  test("the chosen size is what goes in the basket, priced per line, and each size is its own line", async ({ page }) => {
    await open(page);
    await page.getByRole("group", { name: /Size of/ }).getByRole("button", { name: /1 litre/ }).click();
    await page.getByRole("button", { name: /one more/i }).click();
    await page.locator(".atb-add").click();
    await expect(page.locator(".atb-add")).toHaveAttribute("data-state", "added");
    await expect(page.locator(".atb-add")).toHaveAttribute("data-state", "idle", { timeout: 4000 });
    await page.getByRole("group", { name: /Size of/ }).getByRole("button", { name: /500ml/ }).click();
    await page.locator(".atb-n").waitFor();
    await page.locator(".atb-add").click();
    await expect(page.locator(".atb-add")).toHaveAttribute("data-state", "added");
    const lines = await page.evaluate(() => JSON.parse(localStorage.getItem("jo5_cart") || "[]") as { h: string; q: number; v?: string }[]);
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.q).sort()).toEqual([1, 2]);
    expect(lines.every((l) => !!l.v)).toBe(true);
    await page.locator(".cartbtn").first().click();
    const body = page.locator("#cart-body");
    await expect(body).toContainText("(1 litre) × 2");
    await expect(body).toContainText("(500ml) × 1");
    await expect(body).toContainText("£23.50"); // 2 x 9.00 + 5.50
    await expect(page.locator(".cartbtn .n").first()).toHaveText("3");
  });

  test("a size that is sold out cannot be chosen, and the other is the default", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));
    await page.goto("/beers");
    const href = await page.locator(".pg-card", { hasText: "Size Test Half Sold Out" }).first().locator("a[href^='/product/']").first().getAttribute("href");
    await page.goto(href!);
    const sizes = page.getByRole("group", { name: /Size of/ });
    await expect(sizes.getByRole("button", { name: /500ml/ })).toHaveAttribute("aria-disabled", "true");
    await expect(sizes.getByRole("button", { name: /1 litre/ })).toHaveAttribute("aria-pressed", "true");
    await sizes.getByRole("button", { name: /500ml/ }).click({ force: true });
    await expect(sizes.getByRole("button", { name: /1 litre/ })).toHaveAttribute("aria-pressed", "true");
  });
});
