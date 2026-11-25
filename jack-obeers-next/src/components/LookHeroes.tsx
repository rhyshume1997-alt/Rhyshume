import { BgVideo } from "@/components/BgVideo";
import { MEDIA } from "@/lib/media";
import { ADDRESS_LINE, DIRECTIONS_URL, PHONE, PHONE_HREF } from "@/lib/site";

/**
 * Preview looks for the owner to compare (see LookPicker). Both are hidden unless the page has data-look set,
 * so the normal site is unchanged. The facts are the ones already on the site; nothing new is claimed.
 */
export function BackBarHero() {
  return (
    <section className="look-bb" aria-label="Welcome">
      <img className="bb-photo" src="/media/photos/tap-wall-wide-1200.webp" alt="" width={1200} height={800} loading="lazy" decoding="async" />
      <div className="bb-copy">
        <p className="bb-kick">Craft beer &middot; cider &middot; wine &middot; deli</p>
        <h1 className="bb-h1"><span className="bb-l"><span>Welcome,</span></span>{" "}<span className="bb-l gold"><span>come on in.</span></span></h1>
        <p className="bb-lede">Independent British drink shop in Milngavie. Come in, have a look along the shelf, and take something good home to enjoy.</p>
        <div className="bb-cta"><a className="bb-btn p" href="#shelf">Come in</a><a className="bb-btn" href="/beers">Shop beers</a></div>
      </div>
      <dl className="bb-info"><div><dt>Find us</dt><dd><a href={DIRECTIONS_URL}>{ADDRESS_LINE}</a></dd></div><div><dt>Open</dt><dd>Wednesday to Monday, 11am to 7pm</dd></div><div><dt>Closed</dt><dd>Tuesday</dd></div></dl>
    </section>
  );
}

const SCENES = [
  { id: "c1", slate: "Jack O’Beers and Deli · Milngavie", loop: MEDIA.bgTaps, hero: true },
  { id: "c2", slate: "Scene one · The wall", loop: MEDIA.pour },
  { id: "c3", slate: "Scene two · The deli", loop: MEDIA.bgDeli },
  { id: "c4", slate: "Final scene · Find us", loop: MEDIA.storefront },
] as const;

export function CinematicScenes() {
  return (
    <div className="look-cin">
      <section className="cin-scene" id="cin-1" aria-label="Welcome"><BgVideo loop={SCENES[0].loop} priority /><div className="cin-slate">{SCENES[0].slate}</div>
        <div className="cin-cap"><h1 className="cin-h1"><span className="bb-l"><span>Welcome,</span></span>{" "}<span className="bb-l gold"><span>come on in.</span></span></h1><p className="cin-sub">Independent British drink shop in Milngavie. Come in, have a look along the shelf, and take something good home to enjoy.</p><div className="bb-cta"><a className="bb-btn p" href="#shelf">Come in</a><a className="bb-btn" href="/beers">Shop beers</a></div></div><div className="cin-bar" /></section>
      <section className="cin-scene" aria-label="The wall of taps"><BgVideo loop={SCENES[1].loop} /><div className="cin-slate">{SCENES[1].slate}</div>
        <div className="cin-cap"><h2 className="cin-h2"><span className="bb-l"><span>Twenty-three taps,</span></span>{" "}<span className="bb-l gold"><span>keg fresh.</span></span></h2><p className="cin-sub">A custom transfer system keeps beer, cider and wine fresh from the keg. Bring a bottle or take one of ours: refills come in 500ml or 1 litre.</p><div className="bb-cta"><a className="bb-btn p" href="/beers">Shop beers</a></div></div><div className="cin-bar" /></section>
      <section className="cin-scene" aria-label="The deli"><BgVideo loop={SCENES[2].loop} /><div className="cin-slate">{SCENES[2].slate}</div>
        <div className="cin-cap"><h2 className="cin-h2"><span className="bb-l"><span>Sit in, eat,</span></span>{" "}<span className="bb-l gold"><span>take some home.</span></span></h2><p className="cin-sub">Soups, dumplings and pies from the sit-in menu, with charcuterie and cheese from the deli counter. Run by Michael and Tanya.</p><div className="bb-cta"><a className="bb-btn p" href="#deli">Visit the deli</a></div></div><div className="cin-bar" /></section>
      <section className="cin-scene" aria-label="Find us"><BgVideo loop={SCENES[3].loop} /><div className="cin-slate">{SCENES[3].slate}</div>
        <div className="cin-cap"><h2 className="cin-h2"><span className="bb-l"><span>13 Station Road,</span></span>{" "}<span className="bb-l gold"><span>Milngavie.</span></span></h2>
          <dl className="bb-info flat"><div><dt>Open</dt><dd>Wednesday to Monday, 11am to 7pm</dd></div><div><dt>Closed</dt><dd>Tuesday</dd></div><div><dt>Phone</dt><dd><a href={PHONE_HREF}>{PHONE}</a></dd></div></dl>
          <div className="bb-cta"><a className="bb-btn p" href={DIRECTIONS_URL}>Get directions</a><a className="bb-btn" href={PHONE_HREF}>Call</a></div></div><div className="cin-bar" /></section>
    </div>
  );
}
