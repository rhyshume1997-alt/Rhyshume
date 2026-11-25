import Image from "next/image";
import { BgVideo } from "@/components/BgVideo";
import { Frame } from "@/components/Frame";
import { KegBlurb } from "@/components/KegBlurb";
import { MEDIA } from "@/lib/media";
import { TAP_WALL_FULL } from "@/lib/photos";

const CLIPS = [
  { loop: MEDIA.takeaway, caption: "A bottle filled straight from the tap wall" },
  { loop: MEDIA.pour, caption: "A beer poured, in slow motion" },
  { loop: MEDIA.settling, caption: "A fresh pint settling, in slow motion" },
];

/**
 * The taps and takeaway section. The tap wall photo has its own frame at its real shape (4 by 3), so no tap or number
 * is ever cropped and it never sits squeezed beside the words. The bg-taps loop plays quietly behind the section.
 */
export function TapsSection() {
  return (
    <section className="taps" id="taps" aria-labelledby="tp-h">
      <div className="taps-bg" aria-hidden="true">
        <BgVideo loop={MEDIA.bgTaps} className="taps-video" />
      </div>
      <div className="wrap">
        <div className="taps-grid">
          <div className="taps-copy">
            <p className="mono">From the tap wall</p>
            <h2 className="h2" id="tp-h">Keg fresh, <em>to take home.</em></h2>
            <p className="lede">There are 23 taps on the wall. Beer, cider and wine are transferred into a 500ml or 1 litre bottle for you to take home.</p>
          </div>
          <Frame className="taps-frame">
            <Image src={TAP_WALL_FULL.file} alt={TAP_WALL_FULL.alt} width={TAP_WALL_FULL.width} height={TAP_WALL_FULL.height} sizes="(max-width: 52rem) 100vw, 58vw" />
          </Frame>
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
