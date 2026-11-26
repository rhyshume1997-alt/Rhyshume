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

// Rev 8: the Polaroid had collapsed to the width of its caption on every screen size. Never again.
for (const [w, h] of [[360, 780], [390, 844], [430, 932], [768, 1024], [1440, 900]] as const) {
  test(`About at ${w}px: the Polaroid is whole, its caption is inside it, nothing overlaps it, and the mat stays behind`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    await page.waitForTimeout(1000);
    await page.locator(".polaroid").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1400);
    const r = await page.evaluate(() => {
      const rect = (e: Element) => { const q = e.getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top, b: q.bottom }; };
      const pic = document.querySelector(".polaroid .pol-pic")!;
      const pol = rect(pic), mat = rect(document.querySelector(".polaroid .beermat")!), cap = rect(document.querySelector(".polaroid figcaption")!);
      const img = document.querySelector(".polaroid .pol-pic img") as HTMLImageElement;
      const vid = rect(document.querySelector(".about-vid .frame")!);
      const texts = [...document.querySelectorAll("#about :is(p, h2, h3, li, a, button, small, figcaption)")].filter((e) => !e.closest(".polaroid") && !e.closest(".beermat") && (e.textContent || "").trim() && e.getBoundingClientRect().width > 0);
      const over = (a: { l: number; r: number; t: number; b: number }) => texts.filter((e) => { const q = e.getBoundingClientRect(); return q.left < a.r && q.right > a.l && q.top < a.b && q.bottom > a.t; }).map((e) => (e.textContent || "").trim().slice(0, 24));
      const W = document.documentElement.clientWidth;
      return {
        polWidth: pol.r - pol.l, imgW: img.getBoundingClientRect().width, imgH: img.getBoundingClientRect().height,
        capInside: cap.t >= pol.t && cap.b <= pol.b + 1 && cap.l >= pol.l - 1 && cap.r <= pol.r + 1,
        matOverText: over(mat), polOverText: over(pol),
        matOverVideo: mat.t < vid.b && mat.b > vid.t && mat.l < vid.r && mat.r > vid.l,
        matInside: mat.l >= -1 && mat.r <= W + 1, polInside: pol.l >= 0 && pol.r <= W, sideways: document.documentElement.scrollWidth > W + 1,
      };
    });
    expect(r.polWidth, "the polaroid must not collapse").toBeGreaterThan(Math.min(w - 60, 280));
    expect(r.imgW).toBeGreaterThan(200);
    expect(Math.abs(r.imgW - r.imgH)).toBeLessThan(3); // a square print
    expect(r.capInside).toBe(true);
    expect(r.matOverText).toEqual([]);
    expect(r.polOverText).toEqual([]);
    expect(r.matOverVideo).toBe(false);
    expect(r.matInside).toBe(true);
    expect(r.polInside).toBe(true);
    expect(r.sideways).toBe(false);
  });
}

test("the written introduction starts below the finished photographic block", async ({ page }) => {
  for (const w of [390, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(800);
    const ok = await page.evaluate(() => {
      const pol = document.querySelector(".polaroid .pol-pic")!.getBoundingClientRect();
      const vid = document.querySelector(".about-vid")!.getBoundingClientRect();
      const mat = document.querySelector(".polaroid .beermat")!.getBoundingClientRect();
      const copy = document.querySelector(".about-home-grid")!.getBoundingClientRect();
      return copy.top >= Math.max(pol.bottom, vid.bottom, mat.bottom) - 1;
    });
    expect(ok, `at ${w}px`).toBe(true);
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// Rev 9: "From keg to bottle" (the tap wall section only)
// ---------------------------------------------------------------------------------------------------------------------
const KB = {
  heading: "From keg to bottle.",
  intro: "Good beer starts at the tap. Explore our 23 taps and we’ll fill your bottle fresh at the counter, ready to take home.",
  cap1: "Freshly filled, straight from the tap.",
  cap2: "A good beer deserves a good pour.",
  quote: "Find something you fancy on the tap wall. We’ll take care of the bottle, so you can enjoy a fresh pour at home.",
};

test("From keg to bottle: the exact wording, the two numbered details and nothing from the old block", async ({ page }) => {
  await page.goto("/");
  const sec = page.locator("#taps .taps-new");
  await expect(sec.locator(".kb-h")).toHaveText(KB.heading);
  await expect(sec.locator(".kb-intro")).toHaveText(KB.intro);
  await expect(sec.locator(".kb-a figcaption")).toHaveText(KB.cap1);
  await expect(sec.locator(".kb-b figcaption")).toHaveText(KB.cap2);
  await expect(sec.locator(".kb-quote")).toHaveText(KB.quote);
  await expect(sec.locator(".kb-a .kb-no")).toHaveText("01 Fresh from the tap");
  await expect(sec.locator(".kb-b .kb-no")).toHaveText("02 The perfect pour");
  // no freshness times, storage claims or awards were added
  expect((await sec.innerText()).toLowerCase()).not.toMatch(/week|days|award|best|guarantee|lasts|keeps for/);
  // the old block is not shown in this look
  await expect(page.locator("#taps .taps-old")).toBeHidden();
  // both existing videos are used, and keep their 16 by 9 shape
  await expect(sec.locator("video.kb-video")).toHaveCount(2);
});

test("KegBlurb is unchanged where it is reused: the beer range panel and the beers page", async ({ page }) => {
  const OLD = "Pick from the taps and we bottle it fresh for you";
  await page.goto("/");
  await page.getByRole("link", { name: "Shop drinks" }).first().click();
  await page.waitForTimeout(1200);
  await page.locator(".sh-item[data-kind=beer]").click();
  await expect(page.locator("#range-panel .keg")).toContainText(OLD);
  await page.goto("/beers");
  await expect(page.locator(".keg")).toContainText(OLD);
  // and the new closing statement is not on either of them
  expect(await page.locator("body").innerText()).not.toContain("Find something you fancy on the tap wall");
});

for (const [w, h] of [[360, 780], [390, 844], [768, 1024], [1440, 1160]] as const) {
  test(`From keg to bottle at ${w}px: nothing collides, nothing covers the footage, the shape is kept`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelector(".kb-feature")!.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(2600);
    const r = await page.evaluate(() => {
      const rect = (e: Element) => { const q = e.getBoundingClientRect(); return { l: q.left, r: q.right, t: q.top, b: q.bottom, w: q.width, h: q.height }; };
      const inter = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>, tol = 1.5) => a.l < b.r - tol && a.r > b.l + tol && a.t < b.b - tol && a.b > b.t + tol;
      const vids = [...document.querySelectorAll(".kb-video")].map(rect);
      const frames = [...document.querySelectorAll(".kb-frame")].map(rect);
      const texts = [...document.querySelectorAll(".taps-new :is(.kb-h, .kb-intro, .kb-no, figcaption, .kb-quote)")].map((e) => ({ n: (e.textContent || "").slice(0, 22), r: rect(e) }));
      // the line is drawn by two borders (top and right) of an otherwise empty box, so measure those two strips, not the whole box
      const rail: ReturnType<typeof rect>[] = [];
      for (const e of document.querySelectorAll(".kb-rail i")) {
        if (getComputedStyle(e).display === "none" || e.getBoundingClientRect().width === 0) continue;
        const q = rect(e);
        if (e.classList.contains("kb-run")) { rail.push({ ...q, b: q.t + 2, h: 2 }); rail.push({ ...q, l: q.r - 2, w: 2 }); } else rail.push(q);
      }
      const textHits: string[] = [];
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) if (inter(texts[i].r, texts[j].r, 2)) textHits.push(texts[i].n + " x " + texts[j].n);
      const textOverFrame = texts.filter((t) => frames.some((f) => inter(t.r, f))).map((t) => t.n);
      const railOverVideo = rail.some((x) => vids.some((v) => inter(x, v)));
      const railOverText = rail.some((x) => texts.some((t) => inter(x, t.r)));
      const bar = document.querySelector(".sticky-bar") as HTMLElement | null;
      const barTop = bar && getComputedStyle(bar).display !== "none" ? bar.getBoundingClientRect().top : Infinity;
      const q = rect(document.querySelector(".kb-quote")!);
      const W = document.documentElement.clientWidth;
      return {
        ratios: vids.map((v) => v.w / v.h), textHits, textOverFrame, railOverVideo, railOverText,
        framesInside: frames.every((f) => f.l >= 0 && f.r <= W + 0.5),
        sideways: document.documentElement.scrollWidth > W + 1,
        quoteClearOfBar: q.b <= barTop + 0.5 || barTop === Infinity,
        railPieces: rail.length,
        mobileRail: [".kb-a::before", ".kb-a::after", ".kb-b::before", ".kb-b::after"].map((c) => { const [sel, pseudo] = c.split("::"); return getComputedStyle(document.querySelector(sel)!, "::" + pseudo).content; }),
      };
    });
    for (const x of r.ratios) expect(Math.abs(x - 16 / 9)).toBeLessThan(0.03);
    expect(r.textHits).toEqual([]);
    expect(r.textOverFrame).toEqual([]);
    expect(r.railOverVideo).toBe(false);
    expect(r.railOverText).toBe(false);
    expect(r.framesInside).toBe(true);
    expect(r.sideways).toBe(false);
    if (w >= 864) expect(r.railPieces).toBe(5); // collar, the line (two measured edges), ferrule, drop
    else expect(r.mobileRail.every((c) => c !== "none" && c !== "normal")).toBe(true); // the same rail, drawn down the left
  });
}

test("the fixed phone action bar does not hide the closing statement", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForTimeout(800);
  // scroll the statement as far up as it sits by default when navigated to, then check it clears the bar
  await page.evaluate(() => document.querySelector(".kb-quote")!.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(600);
  const g = await page.evaluate(() => {
    const q = document.querySelector(".kb-quote")!.getBoundingClientRect();
    const bar = document.querySelector(".sticky-bar")!.getBoundingClientRect();
    return { qBottom: q.bottom, barTop: bar.top, barVisible: getComputedStyle(document.querySelector(".sticky-bar")!).display !== "none" };
  });
  expect(g.barVisible).toBe(true);
  expect(g.qBottom).toBeLessThan(g.barTop - 8);
  // and an anchor jump to the end of the statement leaves room above the bar (scroll-margin-bottom)
  const margin = await page.locator(".kb-quote").evaluate((e) => parseFloat(getComputedStyle(e).scrollMarginBottom));
  expect(margin).toBeGreaterThanOrEqual(100);
});

test("From keg to bottle: the line draws once; with reduced motion it is already drawn", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1160 });
  await page.goto("/");
  await page.waitForTimeout(800);
  // before it comes into view the line is held back
  const before = await page.locator(".kb-run").evaluate((e) => getComputedStyle(e).clipPath);
  expect(before).not.toBe("none");
  await page.evaluate(() => document.querySelector(".kb-feature")!.scrollIntoView({ block: "center" }));
  await expect(page.locator(".kb-feature.in")).toHaveCount(1, { timeout: 3000 });
  await page.waitForTimeout(2200);
  const after = await page.evaluate(() => ({ run: getComputedStyle(document.querySelector(".kb-run")!).clipPath, drop: getComputedStyle(document.querySelector(".kb-drop")!).opacity }));
  expect(after.drop).toBe("1");
  expect(after.run === "none" || /inset\(0(px)?( 0(px)?){0,3}( 0%)?\)/.test(after.run)).toBe(true);
});

test.describe("From keg to bottle, reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("static: the whole rail is drawn, nothing animates", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1160 });
    await page.goto("/");
    await page.waitForTimeout(600);
    const s = await page.evaluate(() => {
      const g = (c: string) => getComputedStyle(document.querySelector(c)!);
      return { clip: g(".kb-run").clipPath, anim: [".kb-run", ".kb-drop", ".kb-ferrule", ".kb-collar"].map((c) => g(c).animationName), opacity: [".kb-drop", ".kb-ferrule", ".kb-collar"].map((c) => g(c).opacity) };
    });
    expect(s.clip).toBe("none");
    expect(s.anim.every((a) => a === "none")).toBe(true);
    expect(s.opacity.every((o) => o === "1")).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Rev 10: typography consistency. Gloock for display, Source Serif 4 for everything else, checked on the rendered pages.
// ---------------------------------------------------------------------------------------------------------------------
const TYPE_PAGES = ["/", "/beers", "/ciders", "/wines", "/product/p6", "/about", "/events", "/draught-club", "/members", "/faq", "/west-highland-way"];
const SELECTED = ["Gloock", "Source Serif 4"];
const firstFamily = (f: string) => f.split(",")[0].replace(/["']/g, "").trim();

async function openEverything(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => sessionStorage.setItem("jo_opened", "1"));
  await page.waitForTimeout(500);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 600) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(30); }
  if (path === "/") {
    // the product panels (the cider one has the style filter), Find me a beer, and the basket
    await page.locator(".sh-item[data-kind=wine]").click().catch(() => {});
    await page.locator(".sh-item[data-kind=cider]").click().catch(() => {});
    await page.waitForTimeout(400);
    await page.locator("[data-add]").first().click().catch(() => {});
    await page.locator(".cartbtn").first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
}

for (const path of TYPE_PAGES) {
  test(`typography ${path}: every visible text element and control is Gloock or Source Serif 4`, async ({ page }) => {
    await openEverything(page, path);
    const offenders = await page.evaluate((selected) => {
      const first = (f: string) => f.split(",")[0].replace(/["']/g, "").trim();
      const bad: string[] = [];
      const check = (e: Element, what: string) => {
        if (e.closest("script, style, svg, .vh, [hidden], .cm-panel, .cm-tab, .look-picker")) return;
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden") return;
        const q = e.getBoundingClientRect();
        if (!q.width || !q.height) return;
        const fam = first(cs.fontFamily);
        if (!selected.includes(fam)) bad.push(`${what} ${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0]} = ${fam}`);
        if (e.matches("input, textarea")) { const ph = first(getComputedStyle(e, "::placeholder").fontFamily); if (!selected.includes(ph)) bad.push(`placeholder of ${e.tagName.toLowerCase()} = ${ph}`); }
      };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set<Element>();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) { const e = n.parentElement; if (e && !seen.has(e) && (n.nodeValue || "").trim()) { seen.add(e); check(e, "text"); } }
      document.querySelectorAll("input, textarea, select, button, summary").forEach((e) => check(e, "control"));
      return [...new Set(bad)].slice(0, 12);
    }, SELECTED);
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
}

test("Cider filter, Beer filter and the homepage panel use the same typography and the same underlined-tab style", async ({ page }) => {
  const read = async (sel: string) => page.locator(sel).first().evaluate((e) => { const cs = getComputedStyle(e); return { fam: cs.fontFamily.split(",")[0].replace(/["']/g, ""), size: cs.fontSize, weight: cs.fontWeight, radius: cs.borderTopLeftRadius, bg: cs.backgroundColor, bt: cs.borderBottomWidth }; });
  await page.goto("/beers");
  const beer = await read(".seg-btn");
  await page.goto("/ciders");
  await expect(page.locator(".pg-chip").first()).toBeVisible();
  const cider = await read(".pg-chip");
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("jo_opened", "1"));
  await page.locator("#shelf").scrollIntoViewIfNeeded();
  await page.locator(".sh-item[data-kind=cider]").click();
  await expect(page.locator("#range-panel .pg-chip").first()).toBeVisible();
  const panel = await read("#range-panel .pg-chip");
  for (const c of [cider, panel]) {
    expect(c.fam).toBe("Source Serif 4");
    expect(c.fam).toBe(beer.fam);
    expect(c.size).toBe(beer.size);
    expect(c.weight).toBe(beer.weight);
    expect(c.radius).toBe(beer.radius); // no pill
    expect(c.bg).toBe(beer.bg); // no fill
  }
  // the selected tab is marked the same way as Beer's (an amber underline)
  await page.locator("#range-panel .pg-chip").nth(1).click();
  const sel = await page.locator("#range-panel .pg-chip[aria-pressed='true']").evaluate((e) => ({ c: getComputedStyle(e).borderBottomColor, w: getComputedStyle(e).borderBottomWidth }));
  expect(sel.w).toBe("3px");
  expect(sel.c).not.toBe("rgba(0, 0, 0, 0)");
});

test("the same kind of content has the same typeface on Beer, Cider and Wine, on their pages and in the homepage panel", async ({ page }) => {
  const sample = async () => page.evaluate(() => {
    const f = (s: string) => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); return `${cs.fontFamily.split(",")[0].replace(/["']/g, "")}/${cs.fontWeight}/${cs.fontSize}`; };
    return { h1: f("h1"), name: f(".pg-name"), price: f(".pg-price"), brew: f(".pg-brew"), meta: f(".pg-meta"), add: f(".pg-btn[data-add]"), count: f(".pg-count") };
  });
  const pages: Record<string, Awaited<ReturnType<typeof sample>>> = {};
  for (const k of ["beers", "ciders", "wines"]) { await page.goto("/" + k); await page.waitForTimeout(400); pages[k] = await sample(); }
  expect(pages.ciders).toEqual(pages.beers);
  expect(pages.wines).toEqual(pages.beers);
  const panel: Record<string, Omit<Awaited<ReturnType<typeof sample>>, "h1">> = {};
  for (const k of ["beer", "cider", "wine"]) {
    await page.goto("/"); await page.evaluate(() => sessionStorage.setItem("jo_opened", "1"));
    await page.locator("#shelf").scrollIntoViewIfNeeded();
    await page.locator(`.sh-item[data-kind=${k}]`).click();
    await page.waitForTimeout(500);
    panel[k] = await page.evaluate(() => { const f = (s: string) => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); return `${cs.fontFamily.split(",")[0].replace(/["']/g, "")}/${cs.fontWeight}/${cs.fontSize}`; }; return { name: f("#range-panel .pg-name"), price: f("#range-panel .pg-price"), brew: f("#range-panel .pg-brew"), meta: f("#range-panel .pg-meta"), add: f("#range-panel .pg-btn[data-add]"), count: f("#range-panel .pg-count") }; });
  }
  expect(panel.cider).toEqual(panel.beer);
  expect(panel.wine).toEqual(panel.beer);
  // and the panel matches the dedicated page for the same content
  for (const key of ["name", "price", "brew", "meta", "add", "count"] as const) expect(panel.beer[key]).toBe(pages.beers[key]);
});

test("every price is Source Serif 4, and nothing is synthesised (no faux bold on the display face)", async ({ page }) => {
  const prices: string[] = [];
  const weights: string[] = [];
  for (const path of TYPE_PAGES) {
    await openEverything(page, path);
    const r = await page.evaluate(() => {
      const bad: string[] = [], wt: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set<Element>();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const tx = (n.nodeValue || "").trim(); const e = n.parentElement;
        if (!e || seen.has(e) || !tx || e.closest("script, style, svg, .vh, [hidden], .cm-panel, .cm-tab")) continue;
        const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || !e.getBoundingClientRect().width) continue;
        seen.add(e);
        const fam = cs.fontFamily.split(",")[0].replace(/["']/g, "");
        if (/^[£€]\s?\d/.test(tx) && fam !== "Source Serif 4") bad.push(`${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0]} "${tx.slice(0, 12)}" = ${fam}`);
        if (e.matches(".pg-price, .prod-price, .tier-price b, .deli-price") && fam !== "Source Serif 4") bad.push(`price element ${e.className} = ${fam}`);
        if (fam === "Gloock" && (cs.fontWeight !== "400" || cs.fontStyle !== "normal")) wt.push(`${e.tagName.toLowerCase()}.${(e.className || "").toString().split(" ")[0]} w${cs.fontWeight} ${cs.fontStyle}`);
      }
      return { bad, wt, synth: getComputedStyle(document.documentElement).fontSynthesis };
    });
    prices.push(...r.bad.map((x) => path + " " + x));
    weights.push(...r.wt.map((x) => path + " " + x));
    expect(r.synth).toContain("none");
  }
  expect(prices, prices.join("\n")).toEqual([]);
  expect(weights, weights.join("\n")).toEqual([]);
});

test("the selected font files load, nothing fails, and the preview settings cannot swap the type system unexpectedly", async ({ page }) => {
  const failed: string[] = [];
  page.on("response", (r) => { if (/\.woff2?($|\?)/.test(r.url()) && r.status() >= 400) failed.push(r.status() + " " + r.url()); });
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("jo_opened", "1"));
  await page.reload();
  await page.waitForTimeout(1200);
  const loaded = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family.replace(/["']/g, "")} ${f.style}`); });
  expect(loaded.some((l) => l.startsWith("Gloock"))).toBe(true);
  expect(loaded.some((l) => l.startsWith("Source Serif 4 normal"))).toBe(true);
  expect(failed).toEqual([]);
  // a ?type= comparison applies to that page only: it is not remembered, and a value left in the tab by an earlier visit is cleared
  await page.evaluate(() => sessionStorage.setItem("jo_type", "b"));
  await page.goto("/ciders");
  expect(await page.evaluate(() => sessionStorage.getItem("jo_type"))).toBeNull();
  expect(await page.evaluate(() => document.documentElement.dataset.type ?? null)).toBeNull();
  expect(firstFamily(await page.locator("h1").evaluate((e) => getComputedStyle(e).fontFamily))).toBe("Gloock");
  await page.goto("/?type=b");
  expect(firstFamily(await page.locator(".bh-l2").evaluate((e) => getComputedStyle(e).fontFamily))).toBe("Bodoni Moda");
  await page.goto("/beers");
  expect(await page.evaluate(() => document.documentElement.dataset.type ?? null)).toBeNull();
  expect(firstFamily(await page.locator("h1").evaluate((e) => getComputedStyle(e).fontFamily))).toBe("Gloock");
});

test("no text wraps badly or clips after the change: filters, names, prices and basket controls stay on screen", async ({ page }) => {
  for (const w of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const path of ["/ciders", "/beers", "/wines"]) {
      await page.goto(path);
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => {
        const W = document.documentElement.clientWidth;
        // the New in strip is a deliberate sideways-swipe row, so its cards are allowed to run past the edge
        const els = [...document.querySelectorAll(".pg-chip, .seg-btn, .pg-name, .pg-price, .pg-btn, .cartbtn")].filter((e) => (e as HTMLElement).offsetParent !== null && !e.closest(".newin"));
        const off = els.filter((e) => { const q = e.getBoundingClientRect(); return q.right > W + 1 || q.left < -1; }).map((e) => (e.className || "").toString().split(" ")[0]);
        const clipped = els.filter((e) => (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 2 && getComputedStyle(e).overflow !== "visible" && !getComputedStyle(e).webkitLineClamp.match(/\d/)).map((e) => (e.textContent || "").trim().slice(0, 20));
        return { off, clipped, sideways: document.documentElement.scrollWidth > W + 1 };
      });
      expect(r.off, `${path} at ${w}`).toEqual([]);
      expect(r.sideways, `${path} at ${w}`).toBe(false);
    }
  }
});
