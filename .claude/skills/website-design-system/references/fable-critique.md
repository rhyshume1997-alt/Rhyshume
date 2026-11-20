# Fable critique methodology

Fable is used for visual critique. It proposes; it never edits. Every claim it makes is a hypothesis that is measured before anything is implemented.

## 1. Capture the evidence first

For each page capture, at 1440x900 and 390x844 (mobile emulation with touch):
- screenshots at successive viewport-height scroll positions (instant scrolling, not smooth);
- horizontal overflow, console errors, layout shift measured before scrolling, payload, h1 count;
- whether video plays (allow muted autoplay) and the intrinsic against rendered media size.

Write the screenshots and a metrics JSON to a folder the reviewers can read. State the caveats up front: headless software-rendered timings (LCP and similar) are a signal, not a verdict; screenshots are still frames so motion cannot be judged.

## 2. Brief the reviewers

Two concepts per reviewer keeps each critique deep. Use the brief below. Fill the placeholders; do not weaken the guardrails.

```
You are a senior web designer doing an evidence-based critique of two existing
concept websites. PROPOSE ONLY. Do not edit any file, install anything, or use
the network.

CONTEXT: [N] concept sites, each deliberately art-directed to be different with
its own signature interaction. Find genuine, evidence-backed improvements and
PRESERVE each concept's approved identity and signature interaction. The set must
not drift toward looking alike. Do not recommend something merely because it is
fashionable.

YOUR CONCEPTS: [slug A] ([kind]) and [slug B] ([kind]).
[PROTECTED RULE if any: its identity is kept intact; recommend a change ONLY for a
genuine defect shown by evidence, otherwise say "no change recommended".]

EVIDENCE (read-only): screenshots [path/<slug>-d-<n>.jpg, <slug>-m-<n>.jpg];
metrics [path/metrics.json] with caveats; source [path/<slug>.html, .css, .js];
the builder's own known limitations [list].

METHOD:
1. Audit first: the 5 biggest problems, worst first, each with the fix. If the page
   is strong, say so and list fewer.
2. De-slop check: gradients, icon cards, pill badges, an accent-coloured word, sparkle
   icons, fade-ups on everything, vague buttons, glass cards, a shadow on every
   element, centred hero with three feature cards. For each real instance give a
   replacement based on what the business does, with no new claims. Note where an
   apparent default suits the concept's tone.
3. One-second test at 1440 and 390: focal point, hierarchy, overlap, clipping.
4. Contrast (compute from CSS values), tap targets, tiny text, keyboard focus,
   reduced motion.
5. Motion principles: ease-out entering, never ease-in; under about 300ms;
   press scale(0.97); never from scale(0); hover gated by (hover:hover) and
   (pointer:fine); subtle or no bounce; animate transform and opacity; reduced
   motion means fewer and gentler.

OUTPUT per concept (under 600 words, plain text):
A. Direction in one or two sentences and the strongest interaction.
B. Audit, worst first, each tied to a screenshot filename or a CSS/JS line.
C. Up to THREE recommendations, prioritised: evidence; the principle or reference
   (cite ONLY verified URLs from the reference library); intended behaviour; the
   simplest implementation (CSS first); user benefit; one-line identity risk.
D. What must NOT change.
E. What could not be judged from the evidence.
Be honest about uncertainty. Do not claim to have run anything you did not run.
```

## 3. Verify every claim before it becomes a fix

Reviewers read screenshots and source but did not run the pages. Treat each claim as a hypothesis:
1. Reproduce it in a real browser (computed styles, bounding boxes, contrast from real colour values, source lines, a width sweep).
2. Mark it Confirmed, Not reproduced, Unverified or Artefact.
3. Keep a ledger so refuted claims are not repeated.

On a recent eight-concept audit this caught claims that did not hold: "rows shift under the pointer" (measured 0px), "chapters empty after an anchor jump" (0 of 5 invisible), "3.6:1 text" (13.17:1), and "one shared rule fixes the focus ring" (it did not fix three call bars). It also caught that a proposed CSS fix for a pale image edge did not work, so the fix became an asset crop.

## 4. Before and after

Inject the proposed CSS at render time on a copy of the page, capture both states, and show them side by side. Where the fix is an asset or a script change, serve the replacement through request interception for the "after". Do not edit the repository to produce evidence.

## 5. Document each fix

File, actual cause, proposed change, before and after evidence, regression risk, and whether it touches a protected design. Defects (functional, responsive, accessibility) before taste. One commit per fix so each can be reviewed or dropped alone.

## 6. Regress

After implementing, run the repository's tests and a visual regression: full-page screenshots, static (reduced motion), baseline against branch, per concept and width. Concepts that should not change must be pixel-identical. Where differences appear, look at the changed regions side by side to separate real changes from sub-pixel shifts.
