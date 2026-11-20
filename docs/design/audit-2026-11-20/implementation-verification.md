# Implementation verification: fixes F1 to F6

Pull request: https://github.com/rhyshume1997-alt/Rhyshume/pull/32 (draft, base `claude/cinematic-poc`, six commits from `eae94be`, five CSS files, +28 / -7). F7 (Salt & Ember asset crop) is **not** implemented. Priority 2 and 3 are untouched.

All measurements were taken in a real browser against two local copies: the untouched baseline and the fixes branch.

| Fix | Measurement | Before | After |
| --- | --- | --- | --- |
| F1 Oak & Razor booking grid | computed `display` of `#bk` at 1024 to 1920px | `block`; rail overlapped the slip by 259,000 to 347,000 px² | `grid`, two columns, overlap 0 |
| | six-step journey (service, barber, date, time, contact, review) at 1440 and 390px | completes | completes, 0 page errors |
| F2 Focus ring (all eight) | ring contrast against the band, banner at 1440px and call bar at 390px (16 readings) | 1.00 on eight of them, 1.95 to 2.75 on six, others higher | **all 16 at 7.16:1 or better** |
| F3 Bright Circuit board | mid-word breaks across 14 widths, 360 to 2200px | 1 or 2 per width from 1280px up | 0 at every width; no overflow |
| F4 Sunny Hours phones | pinned height at 390px | 192px of 844px | 117px (768px and 1440px identical) |
| | tap-tile-then-tap-slot planner flow | works | works identically, 0 page errors |
| F5 Sunny Hours headings | headings overflowing or touching the icon across 12 widths | 1 to 4 per width at 768 and 1120 to 1920px | 0 at every width; 390, 900, 1024 and 1119px unchanged |
| F6 Corner Shelf first view | share of "Shelf" visible | 1440x900 35%; 1536x864 18%; 1100x700 14%; 1366x768 0%; 1280x720 0% | 73%; 54%; 52%; 25%; 21%. 1920x1080, 1440x1200 and 800x900 unchanged |

Repository tests: `node --test` 247 pass, 0 fail (identical to baseline).

## Visual regression

Full-page screenshots (static, reduced motion), baseline against branch:

| Concept | 1440px | 390px |
| --- | --- | --- |
| Olive & Ivory | identical | identical |
| **Salt & Ember (protected)** | **identical** | **identical** |
| Clear Ground | identical | identical |
| Little Kettle | identical | identical |
| Bright Circuit | board changes as intended; page 2px shorter | identical |
| Corner Shelf | plate shallower as intended; page 93px shorter | identical |
| Sunny Hours | day headings change as intended | pinned header gone; slot labels larger (page 26px taller) |
| Oak & Razor | booking grid restored; page 278px shorter | grid gap between rail and slip (page 23px taller) |

Residual pixel differences below a changed block were checked by looking at the regions side by side (see the `regression-*.png` images here); they are small vertical shifts, not regressions.

## Intended side effects (called out for review)

- Sunny Hours slot labels grow from 0.64rem to 0.72rem, adding about 6px per day card on phones.
- Oak & Razor on phones gains the grid's intended gap (about 23px) between the rail and the slip; the same specificity bug had suppressed it.
- F6 only partly helps the shortest screens: "Shelf" goes from invisible to about a fifth to a quarter visible at 1280x720 and 1366x768.

## Not tested

Real devices, Safari and Firefox, screen readers, and the deeper states of each page beyond the journeys named above.
