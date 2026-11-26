import { expect, test } from "@playwright/test";

// The look switch and the notes drawer are for previews only. The test server runs in live mode (SITE_INDEXABLE=true),
// so they must not exist here, and ?look= must change nothing. (The preview itself was checked by hand: see PREVIEWS.md.)
test("live mode has no look picker, notes tab or look switch", async ({ page }) => {
  await page.goto("/?look=backbar");
  await expect(page.locator(".look-picker")).toHaveCount(0);
  await expect(page.locator(".cm-tab")).toHaveCount(0);
  await expect(page.locator(".look-bb")).toHaveCount(0);
  await expect(page.locator(".look-cin")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.dataset.look)).toBeUndefined();
  await expect(page.locator(".stage")).toBeVisible();
});

// Rev 9: the new "From keg to bottle" block is preview-only. The live site keeps its original tap wall section.
test("live mode keeps the original tap wall section and has no From keg to bottle block", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".taps-new")).toHaveCount(0);
  await expect(page.locator("#tp-h")).toContainText("Keg fresh,");
  await expect(page.locator(".taps-old")).toBeVisible();
});

// Rev 10: the older component rules named the system font. On the live (original) look every control uses the site's own interface font, never system-ui.
test("live mode: filters, buttons and tags use the site's interface font, not the system font", async ({ page }) => {
  for (const path of ["/ciders", "/beers"]) {
    await page.goto(path);
    const fams = await page.evaluate(() => [...document.querySelectorAll(".pg-chip, .seg-btn, .pg-more, .pg-flav li, .range-close, .pg-btn")].map((e) => getComputedStyle(e).fontFamily.split(",")[0].replace(/["']/g, "")));
    expect(fams.length).toBeGreaterThan(0);
    for (const f of fams) expect(f).toBe("Source Sans 3");
  }
});
