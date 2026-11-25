# Preview looks and notes (previews only)

On preview deployments (not the live site) the pages carry a small "Look" switch bottom-left and a "Notes" tab down the right edge.
Neither is rendered when the site is the live deployment or `SITE_INDEXABLE=true` (`tests/preview.spec.ts` checks this).

## Looks
Add `?look=` to any preview link. It is remembered for the tab (sessionStorage).

| Link ending | Look |
|---|---|
| none, or `?look=behind` | **Behind the Counter** (Rev 5 selected direction), see BEHIND-THE-COUNTER.md |
| `?look=original` | The earlier site, unchanged, with the opening animation |
| `?look=classic` | The original page and animations in Bodoni Moda (headings) and Lora (text) |
| `?look=backbar` | Dark tap-wall hero, brass square buttons, Cormorant Garamond and Lora |
| `?look=cinematic` | Four full-screen video scenes, grain and letterbox bars, then the shop |

Fonts: Bodoni Moda, Cormorant Garamond and Lora are SIL Open Font Licence (free for commercial use), self-hosted in `public/fonts`.
New York, Recoleta and Lost Saloon are NOT used: they are personal use or demo only.

## Notes
The Notes drawer saves in the browser it is written in (localStorage). It can copy, download or email all notes.
It does not send notes anywhere by itself, so the owner cannot see them until they are copied or sent.
Saving to a shared place needs a store (see the question in the hand-over); nothing is connected.
