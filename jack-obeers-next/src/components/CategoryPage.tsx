import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { BasketBehaviour } from "@/components/BasketBehaviour";
import { KegBlurb } from "@/components/KegBlurb";
import { ProductGrid } from "@/components/ProductGrid";
import { NewIn } from "@/components/NewIn";
import { checkoutOn, getCatalogue, newIn, type Category } from "@/lib/catalogue";
import { rangeOf } from "@/lib/cards";

/** One range on one screen: a compact grid, style chips that filter in place, Buy now on every card. */
export async function CategoryPage({ category, eyebrow, heading, noun }: { category: Category; eyebrow: string; heading: React.ReactNode; noun: string }) {
  const catalogue = await getCatalogue();
  const { cards, chips } = rangeOf(catalogue.all, category);
  const crumb = { beer: ["Beer", "/beers"], cider: ["Cider", "/ciders"], wine: ["Wine", "/wines"] }[category as "beer" | "cider" | "wine"] || ["Drinks", "/drinks"];
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: crumb[0], path: crumb[1] }])} />
      <main id="main">
        <section className="page-top compact">
          <div className="wrap">
            <p className="mono">{eyebrow}</p>
            <h1 className="h2">{heading}</h1>
          </div>
        </section>
        <section className="cream pg-sec" style={{ background: "var(--cream)" }}>
          <div className="wrap pg-wrap">
            {category === "beer" && <NewIn products={newIn(catalogue.all, "beer")} />}
            {cards.length === 0 ? <p className="lede">Nothing here yet.</p> : <ProductGrid cards={cards} chips={chips} checkoutOn={checkoutOn()} noun={noun} intro={category === "beer" ? <KegBlurb /> : undefined} segmented={category === "beer"} />}
          </div>
        </section>
      </main>
      <BasketBehaviour solid={true} />
    </>
  );
}
