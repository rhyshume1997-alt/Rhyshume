"use client";
import { useEffect, useState } from "react";
import { londonDate, londonWeek, weekLabel, prettyDate } from "@/lib/london";
import { XmasSectionDecor } from "@/components/XmasDecor";
import { inWeek, type WeeklyUpdate } from "@/lib/weekly";

/**
 * The two permanent homepage sections, "What's Happening This Week" and "Events". They show all year; nothing here
 * depends on the Christmas dates. Both depend on today's date in London, and the pages are cached, so the server
 * passes the date it rendered with (identical first render, no hydration mismatch) and the browser then moves on to the
 * real London date, re-checking every 30 seconds so a page left open over Sunday midnight rolls into the new week.
 */
function useToday(serverToday: string): string {
  const [today, setToday] = useState(serverToday);
  useEffect(() => {
    const tick = () => setToday(londonDate());
    tick();
    const t = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, []);
  return today;
}

export type HomeEvent = { handle: string; title: string; description: string; image: string | null; price: number; date: string; time: string | null };

const whenOf = (date: string, time: string | null) => (time ? `${prettyDate(date)}, ${time}` : prettyDate(date));

export function ThisWeek({ updates, events, serverToday }: { updates: WeeklyUpdate[]; events: HomeEvent[]; serverToday: string }) {
  const today = useToday(serverToday);
  const wk = londonWeek(today);
  const shown = updates.filter((u) => inWeek(u, today));
  const onThisWeek = events.filter((e) => e.date >= wk.start && e.date <= wk.end && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <section className="week" id="this-week" aria-labelledby="week-h">
      <XmasSectionDecor kind="corner" />
      <div className="wrap">
        <p className="mono" data-week-range="">{weekLabel(wk)}</p>
        <h2 className="h2" id="week-h">What&rsquo;s Happening This Week</h2>
        {shown.length > 0 ? (
          <ul className="week-list">
            {shown.map((u) => (
              <li key={u.id} className="week-card">
                {u.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={u.image} alt={u.imageAlt} width={160} height={160} loading="lazy" decoding="async" />}
                <div>
                  {u.label && <span className="week-tag">{u.label}</span>}
                  <h3>{u.title}</h3>
                  {u.text && <p>{u.text}</p>}
                  {u.link && <a className="week-link" href={u.link.href}>{u.link.label} <span aria-hidden="true">&rarr;</span></a>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="week-empty">Nothing new to report this week. Pop in for a look along the shelf, or see what is coming up under Events.</p>
        )}
        {onThisWeek.length > 0 && (
          <p className="week-events"><span className="week-tag">On this week</span> {onThisWeek.map((e, i) => (
            <span key={e.handle}>{i > 0 && ", "}<a href={`/events#${e.handle}`}>{e.title}</a> ({prettyDate(e.date).split(" ").slice(0, 2).join(" ")}{e.time ? `, ${e.time}` : ""})</span>
          ))}</p>
        )}
      </div>
    </section>
  );
}

export function EventsSection({ events, serverToday }: { events: HomeEvent[]; serverToday: string }) {
  const today = useToday(serverToday);
  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "")).slice(0, 3);
  return (
    <section className="evsec" id="events-home" aria-labelledby="evsec-h">
      <XmasSectionDecor kind="sprig" />
      <div className="wrap">
        <p className="mono">At the shop</p>
        <h2 className="h2" id="evsec-h">Events</h2>
        {upcoming.length > 0 ? (
          <ul className="evsec-list">
            {upcoming.map((e) => (
              <li key={e.handle} className="evsec-card">
                {e.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={e.image} alt="" width={320} height={200} loading="lazy" decoding="async" />}
                <div className="evsec-body">
                  <p className="evsec-when">{whenOf(e.date, e.time)}</p>
                  <h3>{e.title}</h3>
                  {e.description && <p className="evsec-desc">{e.description}</p>}
                  {e.price > 0 && <p className="evsec-price">{`£${e.price.toFixed(2)} a ticket`}</p>}
                  <a className="btn dk" href={`/events#${e.handle}`}>View details<span className="sr-only"> for {e.title}</span></a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="week-empty">No events are booked in just now. Join the newsletter on the Events page and we will tell you when the next one is on.</p>
        )}
        <p className="evsec-all"><a className="btn ghost" href="/events">View All Events</a></p>
      </div>
    </section>
  );
}
