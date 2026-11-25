import type { MetadataRoute } from "next";

// Preview mode: block crawlers until launch is approved. Swap to allow: "/" then, and keep the disallow lines below.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: ["/", "/owners", "/members", "/api"] } };
}
