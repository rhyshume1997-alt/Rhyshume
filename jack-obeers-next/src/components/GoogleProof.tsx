import { GOOGLE_PROOF as G } from "@/lib/site";

/** A slim strip of numbers from the Google listing: stars, rating, review count, and the date they were checked. */
export function GoogleProof() {
  return (
    <div className="proof-wrap">
      <a className="proof" href={G.url} target="_blank" rel="noopener noreferrer">
        <span className="proof-stars" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <svg key={i} viewBox="0 0 20 20" width="18" height="18" focusable="false"><path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8z" fill="#d9992b" /></svg>
          ))}
        </span>
        <b>{G.rating.toFixed(1)}</b>
        <span>from {G.reviews} Google reviews</span>
        <small>Checked {G.checked}</small>
        <span className="vh"> (opens Google)</span>
      </a>
    </div>
  );
}
