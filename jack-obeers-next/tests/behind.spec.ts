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

test("the illustrated shelf is back: wooden shelf, bottles, glass, Jack, and the glass fills on hover", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "hover is a desktop pointer interaction; the tap test covers touch");
  await page.goto("/");
  await page.getByRole("link", { name: "Shop drinks" }).first().click();
  await page.waitForTimeout(1200);
  // five shelf items, the drawn art is shown (not hidden behind photographs), and there is no photo or video in the tiles
  await expect(page.locator(".shelf-row .sh-item")).toHaveCount(5);
  expect(await page.locator(".sh-item[data-kind=beer] .art").evaluate((e) => getComputedStyle(e).display)).not.toBe("none");
  await expect(page.locator(".sh-item[data-kind=beer] .sh-bottle")).toHaveCount(1);
  await expect(page.locator(".sh-item[data-kind=beer] .sh-glass")).toHaveCount(1);
  await expect(page.locator(".sh-item video")).toHaveCount(0);
  // wait out the entrance gesture so we are testing hover, not that
  await page.waitForTimeout(1500);
  await expect(page.locator(".sh-item.is-demo")).toHaveCount(0, { timeout: 8000 });
  await page.mouse.move(4, 4); // the pointer may be resting over the tile after the scroll; start from a clear spot
  await page.waitForTimeout(900);
  const liq = page.locator(".sh-item[data-kind=beer] .sh-glass .liq");
  const t0 = await liq.evaluate((e) => getComputedStyle(e).transform);
  await page.locator(".sh-item[data-kind=beer]").hover();
  await expect.poll(async () => liq.evaluate((e) => getComputedStyle(e).transform), { timeout: 3000 }).not.toBe(t0);
});

test("the shelf does one short gesture when it comes into view and never blocks a click", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector("#shelf")!.scrollIntoView());
  await expect(page.locator(".sh-item.is-demo")).toHaveCount(1, { timeout: 2000 });
  // clicking during the gesture works at once
  await page.locator(".sh-item[data-kind=wine]").click();
  await expect(page.locator("#range-panel")).toBeVisible({ timeout: 1000 });
  // and it settles back on its own
  await expect(page.locator(".sh-item.is-demo")).toHaveCount(0, { timeout: 5000 });
});

test("the beer bottle cursor shows only over the drawn shelf items, never over text or controls elsewhere", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "mouse only");
  await page.goto("/");
  await page.getByRole("link", { name: "Shop drinks" }).first().click();
  await page.waitForTimeout(1300);
  const beer = page.locator(".sh-item[data-kind=beer]");
  await beer.hover();
  expect(await beer.evaluate((e) => getComputedStyle(e).cursor)).toContain("cursor-beer.png");
  // the heading, the basket and the body use the normal cursor
  expect(await page.locator("#tl-h").evaluate((e) => getComputedStyle(e).cursor)).not.toContain("cursor-beer");
  expect(await page.locator(".cartbtn").first().evaluate((e) => getComputedStyle(e).cursor)).not.toContain("cursor-beer");
  expect(await page.locator("body").evaluate((e) => getComputedStyle(e).cursor)).not.toContain("cursor-beer");
});

test("tapping Beer opens the range at once (touch)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch only");
  await page.goto("/");
  await page.getByRole("link", { name: "Shop drinks" }).first().click();
  await page.waitForTimeout(1200);
  await page.locator(".sh-item[data-kind=beer]").tap();
  await expect(page.locator("#range-panel")).toBeVisible({ timeout: 1000 });
  await expect(page.locator(".sh-item[data-kind=beer]")).toHaveAttribute("aria-expanded", "true");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("static opening, no entrance gesture, filled glass, range still opens at once", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".bh-h1")).toBeVisible();
    expect(await page.locator(".bh-photo img").evaluate((e) => getComputedStyle(e).animationName)).toBe("none");
    await page.getByRole("link", { name: "Shop drinks" }).first().click();
    await page.waitForTimeout(1500);
    await expect(page.locator(".sh-item.is-demo")).toHaveCount(0);
    expect(await page.locator(".sh-item[data-kind=beer] .sh-glass .liq").evaluate((e) => getComputedStyle(e).transform)).not.toBe("matrix(1, 0, 0, 0, 0, 0)");
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

test("typography: Gloock headlines, Source Serif 4 text, no italic headlines, no stack of labels", async ({ page }) => {
  await page.goto("/");
  const fam = async (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).fontFamily);
  expect(await fam(".bh-h1")).toContain("Gloock");
  expect(await fam("body")).toContain("Source Serif 4");
  expect(await fam(".bh-cta .btn")).toContain("Source Serif 4");
  // no italic in any heading, and no heading carries a coloured emphasis word
  const italics = await page.locator("h1, h2, h3").evaluateAll((els) => els.filter((e) => getComputedStyle(e).fontStyle === "italic" || e.querySelector("em") && getComputedStyle(e.querySelector("em")!).fontStyle === "italic").length);
  expect(italics).toBe(0);
  // the small labels above headings are gone from the page
  const labels = await page.locator("#main .mono").evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length);
  expect(labels).toBe(0);
  // entrances are off: nothing waits for a reveal
  const hidden = await page.locator(".rv").evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity !== "1").length);
  expect(hidden).toBe(0);
});

test("the three typography candidates can be compared with ?type=", async ({ page }) => {
  for (const [t, fam] of [["a", "Gloock"], ["b", "Bodoni Moda"], ["c", "Newsreader"]] as const) {
    await page.goto(`/?type=${t}`);
    expect(await page.locator(".bh-h1").evaluate((e) => getComputedStyle(e.querySelector(".bh-l2")!).fontFamily)).toContain(fam);
  }
  await page.goto("/?type=a");
});

test("Rev 7 photo system: polaroid only for Michael and Tanya, mounts elsewhere, no black awning frame, two beer mats", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1200);
  // exactly one polaroid, and it is Michael and Tanya
  await expect(page.locator(".polaroid")).toHaveCount(1);
  await expect(page.locator(".polaroid .pol-pic img")).toHaveAttribute("alt", /Michael and Tanya/);
  // mounts are used for the deli and the shop photos; none of them is a polaroid
  expect(await page.locator(".mount").count()).toBeGreaterThanOrEqual(4);
  expect(await page.locator(".polaroid .mount, .mount .polaroid").count()).toBe(0);
  // the old black frame is not around any of these pictures
  const framed = await page.locator(".mount-pic .frame, .pol-pic .frame").evaluateAll((els) => els.filter((e) => getComputedStyle(e).backgroundImage !== "none" || getComputedStyle(e).paddingLeft !== "0px").length);
  expect(framed).toBe(0);
  // the beer mat is a small, selective detail: exactly two, both decorative and hidden from assistive technology
  await expect(page.locator(".beermat")).toHaveCount(2);
  expect(await page.locator(".beermat").evaluateAll((els) => els.every((e) => e.getAttribute("aria-hidden") === "true" && getComputedStyle(e).pointerEvents === "none"))).toBe(true);
  // no horizontal scroll
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("Rev 7: a beer mat never sits over text or a control", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1000);
  for (const sel of [".polaroid .beermat", ".deli-lead .beermat"]) {
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1300);
    const hit = await page.evaluate((s) => {
      const m = document.querySelector(s)!.getBoundingClientRect();
      const els = [...document.querySelectorAll("#main :is(p, h1, h2, h3, a, button, li, summary, input)")].filter((e) => !e.closest(".beermat, .mount-pic, .pol-pic, figcaption"));
      return els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.left < m.right && r.right > m.left && r.top < m.bottom && r.bottom > m.top && (e.textContent || "").trim().length > 0; }).map((e) => e.tagName + ":" + (e.textContent || "").trim().slice(0, 24));
    }, sel);
    expect(hit, `${sel} overlaps ${hit.join(", ")}`).toEqual([]);
  }
});

test.describe("Rev 7 reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("polaroid and beer mats are static and already in place", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(800);
    const t = await page.locator(".polaroid").evaluate((e) => ({ tr: getComputedStyle(e).transitionDuration, rot: getComputedStyle(e).transform }));
    expect(parseFloat(t.tr)).toBeLessThan(0.001); // a global reduced-motion rule makes durations effectively zero
    expect(t.rot).not.toBe("none");
    expect(parseFloat(await page.locator(".polaroid .beermat").evaluate((e) => getComputedStyle(e).transitionDuration))).toBeLessThan(0.001);
  });
});
