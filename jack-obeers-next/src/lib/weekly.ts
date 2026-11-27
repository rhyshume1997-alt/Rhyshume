import { endpoint } from "@/lib/catalogue";
import { addDays, londonDate, londonWeek } from "@/lib/london";

/**
 * "What's Happening This Week": short shop updates that Michael writes in Shopify, with no code and no new app.
 * Source: the blog called "this-week" (Shopify admin > Online Store > Blog posts). One blog post is one update.
 *   Title        the heading of the card
 *   Excerpt      the short text (if empty, the start of the post is used)
 *   Image        the card picture (optional)
 *   Tags         all optional:
 *                  from:2026-12-07   first day to show (default: the Monday of the week the post was published)
 *                  to:2026-12-13     last day to show  (default: the Sunday of that week)
 *                  tasting, new-drink, on-tap, beer-club, announcement   the small label on the card
 *                  product:<handle>  link "See the drink" to that product page
 *                  events            link "See events" to the Events page
 *                  club              link "About Draught Club" to the club page
 * The site decides what is "this week" in the browser using London time, so an update leaves the page by itself on its last day.
 * Reading a blog needs the Storefront token to have "Read content" (unauthenticated_read_content). Without it, or without the
 * blog, this quietly returns nothing and the section shows its empty state. Nothing is ever made up.
 */
export type WeeklyUpdate = {
  id: string;
  title: string;
  text: string;
  image: string | null;
  imageAlt: string;
  label: string | null;
  from: string;
  to: string;
  link: { href: string; label: string } | null;
};

const BLOG = "this-week";

const QUERY = `
query ThisWeek($handle: String!) {
  blog(handle: $handle) {
    articles(first: 20, sortKey: PUBLISHED_AT, reverse: true) {
      nodes { id title excerpt content publishedAt tags image { url altText } }
    }
  }
}`;

type Article = { id: string; title: string; excerpt?: string | null; content?: string | null; publishedAt?: string | null; tags?: string[]; image?: { url: string; altText?: string | null } | null };

const LABELS: Record<string, string> = { tasting: "Tasting", "new-drink": "New in", "on-tap": "On tap", "beer-club": "Beer club", announcement: "Announcement" };

function tagValue(tags: string[], key: string): string | null {
  const t = tags.find((x) => x.toLowerCase().startsWith(`${key}:`));
  return t ? t.slice(key.length + 1).trim() : null;
}
const isKey = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

function plain(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&rsquo;|&#39;/g, "’").replace(/\s+/g, " ").trim();
}

export function toUpdate(a: Article): WeeklyUpdate | null {
  const title = (a.title || "").trim();
  if (!title) return null;
  const tags = a.tags || [];
  const published = a.publishedAt ? londonDate(new Date(a.publishedAt)) : null;
  const wk = published ? londonWeek(published) : null;
  const fromTag = tagValue(tags, "from");
  const toTag = tagValue(tags, "to");
  const from = isKey(fromTag) ? fromTag : wk?.start;
  const to = isKey(toTag) ? toTag : isKey(fromTag) ? addDays(fromTag, 6 - ((new Date(`${fromTag}T12:00:00Z`).getUTCDay() + 6) % 7)) : wk?.end;
  if (!from || !to || to < from) return null; // no dates and not published: never shown, so it can never look current by accident
  const raw = (a.excerpt && a.excerpt.trim()) || plain(a.content || "");
  const text = raw.length > 260 ? `${raw.slice(0, 257).trimEnd()}…` : raw;
  const label = tags.map((t) => LABELS[t.toLowerCase()]).find(Boolean) || null;
  const product = tagValue(tags, "product");
  const link = product && /^[a-z0-9-]+$/i.test(product)
    ? { href: `/product/${product}`, label: "See the drink" }
    : tags.some((t) => t.toLowerCase() === "events") ? { href: "/events", label: "See events" }
    : tags.some((t) => t.toLowerCase() === "club") ? { href: "/draught-club", label: "About Draught Club" } : null;
  return { id: a.id, title, text, image: a.image?.url || null, imageAlt: a.image?.altText || "", label, from, to, link };
}

/** Whether an update belongs to the Monday-to-Sunday week that contains `today` (a London date key). */
export function inWeek(u: { from: string; to: string }, today: string): boolean {
  const w = londonWeek(today);
  return u.from <= w.end && u.to >= w.start;
}

export async function getWeeklyUpdates(): Promise<WeeklyUpdate[]> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !token) return [];
  try {
    const res = await fetch(endpoint(domain), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
      body: JSON.stringify({ query: QUERY, variables: { handle: BLOG } }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { errors?: unknown; data?: { blog: { articles: { nodes: Article[] } } | null } };
    if (json.errors || !json.data?.blog) return [];
    const today = londonDate();
    return json.data.blog.articles.nodes.map(toUpdate).filter((u): u is WeeklyUpdate => !!u && u.to >= addDays(today, -1)); // only ones that are not long over
  } catch {
    return [];
  }
}
