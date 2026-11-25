import demo from "@/data/demo-products.json";

export type Variant = { id: string; title: string; price: number; available: boolean };
export type Product = {
  handle: string;
  title: string;
  collection: string;
  productType: string;
  tags: string[];
  descriptor: string;
  description: string;
  kind: string;
  flavour: { sweet: number; bitter: number; fruity: number; body: number } | null;
  pairings: string[];
  abv: string;
  allergens: string;
  image: string | null;
  variants: Variant[];
  blurb?: string;
};
export type Catalogue = {
  collections: Record<string, { title: string; lede: string }>;
  products: Product[];
};

/**
 * The only place the site asks for products.
 *
 * Today it returns the SAMPLE catalogue (names, prices and flavour scores are made up).
 * When the Shopify store is approved and connected, replace the body with a Storefront API
 * query using SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN from environment variables.
 * Shopify stays the only source of products, stock, cart, orders and checkout.
 */
export async function getCatalogue(): Promise<Catalogue> {
  return demo as unknown as Catalogue;
}
