import { expect, test, type Page } from "@playwright/test";

/** SEO checks on the live-mode build (SITE_INDEXABLE=true), the site as search engines will see it. */

const SITE = "https://jackobeers.com";
const PAGES = ["/", "/beers", "/ciders", "/wines", "/draught-club", "/events", "/faq", "/about", "/west-highland-way", "/craft-beer-milngavie", "/bottle-shop-milngavie", "/beer-gift-boxes"];
const REVIEW = "https://g.page/r/CdfUxddA7FDHEBM/review";

type Seen = { path: string; title: string; desc: string; canonical: string | null; og: Record<string, string>; h1: number; noAlt: string[]; ld: any[]; body: string };

async function read(page: Page, path: string): Promise<Seen> {
  await page.goto(path);
  return page.evaluate((path) => {
    const meta = (sel: string) => document.querySelector<HTMLMetaElement>(sel)?.content || "";
    const og: Record<string, string> = {};
    document.querySelectorAll<HTMLMetaElement>('meta[property^="og:"]').forEach((m) => { og[m.getAttribute("property")!] = m.content; });
    const noAlt = [...document.querySelectorAll("img")].filter((i) => !(i.getAttribute("alt") || "").trim() && !i.closest("[aria-hidden='true']") && i.getAttribute("role") !== "presentation").map((i) => i.getAttribute("src") || "");
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => { const j = JSON.parse(s.textContent || "[]"); return Array.isArray(j) ? j : [j]; });
    return { path, title: document.title, desc: meta('meta[name="description"]'), canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || null, og, h1: document.querySelectorAll("h1").length, noAlt, ld, body: document.body.innerText };
  }, path);
}

test("every page: unique title and description, canonical, Open Graph, one h1, alt text, no em dashes", async ({ page }) => {
  const titles = new Set<string>(), descs = new Set<string>();
  for (const path of [...PAGES, "/product/p6"]) {
    const s = await read(page, path);
    const at = `at ${path}`;
    expect(s.title.length, `title ${at}`).toBeGreaterThan(10);
    expect(titles.has(s.title), `duplicate title ${at}: ${s.title}`).toBe(false);
    titles.add(s.title);
    expect(s.desc.length, `description length ${at}: ${s.desc.length}`).toBeGreaterThan(70);
    expect(s.desc.length, `description length ${at}`).toBeLessThanOrEqual(175);
    expect(descs.has(s.desc), `duplicate description ${at}`).toBe(false);
    descs.add(s.desc);
    expect((s.canonical || "").replace(/\/$/, ""), `canonical ${at}`).toBe(SITE + (path === "/" ? "" : path));
    expect(s.og["og:title"], `og:title ${at}`).toBeTruthy();
    expect(s.og["og:description"], `og:description ${at}`).toBeTruthy();
    expect((s.og["og:url"] || "").replace(/\/$/, ""), `og:url ${at}`).toBe(SITE + (path === "/" ? "" : path));
    expect(s.og["og:image"], `og:image ${at}`).toBeTruthy();
    expect(s.h1, `h1 count ${at}`).toBe(1);
    expect(s.noAlt, `images without alt text ${at}`).toEqual([]);
    expect(s.body.includes("—"), `em dash in the visible text ${at}`).toBe(false);
    expect(s.desc.includes("—") || s.title.includes("—"), `em dash in meta ${at}`).toBe(false);
  }
});

test("Store JSON-LD on every page, with the shop's facts", async ({ page }) => {
  for (const path of [...PAGES, "/product/p6"]) {
    const s = await read(page, path);
    const types = (t: unknown) => ([] as string[]).concat(t as string | string[]);
    const store = s.ld.find((x) => types(x["@type"]).includes("LiquorStore"));
    expect(store, `Store at ${path}`).toBeTruthy();
    expect(types(store["@type"])).toContain("Store");
    expect(store.name).toMatch(/Jack O.Beers and Deli/);
    expect(store.address).toMatchObject({ streetAddress: "13 Station Road", addressLocality: "Milngavie", postalCode: "G62 8PG" });
    expect(store.telephone.replace(/\s/g, "")).toBe("07405480950");
    const h = store.openingHoursSpecification[0];
    expect(h.dayOfWeek).toEqual(["Monday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
    expect([h.opens, h.closes]).toEqual(["11:00", "19:00"]);
    expect(store.geo).toMatchObject({ latitude: 55.9419793, longitude: -4.3166612 });
    expect(store.sameAs).toContain(REVIEW);
    expect(store.sameAs.some((u: string) => /google|goo\.gl/.test(u) && u !== REVIEW)).toBe(true);
  }
});

test("Product JSON-LD on a product page, FAQPage on the FAQ", async ({ page }) => {
  const p = await read(page, "/product/p6");
  const prod = p.ld.find((x) => x["@type"] === "Product");
  expect(prod?.offers?.price).toBeTruthy();
  const f = await read(page, "/faq");
  const faq = f.ld.find((x) => x["@type"] === "FAQPage");
  expect(faq.mainEntity.length).toBeGreaterThanOrEqual(10);
});

test("name, address, phone and hours are visible in the footer of every page", async ({ page }) => {
  for (const path of [...PAGES, "/product/p6"]) {
    await page.goto(path);
    const foot = (await page.locator("footer").first().innerText()).replace(/\s+/g, " ");
    expect(foot, `footer at ${path}`).toMatch(/13 Station Road/);
    expect(foot).toMatch(/G62 8PG/);
    expect(foot).toMatch(/07405 480950/);
    expect(foot).toMatch(/11am/i);
    expect(foot).toMatch(/Tuesday/i);
  }
});

test("robots.txt allows crawling, points to the sitemap and blocks cart, checkout and account", async ({ request }) => {
  const r = await (await request.get("/robots.txt")).text();
  expect(r).toMatch(/Allow: \//);
  expect(r).toMatch(/Sitemap: https:\/\/jackobeers\.com\/sitemap\.xml/);
  for (const p of ["/cart", "/checkout", "/account", "/api/"]) expect(r).toContain("Disallow: " + p);
});

test("sitemap.xml lists the landing pages", async ({ request }) => {
  const x = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/craft-beer-milngavie", "/bottle-shop-milngavie", "/beer-gift-boxes", "/draught-club", "/faq"]) expect(x).toContain(SITE + p);
  expect(x).not.toContain("/cart");
});

test("FAQ answers hours, location, delivery, click and collect, Draught Club and the £35 minimum, without inventing", async ({ page }) => {
  await page.goto("/faq");
  const t = await page.locator("main").innerText();
  expect(t).toMatch(/Wednesday to Monday, 11am to 7pm/);
  expect(t).toMatch(/13 Station Road/);
  expect(t).toMatch(/minimum order is £35/i);
  expect(t).toMatch(/local delivery to Milngavie, Baljaffray and Strathblane/i);
  expect(t).toMatch(/Click and collect stays/i);
  expect(t).not.toMatch(/UK delivery|£4\.99/);
  expect(t).toMatch(/£24\.99/);
  expect(t).toMatch(/£39\.99/);
});

test("landing pages carry only confirmed facts", async ({ page }) => {
  for (const path of ["/craft-beer-milngavie", "/bottle-shop-milngavie", "/beer-gift-boxes", "/draught-club"]) {
    await page.goto(path);
    const t = await page.locator("main").innerText();
    expect(t, path).not.toMatch(/\d+ (Google )?reviews|\b(award|best in|number one|#1)\b/i);
    expect(t, path).not.toMatch(/\b(2[0-9]|3[0-9]) taps\b(?<!23 taps)/);
  }
  await page.goto("/draught-club");
  expect(await page.locator("main").innerText()).toMatch(/£24\.99[\s\S]*£39\.99/);
  await page.goto("/craft-beer-milngavie");
  const t = await page.locator("main").innerText();
  expect(t).toMatch(/23 taps/);
  expect(t).toMatch(/popcorn at £3\.50/);
  expect(t).toMatch(/5 star reviews on Google/);
});
