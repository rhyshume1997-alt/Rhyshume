import type { MetadataRoute } from "next";
import { getCatalogue } from "@/lib/catalogue";
import { abs } from "@/lib/site";

export const revalidate = 3600;

/**
 * Built from the routes and from the live Shopify products. Left out on purpose: /api (forms and checkout), /owners,
 * /members, the old /drinks and /product shelf pages, and product pages while the site is on sample data.
 */
const PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/beers", priority: 0.9, changeFrequency: "daily" },
  { path: "/ciders", priority: 0.8, changeFrequency: "daily" },
  { path: "/wines", priority: 0.8, changeFrequency: "daily" },
  { path: "/west-highland-way", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  { path: "/events", priority: 0.7, changeFrequency: "weekly" },
  { path: "/draught-club", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalogue = await getCatalogue();
  const products = catalogue.live ? catalogue.products.map((p) => ({ url: abs(`/product/${p.handle}`), changeFrequency: "weekly" as const, priority: 0.5 })) : [];
  return [...PAGES.map((p) => ({ url: abs(p.path), changeFrequency: p.changeFrequency, priority: p.priority })), ...products];
}
