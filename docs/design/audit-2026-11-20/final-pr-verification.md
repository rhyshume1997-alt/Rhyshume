# Final verification of pull requests 32 and 33

Both are drafts targeting `claude/cinematic-poc` (baseline `eae94be`). Nothing has been merged or deployed. All results below were measured on 2026-11-20.

## 1. Targets and deployment behaviour

| Check | Evidence |
| --- | --- |
| PR 32 (fixes) base branch | `claude/cinematic-poc` @ `eae94be`, read from the GitHub API |
| PR 33 (documentation and skill) base branch | `claude/cinematic-poc` @ `eae94be`, read from the GitHub API |
| Neither targets `main` or production | Confirmed above. Both are drafts |
| Production deployments come only from `main` | Vercel lists the `rhyshume` project's production deployments: every one has `githubCommitRef: main`; the latest, built from `main` @ `4f93e27`, was created before any of these branches was pushed |
| What the branches did deploy | `rhyshume` deployment for the PR 32 head: state READY, `target: null`, which is a **preview**. Previews on this project sit behind SSO protection (except custom domains). No production deployment was created from either branch |
| Failing status on both PRs | The separate Vercel project `marpet-fabrications-preview` reports a failed preview. **It already failed on the untouched baseline commit** (`eae94be`, state ERROR, created before any of this work), so it is pre-existing and not caused by these PRs. Its cause was not investigated (a different project) |
| If a PR is merged into `claude/cinematic-poc` | At most another preview deployment. Production builds follow `main`. A later merge of `claude/cinematic-poc` into `main` would deploy to production and needs its own approval |

## 2. PR 32: tests, changed files, evidence

**Changed files (5, CSS only, +28 / -7):** `c-3e9a41b7d20f58c6/cinematic/bright-circuit.css`, `cinematic.css`, `corner-shelf.css`, `oak-razor.css`, `sunny-hours.css`. Nothing else: no HTML, JavaScript, images, `vercel.json` or `.vercelignore`.

- **Repository tests:** `node --test` 247 pass, 0 fail.
- **Intermediate-viewport sweep:** 8 concepts at 12 widths (320, 360, 414, 600, 768, 900, 1024, 1180, 1280, 1366, 1536, 1920px), baseline against branch, **192 page measurements**. No regression: zero horizontal overflow on baseline and branch, no new console errors, h1 count unchanged. Raw data: `intermediate-viewport-measurements.json`.
- **Fix assertions across all 12 widths:** F1 `#bk` is `grid` with zero rail overlap from 1024px (baseline `block` with up to 347,000 px² overlap); F3 mid-word breaks 1 or 2 at 1280px and up before, 0 after; F5 day-heading problems at 768px and from 1180px (1 to 4) before, 0 after, with no slot-label overflow; F6 "Shelf" visible at the 900px-high sizes: 1280px wide 63% to 100%, 1366px 42% to 82%, 1536px 32% to 68%, 1920px 38% to 75%.
- **Pixel comparison (static, reduced motion), baseline against branch, full page, zero-difference comparison at all 12 widths:** Salt & Ember identical; Olive & Ivory identical; Clear Ground identical; Little Kettle identical. **All four untouched concepts: 48 of 48 full-page pairs byte-for-byte identical.** Page heights of those four are equal at every width.
- **Intended side effects:** Sunny Hours slot labels slightly larger (about +26px page height at 320px, +39px at 768px); Oak & Razor gains the grid's intended gap on phones (+23px at 320px, +31px at 768px) and is shorter on desktop (-278px at 1920px) because the booking panel now sits beside its rail; Corner Shelf is shorter on desktop (-87 to -94px); Bright Circuit -2px at 1920px.

## 3. Salt & Ember: protected, unchanged apart from the keyboard focus ring

- **Files:** none of `ember.css`, `ember.js`, `salt-ember.html` or its `se-*` images is touched. The only shared change is two lines in `cinematic.css` that apply to `:focus-visible` on the banner and call-bar links.
- **Computed-style fingerprint of every element** in the settled page (fonts, sizes, weights, letter spacing, colours, layout, animation and transition properties, 131 elements): **identical** between baseline and branch at 1440px and at 390px (same hash). The four menu tabs behave identically (same active photograph and same transition for each).
- **Pixel-identical** at all 12 widths in a static state.
- **The one visible change, keyboard focus only:** the ring on the cream banner and call bar goes from its ember orange (2.75:1 against the band) to near-black (14.53:1). Image: `salt-ember-focus-before-after.png`. **This is a visible colour change to its focus styling.** On-brand alternative: a deeper ember, `#b8481f` (4.31:1), scoped inside `ember.css`, which would touch a protected file and so needs approval. Not applied.
- **Not covered by any of this:** the ignition animation was verified by code identity and settled-state fingerprint, not frame by frame.

## 4. Safari and other browsers: limitation and substitute evidence

- **Safari (WebKit) could not be tested.** Playwright's WebKit download is blocked by the environment's network policy and there is no system Safari or other WebKit browser. Firefox is not installed either. All browser tests ran in Chromium only. I did not ask for extra network access just for a browser binary.
- **Substitute 1, feature support** (from general knowledge of browser support, **not tested here**; verify on a real Safari): the fixes use `:focus-visible` and `aspect-ratio` (Safari 15.4 and 15; both already used by the existing rules), `outline-color: currentColor`, `display: grid`, `position: relative`, media queries including `max-height` (all long supported), and, in F5 only, container queries with `cqi` units (Safari 16 and later).
- **Substitute 2, measured fallback for F5.** In a browser without container queries the new font-size declaration is dropped and the old rule applies. I emulated exactly that on the branch and compared with the baseline: day-heading problems, baseline / full fix / emulated old browser: 768px 1 / 0 / 1; 1120px 4 / 0 / 1; 1180px 4 / 0 / 1; 1280 to 1920px 2 / 0 / 2. **It is never worse than the baseline at any width.**
- **Still needed before wider rollout:** a check on a real Safari (macOS and iOS), Firefox and real phones.

## 5. PR 33: changed files and checks

27 files at first push, all newly added; with the later commits the set is all additions plus the removal of the old `docs/design/grokResearch.md` (moved into the skill with its content preserved). Everything is under `.claude/` and `docs/design/`, both excluded from the Vercel deployment by `.vercelignore`. No concept page, production file or deployment config is touched.

- Skill: validated in fresh sessions (`skill-validation.md`); content hash and source commit recorded in `VERSION.md`; `scripts/verify-version.sh` prints OK for the validated copy and fails on a modified one.
- Reference library: single shared source in the skill; no duplicated copy and no sync script.
- Proposals (not actioned): `skill-sharing-proposal.md` and `build-ai-here-implementation-proposal.md`.

## 6. Remaining risks and merge readiness

| Risk | Detail |
| --- | --- |
| Safari, Firefox, real devices | Not tested. F5 depends on container queries in Safari 16+ and is measured to degrade safely |
| Salt & Ember focus ring | Visible colour change (orange to near-black); owner to choose the near-black ring or a deeper ember scoped in `ember.css` |
| F6 on the shortest screens | "Shelf" only peeks on 1280×720 and 1366×768 |
| Merge order | PR 33's documentation says F1 to F6 are implemented in PR 32. Merge PR 32 first, or both together |
| Pre-existing failing preview | `marpet-fabrications-preview` fails on the baseline too; unrelated, uninvestigated |
| A skill is a model-followed instruction | Validated by one run per scenario; keep reviewing diffs |

**PR 32:** ready to merge into `claude/cinematic-poc` subject to the owner's decision on the Salt & Ember ring colour and acceptance of the listed side effects. **PR 33:** ready subject to the owner approving the library architecture and noting that both sharing proposals are not actioned.
