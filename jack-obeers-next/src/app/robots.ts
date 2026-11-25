import type { MetadataRoute } from "next";

// Preview mode: block crawlers until launch is approved. Swap to allow: "/" then.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
