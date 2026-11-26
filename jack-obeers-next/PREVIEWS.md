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

## Typography comparison (Rev 6)
Add `?type=a`, `?type=b` or `?type=c` to any preview link. A is the selected system (Gloock and Source Serif 4), B is Bodoni Moda and Spectral, C is Newsreader and Lora.
It is remembered for the tab. Dubai (the client preference) is not available on the site because its web licence is unverified. See REV6-DESIGN.md.
