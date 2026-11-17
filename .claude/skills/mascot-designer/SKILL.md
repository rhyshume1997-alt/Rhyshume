---
name: mascot-designer
description: Designs a mascot for an iPhone, iPad, Mac app or website, with character and intention, and hands back everything needed to ship it. Asks what the mascot must stand for, designs the character from that meaning (shape, signature feature, colour, personality, name), picks one of six looks (soft clay 3D, plush, fuzzy, designer toy, flat line, retro sticker), draws three concepts with the person's own OpenAI account, then every pose of the chosen one (idle, blink, hello, thinking, celebrate, oops, sleeping, pointing, love). Every mascot gets the same mastered moves (squash and stretch, anticipation, blinks, confetti, Zzz) in SwiftUI and on the web, identical to the frame, an Xcode asset catalog, a character sheet, and a film of the mascot living inside an iPhone and a Mac app, shown first. No OpenAI account: starts from 20 ready-made mascots, renamed and recoloured to the brand. Use for "mascot", "app mascot", "character for my app", "brand character", "make me a mascot", "Duolingo-style owl", "cute character", "animated mascot", "empty state illustration", "onboarding character", "Lottie mascot", "SwiftUI mascot", "Pixar style character".
---

# Mascot Designer

Version 1.0

You design a mascot the way a character studio would: it **means** something for this app, it has **one** idea you can see from across the room, and it **moves** well. Then you ship it ready to use.

What the person gets, in their folder `~/Desktop/Mascots/<Name>/` (or `$MASCOT_OUT/<Name>` when that's set):
- `<Name>.mp4`: a 32 s film of the mascot living in a real-looking iPhone app and Mac app, doing every move. **They see this first.**
- `<Name> character sheet.png`: the poster: name, what it stands for, palette, hero pose, all 9 poses.
- `ios/<Name>.xcassets` + `ios/<Name>View.swift`: drop into Xcode (iOS 17+, macOS 14+). `<Name>View(move: .celebrate)`.
- `web/mascot.js` + `web/<slug>/`: `<mascot-view src="/<slug>" state="hello">`, same moves to the frame.
- `png/`: every pose at 1024 px, transparent. `HOW TO USE.md`.

Scripts: `S=<this skill's folder>/scripts`. Quote every path (folder names have spaces). Talk in plain words, one or two lines between steps; never show JSON or prompts unless asked.

## 0. First run

If `~/.mascot-designer/node_modules/sharp` is missing, say "Setting up, about a minute." and run `node "$S/doctor.mjs" --fix`. Then `node "$S/gen.mjs" --check`:
- `openai` or `codex`: they can have a one-of-a-kind mascot (§2–§6).
- `none`: no OpenAI account here. Say so in one line, and offer both: sign in (`! codex login` with ChatGPT, or put `OPENAI_API_KEY=sk-...` in `~/.mascot-designer/.env`) for a one-of-a-kind mascot, **or** start now from the 20 ready-made ones (§7). Don't stall: if they don't answer the choice, use the library.

Image drawing costs the person's own OpenAI usage: about 12 images for a mascot (3 concepts, 9 poses). Say it once, before the first drawing.

## 1. Read before you ask

If you're in their project, find out what you can first (a minute, no more): the app's name and what it does (README, App Store text, Info.plist, package.json, the landing page), its colour (`AccentColor.colorset`, `Assets.xcassets`, Tailwind config, CSS variables, the logo), and where it runs (an `.xcodeproj` = iOS/Mac; Next.js/React/HTML = web). Anything you found, don't ask.

## 2. The interview: one round, then you design

One AskUserQuestion call, at most 4 questions, every option written for **their** app (never generic), your best guess first with "(Recommended)". Pick from:
1. **What should it stand for?** The feeling or promise the mascot carries (for a budgeting app: "Money that grows", "Calm about money", "A coach that pushes you", "A friend who celebrates wins").
2. **Its personality.** Four pairings that would really differ on screen (Gentle and warm / Cheeky and bold / Calm and wise / Hyper and playful).
3. **Its colour.** Their brand colour (show the hex you found) / one you choose to stand out against it / another.
4. **Where it lives** (multi-select), only if you couldn't tell: iPhone app, Mac app, website.

If they already told you all of this, skip the interview. Never a second round before they see concepts.

## 3. Design the character (this is the job)

Read `references/character.md` and `references/styles.md`, then write `<folder>/brief.json` (the folder is `~/Desktop/Mascots/<Name>`):

```json
{ "name": "Penny", "app": "Penny", "style": "clay",
  "character": "a small round piggy bank creature with a coin slot on its back and a tiny green sprout growing out of the slot, short stubby legs and arms, little pointed ears and a round snout",
  "colour": "warm coral pink body, fresh leaf-green sprout",
  "feature": "the sprout growing out of the coin slot",
  "personality": "kind, encouraging, quietly proud of you",
  "represents": "Savings that grow, a little every day",
  "role": "A piggy bank with a sprout: your savings, growing.",
  "concepts": [
    { "character": "a small round piggy bank creature with a coin slot on its back and a tiny green sprout growing out of the slot, ...", "colour": "warm coral pink body, fresh leaf-green sprout", "feature": "the sprout growing out of the coin slot", "role": "A piggy bank with a sprout: your savings, growing." },
    { "character": "a plump golden coin creature standing on its edge, with a leaf-shaped tuft ...", "colour": "...", "feature": "...", "role": "..." },
    { "character": "a little round seed pod creature carrying a tiny acorn-cap hat full of coins ...", "colour": "...", "feature": "...", "role": "..." } ],
  "brand": "#FF7A59",
  "lines": { "hello": "...", "empty": "...", "think": "...", "success": "...", "toast": "...", "oops": "...", "tip": "...", "loveTitle": "...", "love": "...",
             "items": ["...", "...", "..."], "itemMeta": ["Updated today", "2 of 5", "0 of 3"], "tile": ["Streak", "6 days"], "sidebar": ["Activity", "Goals", "Settings"],
             "emptyTitle": "Nothing here yet", "oopsTitle": "Oops.", "bannerTitle": "No connection", "bannerBody": "...",
             "ctaStart": "Get started", "ctaRetry": "Try again", "ctaLove": "Rate us",
             "macTitle": "...", "macSub": "...", "sync": "...", "synced": "..." } }
```

- `character`: the idea in one concrete sentence: what it is, its shape, limbs, the one detail that carries the meaning. Shape first, meaning built in (`references/character.md`).
- `concepts`: **three genuinely different ideas** for the same meaning, each `{ "character", "colour", "feature", "role" }` (optionally its own `name`). Different objects or creatures, not three angles on one: for a coffee journal, a roasted bean with a curl of steam, a little round mug with a latte-art heart on its belly, a moka pot with a steam tuft. The first is your favourite (copy it into `character`/`colour`/`feature`). If two of them would look alike as silhouettes, replace one.
- `style`: one of `clay plush fuzzy vinyl line sticker`, chosen with the table in `references/styles.md`. Say why in one line to the person.
- `lines`: everything the demo app says in the film, in the app's own voice and domain: a running app's `items` are runs, its `itemMeta` their distances, its `tile` a real stat, its `sidebar` its real sections, its banner a failure that app really has. The film already shows the title "Hi, I'm <Name>.": `hello` is the line under it, so don't repeat the name. Short: hello ≤ 64 characters, others ≤ 50, toast ≤ 26, itemMeta ≤ 12.
- Lines that share a screen must read as one: `emptyTitle` + `empty` (the title names it, the line says what to do, no repeat), `bannerTitle` + `bannerBody` + `oopsTitle` + `oops` (one failure, told twice in different words), `loveTitle` + `love` + `ctaLove`, `items` + `itemMeta`.
- Name the colour as close to the brand as words allow ("a bright periwinkle blue like #4F6BFE"); if the body still drifts, `poses` says so and `recolour.mjs` makes it exact.
- `brand`: their brand colour (hex), if they have one: it colours the film's buttons and leads the sheet's palette; the mascot's own colour themes the rest.

Tell the person the idea in two lines ("Penny is a piggy bank with a sprout growing from the coin slot: your savings, growing. Soft clay, coral, kind and quietly proud of you.") and go on. Don't wait for approval of words: they'll judge the pictures.

## 4. Concepts, then they pick

```
node "$S/make.mjs" concepts "<folder>"
```

About 2 minutes: one drawing per idea in `concepts`. Read `concepts/sheet.png` yourself first and judge each against the brief with `references/character.md` → "Judge a concept": does the meaning read, is the silhouette simple, is the signature feature clear at 64 px, is it on-style, any text, extra limbs or cut-off parts? Then open the sheet for them (`open "<folder>/concepts/sheet.png"`, or tell them where it is) and ask which one (AskUserQuestion: the three, your recommendation first with a reason in its description, plus "None, try again" with what you'd change).

- They pick n: `node "$S/make.mjs" pick "<folder>" n` (that idea becomes the brief's character; update `role` and `lines` if they no longer fit it).
- "None": change the brief (the shape idea, not adjectives) and run concepts again. At most two rounds; then go with the best and say what the poses can't fix.

## 5. Every pose

```
node "$S/make.mjs" poses "<folder>"
```

3 to 8 minutes (one slow image holds the step): 8 poses drawn from the chosen one in parallel, then cleaned (solid body, clean edges), lined up on one ground line at one scale, and the blink spliced so only the eyes move.

Then **look**: read `qa/sheet.png` (all 9) and `qa/overlay.png` (all stacked over a red ground line). Each pose must be the same character (colours, proportions, accessories, the signature feature), doing the right thing, with nothing extra (text, a floor, a second character, a missing limb). Redo any that fail, naming them and saying what went wrong: `node "$S/make.mjs" poses "<folder>" --only think --note "stay standing; keep the black bean eyes, no eyebrows"` (move names work too: hello, thinking). The earlier attempt is kept in `raw/attempts/`; if the redo is worse, `node "$S/make.mjs" restore "<folder>" think 1`. A pose that fails twice: say which and why, and keep the best.

## 6. Finish, show the film first

```
node "$S/make.mjs" finish "<folder>"
```

About 2 minutes: the kit (Xcode asset catalog at @1x/@2x/@3x, SwiftUI view, web element, PNGs, guide), the character sheet, and the film. Before showing it, check a few stills: `node "$S/film.mjs" "<folder>" --frames 1.6,4,7,10.5,13,17,22,30` and read them (`qa/film-*.jpg`): words fit, nothing overlaps, the mascot sits right in each screen. Fix the words in `brief.json` → `lines` and finish again if not.

The film is always the same demo app (an iPhone app, then a Mac app, then the moves): it's where people judge the moves, whatever their app is. Their own app's words make it theirs. For a menu-bar-only or web-only app, say that in one line when you show it.

Then hand over, in this order:
1. `open "<folder>/<Name>.mp4"`: "Here's <Name> in an app." (the film)
2. The character sheet.
3. Four lines: what's in the folder, how to use it in Xcode / on the web (from `HOW TO USE.md`), where each move belongs (`references/moves.md`, the table).
4. Offer the next step, as a question with options: **put it in my app** (§8), change something (a colour, a pose, the name, the words), or an app icon from it.

## 7. No OpenAI account: the library

20 finished mascots with every pose, one per common kind of app: `node "$S/library.mjs" list`.

1. `node "$S/library.mjs" match "<what the app is, in their words>"` and read `assets/library/library.webp` (all 20 at a glance). The match is only a hint from keywords: choose by meaning yourself (what it can stand for in THIS app: a piggy bank is also the shared kitty of a bill-splitting app), then personality, then look.
2. If they have a brand colour, preview it recoloured: `node "$S/library.mjs" preview <id> --colour "#hex" --out "<scratch>/p.png"` and read it (idle, celebrate and love: check the heart stays red). It keeps the shading, the blush, the mouth and props like the heart. If anything looks muddy or wrong, keep the original colour, pass the brand with `--brand "#hex"` instead (it still themes the film and leads the sheet's palette), and say so.
3. Ask which (AskUserQuestion: your top 3, best first with the reason; the descriptions say what each stands for).
4. `node "$S/library.mjs" use <id> "<folder>" --name "<Name>" --app "<App>" [--colour "#hex" | --brand "#hex"]`. Renaming is free: the name is theirs.
5. Rewrite the meaning for their app in `<folder>/mascot.json`: `role`, `represents` and `personality` (the library's are about its own idea: "money that grows" is wrong for a bill splitter), and the `lines` (same fields as the brief). Then `node "$S/make.mjs" finish "<folder>"` and hand over as in §6.

Be straight about it: a library mascot is shared with other people who use this skill; a one-of-a-kind one needs an OpenAI account.

## 8. Put it in their app

**Xcode.** Copy `ios/<Name>.xcassets` and `ios/<Name>View.swift` into the app's source folder. If `project.pbxproj` contains `PBXFileSystemSynchronizedRootGroup` (Xcode 16+ folders), that's all; otherwise say "drag both into Xcode, tick your target" (never edit project.pbxproj by hand). Then place it where it earns its place (`references/moves.md`): onboarding (`.hello`), the main empty state (`.sleep`), a save/sync wait (`.think` → `.celebrate` / `.oops`), the rate prompt (`.love`). Build it if you can (`xcodebuild -scheme <scheme> -destination 'generic/platform=iOS Simulator' build`).

**Mac menu bar.** In a `MenuBarExtra` with `.menuBarExtraStyle(.window)`, the mascot sits at 64-96 pt at the top of the panel: `.think` while a check runs, `.celebrate` / `.oops` on the result, idle otherwise. The menu-bar icon itself stays an SF Symbol or a template image, not the mascot.

**Web.** Copy `web/mascot.js` and `web/<slug>/` into `public/`, load the script once as a module, render `<mascot-view>`; in React/Next.js set `state` from component state and call `.play()` through a ref for one-shots. Next.js App Router: load it in the root layout (`app/layout.tsx`; create one if the project has none) with `<Script type="module" src="/mascot.js" strategy="afterInteractive" />`, use `<mascot-view>` in a client component, and copy `web/mascot-view.d.ts` into the project (React 19 needs `declare module "react"`, which that file does; a global `JSX` namespace no longer works).

## 9. Changes

- **A colour**: `node "$S/recolour.mjs" "<folder>" "#hex" --preview "<scratch>/p.png"` first (read it), then without `--preview`, then `make.mjs finish`. It always starts from the original colours (kept in `poses-original/`).
- **A pose**: `make.mjs poses "<folder>" --only <pose>` (then finish).
- **The name or the words**: edit `brief.json` / `mascot.json`, then `make.mjs finish`.
- **The moves** themselves never change per mascot: they're the library in `runtime/motion.json`, mastered once, shared by SwiftUI and the web.

## Rules

- Every mascot means something for this app. If you can't say what in one sentence, the brief isn't done.
- One signature feature, never three. Simple shapes, few details, readable at 64 px.
- No text, letters or logos on the character (they mirror when it points left, and blur when small).
- Don't copy a famous mascot or a reference image. Use references for craft, never for the character.
- Never call a pose good without reading the picture.
