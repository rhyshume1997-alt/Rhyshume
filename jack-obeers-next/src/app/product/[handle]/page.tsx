import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Frame } from "@/components/Frame";
import { Behaviour } from "@/components/Behaviour";
import { JsonLd } from "@/components/JsonLd";
import { buyLink, checkoutOn, getCatalogue, safePairings } from "@/lib/catalogue";
import { breadcrumbSchema, productDescription, productPrice, productSchema } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";

export const revalidate = 300;

async function find(handle: string) {
  const catalogue = await getCatalogue();
  const p = catalogue.products.find((x) => x.handle === handle);
  return { catalogue, p };
}

const RANGE = { beer: ["Beer", "/beers"], cider: ["Cider", "/ciders"], wine: ["Wine", "/wines"] } as const;

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { p, catalogue } = await find((await params).handle);
  if (!p) return { title: "Not found", robots: { index: false } };
  const { price } = productPrice(p);
  const bits = [p.style, p.abvNum !== null ? `${p.abvNum}% ABV` : ""].filter(Boolean).join(", ");
  const desc = `${p.name}${bits ? ` (${bits})` : ""} at Jack O’Beers and Deli, Milngavie. £${price.toFixed(2)}. ${productDescription(p)}`.slice(0, 200);
  return pageMeta({ title: `${p.name}${p.style ? `, ${p.style}` : ""}`, description: desc, path: `/product/${p.handle}`, noindex: !catalogue.live });
}

/** One product: the facts, the price, and structured data with the Shopify price and stock. Server rendered. */
export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { catalogue, p } = await find((await params).handle);
  if (!p) notFound();
  const path = `/product/${p.handle}`;
  const { price, available } = productPrice(p);
  const range = RANGE[p.category as keyof typeof RANGE] || RANGE.beer;
  const link = buyLink(p);
  const pairs = safePairings(p.profile);
  return (
    <>
      <JsonLd data={[productSchema(p, path), breadcrumbSchema([{ name: "Home", path: "/" }, { name: range[0], path: range[1] }, { name: p.name, path }])]} />
      <main id="main">
        <section className="page-top compact">
          <div className="wrap">
            <p className="mono"><a href={range[1]}>{range[0]}</a>{p.brewery ? ` · ${p.brewery}` : ""}</p>
            <h1 className="h2">{p.name}</h1>
          </div>
        </section>
        <section className="cream prod" style={{ background: "var(--cream)" }}>
          <div className="wrap prod-grid">
            {p.image && <Frame className="prod-img"><Image src={p.image} alt={`${p.name}${p.brewery ? `, ${p.brewery}` : ""}`} width={640} height={640} sizes="(max-width: 52rem) 100vw, 40vw" priority /></Frame>}
            <div className="prod-body">
              <p className="prod-meta">
                {p.abvNum !== null && <span>{p.abvNum}% ABV</span>}
                {p.style && <span>{p.style}</span>}
              </p>
              <p className="prod-price">£{price.toFixed(2)} <small>{available ? "In stock" : "Sold out"}</small></p>
              {p.profile && <p className="lede">{p.profile.blurb}</p>}
              {p.profile && (
                <ul className="pg-flav" aria-label="Flavours">
                  {p.profile.flavour.map((f) => <li key={f}>{f}</li>)}
                </ul>
              )}
              {pairs.length > 0 && <p className="pg-goes"><b>Goes with</b> {pairs.join(", ")}{!p.profile?.pairingConfirmed && <span className="pg-sugg">suggestion</span>}</p>}
              <div className="pg-btns prod-btns">
                {available ? (
                  <>
                    <button type="button" className="pg-btn soft" data-add={p.handle}>Add to basket</button>
                    {checkoutOn() && link ? <a className="pg-btn solid" href={link}>Buy now</a> : <button type="button" className="pg-btn solid" disabled>Buy now</button>}
                  </>
                ) : (
                  <button type="button" className="pg-btn solid" disabled>Sold out</button>
                )}
              </div>
              {!checkoutOn() && <p className="note-s">Online checkout opens soon. You can add this to your basket now, or come into the shop at 13 Station Road, Milngavie.</p>}
              <p className="note-s">18+ only, please drink responsibly.</p>
              <p><a href={range[1]}>← All {range[0].toLowerCase()}</a></p>
            </div>
          </div>
        </section>
      </main>
      <Behaviour products={catalogue.products} solid={true} />
    </>
  );
}
