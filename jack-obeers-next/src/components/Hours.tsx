import { HOURS, LINKS } from "@/lib/brand";

/**
 * The opening hours as a list, Tuesday shown as closed. The hours are the shop's own details; the link goes to the
 * shop's Google listing, which is where today's hours (and any bank holiday changes) should be checked.
 */
export function Hours({ className = "" }: { className?: string }) {
  return (
    <div className={`hours ${className}`.trim()}>
      <ul className="hours-list" aria-label="Opening hours">
        {HOURS.map((h) => (
          <li key={h.day} className={h.open ? "" : "is-closed"}>
            <span>{h.day}</span>
            <b>{h.open ?? "Closed"}</b>
          </li>
        ))}
      </ul>
      <p className="hours-note">
        <a href={LINKS.google} target="_blank" rel="noopener noreferrer">Check today&rsquo;s hours on Google<span className="vh"> (opens Google)</span></a>
      </p>
    </div>
  );
}
