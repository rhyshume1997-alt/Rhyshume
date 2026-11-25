import { OpenNow } from "@/components/OpenNow";
import { ADDRESS } from "@/lib/site";

/**
 * "Behind the Counter" opening. The real tap wall is the picture. The headline sits to the left on dark mahogany and
 * deep green, the original logo sits on a cream sign that straddles the edge of the cream shop below, and an amber
 * line (see .bh-line in the shelf) runs from here into the shelf. On a phone the wall is framed on the numbered taps
 * and the headline sits over the lower part of the picture, so nothing is empty and Shop drinks is in the first screen.
 * Only rendered on previews.
 */
export function BehindHero() {
  return (
    <section className="bh-hero" aria-label="Welcome">
      <div className="bh-photo" aria-hidden="true">
        <picture>
          <source media="(min-width: 54rem)" srcSet="/media/photos/tap-wall-wide-2400.webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/photos/tap-wall-wide-1200.webp" alt="" width={1200} height={900} fetchPriority="high" decoding="async" />
        </picture>
        <div className="bh-wash" />
      </div>
      <div className="bh-in">
        <div className="bh-copy">
          <OpenNow variant="hero" />
          <h1 className="bh-h1">Welcome, <em>come on in.</em></h1>
          <p className="bh-lede">Independent British drink shop in Milngavie. Come in, have a look along the shelf, and take something good home to enjoy.</p>
          <div className="bh-cta">
            <a className="btn" href="#shelf">Shop drinks</a>
            <a className="btn ghost" href="#find">Find us</a>
          </div>
        </div>
        <a className="bh-sign" href="/" aria-label={`Jack O’Beers and Deli, ${ADDRESS.street}, ${ADDRESS.town}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/jack-logo.png" alt="Jack O’Beers and Deli: Jack the bull with a barrel" width={244} height={258} />
        </a>
      </div>
    </section>
  );
}
