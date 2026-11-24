/* Jack O'Beers: site configuration. This is the ONLY file to edit to go from the demonstration catalogue to live Shopify.
   Nothing here is secret: the Storefront API token is a public, read-and-cart-only token made for browsers. Never put an Admin API token here. */
window.JO_CONFIG = {
  /* Shopify. Leave both empty for demonstration mode (local sample catalogue, no checkout). */
  shopifyDomain: '',            /* e.g. 'jack-obeers.myshopify.com' (the .myshopify.com domain, not the public domain) */
  storefrontToken: '',          /* Storefront API public access token from a Shopify custom app / Headless channel */
  apiVersion: '2025-01',        /* a stable Storefront API version; update on Shopify's schedule */
  apiBase: '',                  /* only for tests or a proxy: full origin, e.g. 'https://shop.example.com'. Leave empty. */

  /* Members. Shopify-hosted customer accounts. Sign in and registration happen on Shopify, not here. */
  accountUrl: '',               /* e.g. 'https://shopify.com/<shop id>/account' or 'https://<domain>/account/login' */

  /* Newsletter. Any endpoint that accepts a form POST of { email, consent } (Shopify Forms, Klaviyo, Mailchimp or your own). Empty = demonstration. */
  newsletterEndpoint: '',

  /* Click and collect. PLACEHOLDERS until the shop confirms days, hours and lead time. weekdays: 0 Sunday to 6 Saturday. */
  collection: { weekdays: [3, 4, 5, 6], windows: ['12:00 to 14:00', '14:00 to 17:00'], leadHours: 24, horizonDays: 10 },

  currency: 'GBP',
  locale: 'en-GB',
  ageGate: true,                /* self-declaration gate on first visit. How age is verified is a compliance decision for the client. */
  catalogueFile: 'data/products.json'
};
