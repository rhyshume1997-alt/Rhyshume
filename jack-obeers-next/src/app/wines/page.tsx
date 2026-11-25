import { CategoryPage } from "@/components/CategoryPage";

export const metadata = { title: "Wine | Jack O’Beers & Deli" };

export default function Page() {
  return <CategoryPage category="wine" eyebrow="Wine" noun="wines" heading={<>Wine, <em>all in one place.</em></>} />;
}
