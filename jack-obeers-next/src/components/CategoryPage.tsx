import { Behaviour } from "@/components/Behaviour";
import { KegBlurb } from "@/components/KegBlurb";
import { ProductGrid } from "@/components/ProductGrid";
import { checkoutOn, getCatalogue, type Category } from "@/lib/catalogue";
import { rangeOf } from "@/lib/cards";

/** One range on one screen: a compact grid, style chips that filter in place, Buy now on every card. */
export async function CategoryPage({ category, eyebrow, heading, noun }: { category: Category; eyebrow: string; heading: React.ReactNode; noun: string }) {
  const catalogue = await getCatalogue();
  const { cards, chips } = rangeOf(catalogue.all, category);
  return (
    <>
      <main id="main">
        <section className="page-top compact">
          <div className="wrap">
            <p className="mono">{eyebrow}</p>
            <h1 className="h2">{heading}</h1>
          </div>
        </section>
        <section className="cream pg-sec" style={{ background: "var(--cream)" }}>
          <div className="wrap pg-wrap">
            {cards.length === 0 ? <p className="lede">Nothing here yet.</p> : <ProductGrid cards={cards} chips={chips} checkoutOn={checkoutOn()} noun={noun} intro={category === "beer" ? <KegBlurb /> : undefined} />}
          </div>
        </section>
      </main>
      <Behaviour products={catalogue.products} solid={true} />
    </>
  );
}
