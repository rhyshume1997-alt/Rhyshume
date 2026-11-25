import { expect, test } from "@playwright/test";

/** No note is left on show: no "to be supplied", "to be confirmed", "coming soon" placeholders, no "concept" notes. */
const PAGES = ["/", "/beers", "/ciders", "/wines", "/events", "/draught-club", "/about", "/faq", "/west-highland-way", "/product/p6", "/members"];
const BANNED = /to be supplied|to be confirmed|\[Michael|Michael to|concept|coming soon|opens soon|link to be added|still to be added|Sample event|working preview|Not live|temporary/i;

for (const path of PAGES) {
  test(`no placeholder notes on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => sessionStorage.setItem("jo_opened", "1"));
    const text = (await page.locator("body").innerText()).replace(/Events coming soon/g, "");
    const hit = text.match(BANNED);
    expect(hit, `found "${hit?.[0]}" on ${path}`).toBeNull();
  });
}

test("about page shows the real photo of Michael and Tanya and no placeholder", async ({ page }) => {
  await page.goto("/about");
  const img = page.locator('img[alt="Owners Michael and Tanya outside Jack O\'Beers"]');
  await expect(img).toHaveCount(1);
  expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 100)).toBe(true);
  await expect(page.locator(".arch-slot, .video-slot")).toHaveCount(0);
});

test("google reviews, best sellers and the basket pairing", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("jo_opened", "1"));
  await expect(page.locator(".bestsellers li").first()).toBeVisible();
  await expect(page.locator("#best [data-add]").first()).toBeVisible();
  // pairing: put the Waterpistol (profile pairs with pork pie) in the basket
  await page.goto("/beers");
  await page.locator(".pg-card", { hasText: "Waterpistol" }).locator("[data-add]").click();
  await page.locator(".cartbtn").first().click();
  await expect(page.locator(".pair")).toContainText("Award-winning pork pie");
  await page.locator(".pair [data-add]").click();
  await expect(page.locator(".pair")).toHaveCount(0); // already in the basket, so no second suggestion
});

test("minimum order of 35 pounds is still there", async ({ page }) => {
  await page.goto("/beers");
  await page.locator(".pg-card [data-add]").first().click();
  await page.locator(".cartbtn").first().click();
  await expect(page.locator("#min-msg")).toContainText("Minimum order is £35");
});
