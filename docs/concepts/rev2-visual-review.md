# Rev 2.1: visual quality review

Status: review of the two proofs on `claude/cinematic-poc`. Not merged, not deployed to production. No other concept was touched. The full review with screenshots and recordings is in the review artifact; this file keeps the findings in the repository.

## Verdict

Against Tobia Donadon's level of ambition neither concept is there yet. Both are clean, restrained and technically sound, and the interactions (expanding print, keep, menu tabs) are good, but they sit closer to a polished template with an animated hero than to an art directed cinematic experience. The biggest gaps are the lack of real motion in the openings, the lack of scene-to-scene transitions, and objects that do not belong to their scenes.

## What to keep

- Olive & Ivory: the type pairing and palette discipline, the clock numerals, the expanding print from its thumbnail, kept moments with the sage ring, the reply card and its stamp.
- Salt & Ember: the headline running across the plate edge, the menu as tabs (tap, hover, keyboard, arrows), the restraint of the colour, and the honest labelling.
- Both: reduced motion and no-WebGL fallbacks, the tested keyboard paths, zero axe violations, no layout shift.

## Distance from the reference (observed)

| Lever | Reference | Ours | Gap |
|---|---|---|---|
| Orchestrated intro sequence | A photo-strip loader on near-black that resolves into the page, with a loader-gone keyframe (seen in screenshots and the CSS). | None. Pages simply load. | Missing |
| Bespoke motion artwork per section | About 117 named keyframe animations in his stylesheet, in families per project and section (floating, folding, drawing, curtain, aurora). | Six keyframes in total. Sections are photographs plus type. | Missing |
| Cursor as part of the design | An orange cursor dot and an image trail that pops along the pointer (trail-pop keyframe). | Hover changes a picture or a colour. The cursor is never part of a scene. | Missing |
| Advanced type | GSAP with SplitText and ScrollTrigger in the bundle; per-character reveals; masks (about 40 mask references). | Words rise from a mask; one script write-on wipe. No per-letter light, no type reacting to the scene. | Partial |
| Depth and layering | Sticky stacked project layers, aurora layers drifting at different speeds, mix-blend-mode in places. | One image plane per scene. The fire embers sit on top of the photograph, not inside it. | Partial |
| Scroll as direction | Scroll-driven view() animations and pinned stacking. | One custom property fading embers; a sticky picture. No scene transition that carries an object from one section into the next. | Partial |
| Restraint and clarity | Large calm type, plenty of space, honest copy. | Present. This is where we are closest. | Comparable |
| Accessibility and reduced motion | Many prefers-reduced-motion rules (about 45 matches in his CSS). | Tested: stills for reduced motion, keyboard works, no axe violations. | Comparable |

## Findings

Artificial means it looks fake or pasted. Generic means it looks like a template. Incomplete means it looks unfinished. Judgements are my opinion and are marked as such in the review.

### Olive & Ivory

| ID | Type | Element | Why | Fix |
|---|---|---|---|---|
| O-1 | Artificial | Opening: curtain "movement" | The sway is a 1 to 3 pixel displacement of pixels on a still. The dress, window and room do not move and there is no camera move. At normal viewing it reads as shimmer, not fabric. | Real or generated footage of the scene (route A below), or a depth-based camera move. |
| O-2 | Artificial | Script name "write-on" | A rectangular wipe over finished lettering. A viewer sees a reveal, not a pen. (Judgement.) | Stroke-by-stroke SVG path of the name, drawn with a mask, or accept the wipe and drop the word "handwriting" from the pitch. |
| O-3 | Artificial | Photograph softness | The images are 360 x 540 px shown at about 1.6 to 1.8x, with visible painterly smearing in the dress and curtains. | High resolution originals (2400 px or more on the long edge). |
| O-4 | Artificial | Small overlapping photograph with a thick ivory outline | A pasted-sticker trope. It does not belong to the scene. | Remove, or make it a real layer that moves with the camera. |
| O-5 | Generic | Hero composition | Type on the left, a tall image on the right, two buttons: the standard split hero. The type is restrained and good, but the composition has no idea of its own. | Let the scene fill the opening and put the type inside it, with the sheet as the transition (see direction D1 below). |
| O-6 | Generic | The "contact sheet" | Four staggered photographs. The contact sheet exists only in the heading and numbers. There is no film edge, frame border, paper, grease-pencil mark or index strip, so it reads as a gallery. | Design the sheet as an object: sheet paper, frame borders, edge codes, hand marks. 20 or more frames. |
| O-7 | Generic | Expanded print | A standard lightbox card (image, text, buttons). The expansion motion is good; the object it expands into is not. | Expand into a "print" on a table: margins, caption in a handwritten style, a pencil mark. |
| O-8 | Generic | Follow the day | Standard sticky-image scrollytelling with plain crossfades. Between moments the page is flat ivory with large empty areas (about 1,700 px of mostly blank page in the full-page view). | Make each moment a scene transition (shared element, light change) and tighten the spacing. |
| O-9 | Generic | Reply card | A lovely idea (stationery, stamp) carried by an ordinary stepper form. | Keep. Add paper texture treatment only if it can stay flat and fast. |
| O-10 | Incomplete | Photograph count | Only four photographs, and each is used two or three times (opening, sheet, day). The sheet needs about 24. | More images from the same shoot or generation, at high resolution. |
| O-11 | Incomplete | No transitions between scenes | Sections cut from one to the next. There is no moment where the opening becomes the sheet. | Build the "develop" as a true transition (see D1). |
| O-12 | Incomplete | No intro or arrival | The page starts at the top with no arrival moment. | A short, skippable arrival that is part of the story, not a loader for its own sake. |

### Salt & Ember

| ID | Type | Element | Why | Fix |
|---|---|---|---|---|
| S-1 | Artificial | Fire movement | Pixels that are orange and bright are wobbled by noise and brightened. No flame is born, splits or dies, the steak and grill never change, and the flames keep their shape. It reads as heat shimmer on a picture. | Real or generated flame footage, or an FX-tool render (route B). |
| S-2 | Artificial | Embers | Soft dots on a near-straight diagonal, similar in size and brightness, launched from a rectangle rather than from the fire. They light nothing, ignore the flames and ignore the cursor. | Spawn from the footage, vary size and heat, let them lift the type and react to the pointer. |
| S-3 | Artificial | The photograph does not light the page | A hard-edged rectangle with a 2 px rule against flat brown. The fire casts no light on the headline or the background, so the plate feels pasted in. | Drive a warm flicker on the page from the footage brightness (opacity only); let the fire fill or bleed beyond a rectangle. |
| S-4 | Artificial | Photograph softness | Flames look smeared at about 1.6x in the close-up. | High resolution original or footage. |
| S-5 | Artificial | Headline over the flames | "something" crosses a bright flame and loses crispness. | Keep the type in the dark area or give the flame a dark pass behind letters. |
| S-6 | Generic | Menu and reservation | Clean and usable, and the menu is the strongest part, but the layout (list left, picture right) and the default reservation form are conventional. | Keep the interaction; give the menu photograph a stage (it should arrive from the fire, not appear beside it). |
| S-7 | Generic | The hand-off | Embers fade by opacity and the plate drifts. It is a fade, not a transition. | A scene transition: the fire dies, the light dims, the camera pushes through the flame into the first dish (D3). |
| S-8 | Incomplete | Empty space and content | Under the course list on desktop there is a large empty block. There are no dish names or detail views, deliberately, but the section feels unfinished. | Real menu content from a restaurant, or a clearly labelled sample dish set. |
| S-9 | Incomplete | Mobile menu | The photograph sits above the list and is not sticky, so on a phone you can tap a course and change a picture that has scrolled out of view. (From the layout; to be confirmed on a real phone.) | Make the photograph sticky at the top on phones, or place a small thumbnail beside each course. |
| S-10 | Incomplete | No arrival, no cursor, no sound | No intro sequence, nothing reacts to the pointer, and there is no sound design. | Decide how far to go (D2). |

## Replacing the temporary scenes

Code that moves a photograph cannot become convincing cinema. Convincing motion needs footage (filmed, generated or simulated) or a scene built from separate layers.

- **Olive & Ivory opening:** A1 real or licensed footage; A2 image-to-video from the supplied photograph (generated by Rhys, labelled); A3 depth-based camera move; A4 Blender (not recommended for a wedding).
- **Salt & Ember fire:** B1 real flame and ember footage composited with a screen blend; B2 FX-tool render with alpha; B3 image-to-video from the grill photograph; B4 better code only (layers, light cast, embers from the flame, cursor wind).
- **Integration:** muted looping inline video with a poster, 1080p H.264 plus WebM, about 2 to 3 MB and a vertical mobile cut, paused off screen, poster only for reduced motion or data saver. For the fire, a small canvas samples brightness to drive a page flicker (opacity only) and spawn embers.

## Footage pipeline test

`lab/fire.html` with `lab/render.js` renders a procedural fire frame by frame and the frames were encoded with ffmpeg. 120 frames at 1280 x 720 rendered in about 16 seconds into a 458 KB MP4. The loop is seamless (last to first frame difference 0.99, same as neighbouring frames). **The pipeline works but the picture is not good enough**: it reads as a glowing yellow mass, so from-scratch code fire is not hero quality. This is evidence only and is not used on either page.

## Directions for the fire opening (not selected)

- D1 Hearth film: footage fills the screen, the page is lit by the fire, the plate shrinks into the menu panel.
- D2 Ignition: the headline starts dark, a spark crosses it and lights each letter while embers rise.
- D3 Through the flame: scroll pushes the camera into the fire and cuts to the first dish.

## Limits

Automated review, aesthetic judgements are opinion, comparison uses only the reference pages that could be loaded and read, recordings and measurements are from headless software rendering, and nothing was tested on a real phone or GPU, in Safari or Firefox, or with a screen reader.
