import { Landing } from "@/components/Landing";
import { pageMeta } from "@/lib/seo";
import { TAPS_NUMBERED_CLOSE } from "@/lib/photos";
import { ADDRESS_LINE } from "@/lib/site";

export const metadata = pageMeta({
  title: "Craft beer in Milngavie",
  description: "Craft beer in Milngavie at Jack O’Beers and Deli, 13 Station Road. 23 taps of fresh draught beer to take away in bottles, plus craft beer cans, cider and wine.",
  path: "/craft-beer-milngavie",
});

export default function Page() {
  return (
    <Landing
      path="/craft-beer-milngavie"
      crumb="Craft beer in Milngavie"
      mono="Craft beer shop"
      h1={<>Craft beer in <em>Milngavie.</em></>}
      lede={<>Jack O’Beers and Deli is an independent shop at {ADDRESS_LINE}. We sell craft beer from the taps and from the fridges, with cider, wine and deli food too.</>}
      photo={TAPS_NUMBERED_CLOSE}
      sections={[
        { h: "Fresh from the tap", body: <p>There are 23 taps on the wall. Pick a beer or cider and we fill a 500ml or 1 litre bottle for you straight from the keg, with no foam. A sealed bottle keeps for up to two weeks.</p> },
        { h: "Cans and bottles", body: <p>The fridges are full of craft beer, cider and wine, including cans. The <a href="/beers">beer page</a> shows the price and ABV of every beer in the range.</p> },
        { h: "Something to go with it", body: <p>The deli sells pork pies, salami beer sticks, cheeses, oatcakes, chutneys and chilli jams, and popcorn at £3.50.</p> },
      ]}
    />
  );
}
