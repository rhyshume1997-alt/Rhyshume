import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";
import { BasketBehaviour } from "@/components/BasketBehaviour";
import taps from "@/data/taps.json";

export const metadata = pageMeta({ title: "On tap at Jack O’Beers and Deli, Milngavie", description: "What is on the taps at Jack O’Beers and Deli in Milngavie: name, style, ABV and price for a 250ml or 500ml pour, from the shop’s tap guide.", path: "/on-tap" });

type Tap = { brewery: string; name: string; style: string; abv: number; p250: number | null; p500: number | null; desc: string };
const money = (n: number) => `£${n.toFixed(2)}`;

/**
 * Michael's tap guide of 27 November 2026, as supplied. Drinks that are still unconfirmed in the guide (an unnamed tap, a changed
 * name, an ABV that disagrees with Shopify, the frizzante and the spritz) are left out until he confirms them. Allergen notes in the guide
 * are marked "check keg", so they are not published here. This list is read-only: nothing on it can be added to the basket.
 */
export default function Page() {
  const list = taps as Tap[];
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "On tap", path: "/on-tap" }])} />
      <main id="main">
        <section className="page-top compact">
          <div className="wrap">
            <p className="mono">On the taps</p>
            <h1 className="h2">On tap, <em>poured fresh.</em></h1>
          </div>
        </section>
        <section className="cream pg-sec" style={{ background: "var(--cream)" }}>
          <div className="wrap pg-wrap">
            <p className="lede">From our tap guide of 27 November 2026. Taps change, so ask in the shop for what is on today. Please ask a member of the team about allergens before you order.</p>
            <ul className="pg-grid">
              {list.map((t) => (
                <li key={t.name} className="pg-card" data-cat="beer">
                  <div className="pg-top">
                    <div className="pg-text">
                      <h2 className="pg-name">{t.name}</h2>
                      {t.brewery && <p className="pg-brew">{t.brewery}</p>}
                      <p className="pg-meta">
                        <span>{t.abv}% ABV</span>
                        {t.style && <span>{t.style}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="pg-buy">
                    <span className="pg-price">
                      {t.p250 !== null && <span>{money(t.p250)} for 250ml</span>}
                      {t.p250 !== null && t.p500 !== null && " · "}
                      {t.p500 !== null && <span>{money(t.p500)} for 500ml</span>}
                    </span>
                  </div>
                  <p>{t.desc}</p>
                </li>
              ))}
            </ul>
            <p className="note-s">18+ only, please drink responsibly. Photo ID may be asked for when you collect or take delivery.</p>
          </div>
        </section>
      </main>
      <BasketBehaviour solid={true} />
    </>
  );
}
