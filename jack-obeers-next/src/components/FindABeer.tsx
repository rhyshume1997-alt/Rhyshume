"use client";

import { useMemo, useState } from "react";
import type { Card } from "@/lib/cards";
import { AddToBasket } from "@/components/AddToBasket";

/**
 * "Find me a beer": three tap questions, no sign-up. It matches the answers to the flavour chips in src/data/profiles.json,
 * so it only ever points at beers that have a profile, and only says what the profile says. The chip lists below are the
 * words that appear in profiles.json. A new chip that is in no list simply counts for nothing.
 */
const DARK = ["dark", "rich", "barrel aged", "chocolate", "toasted malt", "oak"];
const BITTER = ["bitter", "hoppy", "resinous", "pine", "piney", "dry", "dry finish", "spicy"];
const SWEET = ["sweet", "mild sweetness", "caramel", "honey", "vanilla", "bubblegum", "orange soda"];
const FRUITY = ["fruity", "cherry", "citrus", "grapefruit", "lemon", "lime", "mango", "orange", "papaya", "passionfruit", "pineapple", "raspberry", "stone fruit", "tropical", "juicy", "tart", "orange soda"];

type A = { shade?: "light" | "dark"; taste?: "bitter" | "sweet"; fruit?: "fruity" | "not" };
const has = (chips: string[], list: string[]) => chips.filter((c) => list.includes(c.toLowerCase()));

/** Returns the matching score and the chips that explain it. */
export function scoreBeer(chips: string[], a: A): { score: number; why: string[] } {
  let score = 0;
  const why: string[] = [];
  const dark = has(chips, DARK), bitter = has(chips, BITTER), sweet = has(chips, SWEET), fruity = has(chips, FRUITY);
  if (a.shade === "dark" && dark.length) { score++; why.push(dark[0]); }
  if (a.shade === "light" && !dark.length) { score++; }
  if (a.taste === "bitter" && bitter.length) { score++; why.push(bitter[0]); }
  if (a.taste === "sweet" && sweet.length) { score++; why.push(sweet[0]); }
  if (a.fruit === "fruity" && fruity.length) { score++; why.push(fruity[0]); }
  if (a.fruit === "not" && !fruity.length) { score++; }
  return { score, why };
}

const Q: { key: keyof A; q: string; opts: [string, string, string, string][] }[] = [
  { key: "shade", q: "Light or dark?", opts: [["light", "Light", "dark", "Dark"]] as never },
  { key: "taste", q: "Bitter or sweet?", opts: [["bitter", "Bitter", "sweet", "Sweet"]] as never },
  { key: "fruit", q: "Fruity or not?", opts: [["fruity", "Fruity", "not", "Not fruity"]] as never },
];

export function FindABeer({ cards }: { cards: Card[] }) {
  const [a, setA] = useState<A>({});
  const answered = Object.keys(a).length;
  const picks = useMemo(() => {
    if (!answered) return [];
    return cards
      .filter((c) => c.profile && c.profile.flavour.length > 0 && c.available)
      .map((c) => ({ c, ...scoreBeer(c.profile!.flavour, a) }))
      .filter((r) => r.score >= Math.min(answered, 2))
      .sort((x, y) => y.score - x.score || x.c.name.localeCompare(y.c.name))
      .slice(0, 3);
  }, [cards, a, answered]);
  const set = (k: keyof A, v: string) => setA((p) => ({ ...p, [k]: p[k] === v ? undefined : v }) as A);
  return (
    <details className="find">
      <summary>Find me a beer</summary>
      <div className="find-body">
        {Q.map((q) => {
          const [v1, l1, v2, l2] = q.opts[0];
          return (
            <div key={q.key} className="find-q" role="group" aria-label={q.q}>
              <span>{q.q}</span>
              <div className="seg">
                {[[v1, l1], [v2, l2]].map(([v, l]) => (
                  <button key={v} type="button" className="seg-btn" aria-pressed={a[q.key] === v} onClick={() => set(q.key, v)}>{l}</button>
                ))}
              </div>
            </div>
          );
        })}
        <div className="find-out" role="status" aria-live="polite">
          {answered === 0 && <p className="find-hint">Tap an answer or two and we will point you at a beer.</p>}
          {answered > 0 && picks.length === 0 && <p className="find-hint">Nothing matches those yet. Try a different answer, or look through the whole range.</p>}
          {picks.map(({ c, why }) => (
            <div key={c.handle} className="find-pick">
              <div>
                <a href={`/product/${c.handle}`}><b>{c.name}</b></a>
                <small>{[c.brewery, c.abv !== null ? `${c.abv}% ABV` : "", `£${c.price.toFixed(2)}`].filter(Boolean).join(" · ")}{why.length ? ` · ${why.join(", ")}` : ""}</small>
              </div>
              <AddToBasket handle={c.handle} name={c.name} stock={c.stock} sizes={c.sizes} />
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
