import { GOOGLE_REVIEWS as G, GOOGLE_WRITE_REVIEW_URL } from "@/lib/site";

/**
 * A short section for Google reviews. It says "5 star reviews on Google" and nothing more about the numbers: no count,
 * no quotes. One link goes to the reviews, one button goes to leave a review.
 */
export function GoogleReviews() {
  return (
    <section className="greviews" aria-labelledby="gr-h">
      <div className="wrap">
        <span className="proof-stars" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <svg key={i} viewBox="0 0 20 20" width="22" height="22" focusable="false"><path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8z" fill="#d9992b" /></svg>
          ))}
        </span>
        <h2 className="h3" id="gr-h">{G.headline}</h2>
        <p className="gr-actions">
          <a className="pg-btn soft" href={G.reviewsUrl} target="_blank" rel="noopener noreferrer">Read the reviews<span className="vh"> on Google (opens Google)</span></a>
          <a className="pg-btn solid" href={GOOGLE_WRITE_REVIEW_URL} target="_blank" rel="noopener noreferrer">Leave a review<span className="vh"> on Google (opens Google)</span></a>
        </p>
      </div>
    </section>
  );
}
