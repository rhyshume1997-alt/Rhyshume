import { test, expect } from "@playwright/test";
import { christmasOn, seasonScript } from "../src/lib/season";
import { londonDate, londonWeek, addDays } from "../src/lib/london";
import { inWeek, toUpdate } from "../src/lib/weekly";

/**
 * Seasonal dates, the weekly week, and the two permanent homepage sections. Runs against the live-mode build.
 * The browser clock is set with page.clock, so no test depends on today's real date.
 */

const at = (iso: string) => new Date(iso);

test.describe("Christmas date rule (Europe/London)", () => {
  const cases: [string, boolean][] = [
    ["2026-11-30T12:00:00Z", false],
    ["2026-11-30T23:59:59Z", false],
    ["2026-12-01T00:00:00Z", true], // London is on GMT in winter, so midnight London is midnight UTC
    ["2026-12-15T12:00:00Z", true],
    ["2026-12-31T23:59:59Z", true],
    ["2027-01-01T00:00:00Z", false],
    ["2027-12-01T12:00:00Z", false], // must stay off: the dates are for 2026 only
    ["2027-12-25T12:00:00Z", false],
  ];
  for (const [iso, want] of cases) test(`${iso} is ${want ? "on" : "off"}`, () => expect(christmasOn(at(iso))).toBe(want));

  test("the day is the London day, not the visitor's: 23:30 on 30 Nov in New York is already 1 Dec in London... only after 00:00 London", () => {
    expect(londonDate(at("2026-12-01T04:30:00Z"))).toBe("2026-12-01"); // 23:30 on 30 Nov in New York
    expect(christmasOn(at("2026-12-01T04:30:00Z"))).toBe(true);
    expect(christmasOn(at("2026-11-30T23:30:00Z"))).toBe(false);
  });
});

test.describe("London weeks", () => {
  test("Monday to Sunday", () => {
    expect(londonWeek("2026-12-07")).toEqual({ start: "2026-12-07", end: "2026-12-13" }); // a Monday
    expect(londonWeek("2026-12-13")).toEqual({ start: "2026-12-07", end: "2026-12-13" }); // the Sunday
    expect(londonWeek("2026-12-14")).toEqual({ start: "2026-12-14", end: "2026-12-20" });
  });
  test("across the clocks going forward (29 March 2026) the week is still seven days", () => {
    expect(londonWeek("2026-03-29")).toEqual({ start: "2026-03-23", end: "2026-03-29" });
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
  });
  test("a late Sunday in London in summer is still Sunday", () => {
    expect(londonDate(at("2026-07-05T23:30:00Z"))).toBe("2026-07-06"); // 00:30 BST Monday
    expect(londonDate(at("2026-07-05T22:30:00Z"))).toBe("2026-07-05");
  });
  test("an update is current only in the weeks it covers", () => {
    const u = { from: "2026-12-07", to: "2026-12-13" };
    expect(inWeek(u, "2026-12-09")).toBe(true);
    expect(inWeek(u, "2026-12-13")).toBe(true);
    expect(inWeek(u, "2026-12-14")).toBe(false);
    expect(inWeek(u, "2026-12-06")).toBe(false);
  });
  test("an update with no tags covers the week it was published; one with no date at all is dropped", () => {
    const a = toUpdate({ id: "1", title: "T", excerpt: "x", publishedAt: "2026-12-09T10:00:00Z", tags: [] });
    expect(a && [a.from, a.to]).toEqual(["2026-12-07", "2026-12-13"]);
    expect(toUpdate({ id: "2", title: "T", excerpt: "x", tags: [] })).toBeNull();
    expect(toUpdate({ id: "3", title: "", excerpt: "x", publishedAt: "2026-12-09T10:00:00Z" })).toBeNull();
  });
});

test.describe("The head script agrees with the rule, and the live site cannot be overridden", () => {
  for (const iso of ["2026-11-30T23:59:59Z", "2026-12-01T00:00:00Z", "2026-12-15T09:00:00Z", "2026-12-31T23:59:59Z", "2027-01-01T00:00:00Z", "2027-12-01T09:00:00Z"]) {
    test(`script at ${iso}`, async ({ page }) => {
      await page.clock.install({ time: at(iso) });
      await page.goto("/about");
      const got = await page.evaluate((s) => { document.documentElement.removeAttribute("data-xmas"); eval(s); return document.documentElement.dataset.xmas; }, seasonScript(false));
      expect(got).toBe(christmasOn(at(iso)) ? "on" : "off");
      expect(await page.locator("html").getAttribute("data-xmas")).toBe(christmasOn(at(iso)) ? "on" : "off"); // the page's own script said the same
    });
  }
  test("?xmas=on does nothing on the live site", async ({ page }) => {
    await page.clock.install({ time: at("2027-06-15T12:00:00Z") });
    await page.goto("/?xmas=on");
    await expect(page.locator("html")).toHaveAttribute("data-xmas", "off");
    expect(seasonScript(false)).not.toContain("jo_xmas"); // the override code is not even sent
    expect(seasonScript(true)).toContain("jo_xmas");
  });
  test("a site left open over midnight switches on by itself, and off again on 1 January", async ({ page }) => {
    await page.clock.install({ time: at("2026-11-30T23:59:40Z") });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-xmas", "off");
    await page.clock.runFor(45_000);
    await expect(page.locator("html")).toHaveAttribute("data-xmas", "on");
    await page.clock.setSystemTime(at("2026-12-31T23:59:40Z"));
    await page.clock.runFor(45_000);
    await expect(page.locator("html")).toHaveAttribute("data-xmas", "off");
  });
});

test.describe("Permanent sections", () => {
  test("both are on the page with Christmas off, with a title each", async ({ page }) => {
    await page.clock.install({ time: at("2027-06-15T12:00:00Z") });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-xmas", "off");
    await expect(page.getByRole("heading", { name: "What’s Happening This Week", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Events", level: 2, exact: true })).toBeVisible();
    await expect(page.locator(".xlogo:visible, .xcorner:visible")).toHaveCount(0);
    await expect(page.locator(".xkicker:visible")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "View All Events" })).toHaveAttribute("href", "/events");
  });
  test("both are on the page in December too, and in January", async ({ page }) => {
    for (const iso of ["2026-12-15T12:00:00Z", "2027-01-05T12:00:00Z"]) {
      await page.clock.setFixedTime(at(iso));
      await page.goto("/");
      await expect(page.locator("#this-week")).toBeVisible();
      await expect(page.locator("#events-home")).toBeVisible();
    }
  });
  test("weekly updates: shown in their week, gone in the next, a new week brings the new one", async ({ page }) => {
    await page.clock.install({ time: at("2031-01-14T12:00:00Z") });
    await page.goto("/");
    const week = page.locator("#this-week");
    await expect(week.getByRole("heading", { name: "Fixture update: tasting night" })).toBeVisible();
    await expect(week.getByText("Fixture update: new on tap")).toHaveCount(0);
    await expect(week.getByText("no dates, published long ago")).toHaveCount(0);
    await expect(week.locator("[data-week-range]")).toHaveText("Mon 13 to Sun 19 January");
    await expect(week.getByRole("link", { name: "See events" })).toHaveAttribute("href", "/events");
    await expect(week.getByText("On this week")).toBeVisible(); // the Tuesday tasting event, from the events data
    // the page stays open into the next week
    await page.clock.setSystemTime(at("2031-01-20T00:30:00Z"));
    await page.clock.runFor(35_000);
    await expect(week.getByText("Fixture update: tasting night")).toHaveCount(0);
    await expect(week.getByRole("heading", { name: "Fixture update: new on tap" })).toBeVisible();
    await expect(week.getByText("A fixture body with markup & no excerpt.")).toBeVisible();
    await expect(week.getByRole("link", { name: "See the drink" })).toHaveAttribute("href", "/product/p0");
  });
  test("weekly updates: none this week shows a plain empty state and no made-up content", async ({ page }) => {
    await page.clock.install({ time: at("2031-03-05T12:00:00Z") });
    await page.goto("/");
    const week = page.locator("#this-week");
    await expect(week.getByText("Nothing new to report this week.")).toBeVisible();
    await expect(week.locator("li")).toHaveCount(0);
  });
  test("events: future events show, expired and undated ones never do, and they leave when their day is over", async ({ page }) => {
    await page.clock.install({ time: at("2031-01-14T12:00:00Z") });
    await page.goto("/");
    const ev = page.locator("#events-home");
    for (const n of [1, 2, 3]) await expect(ev.getByRole("heading", { name: `Tasting Night ${n}` })).toBeVisible();
    await expect(ev.getByText("Expired Test Night")).toHaveCount(0);
    await expect(ev.getByText("Undated Sample Event")).toHaveCount(0);
    await expect(ev.getByText("£12.50 a ticket").first()).toBeVisible();
    await expect(ev.getByRole("link", { name: /View details for Tasting Night 1/ })).toHaveAttribute("href", /^\/events#p\d+$/);
    await page.clock.setSystemTime(at("2031-02-15T12:00:00Z"));
    await page.clock.runFor(35_000);
    await expect(ev.getByRole("heading", { name: "Tasting Night 1" })).toHaveCount(0);
    await expect(ev.getByRole("heading", { name: "Tasting Night 2" })).toHaveCount(0);
    await expect(ev.getByRole("heading", { name: "Tasting Night 3" })).toBeVisible();
  });
  test("events: none left shows a visible empty state and still links to the Events page", async ({ page }) => {
    await page.clock.install({ time: at("2031-06-01T12:00:00Z") });
    await page.goto("/");
    const ev = page.locator("#events-home");
    await expect(ev.getByText("No events are booked in just now.")).toBeVisible();
    await expect(ev.getByRole("link", { name: "View All Events" })).toHaveAttribute("href", "/events");
  });
  test("the two sections are not next to each other and nothing overflows a narrow phone", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.clock.install({ time: at("2031-01-14T12:00:00Z") });
    await page.goto("/");
    const [w, e] = await Promise.all([page.locator("#this-week").boundingBox(), page.locator("#events-home").boundingBox()]);
    expect(e!.y - (w!.y + w!.height)).toBeGreaterThan(300); // other sections sit between them
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
