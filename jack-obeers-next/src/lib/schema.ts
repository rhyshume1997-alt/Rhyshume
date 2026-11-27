import { ADDRESS, EMAIL, GEO, NAME, OPENING, PHONE, SAME_AS, SITE_URL, STORE_ID, abs } from "@/lib/site";
import { LINKS } from "@/lib/brand";
import type { Product } from "@/lib/catalogue";
import { isAvailable, pickVariant } from "@/lib/variants";

/** Structured data, built on the server and written into the page as JSON-LD. Only facts the shop has confirmed. */

export function storeSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["LiquorStore", "Store"],
    "@id": STORE_ID,
    name: NAME,
    url: SITE_URL,
    description: "Independent craft beer, cider and wine shop and deli in Milngavie, near the start of the West Highland Way. Fresh draught beer to take away in 500ml or 1 litre bottles.",
    image: abs("/media/photos/shopfront-street-1200.webp"),
    logo: abs("/media/jack-logo.png"),
    telephone: PHONE,
    email: EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS.street,
      addressLocality: ADDRESS.town,
      postalCode: ADDRESS.postcode,
      addressCountry: ADDRESS.country,
    },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: OPENING.days, opens: OPENING.opens, closes: OPENING.closes },
    ],
    hasMap: LINKS.google,
    sameAs: SAME_AS,
    ...(GEO ? { geo: { "@type": "GeoCoordinates", latitude: GEO.lat, longitude: GEO.lng } } : {}),
  };
}

export function websiteSchema() {
  return { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: NAME, publisher: { "@id": STORE_ID }, inLanguage: "en-GB" };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
  };
}

export function productDescription(p: Product): string {
  if (p.profile?.blurb) return p.profile.blurb;
  const bits = [p.brewery ? `${p.name} from ${p.brewery}.` : `${p.name}.`];
  if (p.style) bits.push(`${p.style}.`);
  if (p.abvNum !== null) bits.push(`${p.abvNum}% ABV.`);
  return bits.join(" ");
}

export function productPrice(p: Product): { price: number; available: boolean } {
  const v = pickVariant(p.variants);
  return { price: v ? v.price : 0, available: isAvailable(p.variants) };
}

/** Product with one Offer. Price, currency and availability come from Shopify. Nothing about reviews or ratings. */
export function productSchema(p: Product, path: string) {
  const { price, available } = productPrice(p);
  const category = p.category === "cider" ? "Cider" : p.category === "wine" ? "Wine" : "Beer";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: productDescription(p),
    category,
    ...(p.brewery ? { brand: { "@type": "Brand", name: p.brewery } } : {}),
    ...(p.image ? { image: [p.image] } : {}),
    ...(p.abvNum !== null ? { additionalProperty: [{ "@type": "PropertyValue", name: "Alcohol by volume", value: p.abvNum, unitText: "percent" }] } : {}),
    offers: {
      "@type": "Offer",
      url: abs(path),
      priceCurrency: "GBP",
      price: price.toFixed(2),
      availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": STORE_ID },
    },
  };
}
