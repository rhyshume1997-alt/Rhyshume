import { expect, test } from "@playwright/test";
import { pickVariant, sizeLabel, sizesOf } from "../src/lib/variants";
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
  expect(sizesOf(v).map((s) => s.label)).toEqual(["250ml", "500ml", "1 litre"]);
  expect(sizesOf([v[0]])).toEqual([]);
  expect(sizeLabel({ id: "x", title: "Default Title", price: 1, available: true }, v)).toBe("");
  expect(sizeLabel(v[1], [v[1]])).toBe("");
});
