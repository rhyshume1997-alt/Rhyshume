# Jack the bull: logo animation brief (to supply)

The site has a gimmick: **Jack lies down in the footer. When a visitor clicks a link he gets up and headbutts the current page out of the way, and the new page is revealed underneath.** Today this runs on a stand-in: the supplied 355 px logo, rotated and slid with CSS. It works, but real animation will be much better. This is what to supply.

## What exists now (so you can see the beats)
1. **Rest** (footer, loops): Jack lying on his side, gently breathing, "z z z" rising. `site/assets/css/site.css`, `.rest`.
2. **Get up** (0.25 s): on click he stands up with a small overshoot. `.bull` / `.bull.up` in `site.css`, created by `site/assets/js/transition.js`.
3. **Charge and headbutt** (0.8 s): he winds back a little, lunges, and the page flies off to the right tilted about 9 degrees while he pushes it; the new page is revealed underneath. This is a cross-document view transition (`::view-transition-group(bull)`, `::view-transition-old(root)`), so it works in Chrome, Edge and Safari 18.2+. Firefox and reduced-motion users just navigate normally.

## Animations to supply (same character, same side-on or three-quarter view in every clip)
| # | Clip | Length | Notes |
|---|---|---|---|
| 1 | **Rest loop** | 2 to 4 s, seamless loop | Lying down, breathing, one ear flick. Optional "z z z". |
| 2 | **Get up** | 0.3 to 0.5 s | From lying to standing, ready to charge. Starts exactly on the last rest pose. |
| 3 | **Wind-up and headbutt** | 0.5 to 0.8 s | Step back, lower head, lunge forward. Last frame is head down, pushing. Impact frame at about 20% in (that is when the page starts to move). |
| 4 | **Push loop** (optional) | 0.3 s loop | Legs driving while he shoves the page. |
| 5 | **Idle stand** (optional) | 2 s loop | Standing, tail swish, for a hero moment. |

Also useful: a **blink/wink** (0.4 s) for the hero, and a **celebration** (1 s) for order confirmation.

## Format and size
- **Best:** vector animation, **Rive** (`.riv`) or **Lottie** (`.json`), built from a vector logo. Sharp at any size, tiny files, and we can switch states (rest, get up, headbutt) in code.
- **Next best:** transparent **WebM (VP9 with alpha)** for Chrome/Firefox plus **HEVC with alpha (.mov/.mp4)** for Safari, or an **animated WebP/APNG** sprite. Square canvas, **at least 512 x 512 px** (it is shown at about 96 to 160 px, up to 2x for retina), 30 or 60 fps, transparent background, Jack centred with a little padding, feet on the bottom edge.
- Keep each clip **under about 300 KB**.
- Colour: use the client's logo colours as supplied (palette on the site is provisional until the logo colour values are confirmed).
- Please supply the **vector logo** (SVG or AI) too: the supplied PNG is only 355 px and the text goes soft when enlarged.

## How it plugs in
- Replace `assets/media/jack-logo.png` in `.rest` (footer) and in `transition.js` with the supplied element (`<video>`, `<img>` for APNG/WebP, or the Rive/Lottie canvas), keeping the class names `.rest` and `.bull`.
- The view transition snapshots whatever `.bull` is showing at the moment of click, so the get-up clip should finish before navigation (the JS waits 280 ms; change it to the clip length).
- Provide the clips with these names: `jack-rest`, `jack-getup`, `jack-headbutt`, `jack-push`, `jack-idle`.

## Rights
Original artwork or AI-assisted: say which. If AI-generated, the commercial-use terms are **not checked**. Do not use another brand's mascot or characters.
