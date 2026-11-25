import { pageMeta } from "@/lib/seo";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata = pageMeta({ title: "Craft beer to take away in Milngavie", description: "Craft beers at Jack O’Beers and Deli, Milngavie. Cans, bottles and fresh draught beer from our 23 taps to take away, with the price and ABV of every beer.", path: "/beers" });

export default function Page() {
  return <CategoryPage category="beer" eyebrow="Beer" noun="beers" heading={<>The beer range, <em>all in one place.</em></>} />;
}
