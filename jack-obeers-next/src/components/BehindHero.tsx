import { OpenNow } from "@/components/OpenNow";
import { ADDRESS } from "@/lib/site";
import { XmasDecor, XmasKicker } from "@/components/XmasDecor";

/**
 * "Behind the Counter" opening. The real tap wall is the picture. The headline sits to the left on dark mahogany and
 * deep green, the supplied transparent logo sits on the photograph (desktop) or the supplied vector logo on a cream sign (phone), and an amber
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
      <XmasDecor />
      <div className="bh-in">
        <div className="bh-copy">
          <XmasKicker />
          <OpenNow variant="hero" />
          <h1 className="bh-h1"><span className="bh-l1">Welcome,</span> <span className="bh-l2">come on in<i className="bh-dot">.</i></span></h1>
          <p className="bh-lede">Independent British drink shop in Milngavie. Come in, have a look along the shelf, and take something good home to enjoy.</p>
          <div className="bh-cta">
            <a className="btn" href="#shelf">Shop drinks</a>
            <a className="btn ghost" href="#find">Find us</a>
          </div>
          <p className="bh-foot">Craft beer &middot; cider &middot; wine &middot; deli &middot; gifts</p>
        </div>
        {/* Desktop: the supplied transparent lying logo, straight onto the dark photograph (its outline is made for dark). */}
        <a className="bh-lying" href="/" aria-label={`Jack O’Beers and Deli, ${ADDRESS.street}, ${ADDRESS.town}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/jack-logo-lying.png" alt="Jack O’Beers and Deli logo: Jack the bull lying down with a barrel" width={480} height={370} loading="lazy" decoding="async" />
          {/* Christmas version of the same logo: hidden unless html[data-xmas="on"], see lib/season.ts. It is not fetched in the other months. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="xlogo" src="/media/jack-christmas-lying.png" alt="Jack O’Beers and Deli Christmas logo: Jack the bull in a Santa hat, lying down with a barrel" width={720} height={565} loading="lazy" decoding="async" />
        </a>
        {/* Phone: the supplied vector logo on a cream sign that straddles the edge of the cream shop. */}
        <a className="bh-sign" href="/" aria-label={`Jack O’Beers and Deli, ${ADDRESS.street}, ${ADDRESS.town}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/jack-logo.svg" alt="Jack O’Beers and Deli logo: Jack the bull with a barrel" width={280} height={288} loading="lazy" decoding="async" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="xlogo" src="/media/jack-christmas-standing.png" alt="Jack O’Beers and Deli Christmas logo: Jack the bull in a Santa hat with a barrel" width={640} height={712} loading="lazy" decoding="async" />
        </a>
      </div>
    </section>
  );
}
