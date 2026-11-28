/**
 * Christmas decoration for the homepage hero. All of it is hidden unless <html data-xmas="on"> (see lib/season.ts), so in
 * the other eleven months it adds nothing to the page and the pictures are never downloaded (lazy images that are not displayed).
 * A light evergreen corner, a few gold sparkles and snowflakes, and a decorated tree standing near the hero edge on wide screens. Decoration only: hidden from
 * assistive technology, never catches a click, and sits behind the headline. The sparkles drift very slowly and stops
 * with reduced motion.
 */
export function XmasDecor() {
  return (
    <div className="xdecor" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="xsparkle" src="/media/christmas-sparkles.webp" alt="" width={1000} height={663} loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="xcorner xcorner-hero" src="/media/christmas-corner.webp" alt="" width={760} height={629} loading="lazy" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="xtree xtree-hero" src="/media/christmas-tree.webp" alt="" width={420} height={716} loading="lazy" decoding="async" />
    </div>
  );
}

/** Small evergreen and holly arrangements for the two permanent sections, in the Christmas season only. */
export function XmasSectionDecor({ kind }: { kind: "corner" | "sprig" }) {
  const src = kind === "corner" ? "/media/christmas-corner.webp" : "/media/christmas-sprig.webp";
  const [w, h] = kind === "corner" ? [760, 629] : [560, 316];
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`xcorner xsec-${kind}`} src={src} alt="" aria-hidden="true" width={w} height={h} loading="lazy" decoding="async" />;
}

/** The small headline above the hero heading. */
export function XmasKicker() {
  return <p className="xkicker">Christmas at Jack O&rsquo;Beers</p>;
}
