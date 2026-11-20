# Rev 4 cursor fix: the bottle never covers text or controls

Problem found in review: the photographic cursor bottle trailed the pointer at a fixed offset, so over body text it covered the lines below, and it could sit across cards and controls.

## What it does now
The bottle may only be seen where its whole footprint is clear. Protected: every heading, paragraph and label in the drinks section, the animation switch, the age notice, the category tabs, the product cards, the detail panel and its shopping controls, and the fixed header.
1. **Find a clear spot.** Each time the pointer moves it tries the usual spot (down and to the right), then the left, then further out, then above, and uses the first clear one. It prefers the usual spot and only moves when it has to.
2. **Look ahead, every frame.** It checks the real, rotated footprint of the photograph, and where it will be in a few frames, against the protected areas. If it is about to cover something it fades out quickly; if it is already over something it is cut at once. It returns only after a short clear run, so it does not flicker.
3. **Controls.** As before it also fades out when the pointer itself is over a control, and returns in a clear area.
4. **Cards.** Hovering a beer or cider card still hands the pour to the footage window (the bottle tips and gives way, the filmed bottle enters from the frame edge). Wine still shows information only.
Kept: weighted movement (long ease, swing against travel, settle to a resting angle, no bounce), photographic appearance, pointer-events none, mouse-only and drinks-section-only, tap, keyboard, reduced motion and the on/off switch. Nothing else in the approved dark cinematic direction was changed.

## How it was tested
`cursor-clearance-check.js` watches the bottle on every animation frame during a full sweep of the section (serpentine passes across the whole width at three scroll positions, then slow drifts along the text) and compares the bottle's rotated bounding box with the real glyph rectangles of every text node, every control, every card and the header. Any frame where the bottle is more than 3 percent opaque and overlaps something counts.
- Rev 4 as shared: 1,353 overlapping frames out of 2,141 frames with the bottle visible.
- After the fix: 0 overlapping frames out of 788 frames with the bottle visible, on repeated runs.
The full suite is 56 checks, 0 failing: the 54 earlier checks (adapted where the cursor's positions changed) plus clearance and "the bottle still appears". axe-core: 0 violations on all four pages. Performance is unchanged in the headless run (about 60 fps, worst frame 16.8 ms during a pour with the cursor moving, layout shift 0.0014); the per-frame check reads about twenty rectangles.

## Trade-off to be aware of
Because the page is dense, the bottle is hidden for much of the catalogue area. It is visible in the open parts of the section (the clear space beside the heading, the gutters and the gaps) and it always appears as the hand-off over a card. If more of the bottle's presence is wanted, the fix is layout, not the rule: leave a wider clear band beside the product grid. That is a design decision for the next review.

## Evidence
`compare-cursor-before-after.mp4` (same scripted movement on both builds), `1-desktop-cursor-after-fix.mp4`, `2-keyboard-focus-and-pour.mp4`, `3-reduced-motion-hover.png`, `4-mobile-tap.mp4`, `test-results.txt`, `test-suite.js`, `cursor-clearance-check.js`.
