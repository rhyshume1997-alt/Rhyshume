import { BasketBehaviour } from "@/components/BasketBehaviour";
import { getCatalogue } from "@/lib/catalogue";
import { demoOn, getMember, type Tier } from "@/lib/members";
import { SpamGuard } from "@/components/SpamGuard";
import { MESSAGES, turnstileSiteKey } from "@/lib/turnstile";
import { demoSignIn, memberSignOut } from "./actions";

export const metadata = { title: "Members", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Section = { title: string; min: Tier; text: string };

/** What each part of the members area needs. The words are placeholders until the shop supplies the real details. */
const SECTIONS: Section[] = [
  { title: "Members-only beers", min: "regular", text: "The beers only members can buy" },
  { title: "The Beer Club Tap", min: "regular", text: "What is on the Beer Club Tap" },
  { title: "Events, first in line", min: "regular", text: "Priority booking, including Meet the Brewer" },
  { title: "Limited kegs, early access", min: "regular", text: "Kegs members can reserve before everyone else" },
  { title: "Your monthly beers", min: "regular", text: "Your 500ml beers for this month" },
  { title: "Free event tickets", min: "legend", text: "Selected events with a free ticket for Legends" },
  { title: "Deli perks and freebies", min: "legend", text: "Deli perks and selected freebies" },
];

const rank: Record<Tier, number> = { regular: 1, legend: 2 };

export default async function Page({ searchParams }: { searchParams: Promise<{ check?: string }> }) {
  const check = (await searchParams).check === "failed";
  const catalogue = await getCatalogue();
  const member = await getMember();
  return (
    <>
      <main id="main">
        <section className="page-top">
          <div className="wrap">
            <p className="mono">Draught Club</p>
            <h1 className="h2">Members. <em>Your side of the bar.</em></h1>
          </div>
        </section>
        <section className="cream" style={{ background: "var(--cream)", paddingTop: "4rem" }}>
          <div className="wrap own">
            {!member ? (
              <>
                <h2 className="h3">Sign in</h2>
                <p className="lede">This is the members&rsquo; area for the Draught Club.</p>
                <p>Not a member yet? <a href="/draught-club">See the two memberships</a>.</p>
                {demoOn() && (
                  <form action={demoSignIn} className="own-warn">
                    <p><b>Preview only.</b> Try the page as a member:</p>
                    <SpamGuard siteKey={turnstileSiteKey()} />
                    {check && <p role="alert" className="own-err">{MESSAGES.failed}</p>}
                    <button className="btn ghost on-cream sm" style={{ color: "var(--ink)" }} name="tier" value="regular">As The Regular</button>{" "}
                    <button className="btn ghost on-cream sm" style={{ color: "var(--ink)" }} name="tier" value="legend">As The Legend</button>
                  </form>
                )}
              </>
            ) : (
              <>
                <div className="own-bar">
                  Welcome, <b>{member.name}</b> <b>{member.tier === "legend" ? "The Legend" : "The Regular"}</b>
                  <form action={memberSignOut} style={{ display: "inline" }}><button className="btn ghost on-cream sm" style={{ color: "var(--ink)" }} type="submit">Sign out</button></form>
                </div>
                <ul className="mem-grid">
                  {SECTIONS.map((s) => {
                    const open = rank[member.tier] >= rank[s.min];
                    return (
                      <li key={s.title} className={"hcard " + (open ? "" : "locked")}>
                        <h2 className="h3">{s.title}</h2>
                        {open ? null : (
                          <p>Included with <b>The Legend</b>. <a href="/draught-club">See what it adds</a>.</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </section>
      </main>
      <BasketBehaviour solid={true} />
    </>
  );
}
