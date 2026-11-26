import { toCard } from "@/lib/cards";
import type { Product } from "@/lib/catalogue";
import { AddToBasket } from "@/components/AddToBasket";

/** A short row of the newest beers (from Shopify created dates), above the filter. Each can go straight in the basket. */
export function NewIn({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="newin" aria-labelledby="newin-h">
      <h2 className="h3" id="newin-h"><i className="newin-dot" aria-hidden="true" />New in</h2>
      <ul>
        {products.map((p) => {
          const c = toCard(p);
          return (
            <li key={p.handle}>
              <a href={`/product/${p.handle}`}><b>{c.name}</b></a>
              <small>{[c.brewery, c.abv !== null ? `${c.abv}% ABV` : ""].filter(Boolean).join(" · ")}</small>
              <span className="newin-row"><span className="pg-price">£{c.price.toFixed(2)}</span><AddToBasket handle={p.handle} name={c.name} stock={c.stock} /></span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
