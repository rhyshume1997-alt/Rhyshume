# Visual upgrade: what changed and how it was built

The pages, content and enquiry paths are unchanged. This round changed how the site moves.

## Homepage: one pinned scene

The hero and the old four-fact strip are now a single scene, about four and a half screens tall. The 3D stage stays fixed under the header while the camera and the copy change.

**Opening (6.4 seconds, once per browser, skippable)**

| Time | What happens |
|---|---|
| 0 to 1.3 s | Close on the brushed side frame, drifting slowly |
| 1.3 to 4.5 s | Camera pulls back to the whole machine |
| 1.9 to 5.9 s | Belt, end plates, bearings, take-ups, bolts and logo plate arrive in turn and decelerate into place |
| 3.5 s | Headline rises line by line from behind a mask; eyebrow rule draws; intro and buttons follow |
| 6.4 s | Belt starts running; labels on the model appear; drag turns the machine |

The header, menu and quote button work from the first frame. Skip, Escape, scroll or touch ends the opening.

**Scroll chapters**

| Scroll | Camera | Copy |
|---|---|---|
| 0 to 13% | Whole machine | Headline, intro, quote button |
| 20 to 42% | Drive end: bearing, end plate, take-up | 01 Design, manufacture, install |
| 48 to 70% | Leg, gusset and weld | 02 Stainless, mild steel, aluminium |
| 76 to 100% | Over the running belt | 03 Food and drink |
| after 93% | Stage dims and the page continues | About section |

The camera reaches its last position at 90% of the scroll and holds. It eases toward the scroll position with frame-rate-independent damping, and the scene redraws only when something changed. Chapters that are not showing are made inert, so keyboard users never tab into hidden copy.

**Fallbacks**

- Reduced motion: no pinning and no opening. The assembled model, the headline, then the three facts as a row.
- No WebGL or no scripts: a still Cycles render, the headline, then the three facts.
- Slow connection: the copy shows after 6 seconds whether or not the model has arrived.

## Services: plates and a viewing frame

On wide screens the seven plates sit on the left and a framed viewing window stays in view on the right. Pointing at or tabbing to a plate brings its photographs into the frame:

- the outgoing picture is wiped away upward or downward, depending on whether the new plate is below or above;
- the incoming background, the small framed photograph and the caption travel different distances (12%, 50% and 30% of the frame height), so they separate in depth;
- quick changes are queued, so the frame always settles on the last plate chosen.

The frame shows the service name, its one-line description and three capability points. Selecting the plate opens the service page with the plate transition. On phones and tablets there is no frame; each plate shows its description underneath.

## Our Work: staggered gallery

- Eleven projects in a twelve-column grid with alternating widths and offsets, large numerals and two-tier type.
- Frames open as they enter the screen, drift at slightly different rates as the page scrolls, and the photograph slides inside its frame.
- With a mouse, a frame leans toward the pointer and its photograph shifts.
- Selecting a project expands its photograph into the project page (the existing frame transition).
- Filters still work; a filtered view switches to an even two-column layout.
- Frame widths are kept close to the source photograph widths, because the largest photograph is 1024 pixels wide.

## Page transitions

Same three (plate, shutter, frame). The plate is now about a second in total instead of 1.2.

## What the references contributed

| Reference | Used for |
|---|---|
| Novu brief | Sticky stage inside a tall section; progress from the section's position; camera reaching its end early and holding; damped follow; chapter windows with masked line reveals |
| Blendy brief | Outgoing layer kept on top and wiped with `clip-path`; direction from item order; per-layer travel factors; input queued during a change |
| Harborlux brief | One clock for the opening with every element timed against it; start states held by a class so nothing flashes; headline reveal timed to the camera settling; reduced motion jumps to the final frame |
| podium.global | Staggered column drift, two-tier type, thumbnail-to-project expansion. Seen with its media blocked, so the grid behaviour is from code and layout, not from watching it |
| recent.design listing (Shopify Editions) | Only the listing page loaded. Nothing of the actual site was seen; its tags (long scroll, large type, chapters) match the direction taken |
| seksyplanety.com | Framed viewports with caption bars, which the services viewing frame echoes |

No code, imagery or brand elements were taken from any of them. Nothing here uses GSAP: the Web Animations API and CSS cover every case, and it keeps the download smaller.

## Measurements

Homepage, served with compression by `serve.mjs`, headless Chromium.

| Run | Network | First paint | 3D scene live | Download |
|---|---|---|---|---|
| Desktop 1440x900 | unthrottled | 0.3 s | 1.8 s | 2,253 KB |
| Phone profile (Pixel 7), CPU slowed 4x | Fast 4G | 0.6 s | 3.0 s | 1,233 KB |
| Phone profile (Pixel 7), CPU slowed 4x | Slow 4G | 0.9 s | 8.1 s | 1,233 KB |

- The page paints and the header works before the model arrives; nothing waits on the 3D assets.
- On the slow connection the headline shows at 6 seconds without the model, which joins about two seconds later.
- Desktop downloads more because it loads the larger photographs lower on the page.
- Scene size: 112,000 triangles, 13 meshes. Phones draw at 618x495 with no mirror floor.

Checks: type check 0 errors; 135 unit tests; 292 browser checks across desktop, tablet and phone sizes including accessibility scans, the pinned scene, the services frame and the gallery.

## Recordings

In `review/video/`:

| File | Shows | How it was made |
|---|---|---|
| `desktop-01-opening-and-turning.mp4` | Opening sequence, then dragging to turn the machine | Frame by frame, 24 frames a second |
| `desktop-02-scrolling-the-scene.mp4` | Scrolling through the three chapters and into the page | Frame by frame, 24 frames a second |
| `desktop-03-services-work-project.mp4` | Services frame, transition to a service page, Our Work, opening a project, back | Recorded in real time |
| `mobile-01-opening-and-scrolling.mp4` | Phone: opening and scroll chapters | Frame by frame, 16 frames a second |
| `mobile-02-services-work-project.mp4` | Phone: services, a service page, Our Work, a project, the quote button | Recorded in real time |

The frame-by-frame recordings show the motion as designed. They are not evidence of how smoothly it runs on a given device.

## Honest limits

- **Frame rate on real devices is still unmeasured.** This environment has no GPU. In its software renderer a close-up 3D frame takes over a second, so the screen recordings of the 3D scenes were captured frame by frame and assembled at 24 frames a second. They show the designed motion, not measured smoothness.
- **The scene is heavier while scrolling.** It redraws every frame as the camera moves. Phones get no mirror floor, a lower pixel ratio and smaller shadow maps, but an older phone may drop frames. The phone test page will show this.
- **The steel in the browser is still not Cycles.** The opening close-up shows brushed grain and soft light, not the depth of the offline render.
- **Photographs limit the gallery.** Frames cannot go full width without visible softness.
- **Tested in headless Chromium only.** Safari and Firefox have not been run. Sticky positioning, `clip-path` animation and `inert` are supported in current versions of both.
