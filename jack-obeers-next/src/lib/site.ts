import { HOURS, LINKS, SHOP } from "@/lib/brand";

/**
 * One place for the facts search engines and AI answer engines read: the name, address and phone (NAP), the web address,
 * the profile links and the hours. The footer, the page schema, /llms.txt and the FAQ all use these, so they always match.
 */
export const SITE_URL = "https://jackobeers.com";
export const NAME = SHOP.name; // "Jack O’Beers and Deli"
export const ADDRESS = { street: "13 Station Road", town: "Milngavie", postcode: "G62 8PG", country: "GB" } as const;
export const PHONE = SHOP.phone; // 07405 480950
export const EMAIL = SHOP.email;
export const ADDRESS_LINE = `${ADDRESS.street}, ${ADDRESS.town}, ${ADDRESS.postcode}`;

/**
 * Where the shop is listed online (schema "sameAs"). Add each profile's address here as it is created or claimed.
 * Only real, working addresses. Instagram and the Google listing are supplied. The rest are in SEO.md for Rhys to fill in:
 *   Facebook, Untappd venue, CAMRA WhatPub, Bing Places, Apple Business Connect, TripAdvisor, West Highland Way listing.
 */
export const SAME_AS: string[] = [LINKS.instagram, LINKS.google];

/** Latitude and longitude. Leave null until Rhys supplies them. Never guess. */
export const GEO: { lat: number; lng: number } | null = null;

/** Shown in the schema as opening hours. Wednesday to Monday 11am to 7pm, Tuesday closed. [Michael to confirm] */
export const OPENING = {
  days: HOURS.filter((h) => h.open).map((h) => h.day),
  opens: "11:00",
  closes: "19:00",
};

/**
 * Search engines may index the site only on the live (production) deployment, or when SITE_INDEXABLE=true is set.
 * Preview deployments and local runs stay out of search.
 */
export function isIndexable(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.SITE_INDEXABLE === "true";
}

export const abs = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;
export const STORE_ID = `${SITE_URL}/#store`;

/**
 * Google reviews. The site says only "5 star reviews on Google". It does not show a count or an average, and never
 * quotes a review. checked is the day Rhys last looked at the listing. Change it when you look again.
 *
 * reviewsUrl: where "Read the reviews" goes (the Google listing).
 * placeId: the shop's Google Place ID. When it is set, "Leave a review" opens Google's review box straight away
 *   (https://search.google.com/local/writereview?placeid=...). Find it at
 *   https://developers.google.com/maps/documentation/places/web-service/place-id (search for the shop) and paste it here.
 *   Until then the button opens the Google listing, where the "Write a review" button is. It is listed in MICHAEL-NEEDS.md.
 */
export const GOOGLE_REVIEWS = {
  headline: "5 star reviews on Google",
  checked: "25 Nov 2026",
  reviewsUrl: LINKS.google,
  placeId: null as string | null,
} as const;

export const GOOGLE_WRITE_REVIEW_URL: string = GOOGLE_REVIEWS.placeId
  ? `https://search.google.com/local/writereview?placeid=${GOOGLE_REVIEWS.placeId}`
  : GOOGLE_REVIEWS.reviewsUrl;

/** The Google Maps directions link used in the footer, the phone bar and the walkers page. */
export const DIRECTIONS_URL = "https://www.google.com/maps/search/?api=1&query=Jack+O'Beers+%26+Deli,+13+Station+Road,+Milngavie,+G62+8PG";
export const PHONE_HREF = `tel:${PHONE.replace(/\s/g, "")}`;
