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
    // The live-mode build (SITE_INDEXABLE=true): the site as it will be when it is the real, searchable site.
    { name: "desktop", testIgnore: /(behind|brass|functional|checkout|hardening|entrypoints|xmas)\.spec\.ts/, use: { browserName: "chromium", viewport: { width: 1366, height: 850 } } },
    { name: "iphone", testIgnore: /(behind|brass|functional|checkout|hardening|entrypoints|xmas)\.spec\.ts/, use: { ...iphone, browserName: "chromium" } },
    // The preview-mode build: Behind the Counter is the default look, with the other looks behind ?look=.
    { name: "behind-desktop", testMatch: /(behind|brass|functional|checkout|hardening|entrypoints|xmas)\.spec\.ts/, use: { baseURL: "http://localhost:3202", browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "behind-iphone", testIgnore: /(checkout|hardening|entrypoints)\.spec\.ts/, testMatch: /(behind|brass|functional|checkout|hardening|entrypoints|xmas)\.spec\.ts/, use: { ...iphone, baseURL: "http://localhost:3202", browserName: "chromium" } },
  ],
  webServer: [
    { command: "node tests/fake-shopify.cjs", port: 4470, reuseExistingServer: true, env: { FAKE_SIZES: "1" } },
    {
      command: "sh -c \"pnpm build && pnpm start -p 3201\"",
      port: 3201,
      timeout: 300_000,
      reuseExistingServer: false,
      env: { SHOPIFY_STORE_DOMAIN: "shop.test", SHOPIFY_STOREFRONT_TOKEN: "x", SHOPIFY_API_BASE: "http://localhost:4470", SITE_INDEXABLE: "true", TURNSTILE_ALLOW_TEST_KEYS: "true" },
    },
    {
      // Preview mode: SITE_INDEXABLE is NOT set, and the build goes in its own folder so it can sit beside the live-mode build.
      command: "sh -c \"NEXT_DIST_DIR=.next-preview pnpm build && NEXT_DIST_DIR=.next-preview pnpm start -p 3202\"",
      port: 3202,
      timeout: 300_000,
      reuseExistingServer: false,
      env: { SHOPIFY_STORE_DOMAIN: "shop.test", SHOPIFY_STOREFRONT_TOKEN: "x", SHOPIFY_API_BASE: "http://localhost:4470", TURNSTILE_ALLOW_TEST_KEYS: "true" },
    },
  ],
});
