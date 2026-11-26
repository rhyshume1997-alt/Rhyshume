import Image from "next/image";
import type { ReactNode } from "react";
import { BasketBehaviour } from "@/components/BasketBehaviour";
import { Frame } from "@/components/Frame";
import { Hours } from "@/components/Hours";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { GOOGLE_REVIEWS, GOOGLE_WRITE_REVIEW_URL } from "@/lib/site";
import type { Photo } from "@/lib/photos";

/**
 * A search landing page: one h1, plain copy built only from facts the shop has confirmed, the opening hours, the reviews
 * line (no count) and links on to the range. Used by the craft beer, bottle shop and gift pages.
 */
export function Landing({ path, crumb, mono, h1, lede, sections, photo, hours = true, children }: {
  path: string;
  crumb: string;
  mono: string;
  h1: ReactNode;
  lede: ReactNode;
  sections: { h: string; body: ReactNode }[];
  photo: Photo;
  hours?: boolean;
  children?: ReactNode;
}) {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: crumb, path }])} />
      <main id="main">
        <section className="page-top compact">
          <div className="wrap">
            <p className="mono">{mono}</p>
            <h1 className="h2">{h1}</h1>
            <p className="lede">{lede}</p>
          </div>
        </section>
        <section className="cream walk" style={{ background: "var(--cream)" }}>
          <div className="wrap walk-grid">
            <div className="walk-copy">
              {sections.map((s) => (
                <div key={s.h}>
                  <h2 className="h3">{s.h}</h2>
                  {s.body}
                </div>
              ))}
              {children}
              {hours && (
                <>
                  <h2 className="h3">Opening hours</h2>
                  <Hours />
                </>
              )}
              <h2 className="h3">What people say</h2>
              <p>{GOOGLE_REVIEWS.headline}. <a href={GOOGLE_REVIEWS.reviewsUrl} target="_blank" rel="noopener noreferrer">Read the reviews</a> or <a href={GOOGLE_WRITE_REVIEW_URL} target="_blank" rel="noopener noreferrer">leave a review</a>.</p>
              <p className="faq-more">More: <a href="/beers">the beer range</a>, <a href="/draught-club">the Draught Club</a>, <a href="/faq">questions and answers</a>, <a href="/west-highland-way">for walkers on the West Highland Way</a>.</p>
              <p className="note-s">18+ only, please drink responsibly.</p>
            </div>
            <Frame className="walk-photo"><Image src={photo.file} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width: 900px) 100vw, 45vw" /></Frame>
          </div>
        </section>
      </main>
      <BasketBehaviour solid={true} />
    </>
  );
}
