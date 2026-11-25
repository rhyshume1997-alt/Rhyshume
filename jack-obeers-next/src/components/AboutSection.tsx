import { Hours } from "@/components/Hours";
import { PhotoStrip } from "@/components/PhotoStrip";

/**
 * About us, at the top of the home page. The wording is Michael's plain voice. Keep it plain: no exclamation marks,
 * no hype, no history or claims until Michael supplies them. The two marked placeholders are his to fill in.
 */
export function AboutSection() {
  return (
    <section className="about-home" id="about" aria-labelledby="ah-h">
      <div className="wrap">
        <p className="mono">About</p>
        <h2 className="h2" id="ah-h">About us</h2>
        <div className="about-home-grid">
          <div>
            <p className="lede">Jack O&rsquo; Beers and Deli is at 13 Station Road, Milngavie. We sell beer, cider and wine, and there&rsquo;s a deli too.</p>
            <p className="lede">We also run events, and there&rsquo;s a beer club if you want to join.</p>
          </div>
          <ul className="about-ph-list">
            <li><Hours /></li>
            <li><span className="tbc">[Michael to add: a line on how the shop started]</span></li>
          </ul>
        </div>
        <PhotoStrip />
      </div>
    </section>
  );
}
