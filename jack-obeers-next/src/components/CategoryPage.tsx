import { Behaviour } from "@/components/Behaviour";
import { ProductGrid, type Card } from "@/components/ProductGrid";
import { buyLink, checkoutOn, getCatalogue, STYLE_CHIPS, type Category, type Product } from "@/lib/catalogue";

function toCard(p: Product): Card {
  const v = p.variants.find((x) => x.available) || p.variants[0];
  return {
    handle: p.handle,
    name: p.name,
    brewery: p.brewery,
    abv: p.abvNum,
    style: p.style,
    styles: p.styles,
    price: v ? v.price : 0,
    available: p.variants.some((x) => x.available),
    buy: buyLink(p),
    glass: p.glass,
    profile: p.profile,
    sample: !!p.sample,
  };
}

/** One range on one screen: a compact grid, style chips that filter in place, Buy now on every card. */
export async function CategoryPage({ category, eyebrow, heading, noun }: { category: Category; eyebrow: string; heading: React.ReactNode; noun: string }) {
  const catalogue = await getCatalogue();
  const items = catalogue.all.filter((p) => p.category === category).sort((a, b) => a.name.localeCompare(b.name));
  const chips = STYLE_CHIPS.filter((c) => items.some((p) => p.styles.includes(c)));
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
            {items.length === 0 ? <p className="lede">Nothing here yet.</p> : <ProductGrid cards={items.map(toCard)} chips={chips} checkoutOn={checkoutOn()} noun={noun} />}
          </div>
        </section>
      </main>
      <Behaviour products={catalogue.products} solid={true} />
    </>
  );
}
