import { Landing } from "@/components/Landing";
import { pageMeta } from "@/lib/seo";
import { FRIDGES_WIDE } from "@/lib/photos";
import { ADDRESS_LINE } from "@/lib/site";

export const metadata = pageMeta({
  title: "Bottle shop in Milngavie",
  description: "A bottle shop in Milngavie, 13 Station Road. Craft beer, cider and wine in the fridges, and fresh draught beer filled into 500ml or 1 litre bottles from 23 taps.",
  path: "/bottle-shop-milngavie",
});

export default function Page() {
  return (
    <Landing
      path="/bottle-shop-milngavie"
      crumb="Bottle shop in Milngavie"
      mono="Bottle shop"
      h1={<>A bottle shop in <em>Milngavie.</em></>}
      lede={<>Take home craft beer, cider or wine from the fridges, or a fresh bottle filled from the taps. We are at {ADDRESS_LINE}.</>}
      photo={FRIDGES_WIDE}
      sections={[
        { h: "Filled from the keg", body: <p>Choose from our 23 taps and we fill a 500ml or 1 litre bottle with no foam. A sealed bottle keeps for up to two weeks. Wine can be transferred into a 500ml or 1 litre bottle too.</p> },
        { h: "On the shelves", body: <p>The fridges hold craft beer in cans and bottles, cider, and wine. Our wines include Georgian wines such as Tsinandali and Saperavi. See <a href="/beers">beer</a>, <a href="/ciders">cider</a> and <a href="/wines">wine</a> online.</p> },
        { h: "Near the West Highland Way", body: <p>The West Highland Way starts in Milngavie. <a href="/west-highland-way">Read more for walkers</a>.</p> },
      ]}
    />
  );
}
