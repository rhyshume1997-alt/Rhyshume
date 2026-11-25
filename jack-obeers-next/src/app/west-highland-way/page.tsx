import Image from "next/image";
import { Behaviour } from "@/components/Behaviour";
import { BgVideo } from "@/components/BgVideo";
import { Hours } from "@/components/Hours";
import { JsonLd } from "@/components/JsonLd";
import { ALLOWED_PAIRINGS, getCatalogue } from "@/lib/catalogue";
import { breadcrumbSchema } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";
import { MEDIA } from "@/lib/media";
import { ADDRESS_LINE } from "@/lib/site";

export const metadata = pageMeta({
  title: "Bottle shop near West Highland Way",
  description: "Jack O’Beers and Deli, 13 Station Road, Milngavie, is near the start of the West Highland Way. Fresh draught beer in a bottle to take away, and deli food. Walkers welcome.",
  path: "/west-highland-way",
});

/** For walkers. Only facts the shop has confirmed. */
export default async function Page() {
  const catalogue = await getCatalogue();
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Walkers on the West Highland Way", path: "/west-highland-way" }])} />
      <main id="main">
        <section className="page-top walk-top">
          <div className="sec-bg walk-bg" aria-hidden="true"><BgVideo loop={MEDIA.walkIn} className="sec-video" /></div>
          <div className="wrap">
            <p className="mono">Walkers welcome</p>
            <h1 className="h2">Near the start of the <em>West Highland Way.</em></h1>
            <p className="lede">The West Highland Way starts in Milngavie. We are at {ADDRESS_LINE}, about 200 metres from the start, according to the West Highland Way listing. <span className="tbc">[Michael to confirm]</span></p>
          </div>
        </section>
        <section className="cream walk" style={{ background: "var(--cream)" }}>
          <div className="wrap walk-grid">
            <div className="walk-copy">
              <h2 className="h3">What to pick up</h2>
              <p>Fresh draught beer or cider in a 500ml or 1 litre bottle, filled for you from our 23 taps. Wine can be transferred into a 500ml or 1 litre bottle too.</p>
              <p>From the deli: {ALLOWED_PAIRINGS.map((x) => x.toLowerCase()).join(", ")}.</p>
              <h2 className="h3">How the bottles keep</h2>
              <p>We fill the bottle straight from the keg with no foam. A sealed bottle keeps for up to two weeks.</p>
              <h2 className="h3">Opening hours</h2>
              <Hours />
              <p>See <a href="/faq">questions and answers</a>, <a href="/beers">the beer range</a>, or <a href="https://www.google.com/maps/search/?api=1&query=Jack+O'Beers+%26+Deli,+13+Station+Road,+Milngavie,+G62+8PG" target="_blank" rel="noopener noreferrer">get directions<span className="vh"> (opens Google Maps)</span></a>.</p>
              <p className="note-s">18+ only, please drink responsibly.</p>
            </div>
            <Image className="walk-photo" src="/media/photos/window-walkers-welcome-1200.webp" alt="The 'Walkers Welcome' window with the Jack O'Beers bull" width={1200} height={1200} sizes="(max-width: 52rem) 100vw, 40vw" />
          </div>
        </section>
      </main>
      <Behaviour products={catalogue.products} solid={true} />
    </>
  );
}
