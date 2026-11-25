import { Behaviour } from "@/components/Behaviour";
import { getCatalogue } from "@/lib/catalogue";
import { getPublicEvents } from "@/lib/events-store";
import { SHOP } from "@/lib/brand";

export const metadata = { title: "Events | Jack O’Beers & Deli" };
export const dynamic = "force-dynamic";

function when(date: string | null, time: string | null): string {
  if (!date) return "Date to be confirmed";
  const d = new Date(date + "T12:00:00");
  const day = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return time ? `${day}, ${time}` : day;
}

export default async function Page() {
  const [catalogue, ev] = await Promise.all([getCatalogue(), getPublicEvents()]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = ev.events.filter((e) => !e.date || e.date >= today).sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const ticketsOn = process.env.CHECKOUT_ENABLED === "true";
  return (
    <>
      <main id="main">
        <section className="page-top">
          <div className="wrap">
            <p className="mono">What&rsquo;s on</p>
            <h1 className="h2">Events at the shop, <em>and how to get a ticket.</em></h1>
          </div>
        </section>
        <section className="cream" style={{ background: "var(--cream)", paddingTop: "4rem" }}>
          <div className="wrap">
            {upcoming.length === 0 ? (
              <p className="lede">No events are listed right now. Check back soon, or ask about a private event below.</p>
            ) : (
              <ul className="events">
                {upcoming.map((e) => (
                  <li key={e.handle} className="hcard event">
                    <p className="mono">{e.sample ? "Sample event" : "Event"}</p>
                    <h2 className="h3">{e.title}</h2>
                    <p className="when">{when(e.date, e.time)}</p>
                    {e.description && <p>{e.description}</p>}
                    <p className="price">{e.price > 0 ? `£${e.price.toFixed(2)} a ticket` : <span className="tbc">price to be confirmed</span>}</p>
                    <p>
                      <button className="btn dk" type="button" disabled>
                        {ticketsOn && e.available ? "Buy tickets" : "Tickets open soon"}
                      </button>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <h2 className="h3" style={{ marginTop: "2.5rem" }}>Planning your own?</h2>
            <p>Tell us what you have in mind and we will get back to you.</p>
            <p>
              <a className="btn ghost on-cream" style={{ color: "var(--ink)" }} href={`mailto:${SHOP.email}?subject=Event%20enquiry`}>Email an event enquiry</a>
            </p>
          </div>
        </section>
      </main>
      <Behaviour products={catalogue.products} solid={true} />
    </>
  );
}
