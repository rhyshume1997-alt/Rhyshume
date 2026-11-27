import { test, expect } from "@playwright/test";

/**
 * The Christmas look, on the preview build (where ?xmas=on|off is allowed for testing before December).
 * The live build ignores that override: see season.spec.ts.
 */
const at = (iso: string) => new Date(iso);

test("on: hats on the logos, the headline, lights and garland show; nothing covers the header controls", async ({ page, isMobile }) => {
  await page.goto("/?xmas=on");
  await expect(page.locator("html")).toHaveAttribute("data-xmas", "on");
  await expect(page.locator(".brand .xhat")).toBeVisible();
  await expect(page.locator(isMobile ? ".bh-sign .xhat" : ".bh-lying .xhat")).toBeVisible();
  await expect(page.locator(".bh-copy .xkicker")).toHaveText("Christmas at Jack O’Beers");
  await expect(page.locator(".bh-hero .xlights")).toBeVisible();
  await expect(page.locator(".bh-hero .xgarland")).toBeVisible();
  // decoration never catches a click and is hidden from assistive technology
  expect(await page.locator(".bh-hero .xdecor").evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  await expect(page.locator(".xdecor").first()).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".brand .xhat")).toHaveAttribute("aria-hidden", "true");
  await page.locator(".cartbtn").click({ trial: true });
});

test("the logo files are untouched and the hat is a separate element", async ({ page }) => {
  await page.goto("/?xmas=on");
  const srcs = await page.locator(".brand img, .bh-lying img, .bh-sign img").evaluateAll((a) => a.map((i) => (i as HTMLImageElement).getAttribute("src")));
  expect(srcs).toEqual(["/media/jack-mascot.svg", "/media/jack-logo-lying.png", "/media/jack-logo.svg"]);
});

test("off: no hat, no decoration, no headline", async ({ page }) => {
  await page.goto("/?xmas=off");
  await expect(page.locator(".xhat:visible, .xdecor:visible, .xkicker:visible")).toHaveCount(0);
  await expect(page.locator("#this-week")).toBeVisible();
  await expect(page.locator("#events-home")).toBeVisible();
});

test("by date on the preview: 30 Nov off, 1 Dec on, 15 Dec on, 31 Dec on, 1 Jan off, 1 Dec 2027 off", async ({ page }) => {
  const want: [string, string][] = [["2026-11-30T12:00:00Z", "off"], ["2026-12-01T00:00:00Z", "on"], ["2026-12-15T12:00:00Z", "on"], ["2026-12-31T23:30:00Z", "on"], ["2027-01-01T00:00:00Z", "off"], ["2027-12-01T12:00:00Z", "off"]];
  for (const [iso, v] of want) {
    await page.clock.setFixedTime(at(iso));
    await page.goto("/");
    await expect(page.locator("html"), iso).toHaveAttribute("data-xmas", v);
  }
});

test("reduced motion: the lights and the snow stand still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?xmas=on");
  expect(await page.locator(".xlights li").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.locator(".xsnow").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});

test("with motion allowed the lights twinkle slowly (no fast flashing)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?xmas=on");
  const d = await page.locator(".xlights li").first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
  expect(d).toBeGreaterThanOrEqual(3);
});

test("narrow phones (320px): nothing overflows, hat and headline sit inside the screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/?xmas=on");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const hat = await page.locator(".brand .xhat").boundingBox();
  expect(hat!.x).toBeGreaterThanOrEqual(0);
  expect(hat!.y).toBeGreaterThanOrEqual(-4);
  const k = await page.locator(".bh-copy .xkicker").boundingBox();
  expect(k!.x + k!.width).toBeLessThanOrEqual(320);
});

test("festive details on other pages are small: hat in the header, nothing on product cards or the basket button", async ({ page }) => {
  await page.goto("/beers?xmas=on");
  await expect(page.locator(".brand .xhat")).toBeVisible();
  await expect(page.locator(".xdecor:visible")).toHaveCount(0);
  await expect(page.locator(".pcard .xhat, .cartbtn .xhat")).toHaveCount(0);
});
