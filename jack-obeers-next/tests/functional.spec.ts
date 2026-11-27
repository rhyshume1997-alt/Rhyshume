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
  const add = page.locator(".pg-card [data-add]").first();
  await add.evaluate((e) => e.scrollIntoView({ block: "center" })); // keeps it clear of the fixed Call bar on a phone
  await add.click();
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

test("descriptions are plain text, tidied, shown in full (allergen wording survives), and only an absurd paste is cut", () => {
  expect(clipDescription("  Hello \n  world  ")).toBe("Hello world");
  expect(clipDescription("")).toBe("");
  // a real-length description with its allergen wording at the end is NOT cut: the warning must survive
  const real = "A crisp lager. ".repeat(60) + "Allergens: Contains: Barley Malt (Gluten).";
  expect(clipDescription(real)).toBe(real.replace(/\s+/g, " ").trim());
  expect(clipDescription(real)).toContain("Contains: Barley Malt (Gluten).");
  // only an absurdly long paste is cut, at a word
  const huge = ("word ").repeat(800);
  const c = clipDescription(huge);
  expect(c.length).toBeLessThanOrEqual(3004);
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
    expect(lines.map((l) => l.q)).toEqual([2, 2]); // the chosen quantity stays after an add, by design
    expect(lines.every((l) => !!l.v)).toBe(true);
    await page.locator(".cartbtn").first().click();
    const body = page.locator("#cart-body");
    await expect(body).toContainText("(1 litre) × 2");
    await expect(body).toContainText("(500ml) × 2");
    await expect(body).toContainText("£29.00"); // 2 x 9.00 + 2 x 5.50
    await expect(page.locator(".cartbtn .n").first()).toHaveText("4");
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

/** Beer styles that used to be dropped because the product type held none of the beer keywords. */
test.describe("Pilsner, Blonde and Bitter products", () => {
  const open = (page: import("@playwright/test").Page) => page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));
  test("Gubernija Pilsner, Ilkley Blonde and Joshua Jane Bitter appear under beers and can be added", async ({ page }) => {
    await open(page);
    await page.goto("/beers");
    for (const name of ["Gubernija Pilsner", "Ilkley Blonde", "Joshua Jane Bitter"]) {
      const c = page.locator(".pg-card", { hasText: name }).first();
      await expect(c, name).toBeVisible();
      await expect(c.locator("[data-add]"), name).toHaveCount(1);
    }
    expect(await page.locator("main").innerText()).toMatch(/\d+ beers/);
  });
  test("they are not on the cider or wine pages, and Cocktail Bitters and other unrelated products stay excluded everywhere", async ({ page }) => {
    await open(page);
    for (const path of ["/beers", "/ciders", "/wines", "/"]) {
      await page.goto(path);
      const t = await page.locator("body").innerText();
      expect(t, path).not.toMatch(/Cocktail Bitters|Tote Bag/i);
    }
    for (const path of ["/ciders", "/wines"]) {
      await page.goto(path);
      expect(await page.locator("main").innerText(), path).not.toMatch(/Gubernija Pilsner|Ilkley Blonde|Joshua Jane Bitter/);
    }
    await page.goto("/");
    await page.locator(".sh-item[data-kind=beer]").click();
    await expect(page.locator("#range-panel")).toContainText("Gubernija Pilsner");
    await expect(page.locator("#range-panel")).not.toContainText(/Cocktail Bitters|Tote Bag/i);
  });
});

/** Catalogue behaviour for what Shopify can return: events with no date or in the past, no variants, missing information. */
test.describe("catalogue edge cases", () => {
  test("events: an undated left-over sample and an expired event never show, a real upcoming one does", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));
    await page.goto("/events");
    const t = await page.locator("main").innerText();
    expect(t).toContain("Tasting Night");
    expect(t).not.toMatch(/Undated Sample Event|Expired Test Night/);
  });

  test("a product Shopify returns with no variants is left out, and one with no information still renders without undefined, NaN or null", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));
    await page.goto("/beers");
    expect(await page.locator("main").innerText()).not.toMatch(/No Variants/i);
    const href = await page.locator(".pg-card", { hasText: "Edge No Info" }).first().locator("a[href^='/product/']").first().getAttribute("href");
    await page.goto(href!);
    const t = await page.locator("main").innerText();
    expect(t).toMatch(/Edge No Info/i);
    expect(t).toMatch(/£3\.20/);
    expect(t).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/);
    expect(t).not.toMatch(/allergen|ABV: ?%/i); // nothing is invented for a product with no information
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("a sold-out product shows Sold out and cannot be added, and the card keeps its price", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));
    await page.goto("/beers");
    const c = page.locator(".pg-card", { hasText: "Sold Out Lager" }).first();
    await expect(c.getByRole("button", { name: /sold out/i })).toBeDisabled();
    await expect(c.locator("[data-add]")).toHaveCount(0);
    await expect(c).toContainText("£3.00");
  });
});

/**
 * Stock the website cannot see or cannot trust. A maximum of 24 per item exists to stop runaway orders. It must never turn "no stock figure"
 * into "available": whether something can be bought is decided by Shopify's own availableForSale flag, and Shopify's checkout is the final
 * authority on real stock.
 */
test.describe("unknown, zero and negative stock", () => {
  const open = (page: import("@playwright/test").Page) => page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));
  const card = (page: import("@playwright/test").Page, name: string) => page.locator(".pg-card", { hasText: name }).first();

  test("no stock figure and on sale: it can be bought, but only up to 24, with no stock claim", async ({ page }) => {
    await open(page);
    await page.goto("/beers");
    const c = card(page, "Stock Unknown Available");
    await expect(c.locator("[data-add]")).toHaveCount(1);
    await expect(c.locator(".pg-low")).toHaveCount(0); // no "Only N left" without a figure
    const plus = c.getByRole("button", { name: /one more/i });
    for (let i = 0; i < 23; i++) await plus.click();
    await expect(c.locator(".atb-n")).toHaveText("24");
    await plus.click({ force: true });
    await expect(c.locator(".atb-n")).toHaveText("24"); // the 24 holds
    await expect(c.locator(".atb-msg")).toHaveText(/Up to 24 of each item per order/);
  });

  test("no stock figure and NOT on sale: still sold out; the 24 limit does not make it available", async ({ page }) => {
    await open(page);
    await page.goto("/beers");
    const c = card(page, "Stock Unknown Sold Out");
    await expect(c.getByRole("button", { name: /sold out/i })).toBeDisabled();
    await expect(c.locator("[data-add]")).toHaveCount(0);
    await expect(c.locator(".atb")).toHaveCount(0);
    const href = await c.locator("a[href^='/product/']").first().getAttribute("href");
    await page.goto(href!);
    await expect(page.locator(".atb-add")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /sold out/i })).toBeDisabled();
    expect(await page.locator("main").innerText()).not.toMatch(/In stock/);
  });

  test("the product page says In stock only when a stock figure exists; with only Shopify's for-sale flag it says Available", async ({ page }) => {
    await open(page);
    await page.goto("/beers");
    const unknown = await card(page, "Stock Unknown Available").locator("a[href^='/product/']").first().getAttribute("href");
    await page.goto(unknown!);
    const t1 = await page.locator(".prod-price").innerText();
    expect(t1).toMatch(/Available/);
    expect(t1).not.toMatch(/In stock/);
    await page.goto("/product/p6"); // the test shop shares 40 for this one
    expect(await page.locator(".prod-price").innerText()).toMatch(/In stock/);
    await page.goto("/beers");
    const sized = await card(page, "Size Test Draught").locator("a[href^='/product/']").first().getAttribute("href");
    await page.goto(sized!); // sizes: no per-size figure is shown, so no claim
    expect(await page.locator(".prod-price").innerText()).not.toMatch(/In stock/);
  });

  test("a stock figure of zero or below is never sold, even if Shopify would allow overselling", async ({ page }) => {
    await open(page);
    await page.goto("/beers");
    for (const name of ["Stock Zero Allowed", "Stock Negative Allowed"]) {
      const c = card(page, name);
      await c.locator("[data-add]").click();
      await expect(c.locator("[data-add]")).toHaveAttribute("data-state", "error");
      await expect(c.locator(".atb-msg.bad")).toHaveText(/none left in stock/i);
    }
    const lines = await page.evaluate(() => JSON.parse(localStorage.getItem("jo5_cart") || "[]") as unknown[]);
    expect(lines).toEqual([]); // nothing was added
  });
});
