# Tracked issues: concept portfolio audit

Source: Stage A audit of the eight concept pages on `main` (measured 19 Nov 2026) and the Rev 2 proof of concept testing. Status values: **Open**, **Fixed on this branch**, **Not applicable to the proofs**.

The eight existing concept pages on `main` are **not changed** by this branch, so every issue found on them stays Open until a separate change. Nothing here has been merged or deployed.

| ID | Where | Issue | Evidence | Status |
|---|---|---|---|---|
| A-01 | All eight concepts | No photographs. Every picture slot is a grey stand-in. | 0 `img` elements on each page | Open for the existing eight. The two Rev 2 proofs use the supplied concept images. |
| A-02 | All eight concepts | Spec-required demonstrations missing: galleries, dish details, filters, basket, step-by-step booking and enquiry. | Only a single-step demo form on each | Open. Rev 2 proofs add gallery, menu detail and a step-by-step reply card for two concepts. |
| A-03 | weddings, restaurants, coaching | Scroll-firmed statement words start at low opacity and score 1.4:1 to 1.65:1 in axe. | axe `color-contrast` | Open |
| A-04 | weddings, restaurants, coaching | `aria-label` set on a paragraph by the word-splitting script. | axe `aria-prohibited-attr` | Open |
| A-05 | electricians | Horizontal overflow of 38 px at 320 px wide. | scrollWidth - innerWidth = 38 | Open |
| A-06 | electricians, after-school, shop, barber | Brand link or phone number under 24 px high (18 to 22 px). | Measured at 390 px | Open |
| A-07 | after-school, cafe, shop | Cream text on tomato (3.77:1), teal (3.66:1), coral (3.06:1), green (4.46:1) and clay red (4.31:1) fails 4.5:1 for normal text. | axe `color-contrast`. Needs Rhys to approve any palette change. | Open |
| A-08 | restaurants | Menu photo follows the cursor only. No touch alternative. | Code and test | Open for the existing page. Fixed in the Rev 2 proof (tap, focus and arrow keys). |
| A-09 | cafe | Cursor shape trail is mouse-only decoration. | Code | Open |
| A-10 | barber | Services row slide is hover-only. | Code | Open |
| A-11 | weddings, coaching | Layout shift 0.121 and 0.128 (above the 0.1 good threshold) in a local measurement. | PerformanceObserver | Open |
| A-12 | electricians | Largest Contentful Paint 2,684 ms locally, far above the others (44 to 72 ms). Cause not found. | PerformanceObserver | Open |
| A-13 | All eight | The concept demo forms rely on JavaScript to stay inactive. With JavaScript off a form would navigate to its own address. | Code review | Open. Rev 2 proofs hide the form without JavaScript and add `onsubmit="return false"`. |
| A-14 | `c-3e9a41b7d20f58c6/fonts` | Licence texts are present for Archivo and Great Vibes only. Plex and Newsreader licence files are missing from this folder. | Directory listing | Open |
| A-15 | Tests | The concept folder is only tested for being hidden, noindex and free of banned wording. Nothing tests behaviour. | `test/` | Partly fixed: `test/cinematic.test.js` covers the proofs. |

## Found and fixed while building the proofs (this branch)

| ID | Issue | Fix |
|---|---|---|
| P-01 | Inactive moments in the day sequence were dimmed with opacity, scoring 1.5:1 contrast. | The clock colour carries the state; no opacity dimming. |
| P-02 | `aria-label` on the brand link did not contain the visible text ("Olive & Ivory"). | Label starts with the visible text. |
| P-03 | Header wrapped before fonts loaded on phones, giving a 0.205 layout shift. | Header does not wrap; fonts preloaded. CLS 0 after the change. |
| P-04 | Frame numbers were white on bright photographs (1.63:1). | Solid backing chip. |
| P-05 | Selected menu number scored 3.07:1 because of an opacity. | Full opacity when selected. |
| P-06 | The date field showed no focus outline in Chromium. | Explicit `:focus-within` outline on fields. |
| P-07 | A hero class name collided with the button class, giving the "Start again" button the wrong font. | Renamed. |

## Rev 3: verified issues fixed on the two productions

| ID | Issue | Fix | Evidence |
|---|---|---|---|
| R3-01 | Salt & Ember mobile menu: choosing a course did not visibly change the photograph. | Photograph is pinned at the top of the screen and swaps on tap. | `t5.js`: new photograph on screen after tap, 390 px |
| R3-02 | Salt & Ember desktop: large dead area after the opening. | Pinned scene hands off into the menu with an overlap; course list matches the photograph column. | `t5.js` heights within 60 px |
| R3-03 | Olive & Ivory name used a rectangular wipe. | Pen-stroke mask drawn from the real outline of the script font. | Recording, reduced motion shows it complete |
| R3-04 | Hero plate crossed text and header wrapped on phones. | Text first on mobile, header does not wrap. | 390 px screenshots |
| R3-05 | `aria-label` and `role="text"` on word spans (A-04 pattern). | Removed; words are plain text. | axe, no prohibited attributes |
| R3-06 | Enlarged `@2x` images implied detail that does not exist. | Deleted. | `image-register.md` |
| R3-07 | 404 console errors from probing for missing video. | Manifest declares availability; no request until a clip exists. | No console errors in `t5.js` |

## Still open on the proofs

- The photographs are about 0.2 megapixels. Large screens show them soft. Needs real high resolution files.
- No footage exists. The openings are photographs with a slow camera push until clips are added (see `asset-manifest.md`). Footage integration was tested with throwaway stand-in clips only.
- Olive & Ivory shows 4 real frames of the planned 12.
- Performance numbers were taken locally with software rendering. No real phone or GPU was tested.
- No screen reader testing. Keyboard testing covered tab order, the dialog, the menu tabs and the reply card.
