import { pageMeta } from "@/lib/seo";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata = pageMeta({ title: "Cider to take away in Milngavie", description: "Craft cider at Jack O’Beers and Deli, Milngavie, on the taps and in the fridge. Take a fresh 500ml or 1 litre bottle home. Price and ABV on every cider.", path: "/ciders" });

export default function Page() {
  return <CategoryPage category="cider" eyebrow="Hard cider" noun="ciders" heading={<>Hard cider, <em>all in one place.</em></>} />;
}
