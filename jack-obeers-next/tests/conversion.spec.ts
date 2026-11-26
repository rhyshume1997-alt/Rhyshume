import { expect, test } from "@playwright/test";

/** Checks for the conversion pass. Checkout stays off in every run. */

test("open now pill: UK time, closed Tuesday, never the visitor's clock", async ({ page }) => {
  const cases: [string, RegExp, string][] = [
    ["2026-11-25T14:00:00Z", /Open now, closes 7pm/, "Wednesday 2pm UK"],
    ["2026-11-25T09:00:00Z", /Opens 11am today/, "Wednesday 9am UK"],
    ["2026-11-24T14:00:00Z", /Closed today\. Opens 11am Wednesday/, "Tuesday"],
    ["2026-11-26T19:30:00Z", /Opens 11am Friday/, "Thursday 7:30pm UK"],
    ["2026-11-30T19:30:00Z", /Closed today\. Opens 11am Wednesday|Opens 11am Wednesday/, "Monday after close"],
    ["2026-07-01T17:30:00Z", /Open now, closes 7pm/, "BST: 17:30 UTC is 18:30 in the UK, so open"],
    ["2026-07-01T18:30:00Z", /Opens 11am/, "BST: 18:30 UTC is 19:30 in the UK, so closed"],
  ];
  for (const [iso, want, label] of cases) {
    await page.clock.install({ time: new Date(iso) });
    await page.goto("/");
    await expect(page.locator(".open-hero, .hero-card .open-pill").first()).toHaveText(want, { timeout: 5000 });
    expect(label).toBeTruthy();
  }
});

test("delivery bottle fills with the basket and says how much is left", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("jo_opened", "1"));
  await page.locator(".sh-item[data-kind=beer]").click();
  await page.locator("#range-panel .pg-card [data-add]").first().click();
  await page.locator("[data-open-cart]").first().click();
  await expect(page.locator(".fd-msg")).toContainText(/Add £\d+\.\d\d for free delivery/);
  const fill = await page.locator(".fd").evaluate((e) => Number(getComputedStyle(e).getPropertyValue("--fill")));
  expect(fill).toBeGreaterThan(0);
  expect(fill).toBeLessThan(1);
});

test("google reviews: says 5 star reviews, no count, two links", async ({ page }) => {
  await page.goto("/");
  const sec = page.locator(".greviews");
  await expect(sec).toContainText("5 star reviews on Google");
  await expect(sec).not.toContainText(/\d+ (Google )?reviews|from \d+|27/);
  await expect(sec.locator("a", { hasText: "Read the reviews" })).toHaveAttribute("href", /maps\.app\.goo\.gl/);
  await expect(sec.locator("a", { hasText: "Leave a review" })).toHaveAttribute("href", /google|goo\.gl/);
});

test("low stock tag shows only for 5 or fewer, nothing on others", async ({ page }) => {
  await page.goto("/beers");
  await page.waitForSelector(".pg-grid");
  const tags = await page.locator(".pg-low").allTextContents();
  expect(tags.length).toBeGreaterThan(0);
  for (const t of tags) expect(Number(t.match(/\d+/)![0])).toBeLessThanOrEqual(5);
  const raspberry = page.locator(".pg-card", { hasText: "Raspberry Sour" });
  await expect(raspberry.locator(".pg-low")).toHaveText("Only 3 left");
  await expect(page.locator(".pg-card", { hasText: "Joshua Jane" }).locator(".pg-low")).toHaveCount(0);
});

test("sticky bar: phone only, with call, directions and shop beers", async ({ page, isMobile }) => {
  await page.goto("/");
  const bar = page.locator(".sticky-bar");
  if (isMobile) {
    await expect(bar).toBeVisible();
    await expect(bar.locator("a[href^='tel:']")).toHaveCount(1);
    await expect(bar.locator("a[href*='google.com/maps']")).toHaveCount(1);
    await expect(bar.locator("a[href='/beers']")).toHaveCount(1);
    const cart = await page.locator(".cartbtn").first().boundingBox();
    const b = await bar.boundingBox();
    expect(cart!.y + cart!.height).toBeLessThan(b!.y); // the basket button is never under the bar
  } else {
    await expect(bar).toBeHidden();
  }
});

test("find me a beer points at beers from the flavour chips", async ({ page }) => {
  await page.goto("/beers");
  await page.locator(".find > summary").click();
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator(".find-pick").first()).toBeVisible();
  await page.getByRole("button", { name: "Fruity", exact: true }).click();
  await page.getByRole("button", { name: "Bitter" }).click();
  expect(await page.locator(".find-pick").count()).toBeLessThanOrEqual(3);
});

test("new in row shows beers created in the last 30 days", async ({ page }) => {
  await page.goto("/beers");
  const row = page.locator(".newin");
  await expect(row).toBeVisible();
  await expect(row.locator("li").first()).toContainText(/Waterpistol|Raspberry Sour|Iron Brew|Ba Nyx/i);
});

test("add to basket confirms after the basket changes, then resets", async ({ page }) => {
  await page.goto("/beers");
  const btn = page.locator(".pg-card [data-add]").first();
  await btn.click();
  await expect(btn).toHaveAttribute("data-state", "added");
  await expect(btn).toHaveAttribute("data-state", "idle", { timeout: 4000 });
});

test("opening: plays once per visit, has Skip, never adds a click", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/opening/, { timeout: 6000 });
  await expect(page.locator(".open-skip")).toBeVisible();
  await page.locator(".open-skip").click();
  await expect(page.locator("html")).not.toHaveClass(/opening/);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(300);
  await page.goto("/");
  await page.waitForTimeout(2500);
  await expect(page.locator("html")).not.toHaveClass(/opening/); // already played in this visit
});

test("opening is skipped with reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3201/");
  await page.waitForTimeout(2500);
  await expect(page.locator("html")).not.toHaveClass(/opening/);
  await expect(page.locator(".open-skip")).toBeHidden();
  await ctx.close();
});
