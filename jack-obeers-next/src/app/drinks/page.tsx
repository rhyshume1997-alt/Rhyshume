import { BasketBehaviour } from "@/components/BasketBehaviour";
import { getCatalogue } from "@/lib/catalogue";

export const metadata = { title: 'Drinks', robots: { index: false, follow: true }, alternates: { canonical: '/beers' } };

export default async function Page() {
  const catalogue = await getCatalogue();
  return (
    <>
<main id="main"><section className="page-top"><div className="wrap"><p className="mono">The shelf</p><h1 className="h2">Pick a glass, <em>any glass.</em></h1></div></section><section className="shelf cream" id="shelf" style={{ paddingTop: '4rem' } as React.CSSProperties}><div className="wrap"><ul className="rows" id="rows" aria-label="Choose a shelf"></ul><div className="shelf-area"><div className="shelf-bar"><p id="shelf-status" role="status">Loading&hellip;</p><label className="sort">Sort <select id="sort"><option value="featured">Featured</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option><option value="name">Name, A to Z</option></select></label></div><ul className="board" aria-label="Drinks on the shelf"></ul><p className="hint" style={{ marginTop: '1.2rem' } as React.CSSProperties}>{catalogue.live ? 'Real products and prices from the shop. Flavour guide and allergens are still to come.' : 'Sample products and prices. Photos, ABV and allergens are to be supplied.'}</p></div></div></section></main>
      <BasketBehaviour solid={true} />
    </>
  );
}
