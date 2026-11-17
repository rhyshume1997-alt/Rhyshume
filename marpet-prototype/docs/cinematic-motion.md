# Cinematic motion: what was built and how

This round put the motion direction into the development website itself. Nothing here is a separate test page.

## Division of labour

| Job | Tool | Why |
|---|---|---|
| Opening camera move (weld close-up, travel, pull back) | Blender Cycles, rendered to video | Shallow depth of field, motion blur and true reflections cannot be matched live on a phone or laptop |
| Conveyor on the homepage after the opening, turning it, scroll viewpoints, parts pulling apart | Three.js | It has to respond to the visitor |
| Scroll-controlled movement, typography, steel sheets, gallery layers | GSAP and ScrollTrigger | Scrubbed timelines tied to scroll position |
| Depth in photographs | Layered copies of the genuine Marpet photographs | No 3D needed |

## Homepage opening

`blender/conveyor.py --film 84` renders 84 frames at 20 frames a second (4.2 seconds) from the master model:

1. Starts a few centimetres from a TIG weld on a leg bracket, 90 mm lens, f/2.8, so only the bead is sharp.
2. Travels along the brushed side frame past the fixings and the Marpet plate.
3. Pulls back and widens to the exact camera position, lens and horizontal offset that the live scene starts from.

The frames are encoded twice: `site/assets/render/opening.webm` (VP9, 189 KB) and `opening.mp4` (H.264, 379 KB). The page picks whichever the browser plays.

How the page uses it (`initHero` in `site/assets/app.js`):

- Wide screens, first visit, motion allowed: the film is fetched and played over the stage while the 3D model loads behind it. The headline comes in at 60% of the film. When the film ends and the model is ready, the film fades out over 0.9 s to reveal the live model in the same position.
- "Skip intro", Escape, the mouse wheel or a touch scroll end it at once.
- If the film is not ready within 3.5 seconds, or cannot play, the live 3D opening from the previous round runs instead.
- Phones (under 900 px) do not download the film; they use the live 3D opening.
- Returning visitors go straight to the finished scene. "Replay opening" plays the film again.
- Reduced motion: no film is requested, no opening plays.

## Scroll: the conveyor introduces the services

The pinned scene keeps its camera path (whole machine, drive end, leg weld, over the belt). The three chapters now introduce services, each with a link to its page:

1. Conveyor systems, at the drive end. As this chapter passes, the end plates, take-up, bearings and bolts pull out from the frame and close again (`EXPLODE` in `src/viewer.js`).
2. General fabrication, at the leg weld.
3. Production lines, looking along the belt.

The names and descriptions come from `content/services.json`; nothing new is claimed. The four facts that used to sit in these chapters are back as a strip directly under the scene.

## Steel sheets as section transitions

`blender/plate.py --sheet` renders one brushed sheet (`site/assets/render/sheet.webp`, 9 KB). `src/motion.js` lays it over any section marked `data-sheets` and ties its movement to scroll:

- `lift`: one sheet tips back and rises off the section (homepage Services, service page photographs).
- `split`: two sheets swing apart like doors (homepage Featured work, About).
- `fold`: one sheet folds away on its top edge (available, not yet assigned).

The sheets are added by script, marked `aria-hidden`, and ignore the pointer. Without the script, or with reduced motion, they are never created, so content is never hidden behind one.

Page-to-page transitions keep the plate, shutter and frame moves from the previous round.

## Our Work

Every project is now a full-width scene rather than a card:

- Back layer: an enlarged, blurred copy of the same Marpet photograph, drifting slowly.
- Middle layer: the sharp photograph in a steel frame, opening from a crop as it arrives and moving at its own rate.
- Front layer: number, title, service and "View project", moving faster than the photograph.
- With a mouse, the photograph leans toward the pointer.
- Clicking expands the photograph into the project page (the existing frame transition).

Scenes alternate sides. On phones they stack: photograph, then caption, with the same backdrop.

The photographs are the ones Marpet already publishes. Their longest side is 1024 px, so each is capped at 1.15 times its real width to stay sharp. Larger originals would let these scenes fill the screen.

## Rest of the site

On every page: headings rise word by word from behind a mask, lead photographs move slower than the page and settle from a slight zoom, and gallery photographs, customer names and lists arrive in sequence. All of it is driven by the same `motion.js`.

## Accessibility and fallbacks

- Navigation and the quote button work before, during and after every animation.
- Reduced motion: no film, no sheets, no parallax, no word reveals. Tested.
- No JavaScript: every page reads normally. Tested.
- Headings split into words keep their full text as an accessible name.
- axe-core reports no violations on any page at 1440, 820 and 412 px.

## Weight

| File | Size | When |
|---|---|---|
| `motion.min.js` (GSAP + ScrollTrigger + site code) | 117 KB, about 42 KB compressed | every page, deferred |
| `opening.webm` / `opening.mp4` | 189 KB / 379 KB | homepage, wide screens, first visit only |
| `sheet.webp` | 9 KB | pages with sheet reveals |

## Recordings

In `review/video/`. See the file list in `docs/build-status.md`.

The homepage recordings are captured frame by frame: one clock steps the film, the 3D scene, GSAP and the CSS transitions together, then the frames are joined at the designed speed. That is necessary because this build machine has no graphics card. They show what the site does and at what pace; they are not a measurement of frame rate on a real device. The other pages are recorded in real time.

## Honest limits

- No real-device frame rates. The blurred gallery backdrops and the pinned 3D scene need checking on an actual mid-range phone and an older laptop.
- At very close range the rendered steel is bright and smooth; the brushing shows more in the travel than in the first frames. A finer grain texture on the master model would improve the first second.
- The film ends on the live camera position, but renderer differences (Cycles against real-time) are visible during the 0.9 s fade if you look for them.
- The film is 1152 x 648. It is sharp on laptops; on very large monitors it is softer than the live model that replaces it.
- Chrome only so far. Safari and Firefox are untested.
- Marpet photographs are small (1024 px at most). This is the main thing holding the gallery back.
