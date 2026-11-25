import { pageMeta } from "@/lib/seo";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata = pageMeta({ title: "Wine and Georgian wine in Milngavie", description: "Wine at Jack O’Beers and Deli, Milngavie, including Georgian wines such as Tsinandali and Saperavi. Wine can go into a 500ml or 1 litre bottle to take home.", path: "/wines" });

export default function Page() {
  return <CategoryPage category="wine" eyebrow="Wine" noun="wines" heading={<>Wine, <em>all in one place.</em></>} />;
}
