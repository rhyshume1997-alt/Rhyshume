/**
 * The shop photos that are in public/media/photos. Alt text is from the media repo's photos.json.
 * -1200 files are for cards, the -2400 file is for the full-width tap wall background.
 */
export type Photo = { file: string; alt: string; width: number; height: number };

export const MICHAEL_AND_TANYA: Photo = { file: "/media/photos/michael-and-tanya-1200.webp", alt: "Owners Michael and Tanya outside Jack O'Beers", width: 1200, height: 675 };
export const SHOPFRONT_STREET: Photo = { file: "/media/photos/shopfront-street-1200.webp", alt: "Jack O'Beers & Deli from the street, with outdoor seating", width: 1200, height: 675 };
export const INTERIOR_COUNTER_BULBS: Photo = { file: "/media/photos/interior-counter-bulbs-1200.webp", alt: "Inside the shop: the deli counter under Edison bulbs", width: 1200, height: 900 };
export const TAP_WALL_WIDE: Photo = { file: "/media/photos/tap-wall-wide-1200.webp", alt: "The wall of 23 taps", width: 1200, height: 900 };
export const DELI_COUNTER: Photo = { file: "/media/photos/deli-counter-1200.webp", alt: "The deli counter: pies, cheese and charcuterie", width: 1200, height: 900 };
export const DELI_CABINET: Photo = { file: "/media/photos/deli-cabinet-1200.webp", alt: "The deli cabinet", width: 1200, height: 900 };
export const TAP_WALL_FULL: Photo = { file: "/media/photos/tap-wall-wide-2400.webp", alt: "The wall of 23 taps", width: 2400, height: 1800 };
export const MICHAEL_OUTSIDE: Photo = { file: "/media/photos/michael-outside-1200.webp", alt: "Michael outside the shop", width: 1200, height: 675 };
export const MICHAEL_AT_THE_FRIDGES: Photo = { file: "/media/photos/michael-at-the-fridges-1200.webp", alt: "Michael by the fridges inside the shop", width: 1200, height: 675 };
