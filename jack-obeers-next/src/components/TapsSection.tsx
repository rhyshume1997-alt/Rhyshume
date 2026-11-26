import Image from "next/image";
import { BgVideo } from "@/components/BgVideo";
import { Seal } from "@/components/Seal";
import { Frame } from "@/components/Frame";
import { KegBlurb } from "@/components/KegBlurb";
import { MEDIA } from "@/lib/media";
import { isIndexable } from "@/lib/site";
import { TAP_WALL_FULL } from "@/lib/photos";

const CLIPS = [
  { loop: MEDIA.takeaway, caption: "A bottle filled straight from the tap wall" },
  { loop: MEDIA.pour, caption: "A beer poured, in slow motion" },
];

/**
 * The taps and takeaway section. The tap wall photo has its own frame at its real shape (4 by 3), so no tap or number
 * is ever cropped and it never sits squeezed beside the words. The bg-taps loop plays quietly behind the section.
 */
export function TapsSection() {
  return (
    <section className="taps" id="taps" {...(isIndexable() ? { "aria-labelledby": "tp-h" } : { "aria-label": "From keg to bottle: the tap wall" })}>
      {!isIndexable() && (
        <div className="taps-cine" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/photos/taps-numbered-close-2400.webp" alt="" width={2400} height={1800} loading="lazy" decoding="async" />
          <span className="taps-cine-cap">The numbered taps</span>
        </div>
      )}
      <div className="taps-bg" aria-hidden="true">
        <BgVideo loop={MEDIA.bgTaps} className="taps-video" />
      </div>
      {!isIndexable() && <KegToBottle />}
      <div className="wrap taps-old">
        <div className="taps-grid">
          <div className="taps-copy">
            <p className="mono">From the tap wall</p>
            <h2 className="h2" id="tp-h">Keg fresh, <em>to take home.</em></h2>
            <p className="lede">There are 23 taps on the wall. Beer, cider and wine are transferred into a 500ml or 1 litre bottle for you to take home.</p>
          </div>
          <div className="taps-fig">
            <Seal />
            <Frame className="taps-frame">
            <Image src={TAP_WALL_FULL.file} alt={TAP_WALL_FULL.alt} width={TAP_WALL_FULL.width} height={TAP_WALL_FULL.height} sizes="(max-width: 52rem) 100vw, 58vw" />
            </Frame>
          </div>
        </div>
        <ul className="clips">
          {CLIPS.map((c) => (
            <li key={c.caption}>
              <figure>
                <Frame><BgVideo loop={c.loop} className="clip-video" /></Frame>
                <figcaption>{c.caption}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <KegBlurb label="Bottles to take home" />
      </div>
    </section>
  );
}


/**
 * Rev 9: "From keg to bottle". The two existing videos become one printed-menu style feature joined by a fine brass line that
 * ends in a small amber drop. Preview only (the live site keeps the original block above). The numbers and captions are the
 * owner's proposed wording; no freshness times or other claims are added. The line draws itself once when the feature comes
 * into view (LookEffects adds .in); with reduced motion it is already drawn. All styling is in globals.css under .taps-new.
 */
function KegToBottle() {
  return (
    <div className="wrap taps-new">
      <header className="kb-head">
        <h2 className="kb-h" id="kb-h">From keg to bottle.</h2>
        <p className="kb-intro">Good beer starts at the tap. Explore our 23 taps and we’ll fill your bottle fresh at the counter, ready to take home.</p>
      </header>
      <div className="kb-feature">
        <span className="kb-rail" aria-hidden="true"><i className="kb-collar" /><i className="kb-run" /><i className="kb-ferrule" /><i className="kb-drop" /></span>
        <figure className="kb-fig kb-a">
          <p className="kb-no"><b>01</b> Fresh from the tap</p>
          <div className="kb-frame"><BgVideo loop={MEDIA.takeaway} className="kb-video" /></div>
          <figcaption>Freshly filled, straight from the tap.</figcaption>
        </figure>
        <figure className="kb-fig kb-b">
          <p className="kb-no"><b>02</b> The perfect pour</p>
          <div className="kb-frame"><BgVideo loop={MEDIA.pour} className="kb-video" /></div>
          <figcaption>A good beer deserves a good pour.</figcaption>
        </figure>
      </div>
      <p className="kb-quote">Find something you fancy on the tap wall. We’ll take care of the bottle, so you can enjoy a fresh pour at home.</p>
    </div>
  );
}
