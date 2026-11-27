/**
 * Christmas decoration for the homepage hero. All of it is hidden unless <html data-xmas="on"> (see lib/season.ts), so in
 * the other eleven months it adds nothing to the page. Evergreen garland across the top, warm fairy lights, a few quiet
 * stars and a little snow. It is decoration only: hidden from assistive technology, never catches a click, and sits
 * behind the headline. The motion is a slow twinkle and a slow fall, and both stop with reduced motion.
 */
export function XmasDecor() {
  const bulbs = ["#e8b13c", "#d8453f", "#f7dc8a", "#4f9a5c", "#e8b13c", "#d8453f", "#f7dc8a", "#4f9a5c"];
  return (
    <div className="xdecor" aria-hidden="true">
      <svg className="xgarland" viewBox="0 0 1200 70" preserveAspectRatio="none" focusable="false">
        <path d="M0 6 Q 150 64 300 14 T 600 14 T 900 14 T 1200 8" fill="none" stroke="#1f5a34" strokeWidth="14" strokeLinecap="round" />
        <path d="M0 8 Q 150 58 300 16 T 600 16 T 900 16 T 1200 10" fill="none" stroke="#2f7a46" strokeWidth="5" strokeLinecap="round" strokeDasharray="3 9" />
      </svg>
      <ul className="xlights">
        {Array.from({ length: 24 }, (_, i) => (
          <li key={i} style={{ ["--c" as string]: bulbs[i % bulbs.length], ["--d" as string]: `${(i % 6) * 0.45}s` }} />
        ))}
      </ul>
      <span className="xstar xs1" />
      <span className="xstar xs2" />
      <span className="xstar xs3" />
      <div className="xsnow" />
    </div>
  );
}

/** The small headline above the hero heading. */
export function XmasKicker() {
  return <p className="xkicker">Christmas at Jack O&rsquo;Beers</p>;
}
