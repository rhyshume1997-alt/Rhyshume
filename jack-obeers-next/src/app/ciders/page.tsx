import { CategoryPage } from "@/components/CategoryPage";

export const metadata = { title: "Hard cider | Jack O’Beers & Deli" };

export default function Page() {
  return <CategoryPage category="cider" eyebrow="Hard cider" noun="ciders" heading={<>Hard cider, <em>all in one place.</em></>} />;
}
