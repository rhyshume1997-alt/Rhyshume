import { Behaviour } from "@/components/Behaviour";
import { getCatalogue } from "@/lib/catalogue";

export const metadata = { title: "The Draft Club | Jack O’Beers & Deli" };

const TIERS = ["Tier one", "Tier two"];

export default async function Page() {
  const catalogue = await getCatalogue();
  return (
    <>
      <main id="main">
        <section className="page-top">
          <div className="wrap">
            <p className="mono">Membership</p>
            <h1 className="h2">The Draft Club, <em>for regulars.</em></h1>
          </div>
        </section>
        <section className="cream" style={{ background: "var(--cream)" }}>
          <div className="wrap">
            <p className="lede">Two ways to join. What each tier gets, and the price, <span className="tbc">to be confirmed by the shop</span>. Nothing can be bought yet.</p>
            <div className="tiers">
              {TIERS.map((t) => (
                <article key={t} className="hcard tier">
                  <p className="mono">{t}</p>
                  <h2 className="h3"><span className="tbc">Name to be confirmed</span></h2>
                  <p className="price"><span className="tbc">price to be confirmed</span></p>
                  <ul>
                    <li><span className="tbc">what members get, to be supplied</span></li>
                  </ul>
                  <p><button className="btn dk" type="button" disabled>Joining opens soon</button></p>
                </article>
              ))}
            </div>
            <p className="note-s">Members will sign in with a Shopify customer account. Special access depends on what the shop decides each tier includes.</p>
          </div>
        </section>
      </main>
      <Behaviour products={catalogue.products} solid={true} />
    </>
  );
}
