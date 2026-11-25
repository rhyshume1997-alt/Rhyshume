import { expect, test } from "@playwright/test";

/**
 * Behind the Counter (Rev 5 selected direction). These run against the preview-mode build on port 3202, where
 * Behind the Counter is the default look and the older looks are behind ?look=. Checkout is OFF (CHECKOUT_ENABLED unset).
 */
const DRINKS = ["beer", "cider", "wine"] as const;

test("opens on the Behind the Counter look with one headline and Shop drinks in the first screen", async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.dataset.look)).toBe("behind");
  const visible = await page.locator("h1").evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => (e.textContent || "").trim()));
  expect(visible).toEqual(["Welcome, come on in."]);
  const btn = page.getByRole("link", { name: "Shop drinks" }).first();
  await expect(btn).toBeVisible();
  const box = await btn.boundingBox();
  const vh = page.viewportSize()!.height;
  expect(box!.y + box!.height).toBeLessThan(vh);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  // the original client logo is on the page
  // the supplied logo files: transparent lying PNG on desktop, vector SVG on a phone
  const logo = page.locator(".bh-lying img[src=\"/media/jack-logo-lying.png\"], .bh-sign img[src=\"/media/jack-logo.svg\"]");
  expect(await logo.evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length)).toBe(1);
});

test("the opening does not run the old scroll-jacking opening or lock scrolling", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => document.documentElement.classList.contains("opening"))).toBe(false);
  expect(await page.evaluate(() => scrollY)).toBeLessThan(5);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(200);
});

for (const kind of DRINKS) {
  test(`${kind}: the range appears at once and a product reaches the basket in two clicks`, async ({ page }, info) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Shop drinks" }).first().click();
    await page.waitForTimeout(1300); // let the scroll to the shelf settle so the click itself is not what is being timed
    const tile = page.locator(`.sh-item[data-kind=${kind}]`);
    await expect(tile).toBeVisible();
    // time it inside the page: from the click event to the panel being shown
    await page.evaluate(() => {
      const w = window as unknown as { __t: { click?: number; shown?: number } };
      w.__t = {};
      document.addEventListener("click", (e) => { if ((e.target as Element).closest(".sh-item")) w.__t.click = performance.now(); }, true);
      const panel = document.querySelector("#range-panel") as HTMLElement;
      new MutationObserver(() => { if (!panel.hidden && w.__t.click && !w.__t.shown) w.__t.shown = performance.now(); }).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
    });
    await tile.click(); // click 1: choose the category
    await expect(page.locator("#range-panel")).toBeVisible({ timeout: 1000 });
    const took = Math.round(await page.evaluate(() => { const t = (window as unknown as { __t: { click: number; shown: number } }).__t; return t.shown - t.click; }));
    expect(took).toBeLessThan(300); // was a deliberate 1.5 s wait before
    const add = page.locator("#range-panel .pg-btn[data-add]").first();
    await expect(add).toBeVisible();
    const before = Number((await page.locator(".cartbtn .n").first().textContent()) || "0");
    await add.click(); // click 2: add to basket
    await expect(page.locator(".cartbtn .n").first()).toHaveText(String(before + 1));
    // checkout is off, so nothing offers to buy now
    await expect(page.locator("#range-panel a.pg-btn.solid")).toHaveCount(0);
    info.annotations.push({ type: "click path", description: `${kind}: choose ${kind} (1), Add to basket (2); panel visible after ${took} ms` });
    console.log(`PATH ${kind}: choose (1), Add to basket (2); panel visible after ${took} ms`);
  });
}

test("panel scrolling starts straight away (no 1.5 s wait)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Shop drinks" }).first().click();
  await page.waitForTimeout(1200);
  const y0 = await page.evaluate(() => scrollY);
  await page.locator(".sh-item[data-kind=wine]").click();
  await page.waitForFunction((y) => Math.abs(scrollY - y) > 8, y0, { timeout: 700 });
});

test("the real pour plays on hover and focus, and nothing floats", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "hover is a desktop pointer interaction; touch is covered by the tap test");
  await page.goto("/");
  await page.getByRole("link", { name: "Shop drinks" }).first().click();
  const beer = page.locator(".sh-item[data-kind=beer]");
  await beer.hover();
  const video = page.locator(".sh-item[data-kind=beer] video");
  await expect.poll(async () => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0), { timeout: 4000 }).toBe(true);
  expect(await video.evaluate((v: HTMLVideoElement) => v.src)).toContain("/media/videos/pour-wide.mp4");
  // the old floating bottle cursor and cartoon glass are not used in this look
  await expect(page.locator(".cur")).toHaveCount(0);
  expect(await page.locator(".sh-item[data-kind=beer] .art").evaluate((e) => getComputedStyle(e).display)).toBe("none");
});

test("tapping Beer starts the pour and opens the range together (touch)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch only");
  await page.goto("/");
  await page.getByRole("link", { name: "Shop drinks" }).first().click();
  await page.locator(".sh-item[data-kind=beer]").tap();
  await expect(page.locator("#range-panel")).toBeVisible({ timeout: 1000 });
  const video = page.locator(".sh-item[data-kind=beer] video");
  await expect.poll(async () => video.evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 4000 }).toBe(true);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("static opening, drawn amber line, still pour frame, range still opens at once", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".bh-h1")).toBeVisible();
    await page.getByRole("link", { name: "Shop drinks" }).first().click();
    expect(await page.locator(".bh-line").evaluate((e) => getComputedStyle(e).transform)).toBe("none");
    expect(await page.locator(".bh-photo img").evaluate((e) => getComputedStyle(e).animationName)).toBe("none");
    const video = page.locator(".sh-item[data-kind=beer] video");
    if (await page.evaluate(() => matchMedia("(hover: hover)").matches)) await page.locator(".sh-item[data-kind=beer]").hover();
    await page.waitForTimeout(1200);
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.locator(".sh-item[data-kind=cider]").click();
    await expect(page.locator("#range-panel")).toBeVisible({ timeout: 1000 });
  });
});

test("the earlier looks are still there behind ?look=", async ({ page }) => {
  await page.goto("/?look=original");
  await expect(page.locator(".stage")).toBeVisible();
  await expect(page.locator(".bh-hero")).toBeHidden();
  for (const look of ["classic", "backbar", "cinematic"]) {
    await page.goto(`/?look=${look}`);
    expect(await page.evaluate(() => document.documentElement.dataset.look)).toBe(look);
    await expect(page.locator(".bh-hero")).toBeHidden();
  }
  // the original keeps its own order: About before the shelf
  await page.goto("/?look=original");
  const order = await page.evaluate(() => {
    const a = document.querySelector("#about")!.getBoundingClientRect().top + scrollY;
    const s = document.querySelector("#shelf")!.getBoundingClientRect().top + scrollY;
    return a < s;
  });
  expect(order).toBe(true);
});

test("the preview drawer offers all five looks and Behind the Counter is selected", async ({ page }) => {
  await page.goto("/");
  await page.locator(".cm-tab").click();
  const looks = page.locator(".cm-looks button");
  await expect(looks).toHaveCount(5);
  await expect(page.locator('.cm-looks button[aria-pressed="true"]')).toHaveText("Behind the Counter");
});
