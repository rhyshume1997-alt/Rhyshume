# Rev 3: cinematic production (Salt & Ember, Olive & Ivory)

Branch `claude/cinematic-poc`. Not merged, not deployed to production. Bright Circuit Electrical not started.

## Built
- **Salt & Ember:** name ignites letter by letter with a light sweep tied to the hero plate; pinned scroll hand-off from the fire into the menu with no dead space; course tabs (tablist pattern) with the photograph changing on tap, pinned at the top on phones; reservation demonstration (inactive).
- **Olive & Ivory:** name drawn by a pen-stroke mask traced from the real outline of the script font; the hero plate docks into frame 01 of a proof sheet on scroll; contact-sheet frames with edge marks and frame numbers; light table (native dialog, swipe, arrow keys, thumbnail strip) with Keep and Pass grease-pencil marks that carry to the reply card; day in moments; reply card (inactive).
- **Footage integration:** each hero has a `<video>` slot driven by `data/footage.json`. Add `key.webm` and `key.mp4` to `video/`, set `available: true`, done. No rebuild. Posters, reduced motion, data saver, missing files and load errors all fall back to the photograph. When a clip is live the Salt & Ember name responds to its brightness.
- No procedural fire, no canvas drawing, no frameworks. Plain CSS, SVG and vanilla JS.

## Not built, because assets do not exist
- **No footage.** Heroes show the generated photograph with a slow camera push. Integration was verified with throwaway stand-in clips (not shipped, not a representation of final footage).
- **Olive & Ivory has 4 of 12 frames.** The sheet shows a labelled reserve strip. Eight photographs are specified in the manifest.
- The supplied photographs are about 360 x 540 px. They are shown near native size and never enlarged.

## Evidence (`rev3-evidence/`)
Screenshots at 1440 and 390 px of heroes, mid-scroll transitions, sheet, light table and the mobile menu before and after a tap, plus four scroll recordings (headless, software rendering).

## Test results
- `node --test`: 238 passing.
- axe (WCAG 2.0 to 2.2 A and AA plus best practice) at 390 and 1280 px: 0 violations on both pages once animations have finished.
- No horizontal overflow at 320, 390, 768, 1280, 1920 px; no console errors.
- Interaction suite: keyboard, touch, swipe, Keep/Pass, reply card, reduced motion, no JavaScript, footage on/off, missing file fallback all pass.
- Not tested: real phones, real GPU, Safari, Firefox, screen readers.

## What is needed next
`asset-manifest.md` lists every clip and photograph with specification and a generation prompt.
