import { toCard } from "@/lib/cards";
import type { Product } from "@/lib/catalogue";

/** The shop's best sellers, from Shopify's own best-selling sort. Hidden when there are none. Each can go in the basket. */
export function BestSellers({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="newin bestsellers" id="best" aria-labelledby="bs-h">
      <div className="wrap">
        <h2 className="h3" id="bs-h"><i className="newin-dot" aria-hidden="true" />Best sellers</h2>
        <ul>
          {products.map((p) => {
            const c = toCard(p);
            return (
              <li key={p.handle}>
                <a href={`/product/${p.handle}`}><b>{c.name}</b></a>
                <small>{[c.brewery, c.abv !== null ? `${c.abv}% ABV` : ""].filter(Boolean).join(" · ")}</small>
                <span className="newin-row"><span className="pg-price">£{c.price.toFixed(2)}{c.low !== null && <span className="pg-low">Only {c.low} left</span>}</span><button type="button" className="pg-btn soft" data-add={p.handle}>Add to basket<span className="vh"> {c.name}</span></button></span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
