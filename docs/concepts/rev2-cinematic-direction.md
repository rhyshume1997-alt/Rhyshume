# Rev 2: Cinematic direction pack

Owner: Rhys Hume. Status: proof of concept for review, on branch `claude/cinematic-poc`. Not merged, not deployed to production.

Rev 2 supersedes the **creative direction** part of Rev 1 (the three Olive & Ivory directions A, B and C). The technical audit and all verified findings from Rev 1 are kept, and every defect is carried into `audit-issues.md`.

## 0. What the supplied photographs allow

The eight supplied concept images are about 360 x 540 px (0.2 megapixels). That decides the layouts:

- They are **portrait plates**. Used as full width landscape heroes they would be enlarged more than 3x and look soft, so I did not do that.
- Layouts are built around the imagery: a tall plate beside oversized type, a contact sheet of mixed crops, a sticky plate that follows the story, a menu plate that changes with the course.
- They are generated concept images and are labelled so on every page. They are not photographs of a real business, customers or work.
- For production, images need **at least 2400 px on the long edge**.

## 1. Olive & Ivory: revised cinematic direction

**Idea.** A wedding told as a photographer's edit. It opens on a single moving scene, "develops" into a contact sheet you can choose from, follows the day in moments, and ends on a reply card that borrows from wedding stationery.

**Sequence**

1. **Opening scene.** Daylight through a tall window, curtains moving, a dress on a hanger. Restrained type: the script name writes on, one Newsreader italic line, a short sentence, one button. A smaller second photograph overlaps the plate.
2. **Transition: the prints develop.** As the sheet scrolls into view the four frames come up in turn (opacity and scale), like prints in a tray.
3. **Proof sheet.** Four frames in different crops. Choose one and it expands into a large print from where it sits. Keep the moments you love; a sage ring marks them and they gather in a bar.
4. **Follow the day.** One sticky picture changes as you read each moment (08:40, 11:20, 14:00, 18:30). A sage thread fills as you go. The times are an example day, not a promise.
5. **Reply card.** The enquiry is a four step reply card with stationery details: script heading, mono labels, a double border, and a "Demo, nothing sent" stamp. The moments you kept arrive on the card.

**Stationery** appears only in the reply card and in supporting typography (script name, mono labels, a stamp). It does not take over the page.

**Palette** is unchanged: ivory #f6f0e7, text #2c2a25, sage #5b6f55, plus one darker ivory tint. **Type**: Great Vibes for the name and card heading, Newsreader for statements and times, IBM Plex Sans for text, IBM Plex Mono for labels.

## 2. Salt & Ember: revised fire direction

**Idea.** The restaurant opens on fire. A moving photograph of the grill sits against oversized type, with embers drifting across the whole opening. As you scroll the embers die down and you arrive at a menu where each course brings its own photograph.

**Sequence**

1. **Fire opening.** A tall plate on the right edge with licking flames and flicker, grain over it. Embers drift up and left across the headline. Type: "Fire, salt and something good to share."
2. **Hand-off to food.** Scrolling away, the embers fade, the plate drifts and scales slightly, and the headline lifts. Only transform and opacity change.
3. **Menu.** Four courses in large type. Tap, hover, focus or use the arrow keys and the photograph changes. No dish names, prices, allergens or opening hours are shown, because none have been supplied.
4. **Reserve.** A small demonstration that books nothing.

**Palette** is unchanged: brown #1f1612, cream #f2e7d6, terracotta #dd6b40, plus one lighter brown tint.

## 3. Visual scene specifications

### Olive & Ivory

| Scene | What the visitor sees | What moves | Fallback |
|---|---|---|---|
| Opening | Tall dress-window plate beside type, small overlay photo | Curtains and dress hem sway (shader), slow breathing of the light, script name writes on, text rises | Still photograph |
| Develop | Four frames in staggered crops | Frames fade up and settle in turn | Frames visible at once |
| Print | Large frame, caption, Keep, Previous, Next, Close | The photograph expands from its thumbnail | Dialog opens with no movement |
| Day | Sticky plate left, large time and moment right | Photograph crossfades, thread fills, clock changes colour | Four moments each with its own picture |
| Reply | Four step card, stamp | Stamp scales in | Same card, no movement |

### Salt & Ember

| Scene | What the visitor sees | What moves | Fallback |
|---|---|---|---|
| Fire | Tall fire plate, oversized headline, embers | Flames lick and flicker, embers rise and sway, grain | Still photograph, no embers |
| Hand-off | Embers fade, plate drifts, headline lifts | Driven by scroll position | Nothing moves |
| Menu | Four large courses, one photograph | Photograph crossfades and settles | Instant change |

## 4. Recommended technologies and justification

### Olive & Ivory: the two approaches, compared

| | Approach 1: footage or animated still, with HTML typography and a custom gallery | Approach 2: live WebGL scene with React Three Fiber |
|---|---|---|
| What it needs | A 5 to 8 second loop of real footage (or a rendered scene) plus the photographs | A 3D scene or a photograph mapped onto geometry, plus React, Three.js and a build step |
| Complexity | Low to medium. The proof uses about 170 lines of plain WebGL and 150 of gallery code, no libraries | High. New dependencies, a build pipeline, a scene to author |
| Mobile | Video decodes in hardware and is predictable. A small shader on one plate is light | Heavier on older phones, battery and thermal throttling are real risks |
| Accessibility | Easy: real text, real images, a still fallback | Possible but needs more work (canvas is opaque to assistive tech) |
| Performance | One video or one shader plate, measured at 61 fps in software rendering | Larger JavaScript, longer start, more to go wrong |
| Meaningful visual benefit | High, for a film-like opening | Low. A wedding is about people and light in photographs. Live 3D would add a technology demo, not a better story |

**Recommendation: Approach 1.** Real footage (or a rendered loop) behind HTML type, and a vanilla JavaScript gallery. I did not build Approach 2 because it would be live 3D for its own sake, and the brief says not to. React is not needed for what the proof does; it is worth adding only if the studio moves to a build pipeline for reasons beyond this one page, and that is a decision for Rhys.

### Salt & Ember: options investigated

| Option | Verdict |
|---|---|
| Pre-rendered flame and ember footage | **Best quality**. A filmed or rendered flame loop is the most convincing. Needs footage. Recommended as the production upgrade. |
| Layered transparent assets (WebM with alpha, or PNG sprites) | Good for embers over type. Browser support for alpha video varies, so keep a fallback. Recommended for the ember layer if footage is used. |
| WebGL particles | Works and is light for sparks. **Used in the proof as a 2D canvas** because a few dozen sparks do not need GPU particles. |
| Shader fire | A fully procedural flame looks stylised and costs more to tune. **Used only to move the flames already in the photograph** (flame pixels are displaced and flicker). |
| Scroll controlled transitions | Used for the hand-off: one custom property, transform and opacity only. |
| Reduced motion | The fire and embers do not start; the page shows the still photograph. Tested: no change between frames. |

**Recommendation for the proof and for production:** keep the photograph as the base and fallback, add the shader movement and embers (built), and upgrade the opening to real footage when it exists. Do not add React Three Fiber.

## 5. Asset production requirements

**Olive & Ivory**

- Opening footage: 5 to 8 seconds, seamless loop, locked-off camera, a real window with real curtains and a dress, natural light, subtle movement only. 3840 x 2160 master, delivered as MP4 (H.264) at about 1080p, 24 or 25 fps, **under 2.5 MB** for desktop and a separate vertical 1080 x 1350 cut **under 1.2 MB** for mobile. Poster frame as a JPEG or WebP.
- Photographs: at least 24 frames for a full proof sheet, **2400 px or more on the long edge**, a consistent grade, mixed portrait, landscape and detail crops. Filenames, source and licence logged in the image register.
- Real client work: the client's own photographs, with permission.

**Salt & Ember**

- Fire footage: 6 to 8 second seamless loop of flames on a dark background, 1080p, H.264, **under 3 MB**, plus a poster still. If alpha is wanted, a matching WebM with alpha.
- Ember layer: 1080p loop on black (blended with a screen mode) or a transparent WebM, **under 1 MB**.
- Food photography: at least 4 to 8 images, **2400 px or more on the long edge**, dark editorial grade.
- Menu content from the restaurant: dish names, descriptions, allergens, prices, opening hours. None of this is invented.

**Not possible in this environment:** Blender is not installed, so no 3D scene or rendered footage could be produced here. The proofs honestly use animated stills instead.

## 6. Desktop and mobile presentation

- **Desktop, Olive & Ivory:** two columns. Type left, tall plate right with the small overlay photograph. The contact sheet is a single row of four frames of different heights.
- **Mobile, Olive & Ivory:** the plate comes first at 4:5, the name sits below it. Frames become a two column ladder. The day sequence puts the sticky plate in a strip at the top while the moments scroll under it. A sticky bottom bar holds "Check my date".
- **Desktop, Salt & Ember:** the plate runs to the right edge from the header down. The headline overlaps its edge. Embers cross the whole opening.
- **Mobile, Salt & Ember:** the plate is first at 4:5 and the headline follows. Menu courses sit under the photograph so a tap on a course changes the picture above it.
- Layouts were checked at 320, 390, 768, 1280 and 1920 px wide. There is no horizontal overflow at any of them.

## 7. How each interaction works

- **Opening scene:** a WebGL layer draws the photograph and moves masked regions slowly; it stops when off screen or when the tab is hidden, and the still image underneath is the fallback.
- **Develop and reveals:** an IntersectionObserver adds a class; CSS moves opacity and scale.
- **Print:** native `<dialog>`, so focus is trapped and Escape closes. The photograph expands from its thumbnail by transform. Arrow keys move between frames. Keep toggles a sage ring and fills the "moments you kept" bar.
- **Day sequence:** one observer per moment sets the active one; the sticky picture crossfades and the thread's scale follows.
- **Reply card:** four fieldsets, one visible at a time, with step announcements. Submit shows a summary and the stamp. Nothing is sent, saved, or stored.
- **Fire:** the shader displaces and flickers the flame pixels; a 2D canvas draws embers; a scroll handler sets one property that fades and lifts them.
- **Menu:** the pattern is tabs. Tap, hover (mouse only), focus and arrow keys all select. The panel text and photograph update.

## 8. Proposed implementation sequence

1. Review this proof: choose what to keep, change or drop. (You are here.)
2. Replace the supplied images with high resolution versions, and, if wanted, real or rendered footage for the two openings.
3. Fix the open issues on the other six concepts in one small change (see `audit-issues.md`).
4. Rebuild Bright Circuit Electrical in a clearly different style (for example a technical control panel scene), using the same small foundations.
5. Repeat for the other five concepts, one at a time, with evidence for each.
6. Only then extract shared components, and only those used twice.
7. Integrate approved proofs into the portfolio (needs your approval).
8. Client Design Studio.

## 9. Technical and performance risks

- **Image resolution** is the biggest risk. Soft photographs undo the cinematic feel.
- **Animated still is not film.** Viewers may notice. It is labelled honestly on the pages.
- **WebGL on low-end phones**: capped at 1.5x device pixel ratio and 30 fps on small screens, paused off screen, with a still fallback. Not tested on real devices.
- **Context loss** (a phone backgrounding the tab): handled by returning to the still.
- **Scroll effects** use one property and no scroll hijacking. The page scrolls normally.
- **Accessibility**: the canvas is `aria-hidden` and the real image stays in the page with alt text. Reduced motion shows only still images. Not tested with a screen reader.
- **Page weight**: about 110 to 210 KB per page in a local measurement. Real footage will add 2 to 5 MB, so lazy loading and poster images matter.
- **Browser support**: scroll driven CSS is not used in the proofs. The dialog, sticky positioning and WebGL are widely supported.

## 10. Demonstrable now versus needs asset production

| Can be demonstrated now | Needs asset production |
|---|---|
| Moving opening scenes (as animated stills) | Real footage or a rendered loop for either opening |
| Interactive proof sheet, expanding print, keep and favourites | A full set of 24 or more high resolution frames |
| Follow-the-day sequence | The real day's photographs and the real timeline |
| Step-by-step reply card with a stamp | Wedding stationery artwork, if wanted |
| Fire hand-off to a menu with changing photographs | Dish names, descriptions, allergens, prices, hours from a real restaurant |
| Reduced motion and no-WebGL fallbacks | Photography at 2400 px or more for sharp large screens |

## Salt & Ember: technical scene specification

**Asset requirements.** Proof: the supplied fire photograph (367 x 537) and three food photographs. Production: a 6 to 8 second seamless fire loop on dark (1080p, under 3 MB) with a poster still; an ember layer (under 1 MB); food photography at 2400 px or more; restaurant-supplied menu copy.

**Rendering approach.** A photograph is drawn on a WebGL plate. A fragment shader treats bright orange pixels as flame, displaces them with scrolling noise and adds a flickering warm lift, then adds film grain. Embers are a separate 2D canvas of about 70 sprites (34 on phones) rising with sway, drawn with additive blending. In production the plate is replaced by the footage and the embers can stay or become a transparent video layer.

**Component architecture.** `scene.js` holds two functions, `Scene.plate(el, options)` and `Scene.embers(el, options)`. The page markup stays plain: an `img` inside a `figure`, which is what a visitor sees without JavaScript, with reduced motion, without WebGL or after a lost context. `ember.js` wires the scroll hand-off, the menu tabs and the reservation demo. No libraries.

**Animation timeline (opening).** 0 ms: label fades in. 200 ms: headline rises. 700 ms: sentence. 900 ms: buttons. The flames and embers run continuously from load. From the first scroll to about 90 percent of the opening's height, one value (0 to 1) fades the embers, lifts the headline by 2.5 rem and drifts and scales the plate by up to 5 percent.

**User interactions.** Scroll for the hand-off. Menu courses select by tap, mouse hover, keyboard focus or arrow keys, and the photograph and text change. The reservation demonstration shows a summary and a "Demo, nothing booked" stamp.

**Mobile version.** The plate is a 4:5 block above the headline, capped at 64 percent of the screen height. Embers drop to 34, the shader capped at 30 fps and 1.5x pixel ratio. Courses sit under the photograph. A sticky bottom bar offers "Book a table".

**Performance considerations.** One draw call per frame for the plate, a pre-rendered sprite for embers, no per-frame gradients, both loops pause when off screen or the tab is hidden, the device pixel ratio is capped, and the page stays under about 210 KB locally. Real footage would add 3 to 4 MB, so it must lazy load behind the poster.

**Testing requirements.** Visual check at 320, 390, 768, 1280 and 1920 px. Frame-to-frame difference to prove the motion. Reduced motion shows no change. A forced no-WebGL run shows the still. Keyboard through the menu and reservation. axe for WCAG 2.2 AA. Real phone and GPU check, battery and thermal check over a 60 second scroll, and a screen reader pass, which are **not done yet**.

## Reusable systems identified (not yet extracted)

Kept as small files inside the proofs. Extract only after a second concept uses them.

- `Scene.plate`: a photograph that a shader can move, with a still fallback.
- `Scene.embers`: a small particle layer.
- Motion preferences: every effect checks reduced motion once.
- Dialog gallery with keep and arrows.
- Sticky sequence: one plate that follows the text.
- Tabs with a changing plate.

## Evidence summary

See the review page and `audit-issues.md`. Measured on a local copy, headless Chromium with software rendering:

- No horizontal overflow at 320, 390, 768, 1280 or 1920 px on either proof.
- axe (WCAG 2.2 AA tags): 0 violations at 390 and 1280 px on both proofs, after fixing seven findings.
- Layout shift 0, load-time Largest Contentful Paint 68 to 132 ms locally (not comparable to real networks), 74 to 208 KB per page.
- Fire: about 13 percent of pixels in the plate change noticeably between frames 450 ms apart. Cloth: movement is concentrated in the curtains (left 15 percent, right 34 percent, centre under 3 percent). With reduced motion: 0.0 percent change.
- Keyboard: 17 and 19 tab stops, all with a visible outline. Dialog, menu tabs and reply card operable by keyboard.
- No cookies, no local or session storage written by either proof.
- Not tested: real phones, real GPUs, a screen reader, Lighthouse, Safari and Firefox.

## Unbuilt

Salt & Ember dish detail pages and a real reservation journey, a Blender or footage-based opening, desktop gallery filters, any of the other six concepts, and the reusable component library.
