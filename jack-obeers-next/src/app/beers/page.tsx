import { CategoryPage } from "@/components/CategoryPage";

export const metadata = { title: "Beer | Jack O’Beers & Deli" };

export default function Page() {
  return <CategoryPage category="beer" eyebrow="Beer" noun="beers" heading={<>The beer range, <em>all in one place.</em></>} />;
}
