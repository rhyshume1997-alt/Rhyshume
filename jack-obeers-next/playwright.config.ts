import { defineConfig, devices } from "@playwright/test";

const { defaultBrowserType: _d, ...iphone } = devices["iPhone 13"];
const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH;

/**
 * End to end tests. They start a fake Shopify, build the site against it, and start it. Use "pnpm verify".
 * Checkout is left OFF on purpose: every test must pass with CHECKOUT_ENABLED unset.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://localhost:3201", launchOptions: exe ? { executablePath: exe } : {} },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1366, height: 850 } } },
    { name: "iphone", use: { ...iphone, browserName: "chromium" } },
  ],
  webServer: [
    { command: "node tests/fake-shopify.cjs", port: 4470, reuseExistingServer: true },
    {
      command: "sh -c \"pnpm build && pnpm start -p 3201\"",
      port: 3201,
      timeout: 300_000,
      reuseExistingServer: false,
      env: { SHOPIFY_STORE_DOMAIN: "shop.test", SHOPIFY_STOREFRONT_TOKEN: "x", SHOPIFY_API_BASE: "http://localhost:4470", SITE_INDEXABLE: "true", TURNSTILE_ALLOW_TEST_KEYS: "true" },
    },
  ],
});
