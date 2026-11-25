import { Behaviour } from "@/components/Behaviour";
import { getCatalogue } from "@/lib/catalogue";
import { SHOP } from "@/lib/brand";

export const metadata = { title: "About | Jack O’Beers & Deli" };

export default async function Page() {
  const catalogue = await getCatalogue();
  return (
    <>
      <main id="main">
        <section className="page-top">
          <div className="wrap">
            <p className="mono">About the shop</p>
            <h1 className="h2">
              Meet {SHOP.owners[0]} and {SHOP.owners[1]}, <em>and the shop.</em>
            </h1>
          </div>
        </section>
        <section className="cream about" style={{ background: "var(--cream)" }}>
          <div className="wrap">
            <div className="about-people">
              <figure className="arch-slot" role="img" aria-label={`Photo of ${SHOP.owners[0]} to be supplied`}>
                <span>Photo coming soon<br />{SHOP.owners[0]}</span>
              </figure>
              <figure className="arch-slot" role="img" aria-label={`Photo of ${SHOP.owners[1]} to be supplied`}>
                <span>Photo coming soon<br />{SHOP.owners[1]}</span>
              </figure>
            </div>
            <div className="about-copy">
              <p className="lede">
                {SHOP.owners[0]} and {SHOP.owners[1]} own Jack O’Beers &amp; Deli, an independent British drinks shop and deli at {SHOP.address[0]}, {SHOP.address[1]}.
              </p>
              <p>
                <span className="tbc">Their story, in their own words, to be supplied</span>
              </p>
              <h2 className="h3">Hear it from them</h2>
              <div className="video-slot" role="img" aria-label="Video of the owners to be supplied">
                <span>Video coming soon<br />Who they are and what they do</span>
              </div>
              <p className="note-s">When the video is ready it will have captions and a written version underneath.</p>
              <h2 className="h3">Come and say hello</h2>
              <p>
                {SHOP.address.join(", ")}.<br />
                Open {SHOP.hours}. Tuesday: <span className="tbc">to be confirmed</span>
              </p>
              <p>
                <a className="btn" href="https://www.google.com/maps/search/?api=1&query=Jack+O'Beers+%26+Deli,+13+Station+Road,+Milngavie,+G62+8PG" target="_blank" rel="noopener noreferrer">
                  Get directions<span className="vh"> (opens Google Maps)</span>
                </a>{" "}
                <a className="btn ghost on-cream" href={`mailto:${SHOP.email}`} style={{ color: "var(--ink)" }}>Email the shop</a>
              </p>
            </div>
          </div>
        </section>
      </main>
      <Behaviour products={catalogue.products} solid={true} />
    </>
  );
}
