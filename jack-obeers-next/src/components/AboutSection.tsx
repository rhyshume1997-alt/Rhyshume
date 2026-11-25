import { Hours } from "@/components/Hours";
import { PhotoStrip } from "@/components/PhotoStrip";

/**
 * About us, at the top of the home page. The words are Michael's own, condensed. Keep them plain: no exclamation marks,
 * no hype. The suppliers named (Jarvis Pickle, Hammond, Belhaven) were dictated, so Michael should check the spellings.
 */
export function AboutSection() {
  return (
    <section className="about-home" id="about" aria-labelledby="ah-h">
      <div className="wrap">
        <p className="mono">About</p>
        <h2 className="h2" id="ah-h">About us</h2>
        <div className="about-home-grid">
          <div className="about-copy">
            <p className="lede">Hello, welcome to Jack O&rsquo;Beers. I&rsquo;m Michael Blakely, and my wife and I run the shop.</p>
            <p>We have 23 taps on the wall, with our own transfer system so the beer and cider are keg fresh. Wine can be transferred into a 500ml or 1 litre bottle, to enjoy at home, at a friend&rsquo;s, or wherever you like.</p>
            <p>In the fridge we focus on the best of British produce, the same as the wall does for beer. We aim to bring you the best quality at the best affordable prices.</p>
            <p>We run events throughout the year. You can also sit in to try our soups and dumplings, or the pies from Jarvis Pickle, with charcuterie from Hammond and fish charcuterie from Belhaven.</p>
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
