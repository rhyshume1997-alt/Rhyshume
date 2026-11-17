# A new campaign, set up for what they want

The person builds it in Google Ads; you give them every value to enter and check each piece before it goes in. After they publish, you check that what's live is what was planned.

## 1. The brief

`gads/brief.json` must have the goal, the target cost (or return), the monthly budget, where, and who counts as "in" the place. If it's missing, ask (SKILL.md, First time).

Before anything else: is there a conversion to count? Goals → Conversions → Summary must have the real result (the form sent, the purchase with its amount, a call of a real length) as Primary. No conversion → set that up first; a campaign bidding for conversions it can't see is the most expensive mistake there is.

## 2. The settings sheet

`gads plan` prints the sheet for their goal: each setting, the value to choose, what Google does with it, and where it is. It's saved in `gads/plans/`. Go through it with them in the order Google's campaign builder asks:

- When Google asks for a goal, pick the one that matches (Leads, Sales, Website traffic only if there's truly nothing to count).
- The builder pre-ticks or recommends things the sheet says to turn off: search partners, the Display Network, AI Max, "Presence or interest". They go one screen at a time; tell them which screen each one is on.
- Budget: the sheet shows the daily number (month ÷ 30.4) and what one day can reach (2×).

## 3. Structure

- One campaign per goal and place. A separate small **brand** campaign (their own name, exact match) so brand searches don't flatter the rest.
- Ad groups by theme: one kind of search each, 5 to 20 keywords, an ad that says that search. "Emergency plumber" and "water heater repair" are two ad groups, not one.
- Keywords: phrase and exact to start. Think of what a buyer types the moment they need it, not every related word. Ask them for the 5 services or products that make the money and start there.
- A starter negative list from day one: jobs, salary, diy, how to, free (unless something is free), course, pdf, and the things they don't do. Read it with them: `references/searches.md`.

Write the plan as `gads/plans/<date>-<name>.md`: campaign, ad groups, keywords with match types, negatives.

## 4. The ads

One or two responsive search ads per ad group, written and scored as in `references/ads.md`. Every draft goes through `gads critic --draft` and passes before they see it. Each ad sends to the page about that ad group's theme, not the home page.

## 5. The extras

At account level: 4+ sitelinks (real pages: prices, reviews, contact, a main service), callouts, structured snippets, images; a call asset on opening hours for leads and calls; the Business Profile linked for visits.

## 6. After they publish: check what's live

This is the step that catches what the builder changed back. Ask them to run the export script (it reads a campaign that hasn't spent yet), then `gads check`. Every setting on the sheet should come back OK. Anything WRONG at this point cost nothing yet: fix it now.

Then leave it alone. First real check after two weeks, or once it has spent about 10× the target cost, whichever comes first. Looking daily and changing things restarts nothing officially, but nobody can read a campaign that changes every day.

## What to tell them to expect

Nothing you can promise. The first weeks buy data: which searches come, what a click costs here, whether the page converts. Say what would make you stop early (spend at 3× the target with no result on a keyword, a broken tag) and what wouldn't (one slow week).
