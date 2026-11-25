import Image from "next/image";
import { AboutSection } from "@/components/AboutSection";
import { BasketBehaviour } from "@/components/BasketBehaviour";
import { Frame } from "@/components/Frame";
import { Hours } from "@/components/Hours";
import { JsonLd } from "@/components/JsonLd";
import { forBasket, getCatalogue } from "@/lib/catalogue";
import { MICHAEL_AT_THE_FRIDGES, MICHAEL_OUTSIDE } from "@/lib/photos";
import { breadcrumbSchema } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";
import { DIRECTIONS_URL, EMAIL, ADDRESS_LINE } from "@/lib/site";
import { SHOP } from "@/lib/brand";

export const metadata = pageMeta({
  title: "About us, Michael and Tanya",
  description: "Michael Blakely and his wife run Jack O’Beers and Deli at 13 Station Road, Milngavie. 23 taps, the best of British produce, events and a sit-in deli menu.",
  path: "/about",
});

export default async function Page() {
  const catalogue = await getCatalogue();
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "About us", path: "/about" }])} />
      <main id="main">
        <section className="page-top">
          <div className="wrap">
            <p className="mono">About the shop</p>
            <h1 className="h2">Meet {SHOP.owners[0]} and {SHOP.owners[1]}, <em>and the shop.</em></h1>
          </div>
        </section>
        <AboutSection standalone />
        <section className="cream about-more" style={{ background: "var(--cream)" }}>
          <div className="wrap">
            <ul className="photo-strip" aria-label="Michael in the shop">
              {[MICHAEL_OUTSIDE, MICHAEL_AT_THE_FRIDGES].map((p) => (
                <li key={p.file}>
                  <Frame><Image src={p.file} alt={p.alt} width={p.width} height={p.height} sizes="(max-width: 40rem) 100vw, 50vw" /></Frame>
                </li>
              ))}
            </ul>
            <h2 className="h3" style={{ marginTop: "2rem" }}>Come and say hello</h2>
            <p>{ADDRESS_LINE}.</p>
            <Hours />
            <p style={{ marginTop: "1rem" }}>
              <a className="btn" href={DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">Get directions<span className="vh"> (opens Google Maps)</span></a>{" "}
              <a className="btn ghost on-cream" href={`mailto:${EMAIL}`} style={{ color: "var(--ink)" }}>Email the shop</a>
            </p>
          </div>
        </section>
      </main>
      <BasketBehaviour solid={true} />
    </>
  );
}
