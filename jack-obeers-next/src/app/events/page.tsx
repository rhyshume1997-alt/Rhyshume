import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";
import { BasketBehaviour } from "@/components/BasketBehaviour";
import { forBasket, getCatalogue } from "@/lib/catalogue";
import { getPublicEvents } from "@/lib/events-store";
import { Frame } from "@/components/Frame";
import { Clip } from "@/components/Clip";
import { MEDIA } from "@/lib/media";
import { NewsletterForm } from "@/components/NewsletterForm";
import { turnstileSiteKey } from "@/lib/turnstile";
import { SHOP } from "@/lib/brand";
import { AddToBasket } from "@/components/AddToBasket";
import { stockOf } from "@/lib/cards";

export const metadata = pageMeta({ title: "Events at the shop, Milngavie", description: "Events at Jack O’Beers and Deli, Milngavie, and how to get a ticket. We supplied the bar for 1,500 people at an England match screening at Ilkley Brewery.", path: "/events" });
export const dynamic = "force-dynamic";

function when(date: string | null, time: string | null): string {
  if (!date) return "";
  const d = new Date(date + "T12:00:00");
  const day = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return time ? `${day}, ${time}` : day;
}

export default async function Page() {
  const [catalogue, ev] = await Promise.all([getCatalogue(), getPublicEvents()]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = ev.events.filter((e) => !e.sample && e.date && e.date >= today).sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  const basketHandles = new Set(forBasket(catalogue.all).map((p) => p.handle));
  const stockByHandle = new Map(forBasket(catalogue.all).map((p) => [p.handle, stockOf(p)] as const));
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
              <div className="events-empty">
                <h2 className="h3">Events coming soon</h2>
                <p>Join the newsletter and we will tell you when the next one is on.</p>
                <NewsletterForm id="nl-events" siteKey={turnstileSiteKey()} />
              </div>
            ) : (
              <ul className="events">
                {upcoming.map((e) => (
                  <li key={e.handle} className="hcard event">
                    <p className="mono">Event</p>
                    <h2 className="h3">{e.title}</h2>
                    <p className="when">{when(e.date, e.time)}</p>
                    {e.description && <p>{e.description}</p>}
                    {e.price > 0 && <p className="price">{`£${e.price.toFixed(2)} a ticket`}</p>}
                    <p className="hamper-btns">
                      {basketHandles.has(e.handle) && e.available && <AddToBasket handle={e.handle} name={e.title} stock={stockByHandle.get(e.handle) ?? null} />}
                      {ticketsOn && e.available && e.buy ? <button type="button" className="btn dk" data-buy={e.handle}>Buy tickets</button> : null}
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
      <BasketBehaviour solid={true} />
    </>
  );
}
