/**
 * Christmas decoration for the homepage hero. All of it is hidden unless <html data-xmas="on"> (see lib/season.ts), so in
 * the other eleven months it adds nothing to the page and the pictures are never downloaded (lazy images that are not displayed).
 * A garland with fairy lights across the top, a sparkle-and-snowflake layer, and a holly corner. Decoration only: hidden from
 * assistive technology, never catches a click, and sits behind the headline. The sparkle layer drifts very slowly and stops
 * with reduced motion.
 */
export function XmasDecor() {
  return (
    <div className="xdecor" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="xgarland" src="/media/christmas-garland.png" alt="" width={1200} height={200} loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="xsparkle" src="/media/christmas-sparkles.png" alt="" width={1200} height={675} loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="xcorner xcorner-hero" src="/media/christmas-corner.png" alt="" width={560} height={560} loading="lazy" decoding="async" />
    </div>
  );
}

/** A holly corner for the two permanent sections, in the Christmas season only. */
export function XmasCorner() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="xcorner xcorner-sec" src="/media/christmas-corner.png" alt="" aria-hidden="true" width={560} height={560} loading="lazy" decoding="async" />;
}

/** The small headline above the hero heading. */
export function XmasKicker() {
  return <p className="xkicker">Christmas at Jack O&rsquo;Beers</p>;
}
