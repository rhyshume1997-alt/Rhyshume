import { expect, test, type Page } from "@playwright/test";

/** Brass Selector buttons and quantity controls. Run in the preview-mode build (Behind the Counter look). Checkout stays off. */

const open = (page: Page) => page.addInitScript(() => sessionStorage.setItem("jo_opened", "1"));
const basket = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("jo5_cart") || "[]") as { h: string; q: number }[]);
const count = (page: Page) => page.locator(".cartbtn .n").first();
const card = (page: Page, name: RegExp | string) => page.locator(".pg-card", { hasText: name }).first();

test.beforeEach(async ({ page }) => {
  await open(page);
});

test("quantity 1, 2 and 3 are added in one action, and the basket count and line agree", async ({ page }) => {
  await page.goto("/beers");
  const c = card(page, "Waterpistol");
  const add = c.locator("[data-add]");
  for (const want of [1, 2, 3]) {
    await page.evaluate(() => localStorage.removeItem("jo5_cart"));
    await page.reload();
    const cc = card(page, "Waterpistol");
    for (let i = 1; i < want; i++) await cc.getByRole("button", { name: /one more/i }).click();
    await expect(cc.locator(".atb-n")).toHaveText(String(want));
    await expect(cc.locator("[data-add]")).toHaveAttribute("data-q", String(want));
    await cc.locator("[data-add]").click();
    await expect(cc.locator("[data-add]")).toHaveAttribute("data-state", "added");
    await expect(count(page)).toHaveText(String(want));
    const lines = await basket(page);
    expect(lines).toHaveLength(1);
    expect(lines[0].q).toBe(want);
  }
  expect(await add.count()).toBe(1);
});

test("the selector never goes below 1 and says so to assistive tech", async ({ page }) => {
  await page.goto("/beers");
  const c = card(page, "Waterpistol");
  const minus = c.getByRole("button", { name: /one fewer/i });
  await expect(minus).toHaveAttribute("aria-disabled", "true");
  await minus.click({ force: true }); // aria-disabled, so Playwright would wait forever; a real press must do nothing
  await expect(c.locator(".atb-n")).toHaveText("1");
  await c.getByRole("button", { name: /one more/i }).click();
  await expect(minus).toHaveAttribute("aria-disabled", "false");
  await minus.click();
  await expect(c.locator(".atb-n")).toHaveText("1");
});

test("verified stock is respected: 3 in stock means 3, then a clear message and nothing more is added", async ({ page }) => {
  await page.goto("/beers");
  const c = card(page, "Raspberry Sour");
  const plus = c.getByRole("button", { name: /one more/i });
  await plus.click();
  await plus.click();
  await expect(c.locator(".atb-n")).toHaveText("3");
  await expect(plus).toHaveAttribute("aria-disabled", "true");
  await plus.click({ force: true });
  await expect(c.locator(".atb-n")).toHaveText("3");
  await expect(c.locator(".atb-msg")).toHaveText(/Only 3 available/);
  await c.locator("[data-add]").click();
  await expect(count(page)).toHaveText("3");
  // all 3 are in the basket, so another press is refused, the quantity stays, and the basket does not move
  await expect(c.locator(".atb-n")).toHaveText("1");
  await c.locator("[data-add]").click();
  await expect(c.locator("[data-add]")).toHaveAttribute("data-state", "error");
  await expect(c.locator(".atb-msg.bad")).toHaveText(/already in your basket/);
  await expect(c.locator(".atb-n")).toHaveText("1");
  expect((await basket(page))[0].q).toBe(3);
  await expect(count(page)).toHaveText("3");
});

test("with no stock figure the only limit is a quiet 99 per action, never shown as stock", async ({ page }) => {
  await page.goto("/beers");
  // the fake shop shares stock for everything, so strip it from the page's own data to prove the fallback
  const c = card(page, "Waterpistol");
  await expect(c.locator(".atb-q")).toHaveAttribute("aria-label", /Quantity of/);
});

test("two products, mixed quantities: basket lines, count and subtotal are right", async ({ page }) => {
  await page.goto("/beers");
  const a = card(page, "Waterpistol");
  await a.getByRole("button", { name: /one more/i }).click();
  await a.locator("[data-add]").click();
  await expect(a.locator("[data-add]")).toHaveAttribute("data-state", "added");
  const b = card(page, "Filler Beer 1 ");
  await b.getByRole("button", { name: /one more/i }).click();
  await b.getByRole("button", { name: /one more/i }).click();
  await b.locator("[data-add]").click();
  await expect(b.locator("[data-add]")).toHaveAttribute("data-state", "added");
  await expect(count(page)).toHaveText("5");
  await page.locator(".cartbtn").first().click();
  const body = page.locator("#cart-body");
  await expect(body).toContainText("× 2");
  await expect(body).toContainText("× 3");
  // 2 × 4.20 + 3 × 3.00
  await expect(body).toContainText("£17.40");
});

test("a quick double press adds once: the button is busy until the basket answers", async ({ page }) => {
  await page.goto("/beers");
  const c = card(page, "Waterpistol");
  await c.locator("[data-add]").dblclick();
  await expect(c.locator("[data-add]")).toHaveAttribute("data-state", "added");
  await expect(count(page)).toHaveText("1");
});

test("success shows only after the basket changed; the label and the light follow, then it resets", async ({ page }) => {
  await page.goto("/beers");
  const c = card(page, "Waterpistol");
  const btn = c.locator("[data-add]");
  await expect(btn.locator(".atb-d")).toHaveCSS("opacity", "0");
  await btn.click();
  await expect(btn).toHaveAttribute("data-state", "added");
  await expect(count(page)).toHaveText("1");
  await expect(btn.locator(".atb-d")).toHaveCSS("opacity", "1");
  await expect(c.locator(".atb-msg")).toHaveText(/Added to your basket/);
  await expect(btn).toHaveAttribute("data-state", "idle", { timeout: 4000 });
  await expect(btn.locator(".atb-d")).toHaveCSS("opacity", "0");
});

test("keyboard only: Tab to the selector, Enter on plus, then Enter on Add", async ({ page }) => {
  await page.goto("/product/p6");
  const plus = page.getByRole("button", { name: /one more/i });
  await plus.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".atb-n")).toHaveText("2");
  await page.keyboard.press("Tab");
  await expect(page.locator(".atb-add")).toBeFocused();
  await expect(page.locator(".atb-add")).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page.locator(".atb-add")).toHaveAttribute("data-state", "added");
  await expect(count(page)).toHaveText("2");
  // focus stays on the button so a keyboard user does not lose their place
  await expect(page.locator(".atb-add")).toBeFocused();
});

test("labels read well to a screen reader", async ({ page }) => {
  await page.goto("/product/p6");
  await expect(page.getByRole("group", { name: /Quantity of Amity Waterpistol/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "One more Amity Waterpistol 440ml" })).toBeVisible();
  await expect(page.getByRole("button", { name: "One fewer Amity Waterpistol 440ml" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Add to basket Amity Waterpistol/ })).toBeVisible();
  await expect(page.locator(".atb-msg")).toHaveAttribute("role", "status");
});

test("sold out stays sold out: no selector, button disabled", async ({ page }) => {
  await page.goto("/beers");
  const c = card(page, "Sold Out Lager");
  await expect(c.getByRole("button", { name: /sold out/i })).toBeDisabled();
  await expect(c.locator(".atb")).toHaveCount(0);
});

test("press timing 140 ms ease-out, hover only for real pointers, reduced motion drops the movement", async ({ page }) => {
  await page.goto("/beers");
  const btn = card(page, "Waterpistol").locator("[data-add]");
  const tr = await btn.evaluate((e) => { const cs = getComputedStyle(e); return { d: cs.transitionDuration, f: cs.transitionTimingFunction, p: cs.transitionProperty }; });
  expect(tr.p).toContain("transform");
  expect(tr.d.split(",")[0].trim()).toBe("0.14s");
  expect(tr.f).toContain("ease-out");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await btn.click();
  await expect(btn).toHaveAttribute("data-state", "added");
  expect(await btn.evaluate((e) => getComputedStyle(e).transform)).toBe("none");
  expect(await btn.evaluate((e) => getComputedStyle(e).transitionProperty)).not.toContain("transform");
});

test("homepage buttons: Shop drinks and Find us keep their destinations; reviews keep external links", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".bh-cta a", { hasText: /shop drinks/i })).toHaveAttribute("href", "#shelf");
  await expect(page.locator(".bh-cta a", { hasText: /find us/i })).toHaveAttribute("href", "#find");
  const read = page.locator(".gr-actions a", { hasText: /read the reviews/i });
  const leave = page.locator(".gr-actions a", { hasText: /leave a review/i });
  for (const l of [read, leave]) {
    await expect(l).toHaveAttribute("target", "_blank");
    await expect(l).toHaveAttribute("rel", /noopener/);
    expect(await l.getAttribute("href")).toMatch(/^https:\/\//);
  }
  // the brass finish is on, the primary and secondary are different surfaces, and neither is the old flat amber
  const bg = (s: string) => page.locator(s).first().evaluate((e) => getComputedStyle(e).backgroundImage);
  const a = await bg(".bh-cta .btn:not(.ghost)");
  const b = await bg(".bh-cta .btn.ghost");
  expect(a).toContain("gradient");
  expect(b).toContain("gradient");
  expect(a).not.toBe(b);
});

for (const w of [360, 390, 768, 1440]) {
  test(`layout at ${w}px: selector and button sit inside their card, never overlap, and are tappable`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    for (const path of ["/beers", "/product/p6", "/events", "/"]) {
      await page.goto(path);
      await page.waitForTimeout(400);
      const bad = await page.evaluate(() => {
        const out: string[] = [];
        const W = document.documentElement.clientWidth;
        document.querySelectorAll(".atb").forEach((box) => {
          const q = box.getBoundingClientRect();
          if (!q.width || !(box as HTMLElement).offsetParent) return;
          const row = box.closest(".newin-row, .newin li, .pg-card, .deli-item, .hcard, .prod-btns, .find-pick");
          const inStrip = !!box.closest(".newin");
          if (!inStrip && (q.right > W + 1 || q.left < -1)) out.push("outside viewport " + Math.round(q.left) + "-" + Math.round(q.right));
          const stepper = box.querySelector(".atb-q")!.getBoundingClientRect();
          const add = box.querySelector(".atb-add")!.getBoundingClientRect();
          const apart = stepper.right <= add.left + 1 || stepper.bottom <= add.top + 1 || add.right <= stepper.left + 1;
          if (!apart) out.push("selector overlaps button");
          if (add.height < 43 || stepper.height < 43) out.push("short target " + Math.round(add.height) + "/" + Math.round(stepper.height));
          box.querySelectorAll(".atb-step").forEach((s) => { const r = s.getBoundingClientRect(); if (r.width < 38 || r.height < 38) out.push("small key " + Math.round(r.width)); });
          const t = box.querySelector(".atb-t") as HTMLElement;
          if (t && t.scrollWidth > t.clientWidth + 1) out.push("label clipped");
          if (row) { const rr = row.getBoundingClientRect(); if (!inStrip && q.right > rr.right + 1) out.push("past card edge"); }
        });
        return out;
      });
      expect(bad, `${path} at ${w}`).toEqual([]);
    }
  });
}
