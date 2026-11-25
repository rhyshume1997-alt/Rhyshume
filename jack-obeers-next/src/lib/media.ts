/**
 * Where the site's video and poster files are.
 *
 * Small clips live in public/media (git). The big ones (the Ilkley Brewery video, Michael's
 * welcome) are hosted on Vercel Blob, in the store "jack-obeers-media". They are switched on with BLOB_LIVE once the
 * files have been uploaded (scripts/upload-blob-media.sh). Until then those places show their poster picture only.
 * Both values can also be set with NEXT_PUBLIC_BLOB_BASE and NEXT_PUBLIC_BLOB_LIVE ("true").
 *
 * The base address follows Blob's usual pattern for the store id and is not yet checked against a real upload.
 */
export const BLOB_BASE = process.env.NEXT_PUBLIC_BLOB_BASE || "https://4fjq3ala3mdl1qyf.public.blob.vercel-storage.com";
export const BLOB_LIVE = process.env.NEXT_PUBLIC_BLOB_LIVE === "true";
const blob = (path: string): string | null => (BLOB_LIVE ? `${BLOB_BASE}/${path}` : null);
const poster = (name: string) => `/media/posters/${name}.jpg`;
const local = (name: string) => `/media/videos/${name}.mp4`;

export const MEDIA = {
  /** The opening: plays behind the saloon doors. Wide on desktop, tall on a phone. Web-sized copies (the full-quality loops are in the media repo). */
  landing: { wide: local("landing-wide"), tall: local("landing-tall"), posterWide: "/media/posters/landing-wide-hero.webp", posterTall: "/media/posters/landing-tall-hero.webp" },
  /** Section backgrounds (compressed for the web, muted loops). */
  bgTaps: { wide: local("bg-taps-wide"), tall: local("bg-taps-tall"), posterWide: poster("bg-taps-wide"), posterTall: poster("bg-taps-tall") },
  bgDeli: { wide: local("bg-deli-wide"), tall: local("bg-deli-tall"), posterWide: poster("bg-deli-wide"), posterTall: poster("bg-deli-tall") },
  storefront: { wide: local("storefront-wide"), tall: local("storefront-tall"), posterWide: poster("storefront-wide"), posterTall: poster("storefront-tall") },
  /** Framed clips in the taps section. */
  takeaway: { wide: local("takeaway-refill-wide"), tall: null, posterWide: poster("takeaway-refill-wide"), posterTall: null },
  pour: { wide: local("pour-wide"), tall: null, posterWide: poster("pour-wide"), posterTall: null },
  settling: { wide: local("beer-settling-wide"), tall: null, posterWide: poster("beer-settling-wide"), posterTall: null },
  /** Has sound: shown with controls, never autoplays. */
  events: { src: blob("videos/events-ilkley-brewery-tall.mp4"), poster: poster("events-ilkley-brewery-tall") },
  /** Michael's welcome (28 MB, has sound, so it lives on Blob). Poster only until it is uploaded. */
  michael: { src: blob("videos/michael-welcome.mp4"), poster: poster("michael-welcome") } as { src: string | null; poster: string },
  /** Walking in through the door. A background on the walkers page. */
  walkIn: { wide: local("walk-in-wide"), tall: local("walk-in-tall"), posterWide: poster("walk-in-wide"), posterTall: poster("walk-in-tall") },
};

export type Loop = { wide: string | null; tall: string | null; posterWide: string; posterTall: string | null };
