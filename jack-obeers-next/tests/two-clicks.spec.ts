import { expect, test, type Page } from "@playwright/test";

/**
 * Michael's rule: two clicks from landing to sale. From the home page, every category must reach "Add to basket" in
 * two clicks or fewer, on a desktop and on an iPhone. The opening's Skip button is not counted. If any path needs more,
 * this test fails, and so does the build ("pnpm verify").
 * Checkout is off in these runs; "sale" here means the item is in the basket, ready for checkout.
 */
type Path = { name: string; steps: string[]; note: string };

const PATHS: Path[] = [
  { name: "beer", steps: [".sh-item[data-kind=beer]", "#range-panel .pg-card [data-add] >> nth=0"], note: "Beer shelf, Add to basket" },
  { name: "cider", steps: [".sh-item[data-kind=cider]", "#range-panel .pg-card [data-add] >> nth=0"], note: "Cider shelf, Add to basket" },
  { name: "wine", steps: [".sh-item[data-kind=wine]", "#range-panel .pg-card [data-add] >> nth=0"], note: "Wine shelf, Add to basket" },
  { name: "deli", steps: ["#deli [data-add] >> nth=0"], note: "Deli item, Add to basket" },
  { name: "gifts", steps: ["#hampers [data-add] >> nth=0"], note: "Hamper, Add to basket" },
  { name: "events", steps: [".sh-item[data-kind=events]", ".hcard.event [data-add] >> nth=0"], note: "Event Tickets shelf, Add to basket" },
];

async function basketCount(page: Page): Promise<number> {
  return Number((await page.locator("[data-count]").first().textContent()) || "0");
}

for (const path of PATHS) {
  test(`${path.name}: home to add to basket in 2 clicks or fewer`, async ({ page }, info) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500); // the opening starts after load; Skip appears while it plays
    const skip = page.locator(".open-skip");
    if (await skip.isVisible()) await skip.click({ force: true }); // not counted (the button moves while the opening plays, so do not wait for it to settle)
    const before = await basketCount(page);
    let clicks = 0;
    for (const step of path.steps) {
      const target = page.locator(step);
      await target.scrollIntoViewIfNeeded();
      await target.click();
      clicks++;
      if (clicks < path.steps.length) await page.waitForTimeout(400);
    }
    await expect.poll(() => basketCount(page)).toBe(before + 1);
    expect(clicks, `${path.name} on ${info.project.name} needed ${clicks} clicks`).toBeLessThanOrEqual(2);
    info.annotations.push({ type: "click path", description: `${info.project.name} | ${path.name} | ${clicks} click(s): ${path.note}` });
    console.log(`PATH ${info.project.name.padEnd(7)} ${path.name.padEnd(7)} ${clicks} click(s)  ${path.note}`);
  });
}
