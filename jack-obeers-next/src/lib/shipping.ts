/**
 * Delivery facts, in one place. The basket bottle and the delivery copy read these.
 *
 * LOCAL DELIVERY ONLY (Michael's latest direction): Milngavie, Baljaffray and Strathblane. No UK-wide or international delivery is
 * offered. Click and collect stays. Michael has not yet supplied the full accepted postcode list, so NOTHING on this site checks a
 * postcode: the areas are shown as wording only. See DELIVERY-PLAN.md for how eligibility could really be enforced.
 *
 * freeFrom and standard came from Rhys for the earlier UK offer. They are NOT confirmed for local delivery. They only drive the
 * basket bottle's fill. Check them with Michael and against the Shopify shipping setup before checkout opens. [Michael to confirm]
 * Checkout itself is unchanged: Shopify works out the real shipping at checkout.
 */
export const DELIVERY_AREAS = ["Milngavie", "Baljaffray", "Strathblane"] as const;
export const DELIVERY_AREAS_TEXT = "Milngavie, Baljaffray and Strathblane";

export const SHIPPING = {
  freeFrom: 50,
  standard: 4.99,
} as const;
