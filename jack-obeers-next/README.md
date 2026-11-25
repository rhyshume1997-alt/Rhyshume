# Jack O' Beers & Deli: Next.js prototype

Private, isolated prototype. **Not deployed, not connected to Shopify, no credentials.** It exists so the Rev 5 design can move from static HTML to Next.js while the grant and contract are still open. Do not merge or deploy without the owner's approval. When the work is approved it should move to its own repository.

## What this is

A first-pass lift of the Rev 5 static preview (`../p-5c2e81a7f3b04d96/rev5/`):

- Next.js 16 (App Router), React 19, TypeScript strict, pnpm. No other dependencies.
- Pages: `/` (home), `/drinks?c=beers|ciders|wines|kegs`, `/product?h=<handle>`.
- Markup was converted from the HTML to JSX (`src/app/*`, `src/components/*`), with the same class names and the same `rev5.css` (`src/app/globals.css`).
- Behaviour (opening animation, shelf, bottle cursor, panels, basket) is the original script (`src/lib/rev5.ts`), run in a client component (`src/components/Behaviour.tsx`) with its listeners removed on unmount. It is `@ts-nocheck` on purpose and is meant to be replaced piece by piece with React components.
- Products come from `getCatalogue()` in `src/lib/catalogue.ts`. Today that returns **sample data** (`src/data/demo-products.json`). This is the single place where the Shopify Storefront API goes later.
- The checkout button opens a "not connected" dialog. Nothing is charged or sent.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build && pnpm start
```

## Tested (25 Nov 2026, Chromium via Playwright against `next start`)

- Production build and TypeScript pass.
- Home headline animates, shelf builds, Shop > Ciders > a drink opens the panel with flavour, pairings and allergens, add to basket works, basket survives a page load, product page renders.
- axe (WCAG 2.2 AA and best practice) reports no violations on `/`, `/drinks` and `/product`.
- No console errors or failed requests. Reduced motion lights all headline letters. No sideways scroll on an iPhone 13 profile.

## Not verified

- Real phones and other browsers, Vercel hosting, Core Web Vitals, keyboard-only pass in this build.
- Everything Shopify: nothing has been run against a real store.
- Fonts: Source Sans 3 and Newsreader stand in for Dubai, which is unlicensed. Licences for the media and the temporary AI-generated footage are unchecked.
- Next.js dev-mode hydration warnings were not checked (only the production build).

## Known shortcuts (to do next)

1. Replace `rev5.ts` with React components (shelf, panel, basket, opening) so nothing touches the DOM directly.
2. `<img>` tags to `next/image`, fonts to `next/font`.
3. `/product?h=` to `/product/[handle]` rendered on the server.
4. Real Storefront API client, cart cookie and checkout redirect (plan in `docs/concepts/jack-obeers/implementation/implementation-plan.md`).
5. Alcohol checkout and delivery stay disabled until licensing checks are done.
6. Replace the placeholder imagery with the shop's own photos and video.
