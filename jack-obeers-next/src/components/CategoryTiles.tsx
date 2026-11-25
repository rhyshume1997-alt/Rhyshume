import type { Category, Product } from "@/lib/catalogue";

const TILES: { cat: Category; href: string; title: string; unit: string; blurb: string }[] = [
  { cat: "beer", href: "/beers", title: "Beer", unit: "beers", blurb: "The whole range on one screen" },
  { cat: "cider", href: "/ciders", title: "Hard Cider", unit: "ciders", blurb: "Dry through to fruity" },
  { cat: "wine", href: "/wines", title: "Wine", unit: "wines", blurb: "Red, white and fizz" },
  { cat: "events", href: "/events", title: "Event Tickets", unit: "events", blurb: "What's on and how to get in" },
  { cat: "subscriptions", href: "/draught-club", title: "Subscription Services", unit: "plans", blurb: "The Draught Club" },
];

/** The five ways into the shop. One click on a tile, one click on Buy now. */
export function CategoryTiles({ all }: { all: Product[] }) {
  const count = (c: Category) => all.filter((p) => p.category === c).length;
  return (
    <section className="tiles-sec cream" id="shelf" aria-labelledby="tl-h">
      <div className="wrap">
        <p className="mono">Shop</p>
        <h2 className="h2" id="tl-h">Pick a <em>shelf.</em></h2>
        <ul className="tiles">
          {TILES.map((t) => {
            const n = count(t.cat);
            return (
              <li key={t.cat}>
                <a className="tile" href={t.href}>
                  <b>{t.title}</b>
                  <span className="tile-n">{n > 0 ? `${n} ${n === 1 ? t.unit.replace(/s$/, "") : t.unit}` : "Coming soon"}</span>
                  <small>{t.blurb}</small>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
