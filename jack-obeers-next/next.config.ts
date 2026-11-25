import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A second build folder lets the preview-mode build sit next to the live-mode build for the tests.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Product photos come from the shop's Shopify files.
  images: { remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }] },
};

export default nextConfig;
