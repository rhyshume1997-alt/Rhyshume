import { test, expect } from "@playwright/test";
import { statSync, readdirSync } from "fs";

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
  await expect(page.locator("#this-week .xsec-corner")).toBeAttached();
  await expect(page.locator("#events-home .xsec-sprig")).toBeAttached();
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
  expect(await page.locator(".xsparkle, .xcorner").evaluateAll((a) => a.every((i) => !(i as HTMLImageElement).currentSrc))).toBe(true);
  // off: the Christmas logos are not shown and not downloaded
  await expect(page.locator("img.xlogo:visible")).toHaveCount(0);
  expect(await page.locator("img.xlogo").evaluateAll((a) => a.every((i) => !(i as HTMLImageElement).currentSrc))).toBe(true);
});

test("off: no hat, no decoration, no headline", async ({ page }) => {
  await page.goto("/?xmas=off");
  await expect(page.locator(".xlogo:visible, .xdecor:visible, .xkicker:visible")).toHaveCount(0);
  await expect(page.locator(".xcorner:visible, .xsparkle:visible")).toHaveCount(0);
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

test("decorations never cover text, buttons or the navigation", async ({ page, isMobile }) => {
  await page.goto("/?xmas=on");
  await page.locator("#this-week").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  const hdr = await page.locator(".hdr").boundingBox();
  const hit = async (sel: string) => (await page.locator(sel).first().boundingBox())!;
  const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
  const corner = await hit(".bh-hero .xcorner-hero");
  expect(corner.y).toBeGreaterThanOrEqual(hdr!.y + hdr!.height - 1); // starts below the header
  for (const sel of [".bh-h1", ".bh-cta", ".bh-copy .xkicker"]) expect(overlaps(corner, await hit(sel)), `corner vs ${sel}`).toBe(false);
  // the section decorations stay clear of the headings and buttons
  for (const [sec, deco, avoid] of [["#this-week", ".xsec-corner", "h2"], ["#events-home", ".xsec-sprig", ".btn"]] as const) {
    await page.locator(sec).scrollIntoViewIfNeeded();
    const d = await hit(`${sec} ${deco}`);
    for (const el of await page.locator(`${sec} ${avoid}`).all()) {
      // measure the words, not the full-width box around them
      const box = await el.evaluate((n) => { const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
      expect(overlaps(d, box), `${sec} ${deco} vs ${avoid}`).toBe(false);
    }
  }
});

test("the Christmas pictures are genuinely transparent and light", async ({ page }) => {
  await page.goto("/?xmas=on");
  const files = ["christmas-sparkles", "christmas-sprig", "christmas-corner"];
  for (const f of files) {
    const r = await page.evaluate(async (u) => {
      const img = new Image(); img.src = u; await img.decode();
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data; let clear = 0; for (let i = 3; i < d.length; i += 4) if (d[i] === 0) clear++;
      return { corners: [d[3], d[(c.width - 1) * 4 + 3], d[(c.height - 1) * c.width * 4 + 3], d[d.length - 1]], clear: clear / (d.length / 4) };
    }, `/media/${f}.webp`);
    expect(r.corners, f).toEqual([0, 0, 0, 0]);
    expect(r.clear, f).toBeGreaterThan(0.4);
  }
  const bytes = readdirSync("public/media").filter((n) => /^(christmas-|jack-christmas-)/.test(n)).reduce((t, n) => t + statSync(`public/media/${n}`).size, 0);
  expect(bytes).toBeLessThan(1_800_000); // all the Christmas pictures together; none is downloaded outside December
});

test("falling snow: slow, three layers, on only in the season, off for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?xmas=on");
  const layers = page.locator(".bh-hero .xsnow i");
  expect(await layers.count()).toBe(3);
  expect(await layers.first().evaluate((el) => getComputedStyle(el).animationName)).toBe("xfall");
  for (const i of [0, 1, 2]) expect(await layers.nth(i).evaluate((el) => parseFloat(getComputedStyle(el).animationDuration))).toBeGreaterThanOrEqual(20); // slow
  expect(await page.locator(".bh-hero .xsnow").evaluate((el) => getComputedStyle(el.parentElement!).pointerEvents)).toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".bh-hero .xsnow")).toBeHidden();
  await page.goto("/?xmas=off");
  await expect(page.locator(".xsnow:visible")).toHaveCount(0);
});
