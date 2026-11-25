import { pageMeta } from "@/lib/seo";
import { GoogleReviews } from "@/components/GoogleReviews";
import { OpenNow } from "@/components/OpenNow";
import { BasketBehaviour } from "@/components/BasketBehaviour";
import { getCatalogue } from "@/lib/catalogue";
import { BRAND } from "@/lib/brand";
import { AboutSection } from "@/components/AboutSection";
import { BgVideo } from "@/components/BgVideo";
import { TapsSection } from "@/components/TapsSection";
import { MEDIA } from "@/lib/media";
import { DeliSection, HampersSection } from "@/components/HomeSections";
import { ShopTiles } from "@/components/ShopTiles";
import { rangeOf } from "@/lib/cards";
import { BestSellers } from "@/components/BestSellers";
import { checkoutOn, getBestSellers } from "@/lib/catalogue";
import { BackBarHero, CinematicScenes } from "@/components/LookHeroes";
import { isIndexable } from "@/lib/site";
import { BehindHero } from "@/components/BehindHero";

export const metadata = pageMeta({
  title: "Craft beer shop in Milngavie | Jack O’Beers and Deli",
  absoluteTitle: true,
  description: "Independent craft beer, cider and wine shop in Milngavie. Fresh draught beer to take away, and a deli with pies and cheese. Open Wednesday to Monday, 11am to 7pm.",
  path: "/",
});

export default async function Page() {
  const catalogue = await getCatalogue();
  const best = await getBestSellers(catalogue.all);
  const preview = !isIndexable();
  const STAGE = (
    <section className="stage" aria-label="Opening"><div className="stage-in"><div className="arch logo-arch" aria-hidden="true"><div className="interior"><BgVideo loop={MEDIA.landing} className="enter" priority /><div className="interior-shade" /></div><div className="arch-logo"><div className="jack-charge" /></div><div className="doors"><div className="door l"><span /></div><div className="door r"><span /></div></div></div><div className="hero-copy"><p className="mono">Craft beer &middot; cider &middot; wine &middot; deli &middot; gifts</p><h1 className="big"><span className="w">Welcome,</span>{" "}<span className="acc"><span className="w">come</span>{" "}<span className="w">on</span>{" "}<span className="w">in.</span></span></h1><p className="lede">Independent British drink shop in Milngavie. Come in, have a look along the shelf, and take something good home to enjoy.</p><div className="btns"><a className="btn" href="#shelf" data-come-in="">Come in</a><a className="btn ghost" href="/drinks?c=beers">Shop beers</a></div><OpenNow variant="hero" /></div><aside className="hero-card" aria-label="Where we are"><OpenNow variant="card" /><p className="hc-addr"><b>13 Station Road</b>, Milngavie</p><ul><li>2 minutes from Milngavie station</li><li>200 m from the West Highland Way start</li></ul></aside><div className="counter" aria-hidden="true"></div><button type="button" className="open-skip">Skip</button><p className="scrollcue" aria-hidden="true">Scroll</p></div></section>
  );
  const TILES = <ShopTiles ranges={{ beer: rangeOf(catalogue.all, "beer"), cider: rangeOf(catalogue.all, "cider"), wine: rangeOf(catalogue.all, "wine") }} events={catalogue.all.filter((p) => p.category === "events").length} subs={catalogue.all.filter((p) => p.category === "subscriptions").length} checkoutOn={checkoutOn()} fancy={preview} />;
  const BEST = <BestSellers products={best} />;
  const TAPS = <TapsSection />;
  const DELI = <DeliSection products={catalogue.all} />;
  const HAMP = <HampersSection products={catalogue.all} checkoutOn={checkoutOn()} />;
  const SERV = (
    <section className="services" id="services" aria-labelledby="s-h"><div className="wrap"><p className="mono">However you like to shop</p><h2 className="h2" id="s-h">Collect it, <em>or we send it.</em></h2><div className="svc"><details><summary><span className="no">01</span><span className="nm">Click &amp; collect</span><span className="ar" aria-hidden="true">&rarr;</span></summary><div className="body"><p>Order online and pick it up from the shop at 13 Station Road, Wednesday to Monday, 11am to 7pm. The shop is closed on Tuesday.</p><p>Photo ID may be asked for when you collect alcohol.</p></div></details><details><summary><span className="no">02</span><span className="nm">Shipping</span><span className="ar" aria-hidden="true">&rarr;</span></summary><div className="body"><p>We deliver in the UK, starting local, and we are looking to deliver internationally.</p><p>UK delivery is free from &pound;50 and &pound;4.99 under that. The minimum order is &pound;35. The delivery price is shown at checkout.</p></div></details><details><summary><span className="no">03</span><span className="nm">Members</span><span className="ar" aria-hidden="true">&rarr;</span></summary><div className="body"><p>Members have their own area, and there is a beer club if you want to join. <a href="/draught-club">See the Draught Club</a> or <a href="/members">go to the members&rsquo; area</a>.</p></div></details></div></div></section>
  );
  return (
    <>
      {/* The hero picture is the first thing the visitor sees, so it is requested first, at the right size for the screen. */}
      <link rel="preload" as="image" href={MEDIA.landing.posterTall} media="(max-width: 832px)" fetchPriority="high" />
      <link rel="preload" as="image" href={MEDIA.landing.posterWide} media="(min-width: 833px)" fetchPriority="high" />
<main id="main">
      {preview && <><BackBarHero /><CinematicScenes /><BehindHero /></>}
      {preview ? (
        <>
          {STAGE}
          {TILES}
          {BEST}
          <GoogleReviews />
          <AboutSection />
          {TAPS}
          {DELI}
          {HAMP}
          {SERV}
        </>
      ) : (
        <>
          {STAGE}
          <GoogleReviews />
          <AboutSection />
          {TILES}
          {BEST}
          {TAPS}
          {DELI}
          {HAMP}
          {SERV}
        </>
      )}
    </main>
      <BasketBehaviour solid={false} />
    </>
  );
}
