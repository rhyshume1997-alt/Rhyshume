import { AddToBasket } from "@/components/AddToBasket";
import { Landing } from "@/components/Landing";
import { getCatalogue } from "@/lib/catalogue";
import { stockOf } from "@/lib/cards";
import { pageMeta } from "@/lib/seo";
import { DELI_CABINET } from "@/lib/photos";
import { PHONE, PHONE_HREF } from "@/lib/site";

export const metadata = pageMeta({
  title: "Beer gift boxes and hampers in Milngavie",
  description: "Beer gift boxes and gift hampers from Jack O’Beers and Deli, Milngavie. See the current hampers, or call 07405 480950 to ask about gifts.",
  path: "/beer-gift-boxes",
});

const money = (n: number) => `£${n.toFixed(2)}`;

/** Hampers come from Shopify products typed as hampers. Nothing about what is in a box is written here: it comes from the product. */
export default async function Page() {
  const catalogue = await getCatalogue();
  const hampers = catalogue.all.filter((p) => p.category === "hampers");
  return (
    <Landing
      path="/beer-gift-boxes"
      crumb="Beer gift boxes and hampers"
      mono="Gifts"
      h1={<>Beer gift boxes <em>and hampers.</em></>}
      lede="Gift hampers from Jack O’Beers and Deli in Milngavie. What is on offer changes, so the current ones are listed here."
      photo={DELI_CABINET}
      sections={[
        { h: "Current hampers", body: hampers.length ? (
          <ul className="gift-list">
            {hampers.map((p) => {
              const v = p.variants.find((x) => x.available) || p.variants[0];
              const on = p.variants.some((x) => x.available);
              return (
                <li key={p.handle}>
                  <a href={`/product/${p.handle}`}><b>{p.name}</b></a> {v ? <span>{money(v.price)}</span> : null}
                  {on ? <AddToBasket handle={p.handle} name={p.name} stock={stockOf(p)} /> : <span> Sold out</span>}
                </li>
              );
            })}
          </ul>
        ) : <p>There are no hampers listed online right now. Call <a href={PHONE_HREF}>{PHONE}</a> or come into the shop to ask about gifts.</p> },
        { h: "Add something from the deli", body: <p>The deli counter sells pork pies, salami beer sticks, cheeses, oatcakes, chutneys, chilli jams and popcorn at £3.50.</p> },
      ]}
    />
  );
}
