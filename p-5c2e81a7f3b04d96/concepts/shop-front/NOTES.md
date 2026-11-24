# Concept: The Shop Front

Bright, friendly, illustrated and rounded. The home page is a drawn shop front; the sections are the shelves inside.

## Palette (contrast measured with WCAG formula)
| Name | Hex | Role | Text pairs |
|---|---|---|---|
| Navy | #16233F | text, outlines | on cream 14.5:1, on butter 11.4:1, on paper 15.1:1 |
| Cream | #FFF6DD | page, cards | |
| Paper | #FFFBEF | card faces | |
| Butter yellow | #FFD95A | hero sky, chips | navy on it 11.4:1 |
| Tomato red | #C93A1F | buttons, awning, door | white on it 5.1:1, cream on it 4.7:1 |
| Teal | #0F7070 | building, deli card, links | white on it 5.9:1, teal on paper 5.7:1 |
| Soft tints | #FFEFB0 #CDEBE6 #FBE0D6 | card backdrops | navy on them 12.4 to 13.5:1 |
| Muted navy | #46506B | small secondary text | on cream 7.4:1 |

## Type
Fredoka 600/700 (display) and Nunito Sans 400/700 (body), latin subset woff2, self-hosted in `fonts/` (68 KB total). Both SIL Open Font License 1.1 (via @fontsource).

## Layout idea
The first screen is an inline-SVG shop front (sign board with the supplied logo image, striped awning, arched window of bottles and deli things, door, barrel, plant, house number 13). Under it: a status card with the live open/closed message. The shelves (three ranges, product shelf on wooden planks, how it works, find us, newsletter and members) sit behind the door on a striped "wallpaper". On phones the scene is cropped around the sign and door so they stay readable.

## Signature interaction: the shop door sign
Real object: the OPEN/CLOSED sign hung on a shop door. It is real: it uses Europe/London time (Intl, so BST is handled) against Wednesday to Monday 11am to 7pm. Tuesday is treated as closed and shows "Tuesday to be confirmed" on the sign and in the text. The sign flips (spring, 0.5 s) when the state changes; it rechecks every 30 s. The state is also written out as text under the scene (role="status").
Clicking, tapping or pressing Enter/Space on the door swings it open (0.65 s) and reveals the shelves; the "Let me in" button does the same. Links in the nav or page that point inside the shop open the door instantly first. Reduced motion: no swing, no flip, no reveal animation, instant jump, awning sway off. Without JavaScript everything is visible.
Demo helper: add `?at=2026-11-25T12:00:00Z` to the URL to preview any moment (for showing the Closed sign).

## Why it suits Jack O'Beers
- Shop front scene: the business is a real shop on Station Road, so the site starts at the door.
- Warm yellow, red and teal with rounded shapes: matches "warm, friendly, rounded, homey" and sits well with the bull logo.
- Shelves and wooden planks: product cards look like stock on a shelf, which fits a beer and deli shop.
- Real hours on the door sign: useful to visitors and honest about the unconfirmed Tuesday.
- Cheese, jars and salami in the window and the deli card: gives the deli equal visual weight, with a nod to the deli feel without copying New York clichés.

## Trade-offs
- Best at: personality, memorability, a clear "open or closed" answer, warmth on a phone.
- Worst at: the very first screen is illustration, not products, so shoppers need one extra tap to reach the shelves (though nav links jump straight in); the "hidden until door opens" idea needs explaining to the owner and would need careful SEO treatment in production; the scene art is fixed drawing, harder to change than photos.

## Missing or assumed
- Tuesday: assumed closed on the sign until confirmed.
- All products are Sample data (8 of the 15). Prices, ABV, allergens, pairings, hamper contents, deli range, click and collect and shipping terms, keg/keezer rental and member benefits are all labelled "to be confirmed".
- Social links are placeholders (`href="#"`). Directions link is a Google Maps search URL.
- Only the supplied logo PNG is used as an image (unaltered). No temporary AI imagery used. All illustration is custom inline SVG.
- Basket is a demonstration (count and list only; no data stored or sent). Newsletter sends nothing.
- Copy such as "a craft beer and deli shop in Milngavie" and "Come on in" is written from the supplied facts; please check it.
