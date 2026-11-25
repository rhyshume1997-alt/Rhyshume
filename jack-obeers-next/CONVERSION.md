# Conversion pass: what it does and what it needs

Everything works with `CHECKOUT_ENABLED` off. Checkout and the payment hold (the switch, the 18+ declaration, the 35 pound
minimum) are unchanged. The only checkout file change: the basket may now also hold deli, hampers and event tickets, so the
product lookup there reads from all basket categories, not only drinks.

| # | What | Where | Needs |
|---|---|---|---|
| 1 | Open now pill, UK time | header, hero, hero card (`src/lib/open-now.ts`) | Hours in `brand.ts`. Bank holidays are not known [Michael to confirm hours] |
| 2 | Free delivery bottle in the basket | `src/lib/shipping.ts` | Rhys to check 50 / 4.99 against Shopify admin (this site cannot read the shipping setup) [Michael to confirm] |
| 3 | Google reviews section: "5 star reviews on Google", Read the reviews, Leave a review (no count, no quotes) | `GOOGLE_REVIEWS` in `src/lib/site.ts` | Place ID for the review box (see MICHAEL-NEEDS.md) |
| 4 | Only N left (5 or fewer) | cards and product pages | **Shopify Storefront token needs the "Read inventory" permission** (`unauthenticated_read_product_inventory`). Without it nothing shows, by design |
| 5 | Phone bar: Call, Directions, Shop beers | phones only | Nothing |
| 6 | Floating hero card | wide screens | 2 minutes from the station and 200 m from the Way start are marked [Michael to confirm] |
| 7 | Find me a beer | beer range, `FindABeer.tsx` | Only beers that have a profile in `profiles.json` can be suggested |
| 8 | Round seal | taps section, `Seal.tsx` | Nothing. No year, no award |
| 9 | Spark on add to basket | 150 ms ease-out, still ring with reduced motion | Nothing |
| 10 | New in row | beer page | Uses Shopify created dates. Hidden if most of the range was created in the last 30 days (a bulk import) |

Skipped because it needs a backend or a new account: none. Live star ratings would need the Google Places API (a backend
and a key), so item 3 is numbers you update by hand.

## Tests

`pnpm verify` type checks, then builds the site against a fake Shopify and runs the tests on a desktop and an iPhone size.
`tests/two-clicks.spec.ts` is Michael's rule: from the home page to Add to basket in two clicks or fewer for beer, cider,
wine, deli, gifts and events. The opening's Skip is not counted. `.github/workflows/jack-obeers-verify.yml` runs it on every
push to this branch and on pull requests, and fails if any category needs a third click.
