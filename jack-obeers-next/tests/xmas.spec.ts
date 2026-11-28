import { test, expect } from "@playwright/test";

/**
 * The Christmas look, on the preview build (where ?xmas=on|off is allowed for testing before December).
 * The live build ignores that override: see season.spec.ts.
 */
const at = (iso: string) => new Date(iso);

test("on: hats on the logos, the headline, lights and garland show; nothing covers the header controls", async ({ page, isMobile }) => {
  await page.goto("/?xmas=on");
  await expect(page.locator("html")).toHaveAttribute("data-xmas", "on");
  await expect(page.locator(".brand img.xlogo")).toBeVisible();
  await expect(page.locator(".brand img:not(.xlogo)")).toBeHidden();
  await expect(page.locator(isMobile ? ".bh-sign img.xlogo" : ".bh-lying img.xlogo")).toBeVisible();
  await expect(page.locator(isMobile ? ".bh-sign img:not(.xlogo)" : ".bh-lying img:not(.xlogo)")).toBeHidden();
  await page.locator(".about-logo.xlogo").scrollIntoViewIfNeeded();
  await expect(page.locator(".about-logo.xlogo")).toBeVisible();
  await expect(page.locator(".about-logo:not(.xlogo)")).toBeHidden();
  await expect(page.locator(".bh-copy .xkicker")).toHaveText("Christmas at Jack O’Beers");
  await expect(page.locator(".bh-hero .xsparkle")).toBeVisible();
  await expect(page.locator(".bh-hero .xcorner-hero")).toBeVisible();
  await expect(page.locator("#events-home .xcorner-sec")).toBeVisible();
  await expect(page.locator(".bh-hero .xgarland")).toBeVisible();
  // decoration never catches a click and is hidden from assistive technology
  expect(await page.locator(".bh-hero .xdecor").evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  await expect(page.locator(".xdecor").first()).toHaveAttribute("aria-hidden", "true");
  await page.locator(".cartbtn").click({ trial: true });
});

test("the original logo files are untouched and still the ones in the page; the Christmas logos are separate files", async ({ page }) => {
  await page.goto("/?xmas=off");
  const srcs = await page.locator(".brand img:not(.xlogo), .bh-lying img:not(.xlogo), .bh-sign img:not(.xlogo)").evaluateAll((a) => a.map((i) => (i as HTMLImageElement).getAttribute("src")));
  expect(srcs).toEqual(["/media/jack-mascot.svg", "/media/jack-logo-lying.png", "/media/jack-logo.svg"]);
  const xs = await page.locator("img.xlogo").evaluateAll((a) => a.map((i) => (i as HTMLImageElement).getAttribute("src")));
  expect(xs.sort()).toEqual(["/media/jack-christmas-lying.png", "/media/jack-christmas-mascot.png", "/media/jack-christmas-standing.png", "/media/jack-christmas-standing.png"]);
  // the decorations are not downloaded either
  expect(await page.locator(".xgarland, .xsparkle, .xcorner").evaluateAll((a) => a.every((i) => !(i as HTMLImageElement).currentSrc))).toBe(true);
  // off: the Christmas logos are not shown and not downloaded
  await expect(page.locator("img.xlogo:visible")).toHaveCount(0);
  expect(await page.locator("img.xlogo").evaluateAll((a) => a.every((i) => !(i as HTMLImageElement).currentSrc))).toBe(true);
});

test("off: no hat, no decoration, no headline", async ({ page }) => {
  await page.goto("/?xmas=off");
  await expect(page.locator(".xlogo:visible, .xdecor:visible, .xkicker:visible")).toHaveCount(0);
  await expect(page.locator(".xcorner:visible, .xgarland:visible, .xsparkle:visible")).toHaveCount(0);
  await expect(page.locator(".brand img:not(.xlogo)")).toBeVisible();
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

test("reduced motion: the sparkle layer stands still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?xmas=on");
  expect(await page.locator(".xsparkle").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});

test("with motion allowed the sparkle layer drifts slowly (no flashing)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?xmas=on");
  const d = await page.locator(".xsparkle").first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
  expect(d).toBeGreaterThanOrEqual(10);
});

test("narrow phones (320px): nothing overflows, logo and headline sit inside the screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/?xmas=on");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const hdr = await page.locator(".brand img.xlogo").boundingBox();
  expect(hdr!.x).toBeGreaterThanOrEqual(0);
  const cart = await page.locator(".cartbtn").boundingBox();
  expect(hdr!.x + hdr!.width).toBeLessThanOrEqual(cart!.x); // the logo never runs into the basket button
  const k = await page.locator(".bh-copy .xkicker").boundingBox();
  expect(k!.x + k!.width).toBeLessThanOrEqual(320);
});

test("the hero logo does not cover the headline or the buttons", async ({ page, isMobile }) => {
  await page.goto("/?xmas=on");
  const logo = await page.locator(isMobile ? ".bh-sign img.xlogo" : ".bh-lying img.xlogo").boundingBox();
  for (const sel of [".bh-h1", ".bh-cta"]) {
    const b = await page.locator(sel).boundingBox();
    const overlap = !(logo!.x + logo!.width <= b!.x || b!.x + b!.width <= logo!.x || logo!.y + logo!.height <= b!.y || b!.y + b!.height <= logo!.y);
    expect(overlap, sel).toBe(false);
  }
});

test("festive details on other pages are small: Christmas logo in the header, nothing on product cards or the basket button", async ({ page }) => {
  await page.goto("/beers?xmas=on");
  await expect(page.locator(".brand img.xlogo")).toBeVisible();
  await expect(page.locator(".xdecor:visible")).toHaveCount(0);
  await expect(page.locator(".pcard .xlogo, .cartbtn .xlogo")).toHaveCount(0);
});
