import { expect, test } from "@playwright/test";

/** The basket icon must open the basket drawer on every page, on desktop and on a phone. */
const PAGES = ["/", "/beers", "/ciders", "/wines", "/events", "/draught-club", "/about", "/faq", "/west-highland-way", "/product/p6", "/members", "/owners", "/drinks", "/product", "/no-such-page"];

for (const path of PAGES) {
  test(`basket icon opens the drawer on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => sessionStorage.setItem("jo_opened", "1"));
    await page.waitForTimeout(800);
    await page.locator(".cartbtn").first().click();
    await expect(page.locator("dialog#cart")).toHaveAttribute("open", "");
    await expect(page.locator("#cart-body")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog#cart")).not.toHaveAttribute("open", "");
  });
}
