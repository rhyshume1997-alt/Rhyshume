import { SHOP } from "@/lib/brand";
import { PhotoStrip } from "@/components/PhotoStrip";

/**
 * About, at the top of the home page. Only facts that are confirmed are written as plain text:
 * the name and the address. Everything else is a marked placeholder for Michael to fill in.
 * Do not add history, claims or opening hours here until Michael supplies them.
 */
export function AboutSection() {
  return (
    <section className="about-home" id="about" aria-labelledby="ah-h">
      <div className="wrap">
        <p className="mono">About</p>
        <h2 className="h2" id="ah-h">Hello from <em>Jack O&rsquo; Beers and Deli.</em></h2>
        <div className="about-home-grid">
          <div>
            <p className="lede">
              We&rsquo;re at {SHOP.address[0]}, {SHOP.address[1]}, Glasgow. Have a look round the range below, or just pop in and say hello.
            </p>
            <p className="about-ph"><span className="tbc">[PLACEHOLDER: our story, in Michael&rsquo;s words]</span></p>
          </div>
          <ul className="about-ph-list">
            <li><span className="tbc">[PLACEHOLDER: opening hours, for Michael to confirm]</span></li>
            <li><span className="tbc">[PLACEHOLDER: who we are and who runs the shop, for Michael to write]</span></li>
          </ul>
        </div>
        <PhotoStrip />
      </div>
    </section>
  );
}
