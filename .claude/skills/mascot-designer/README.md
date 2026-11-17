# Mascot Designer

A skill for Claude Code that designs a mascot for your iPhone, iPad or Mac app (or your website), with a reason to exist, and hands you everything to ship it.

## What it does

1. **Asks four quick questions**, written for your app: what the mascot should stand for, its personality, its colour, where it lives. It reads your project first, so it already knows your app's name and brand colour.
2. **Designs the character**: the idea in one sentence (Penny is a piggy bank with a sprout growing from its coin slot: your savings, growing), one signature feature, the shape, the name, the look (soft clay, plush, fuzzy, designer toy, flat line or retro sticker).
3. **Draws three concepts** with your OpenAI account. You pick one.
4. **Draws every pose** of yours: idle, blink, hello, thinking, celebrate, oops, sleeping, pointing, love. Cleans them, lines them up on one ground line, splices the blink so only the eyes move.
5. **Ships it**:
   - a film of your mascot living in an iPhone app and a Mac app, doing every move (you see this first)
   - a character sheet: name, meaning, palette, every pose
   - `ios/<Name>.xcassets` (@1x @2x @3x) and `ios/<Name>View.swift`: `PennyView(move: .celebrate)`, iOS 17+ and macOS 14+
   - `web/mascot.js` + `web/<name>/`: `<mascot-view src="/penny" state="celebrate">`, the same moves to the frame
   - every pose as a 1024 px transparent PNG, and a guide to where each move belongs

Every mascot gets the same moves, mastered once: anticipation, squash and stretch, overshoot, blinks on their own clock, confetti, a thought bubble, Zzz, floating hearts, a squish on tap. One file (`runtime/motion.json`) drives both SwiftUI and the web.

## No OpenAI account?

It starts from 20 ready-made mascots (savings, cloud, calm, energy, travel, journaling, learning, AI helper, habits, music, security, food, hydration, streaks, writing, sleep, chat, pets, time, shopping), picks the one that means the most for your app, renames it and recolours it to your brand, then makes the same kit and film.

## Install

Open a terminal in this folder, type `claude`, then `hi`. Or run `node install.mjs`.

Needs Claude Code, Node.js 18+, and Google Chrome or Microsoft Edge (or it fetches Chromium). For one-of-a-kind mascots: an OpenAI API key (`OPENAI_API_KEY` in `~/.mascot-designer/.env`) or the Codex CLI signed in with ChatGPT (`codex login`). About 12 images per mascot, on your account.

Made by Tobia Donadon · tobiadonadon.com
