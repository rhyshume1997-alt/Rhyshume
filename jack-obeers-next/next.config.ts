import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Product photos come from the shop's Shopify files.
  images: { remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }] },
};

export default nextConfig;
