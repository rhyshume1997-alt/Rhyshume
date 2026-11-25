import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";
import { Behaviour } from "@/components/Behaviour";
import { getCatalogue } from "@/lib/catalogue";
import { getPublicEvents } from "@/lib/events-store";
import { Frame } from "@/components/Frame";
import { Clip } from "@/components/Clip";
import { MEDIA } from "@/lib/media";
import { SHOP } from "@/lib/brand";

export const metadata = pageMeta({ title: "Events at the shop, Milngavie", description: "Events at Jack O’Beers and Deli, Milngavie, and how to get a ticket. We supplied the bar for 1,500 people at an England match screening at Ilkley Brewery.", path: "/events" });
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
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Events", path: "/events" }])} />
      <main id="main">
        <section className="page-top">
          <div className="wrap">
            <p className="mono">What&rsquo;s on</p>
            <h1 className="h2">Events at the shop, <em>and how to get a ticket.</em></h1>
          </div>
        </section>
        <section className="cream page-pad" style={{ background: "var(--cream)", paddingTop: "3rem" }}>
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
                      {ticketsOn && e.available && e.buy ? (
                        <a className="btn dk" href={e.buy}>Buy tickets</a>
                      ) : (
                        <button className="btn dk" type="button" disabled>Tickets open soon</button>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="ilkley">
              <div>
                <h2 className="h3">Jack O&rsquo;Beers at Ilkley Brewery</h2>
                <p>We supplied the bar for 1,500 people at an England match screening at Ilkley Brewery, Yorkshire.</p>
              </div>
              <Frame className="ilkley-frame"><Clip className="ilkley-video" width={720} height={1280} src={MEDIA.events.src} poster={MEDIA.events.poster} label="Video from the England match screening at Ilkley Brewery, Yorkshire, where Jack O’Beers supplied the bar for 1,500 people." /></Frame>
            </div>
            <div className="enquiry">
              <div>
                <h2 className="h3">Planning your own?</h2>
                <p>Tell us what you have in mind and we will get back to you.</p>
              </div>
              <a className="btn dk" href={`mailto:${SHOP.email}?subject=Event%20enquiry`}>Email an event enquiry</a>
            </div>
          </div>
        </section>
      </main>
      <Behaviour products={catalogue.products} solid={true} />
    </>
  );
}
