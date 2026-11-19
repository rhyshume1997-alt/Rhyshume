# Rev 3.1: separate hero compositions

Branch `claude/cinematic-poc`. Not merged, not deployed to production. No final footage exists and none was substituted.

## Decisions built
- **Salt & Ember, 640 px and wider:** a full width 16:9 scene, fire anchored to the right (72 percent), dark space on the left for the name. The name reads the brightness of the right half of the clip. Under 896 px the scene stacks as a 16:9 band above the name.
- **Salt & Ember, phones (under 640 px):** its own 4:5 portrait scene, composed separately and stacked above the name.
- **Olive & Ivory, 640 px and wider:** a landscape backdrop (dress and window right) behind the opening. The portrait photograph stays as the docking object and sits in the calm band between the type and the dress. The backdrop fades and drifts away on its own schedule while the print travels into frame 01, and the print caption fades with it.
- **Olive & Ivory, phones:** its own portrait 4:5 scene inside the portrait plate, which is also the docking object on phones.
- Tablet portrait and landscape (640 to 1024 px) use the landscape composition. Phones in landscape (about 844 px) do too.

## How the slots work now
- `data/footage.json` declares each clip with `available`, `layout` (`wide` or `portrait`) and an optional `poster`. Phones read `data-mobile`, everything wider reads `data-desktop`. A slot may name only one.
- Nothing changes in the shipped pages until a clip is declared available. The layouts activate from the manifest, with no code change. The fallbacks (poster, reduced motion, data saver, missing or failed clip) are unchanged and tested in both layouts.

## Tests (mobile 390, tablet 768 and 1024, desktop 1440 and 1920)
Stand-in clips and posters were generated for the test copy only and are not in the repository (`rev31-evidence/*-standin-*` show them; they are flat blobs, not a representation of final footage).
- No horizontal overflow and no console errors in all 20 stand-in and shipped combinations.
- axe (WCAG 2.0 to 2.2 AA plus best practice): 0 violations on both pages at 390, 768 and 1440 px, stand-in and shipped, after scrolling.
- Layout shift 0.001 or less in all eight states (after the R31-01 fix).
- Olive & Ivory: the backdrop fades before the print docks, is fully gone and the print docked at the sheet. Header remains sticky and clickable mid transition. Video elements are never focusable. Tab order unchanged.
- Salt & Ember: name flickers from the right half of the clip. Header button usable mid transition.
- Reduced motion: no clip requested, the wide poster still used, the backdrop does not fade or move.
- Data saver: no clip requested.
- Clip blocked or failing: poster remains, layout holds, nothing breaks.
- Repository tests: 239 passing. Concept notices and noindex unchanged on every page.

## Regressions and visual limitations
1. **Layout shift (fixed).** See R31-01 in `audit-issues.md`.
2. **The shipped pages look the same as Rev 3.** The wide layouts only appear once a clip is declared. They have only been seen with flat stand-in clips.
3. **The two landscape stills Rhys sent are not in the repository.** They reached the session as chat images, so there are no files to commit. They are about 1672 x 941 px, too small for a 1920 px poster, and are noted as temporary references. Supply the files if they should become the interim posters (then the wide layouts can go live with posters and no clips).
4. **Olive & Ivory legibility risk.** In the landscape still, the left wall is a mid warm tan. The name is sage green and the copy dark ink, so they would not reach 4.5:1 over it. The final footage and poster need a pale ivory left wall (spec in the manifest), or the type needs a flat panel. This was not testable without the real footage.
5. **Print placement is a composition rule.** The print sits at roughly 52 to 69 percent across at 1440 px, so that band must stay calm and the dress must stay in the right third. At 1024 px the print shrinks with its column.
6. **Clip choice is made at load.** Rotating a tablet or resizing across 640 px does not swap clips. The layout stays coherent but may show the other size's clip.
7. **Brightness mapping untuned.** The name's flicker thresholds were set for earlier test clips and need tuning against the real fire.
8. **Not tested:** real phones, a real GPU, Safari, Firefox, screen readers, performance with real footage sizes.

## Final production specifications
See `asset-manifest.md` (and `asset-manifest.json`): clips for both scenes, their posters, the replacement photographs, with prompts. File sizes there are starting targets, not limits.
