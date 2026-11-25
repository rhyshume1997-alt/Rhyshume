import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://jackobeers.com/", changeFrequency: "weekly", priority: 1 },
    { url: "https://jackobeers.com/drinks", changeFrequency: "daily", priority: 0.8 },
  ];
}
