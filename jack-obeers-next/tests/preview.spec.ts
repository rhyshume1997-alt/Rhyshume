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
