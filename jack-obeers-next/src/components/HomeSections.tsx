import Image from "next/image";
import { Mount } from "@/components/Photo";
import { isIndexable } from "@/lib/site";
import { BgVideo } from "@/components/BgVideo";
import { MEDIA } from "@/lib/media";
import { DELI_CABINET, DELI_COUNTER } from "@/lib/photos";
import { ALLOWED_PAIRINGS, canBuyNow, type Product } from "@/lib/catalogue";
import { AddToBasket } from "@/components/AddToBasket";
import { stockOf } from "@/lib/cards";

/** Popcorn is sold at 3.50 pounds, confirmed by Michael. */
export const POPCORN_PRICE = 3.5;
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
    ? deli.map((p) => ({ key: p.handle, handle: p.handle as string | null, available: p.variants.some((v) => v.available), stock: stockOf(p), name: p.name, price: priceOf(p), image: p.image, with: goesWith(p.name) }))
    : [...ALLOWED_PAIRINGS.map((n) => ({ key: n, handle: null as string | null, available: false, stock: null as number | null, name: n as string, price: null as number | null, image: null as string | null, with: goesWith(n) })), { key: "Popcorn", handle: null as string | null, available: false, stock: null as number | null, name: "Popcorn", price: POPCORN_PRICE as number | null, image: null as string | null, with: [] as string[] }];
  return (
    <section className="deli" id="deli" aria-labelledby="deli-h">
      <div className="sec-bg" aria-hidden="true"><BgVideo loop={MEDIA.bgDeli} className="sec-video" /></div>
      <div className="wrap">
        {!isIndexable() && (
          <div className="deli-lead">
            <Mount variant="a" mat caption="Pies, cheese and charcuterie, over the counter"><Image src={DELI_COUNTER.file} alt={DELI_COUNTER.alt} width={DELI_COUNTER.width} height={DELI_COUNTER.height} sizes="(max-width: 53rem) 100vw, 36vw" /></Mount>
          </div>
        )}
        <p className="mono">The deli counter</p>
        <h2 className="h2" id="deli-h">Good things to eat, <em>next to the beer.</em></h2>
        <ul className="deli-list">
          {items.map((it) => (
            <li key={it.key} className="deli-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.image ? <img src={it.image} alt="" width={96} height={96} loading="lazy" /> : <span className="deli-ph" aria-hidden="true" />}
              <div>
                <h3>{it.name}</h3>
                {it.price !== null && <p className="deli-price">{money(it.price)}</p>}
                {it.with.length > 0 && <p className="deli-with">Suggested with {it.with.join(", ")}</p>}
                {it.handle && it.available && <span className="deli-add"><AddToBasket handle={it.handle} name={it.name} stock={it.stock} /></span>}
              </div>
            </li>
          ))}
        </ul>
        <ul className="deli-photos" aria-label="Photos of the deli">
          {[DELI_COUNTER, DELI_CABINET].map((p, i) => (
            <li key={p.file}><Mount variant="c" caption={i === 0 ? "Pies, cheese and charcuterie, over the counter" : "In the cabinet, from the front"}><Image src={p.file} alt={p.alt} width={p.width} height={p.height} sizes="(max-width: 40rem) 100vw, 50vw" /></Mount></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Something good to give. Hampers come from Shopify products typed as hampers. Until then, two placeholders. */
export function HampersSection({ products, checkoutOn }: { products: Product[]; checkoutOn: boolean }) {
  const hampers = products.filter((p) => p.category === "hampers");
  if (!hampers.length) return null; // hidden until hampers are in Shopify (see MICHAEL-NEEDS.md)
  return (
    <section className="hampers" id="hampers" aria-labelledby="h-h">
      <div className="wrap">
        <p className="mono">Gift hampers</p>
        <h2 className="h2" id="h-h">Something good <em>to give.</em></h2>
        <div className="hlist hamper-list">
          {hampers.map((p) => {
            const v = p.variants.some((x) => x.available);
            const buyNow = canBuyNow(p);
            return (
              <article key={p.handle} className="hcard rv">
                {p.image && /* eslint-disable-next-line @next/next/no-img-element */ <img className="hamper-img" src={p.image} alt={p.name} width={320} height={320} loading="lazy" />}
                <h3>{p.name}</h3>
                {priceOf(p) !== null && <p>{money(priceOf(p) as number)}</p>}
                <p className="hamper-btns">
                  {v && <AddToBasket handle={p.handle} name={p.name} stock={stockOf(p)} />}
                  {checkoutOn && v && buyNow ? <button type="button" className="pg-btn solid" data-buy={p.handle}>Buy now</button> : !v ? <span>Sold out</span> : null}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
