import { Behaviour } from "@/components/Behaviour";
import { getCatalogue } from "@/lib/catalogue";
import { authStatus, getOwner } from "@/lib/auth";
import { eventsBackend, listOwnerEvents } from "@/lib/events-store";
import { deleteEvent, logout } from "./actions";
import { turnstileSiteKey } from "@/lib/turnstile";
import { EventForm, LoginForm } from "./forms";

export const metadata = { title: "Owners | Jack O’Beers & Deli", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function when(date: string, time: string): string {
  const d = new Date(date + "T12:00:00");
  const day = Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return time ? `${day}, ${time}` : day;
}

export default async function Page() {
  const catalogue = await getCatalogue();
  const owner = await getOwner();
  const status = authStatus();
  const backend = eventsBackend();
  const events = owner ? await listOwnerEvents() : [];
  return (
    <>
      <main id="main">
        <section className="page-top">
          <div className="wrap">
            <p className="mono">For Michael and Tanya</p>
            <h1 className="h2">Owners. <em>Add and remove events.</em></h1>
          </div>
        </section>
        <section className="cream" style={{ background: "var(--cream)", paddingTop: "4rem" }}>
          <div className="wrap own">
            {!owner ? (
              status.ready ? (
                <>
                  <h2 className="h3">Sign in</h2>
                  <LoginForm siteKey={turnstileSiteKey()} />
                </>
              ) : (
                <p className="lede">Owner sign-in is not set up yet. <span className="tbc">Logins to be created</span></p>
              )
            ) : (
              <>
                <div className="own-bar">
                  Signed in as <b>{owner.name}</b>
                  {owner.demo && <span className="tbc">demo login</span>}
                  <form action={logout} style={{ display: "inline" }}><button className="btn ghost on-cream sm" style={{ color: "var(--ink)" }} type="submit">Sign out</button></form>
                </div>
                {backend === "mock" && (
                  <p className="own-warn"><b>Practice mode.</b> Events added here are not in Shopify and disappear when the site restarts. They do show on the Events page so you can see how it looks.</p>
                )}
                <h2 className="h3">Add an event</h2>
                <EventForm siteKey={turnstileSiteKey()} />
                <h2 className="h3" style={{ marginTop: "2.5rem" }}>Events now</h2>
                {events.length === 0 ? (
                  <p>No events yet.</p>
                ) : (
                  <ul className="own-list">
                    {events.map((e) => (
                      <li key={e.id}>
                        <div>
                          <b>{e.title}</b>
                          <br />
                          <small>{when(e.date, e.time)} · {e.price > 0 ? `£${e.price.toFixed(2)} a ticket` : "free"}</small>
                        </div>
                        <details>
                          <summary>Delete</summary>
                          <form action={deleteEvent}>
                            <input type="hidden" name="id" value={e.id} />
                            <p>Delete &ldquo;{e.title}&rdquo;? It comes off the website straight away.</p>
                            <button className="btn dk sm" type="submit">Yes, delete it</button>
                          </form>
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Behaviour products={catalogue.products} solid={true} />
    </>
  );
}
