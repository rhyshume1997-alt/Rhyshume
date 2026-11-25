import type { Metadata } from "next";
import { NAME, abs, isIndexable } from "@/lib/site";

/**
 * Per-page search tags: a short unique title (the layout adds " | Jack O’Beers and Deli"), a unique description, the
 * canonical address, and the share card. Pages the shop does not want searched (owners, members, the old shelf pages)
 * pass noindex.
 */
export function pageMeta(o: { title: string; description: string; path: string; noindex?: boolean; absoluteTitle?: boolean }): Metadata {
  const full = o.absoluteTitle ? o.title : `${o.title} | ${NAME}`;
  return {
    title: o.absoluteTitle ? { absolute: o.title } : o.title,
    description: o.description,
    alternates: { canonical: o.path },
    openGraph: { type: "website", locale: "en_GB", siteName: NAME, title: full, description: o.description, url: abs(o.path), images: [{ url: "/media/photos/shopfront-street-1200.webp", width: 1200, height: 675, alt: "Jack O'Beers & Deli from the street, with outdoor seating" }] },
    twitter: { card: "summary_large_image", title: full, description: o.description },
    ...(o.noindex || !isIndexable() ? { robots: { index: false, follow: o.noindex ? true : false } } : {}),
  };
}
