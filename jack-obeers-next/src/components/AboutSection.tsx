import Image from "next/image";
import { Frame } from "@/components/Frame";
import { Clip } from "@/components/Clip";
import { Hours } from "@/components/Hours";
import { PhotoStrip } from "@/components/PhotoStrip";
import { MEDIA } from "@/lib/media";
import { MICHAEL_AND_TANYA } from "@/lib/photos";

/**
 * About us, at the top of the home page. The words are Michael's welcome, from his transcript, as he said it.
 * Keep them plain and in his voice. "Jarvis Pickle", "Hammond" and "Belhaven" are spelled as the transcription heard
 * them and must be checked with Michael before this goes live.
 * His welcome video goes in MEDIA.michael when the file arrives. The transcript below is its text version.
 */
export function AboutSection({ standalone = false }: { standalone?: boolean } = {}) {
  return (
    <section className="about-home" id="about" aria-labelledby="ah-h">
      <div className="wrap">
        {!standalone && <p className="mono">About</p>}
        <h2 className={standalone ? "vh" : "h2"} id="ah-h">About us</h2>
        <div className="about-media">
          <figure className="about-vid">
            <Frame>
              <Clip width={1280} height={720} src={MEDIA.michael.src} poster={MEDIA.michael.poster} label="Michael welcomes you to Jack O’Beers. The words are written below." />
            </Frame>
            <figcaption>Michael welcomes you to the shop</figcaption>
          </figure>
          <figure className="about-people">
            <Frame>
              <Image src={MICHAEL_AND_TANYA.file} alt={MICHAEL_AND_TANYA.alt} width={MICHAEL_AND_TANYA.width} height={MICHAEL_AND_TANYA.height} sizes="(max-width: 52rem) 100vw, 36vw" />
            </Frame>
            <figcaption>Michael and Tanya, who run Jack O’Beers and Deli</figcaption>
          </figure>
        </div>
        <div className="about-home-grid">
          <div className="about-copy">
            <p className="lede">Hello, welcome to Jack O&rsquo;Beers. My name&rsquo;s Michael Blakely, and my wife and I run Jack O&rsquo;Beers.</p>
            <p>We have 23 taps on the wall, with our custom transfer system to ensure keg-fresh beer and cider. And wine can be transferred into a 500ml or 1 litre bottle for you to take home and enjoy in the comfort of your own home, or at a friend&rsquo;s, or wherever you want to enjoy it.</p>
            <p>In the fridge we focus on the best of British produce, as we do on the wall for the best of British beers.</p>
            <p>At Jack O&rsquo;Beers, we&rsquo;re focused on ensuring that we can bring you the best quality at the best affordable prices.</p>
            <p>We have many events that are running throughout the year, and we also offer a sit-in experience to try some of our beautiful soups and dumplings, or our wonderful pies that we have from Jarvis Pickle. They truly are amazing. It&rsquo;s matched in with our charcuterie from Hammond, and also our fish charcuterie that we do from Belhaven.</p>
            <p>We look forward to seeing you at Jack O&rsquo;Beers soon.</p>
          </div>
          <div className="about-side">
            <Hours />
            <span className="jack-cheer" role="img" aria-label="Jack the bull, smiling" />
          </div>
        </div>
        <PhotoStrip />
      </div>
    </section>
  );
}
