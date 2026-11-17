# How Google Ads works now (checked November 2026)

Facts from Google's own help and developer pages unless marked "practitioners". Google changes these often: if the person's screen says something else, the screen wins, and tell them the date on this page.

## What changed in 2026

- **AI Max for Search** left beta in April 2026 and is on by default in new Search campaigns. From September 2026, campaigns that used "automatically created assets" or campaign-level broad match are moved to it. Dynamic Search Ads follow in February 2027.
- **Call-only ads** can no longer be created and stop serving in February 2027. Calls now come from a call asset on a normal responsive search ad.
- **Display is moving into Demand Gen:** a migration tool exists since June 2026; Google has said new Display campaigns will be blocked later, with no date.
- **Developer tokens are gone** (September 2026): API access now goes through a Google Cloud project. Scripts inside Google Ads need neither, which is why this skill uses them.
- **Budget-limited campaigns with a target** hold closer to the target since August 2026.
- **Ads in AI Mode** are rolling out country by country; there is no separate switch or report for them.
- **"Add responsive search ads"** left auto-apply in January 2026.
- **EU political ads:** every campaign has to declare whether it carries any (reported by the trade press; check the campaign builder).

## Budgets

"Your campaign might spend up to twice your average daily budget" on a day; over a month, "no more than 30.4 times your average daily budget".

## Bidding

- Target CPA: can start with no conversion history; evaluate over the last 30 days with at least 30 conversions.
- Target ROAS (Search, Shopping): at least 15 conversions in the past 30 days.
- Learning never lasts more than 7 days; it settles within 1 to 2 conversion cycles. Budget and target changes don't trigger it.
- Practitioners: change targets and budgets in steps of 10 to 20%, two weeks apart; keep the daily budget at several times the target cost. Google states neither for Search.

## Conversions

- Count "Every" for sales, "One" for leads.
- Primary actions feed the Conversions column and the bidding; secondary ones only "All conversions".
- Attribution is data-driven by default; first click, linear, time decay and position-based are gone.
- Default windows: 30 days after a click, 3 days engaged-view, 1 day view-through.
- Consent signals are required for the EEA, UK and Switzerland.

## Responsive search ads

- 3 to 15 headlines of 30 characters, 2 to 4 descriptions of 90, two paths of 15. 3 enabled per ad group.
- Ad Strength "isn't used to calculate Ad Rank, Quality Score, or auction wins". Google says going from Poor to Excellent brings about 15% more conversions on average; an independent study of 22,000 accounts (Optmyzr, 2024) found "Average" ads had the best cost per result. Treat it as a checklist, not a goal.
- Pinning "isn't recommended" by Google; the same study found some pinning beat none.

## Match types

Exact = same meaning or intent. Phrase = includes the meaning. Broad = related, using recent searches, the landing page and the ad group's other keywords. Negatives don't match close variants (they do cover casing and misspellings).

## Quality Score

1 to 10 per keyword; three parts rated Above average, Average or Below average. "Quality Score is not an input in the ad auction."

## Performance Max, today

Campaign-level negative keywords (up to 10,000), brand exclusions, 50 search themes per asset group, device targeting, age and gender exclusions, channel-level and full search-term reporting, asset-level stats, a new-customer goal.

## Benchmarks (context only, never a promise)

LocaliQ / WordStream Search Advertising Benchmarks, 2026 edition (US, Google and Microsoft together; localiq.com/blog/search-advertising-benchmarks): all industries average a 6.64% click rate, $5.42 a click, $66.69 a lead. Legal $131.63 a lead, home improvement $90.92, dentists $72.97, real estate $102.51, restaurants $30.57, beauty $39.25, auto repair $29.96, business services $93.69.

Use these only to answer "is my cost per lead crazy?", with the source and the year, and always after their own numbers. Their target comes from what a customer is worth to them, not from an average.

## What nobody can verify from outside

Which sites are "search partners"; what share of searches Google hides; the default state of every checkbox in the campaign builder on a given day (Google tests different screens on different accounts). Where this skill says "Google recommends" or "on by default", it's from the help page named in `scripts/sheet.mjs`.
