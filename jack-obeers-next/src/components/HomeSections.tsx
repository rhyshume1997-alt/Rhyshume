import { ALLOWED_PAIRINGS, buyLink, type Product } from "@/lib/catalogue";

const money = (n: number) => `£${n.toFixed(2)}`;
const priceOf = (p: Product) => {
  const v = p.variants.find((x) => x.available) || p.variants[0];
  return v ? v.price : null;
};

/**
 * Good things to eat, next to the beer. Items come from the Shopify products whose type is deli, food or similar.
 * Until the shop has any there, the list is the six items the shop has confirmed. Nothing else is named.
 * "Goes with" shows beers whose profile suggests the item. Those pairings are suggestions until the shop confirms them.
 */
export function DeliSection({ products }: { products: Product[] }) {
  const deli = products.filter((p) => p.category === "deli");
  const goesWith = (name: string) =>
    products
      .filter((p) => p.profile && (p.profile.pairing || []).some((x) => x.toLowerCase() === name.toLowerCase()))
      .slice(0, 3)
      .map((p) => p.name);
  const items = deli.length
    ? deli.map((p) => ({ key: p.handle, name: p.name, price: priceOf(p), image: p.image, with: goesWith(p.name) }))
    : ALLOWED_PAIRINGS.map((n) => ({ key: n, name: n, price: null as number | null, image: null as string | null, with: goesWith(n) }));
  return (
    <section className="deli" id="deli" aria-labelledby="deli-h">
      <div className="wrap">
        <p className="mono">The deli counter</p>
        <h2 className="h2" id="deli-h">Good things to eat, <em>next to the beer.</em></h2>
        <ul className="deli-list">
          {items.map((it) => (
            <li key={it.key} className="deli-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.image ? <img src={it.image} alt="" width={96} height={96} loading="lazy" /> : <span className="deli-ph" aria-hidden="true" />}
              <div>
                <h3>{it.name}</h3>
                <p className="deli-price">{it.price !== null ? money(it.price) : <span className="tbc">price to be confirmed</span>}</p>
                {it.with.length > 0 && <p className="deli-with">Suggested with {it.with.join(", ")}</p>}
              </div>
            </li>
          ))}
        </ul>
        <p className="hint deli-hint">
          {deli.length
            ? "Straight from the shop’s own list."
            : "These are the deli items the shop has told us about. The full list, photos and prices will come from the shop’s own products. Allergen details to be confirmed."}
        </p>
      </div>
    </section>
  );
}

/** Something good to give. Hampers come from Shopify products typed as hampers. Until then, two placeholders. */
export function HampersSection({ products, checkoutOn }: { products: Product[]; checkoutOn: boolean }) {
  const hampers = products.filter((p) => p.category === "hampers");
  return (
    <section className="hampers" id="hampers" aria-labelledby="h-h">
      <div className="wrap">
        <p className="mono">Gift hampers</p>
        <h2 className="h2" id="h-h">Something good <em>to give.</em></h2>
        <div className="cols">
          <div className="arch-slot rv" role="img" aria-label="Hamper photo to be supplied"><span>Photo coming soon<br />A gift hamper</span></div>
          <div className="hlist">
            {hampers.length > 0
              ? hampers.map((p) => {
                  const v = p.variants.some((x) => x.available);
                  const link = buyLink(p);
                  return (
                    <article key={p.handle} className="hcard rv">
                      <h3>{p.name}</h3>
                      {priceOf(p) !== null && <p>{money(priceOf(p) as number)}</p>}
                      <p>
                        {checkoutOn && v && link ? <a className="btn sm dk" href={link}>Buy now</a> : <span className="tbc">{v ? "Checkout opens soon" : "Sold out"}</span>}
                      </p>
                    </article>
                  );
                })
              : (
                <>
                  <article className="hcard rv"><p className="mono">Hamper</p><h3>Beer hamper</h3><p>A selection of beers to give. Contents, photo and price <span className="tbc">to be confirmed</span>.</p></article>
                  <article className="hcard rv"><p className="mono">Hamper</p><h3>Deli hamper</h3><p>Deli items to give. Contents, photo and price <span className="tbc">to be confirmed</span>.</p></article>
                </>
              )}
            <p className="note-s">Gift messages, wrapping and sending to another address are <span className="tbc">to be confirmed</span>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
