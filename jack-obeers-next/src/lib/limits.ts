/**
 * Order limits shared by the basket (browser) and the checkout route (server), so the two can never disagree.
 *
 * MAX_PER_LINE: the most of one product in one size that an order can hold. 24 was already the checkout route's cap. The basket used to
 * let a customer add 99 and the route quietly cut each line to 24, so the customer was checked out with less than the basket showed.
 * The basket now stops at 24 and tells the customer, and the route REFUSES more than 24 instead of cutting it. It also means a product with
 * no stock figure from Shopify is never treated as unlimited: 24 is the most the website will ever take, and Shopify's checkout is the
 * final authority on real stock.
 *
 * MIN_ORDER_GBP: the website's minimum order. It was set by the shop. It is NOT enforced or confirmed in Shopify (Shopify has no
 * minimum order setting of its own), so anyone who reaches Shopify's checkout without using this site is not held to it.
 */
export const MAX_PER_LINE = 24;
export const MIN_ORDER_GBP = 35;
