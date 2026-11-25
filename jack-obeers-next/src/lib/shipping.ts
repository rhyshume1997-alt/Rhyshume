/**
 * UK delivery prices, in one place. The basket bottle and the delivery copy read these.
 * Free from 50 pounds, 4.99 under that. These came from Rhys and should match the Shopify shipping setup.
 * This site has no way to read that setup, so check them in Shopify admin (Settings, Shipping). [Michael to confirm]
 * Checkout itself is unchanged: Shopify works out the real shipping at checkout.
 */
export const SHIPPING = {
  freeFrom: 50,
  standard: 4.99,
} as const;
