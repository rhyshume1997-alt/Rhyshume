import Image from "next/image";
import { BgVideo } from "@/components/BgVideo";
import { KegBlurb } from "@/components/KegBlurb";
import { MEDIA } from "@/lib/media";
import { TAP_WALL_FULL } from "@/lib/photos";

const CLIPS = [
  { loop: MEDIA.takeaway, caption: "A bottle filled straight from the tap wall" },
  { loop: MEDIA.pour, caption: "A beer poured, in slow motion" },
  { loop: MEDIA.settling, caption: "A fresh pint settling, in slow motion" },
];

/** The taps and takeaway section. Photo of the tap wall behind, with the bg-taps loop over it when it can play. */
export function TapsSection() {
  return (
    <section className="taps" id="taps" aria-labelledby="tp-h">
      <div className="taps-bg" aria-hidden="true">
        <Image src={TAP_WALL_FULL} alt="" fill sizes="100vw" className="taps-photo" />
        <BgVideo loop={MEDIA.bgTaps} className="taps-video" />
      </div>
      <div className="wrap">
        <p className="mono">From the tap wall</p>
        <h2 className="h2" id="tp-h">Keg fresh, <em>to take home.</em></h2>
        <p className="lede">There are 23 taps on the wall. Beer, cider and wine are transferred into a 500ml or 1 litre bottle for you to take home.</p>
        <ul className="clips">
          {CLIPS.map((c) => (
            <li key={c.caption}>
              <figure>
                <BgVideo loop={c.loop} className="clip-video" />
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
