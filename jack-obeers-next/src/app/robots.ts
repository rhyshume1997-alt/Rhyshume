import type { MetadataRoute } from "next";
import { SITE_URL, isIndexable } from "@/lib/site";

/**
 * Live site: ordinary search bots and the AI crawlers are welcome, except the owners and members areas, the
 * form and checkout endpoints, and the old shelf pages. Preview and local runs block everyone.
 */
const BOTS = ["Googlebot", "Bingbot", "Applebot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"];
const BLOCK = ["/api/", "/owners", "/members", "/drinks"];

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [...BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: BLOCK })), { userAgent: "*", allow: "/", disallow: BLOCK }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
