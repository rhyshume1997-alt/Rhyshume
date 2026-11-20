# Grok design research (X-supplied), 20 November 2026

A shared research record of the owner's Grok report "Design finds, Fri 20 Nov 2026" (attached to the Claude Code session as a 91-line Markdown file), with what is verified and what is not. It feeds the shared reference library (`../reference-library.md`) and each project's own `DESIGN.md`.

**Type of research: X-supplied, compiled by Grok. It is not Reddit research** (the report says Reddit could not be read) **and it is not verified by Claude.**

## Provenance and verification status

| Item | Status |
| --- | --- |
| Report text | Read in full by Claude on 2026-11-20. |
| Everything inside the report | **Reported by Grok. Not verified by Claude.** |
| Source links (x.com, motionsites.ai, animatedwebs.com) | **Not opened.** These hosts are not reachable from the Claude Code cloud environment (connection failed; they are not on its network allowlist), so none of the posts, prompts or templates could be inspected. |
| Reddit | **Not researched.** The report says: "Reddit blocked my reads tonight, so this is X only." No Reddit findings exist and none are claimed anywhere in this repository. |
| Usernames and attributions | Copied exactly as given in the report. Claude has not confirmed who owns any account. |
| Licences | None of the linked items were checked for licence or reuse terms. Treat all as inspiration only. |

Labels used below: **[Report]** = what the Grok report states. **[Claude]** = Claude's own reading, adaptation or caveat.

## 1. Senior designer prompt for Fable 5.2

- **Source [Report]:** @choopyplug1, https://x.com/choopyplug1/status/2121685007215292656
- **What it is [Report]:** a reusable role prompt that makes a model act as lead designer: ask at most three questions, audit an existing screen first, show three directions and wait for a pick, then build with explicit rules, check at 390px and 1440px, and hand off a spec.

The prompt as supplied (verbatim from the report, attributed to @choopyplug1):

```
# ROLE
You are the lead designer on [PRODUCT]. The design is yours
to decide, and you will maintain it after launch.
Design [SCREEN] for [AUDIENCE].

# BEFORE YOU DESIGN
Ask me up to 3 questions, only ones that change the design:
who it is for, the one job of this screen, how it should feel.
No brand yet? Propose one: 1 accent color, 2 neutrals,
1 display font, 1 text font. One line of why for each.
Got an existing screen? Audit it first: the 5 biggest
problems, worst first, each with the fix.

# SHOW 3 DIRECTIONS FIRST
1 = safe · 2 = bold · 3 = one I would not expect
They must differ in layout and idea, not just in color.
Give each a name, one sentence and a rough wireframe.
Recommend one and wait for my pick. Do not build yet.

# BUILD THE ONE I PICK
Real content only. No lorem ipsum, no "Feature 1".
One focal point per screen. Size and space make hierarchy.
4px spacing scale. 5 type sizes max. One accent, used rarely.
Design every state: empty, loading, error, hover, focus.
Text contrast 4.5:1 or higher. Touch targets 44px or more.

# A SYSTEM, NOT ONE SCREEN
Define tokens first: colors, type scale, spacing, radius.
Build from components. Reuse one before you invent one.
The same thing looks the same everywhere.
Dark mode comes from the same tokens, not a second design.

# WORDS ARE DESIGN
Write the real copy yourself. Short, specific, no hype.
Buttons say what happens: "Save draft", not "Submit".
Errors say what went wrong and how to fix it.
Names, numbers and dates must look real, not "John Doe".

# MOTION
Animate only what explains a change. 150 to 250ms, ease-out.
No bounce on everything. Respect reduced motion.

# NEVER SHIP THE DEFAULT AI LOOK
purple-to-blue gradients · glass cards on everything
centered hero with 3 feature cards · emoji as icons
a shadow on every element · more than 3 colors

# CHECK IT BEFORE YOU SHOW ME
Open the result at 390px and 1440px and take screenshots.
Look at them. Fix anything that overlaps, clips or drifts
off the grid. Is the main thing obvious in 1 second?
Tab through it. Every control must be reachable by keyboard.

# WHEN I GIVE FEEDBACK
Change only what I named. Keep everything I did not mention.
If my note makes the design worse, say so once, then do it.
Show before and after side by side.

# HAND OFF
The working file, plus a short spec: colors, type scale,
spacing, components.
The 3 things you would improve with more time.
```

**[Claude] How this is applied**

- It becomes the project's design process (see the skill's `SKILL.md`, "Process"): questions, audit, three directions, build, check, feedback, hand-off.
- Several numeric rules (4px spacing, five type sizes, three colours, one accent) are **defaults for product UI**. A deliberately art-directed site may deviate when its own `DESIGN.md` records why (for example a site with a deliberate five-colour palette). Deviation must be written down, not accidental.
- "150 to 250ms, ease-out" agrees with Emil Kowalski's published ranges (verified in `references.md`), which also allow longer for modals and drawers.
- "Change only what I named" and "show before and after side by side" are adopted as the feedback rule for existing, approved designs.

## 2. De-slop prompt

- **Source [Report]:** @reshax0, https://x.com/reshax0/status/2121959214176505861
- **[Report]:** paste a screenshot of your hero, then: "You're a picky designer. List everything on this page that looks like an AI default: gradients , icon cards, pill bags, accent coloured word, sparkle icon, fade-ups, vague buttons. For each one give one replacement based on what my product actually does. No new claims."
- **[Claude] Application:** this is the screenshot-based audit step. Run it on desktop and mobile captures of each page. The "No new claims" clause matters here because every concept is a fictional business: a replacement may change presentation but must not invent facts, prices, reviews or credentials.
- **[Claude] Caveat:** an "AI default" is only a problem when it is the default. An italic accent word or a pill label can be right if it carries the concept's tone. The audit asks for a reason, not removal.

## 3. MotionSites full prompts

- **Source [Report]:** @viktoroddy
  - Virtual store: https://motionsites.ai/?prompt=virtual-store (post https://x.com/viktoroddy/status/2121758291143626986)
  - Protein bars: https://motionsites.ai/?prompt=protein-bars (post https://x.com/viktoroddy/status/2122497496392126731)
  - Fox couture: https://motionsites.ai/?prompt=fox-couture (post https://x.com/viktoroddy/status/2121587799216595326)
- **[Report]:** these are full prompts for website designs. The report gives only the links; **no prompt text or design description was supplied.**
- **[Claude] Verified separately:** the MotionSites home page (https://www.motionsites.ai/, a different host from the `motionsites.ai` links above) was fetched and describes a library of "ready-to-use prompts" for AI-generated landing pages, with paid tiers. Terms were not read.
- **[Claude] Status:** the three prompts were not inspected, so no design observations are recorded. They are a creative-direction reference for how motion-led sites are briefed, not a template. Do not paste prompts into builds.

## 4. Iridescent Voice Orb

- **Source [Report]:** @RegesCoreAi, https://animatedwebs.com/templates/iridescent-voice-orb ("free full site + build prompt")
- **[Report]:** a free full site template with its build prompt.
- **[Claude] Status:** not inspected, licence unknown. An iridescent orb is the "floating orb" pattern this project treats as a generic AI look, so it is recorded as a **counter-example to study, not a direction to follow**.

## 5. Landing page as a game

- **Source [Report]:** @kodavid, https://x.com/kodavid/status/2122054450994892883
- **[Report]:** the prompt "Create a mobile optimized landing page game using the SocialSight MCP for images, graphics, and other media content. I want an interactive game to showcase our SocialSight Multiverse feature". Tip: ask Claude to ask you questions before it starts.
- **[Claude] Application:** the idea that a page can teach by letting the visitor play is relevant to interactive explanations. It depends on a third-party MCP (SocialSight) that is not part of this project and is not adopted. The "ask questions first" tip is already step one of the process in item 1.

## 6. The UI you shared

- **Source [Report]:** @edo_lunardi, https://x.com/edo_lunardi/status/2121576083707310142 ("designed in Paper, no prompt shown")
- **[Claude] Status:** not inspected. Recorded as a visual reference to look at when access allows.

## Skipped by the report

- @HeyDetya's "Claude made this" post (the report says he admits it was made in Figma).
- @ahmedscen's prompt (behind a paid link). Do not purchase.

## Open items

- Re-run the link inspection if the owner allows the three hosts above, and update this file with verified observations. Until then every statement above remains "reported by Grok".
- Reddit research has not been done by anyone in this record.
- "Tobi" (a designer named in earlier instructions) is still unidentified and is not attributed to any example.
