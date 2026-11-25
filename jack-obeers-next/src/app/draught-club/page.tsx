import { Behaviour } from "@/components/Behaviour";
import { getCatalogue } from "@/lib/catalogue";

export const metadata = { title: "The Draught Club | Jack O’Beers & Deli" };

/**
 * Tiers, from the shop's Draught Club leaflet. The shop has dropped The Local, so there are two tiers.
 * The four benefits that were in The Local are listed in both cards, so people can see what each upgrade adds.
 * `up: true` marks what The Legend adds on top of The Regular.
 */
type Perk = { text: string; up?: boolean; from?: string };

const LOCAL: Perk[] = [
  { text: "10% off all fills" },
  { text: "Access to the Beer Club Tap" },
  { text: "Members-only beers" },
  { text: "Priority access to events (Meet the Brewer and more)" },
];

const TIERS: { name: string; price: string; icon: string; perks: Perk[] }[] = [
  {
    name: "The Regular",
    price: "£24.99",
    icon: "🍻",
    perks: [...LOCAL, { text: "3 × 500ml beers included each month" }, { text: "Early access to limited kegs" }],
  },
  {
    name: "The Legend",
    price: "£39.99",
    icon: "🔥",
    perks: [
      ...LOCAL,
      { text: "Early access to limited kegs", from: "The Regular" },
      { text: "5 × 500ml beers included each month (3 in The Regular)", up: true },
      { text: "Free ticket to selected events", up: true },
      { text: "Deli perks and selected freebies", up: true },
    ],
  },
];

export default async function Page() {
  const catalogue = await getCatalogue();
  return (
    <>
      <main id="main">
        <section className="page-top">
          <div className="wrap">
            <p className="mono">Membership</p>
            <h1 className="h2">The Draught Club. <em>Fresh beer from the tap, bottled for you.</em></h1>
          </div>
        </section>
        <section className="cream" style={{ background: "var(--cream)", paddingTop: "4rem" }}>
          <div className="wrap">
            <p className="lede">Two ways to join. The Legend includes everything in The Regular. What The Legend adds is marked <b>New</b>.</p>
            <div className="tiers">
              {TIERS.map((t) => (
                <article key={t.name} className="hcard tier">
                  <p className="mono"><span aria-hidden="true">{t.icon} </span>Monthly membership</p>
                  <h2 className="h3">{t.name}</h2>
                  <p className="tier-price"><b>{t.price}</b> <span>a month</span></p>
                  <ul className="tier-list">
                    {t.perks.map((p) => (
                      <li key={p.text} className={p.up ? "up" : "inc"}>
                        {p.up && <span className="new">New</span>}
                        {p.text}
                        {p.from && <small> from {p.from}</small>}
                      </li>
                    ))}
                  </ul>
                  <p><button className="btn dk" type="button" disabled>Joining opens soon</button></p>
                </article>
              ))}
            </div>
            <p className="tier-foot"><b>Fresh bottle. Fresh fill. Every time.</b> No oxygen. No foam. Just proper draught beer. Includes a fresh bottle with every fill.</p>
            <p className="note-s">You must be 18 or over to join. How joining and paying each month will work, and when it opens, <span className="tbc">to be confirmed</span>. Nothing can be bought yet.</p>
          </div>
        </section>
      </main>
      <Behaviour products={catalogue.products} solid={true} />
    </>
  );
}
