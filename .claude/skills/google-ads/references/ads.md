# The ad critic, and writing ads that pass it

A responsive search ad is up to 15 headlines (30 characters each) and 4 descriptions (90 each). Google shows 2 or 3 headlines and 1 or 2 descriptions at a time, mixed to find what works. So every headline has to make sense alone and next to any other.

## The score: ten checks, two points each

`gads critic` scores every ad in the export; `gads critic --draft file.json` scores one before it goes live. 14 passes.

| Check | 2 points | What it's for |
|---|---|---|
| Enough headlines | 10 or more | Google can only test what it's given |
| Enough descriptions | 4 | same |
| Says what they searched | the ad group's main keyword, whole, in 2+ headlines | the person sees their own words; Google's advice too |
| Each headline says something new | no two headlines sharing most of their words | repeats waste slots and can't be shown together |
| A reason to pick you | proof in 2+ headlines: years, reviews, rating, licence, guarantee, a number | what a competitor can't copy |
| An offer or a price | in a headline and a description | a reason to click now |
| Tells them what to do | an action in a headline and a description | call, book, get a quote, shop |
| Lands on the right page | https, a page about the keyword (not the home page), the path fields used | the click continues the sentence |
| Google can test it | nothing pinned, or 2+ headlines sharing each pinned position | one headline pinned alone freezes that slot |
| Google's editorial rules | no "!" in headlines, no shouting capitals, no phone number in the text, nothing over the limits | disapprovals stop the ad |

Notes that don't move the score: no line about speed or availability, the brand missing from the headlines.

What the score is not: a prediction. Google's own Ad Strength isn't used in the auction either, and an "Average" ad often beats an "Excellent" one. The score says the ad gives Google and the reader enough to work with. Performance is judged by the numbers after it runs.

For ads in a language the engine's word lists don't cover (it knows English and the common words of Italian, Spanish, French and German), the proof, offer and action checks may read 0 when the line is there: score those three yourself by the same table and say you did.

## Rewriting a weak ad

1. `gads critic` (or `--json`) to see the ad, its keywords and each lost point.
2. Ask for the facts you need and don't have. Never invent them: years in business, review count and rating, licences, guarantees, prices or "from" prices, what's free (quote, delivery, returns), hours, how fast. No fact → leave a `[bracket]` and tell them to fill it or drop the line.
3. Write 12 to 15 headlines across these jobs, each one complete on its own:
   - 3 that say the search itself ("Emergency Plumber Austin", "24/7 Emergency Plumber")
   - 3 of proof ("4.9 Stars From 600+ Reviews", "Licensed & Insured Since 2009")
   - 2 or 3 of offer ("Free Quote in 10 Minutes", "Upfront Price Before We Start")
   - 2 of action ("Book Online in 2 Minutes", "Call Now, We Answer 24/7")
   - 1 or 2 of speed or place ("At Your Door in 60 Minutes")
   - 1 with the brand
4. Write 4 descriptions, each a full thought with an action in it; say the offer in at least one.
5. Path fields: two words from the keyword ("emergency", "austin").
6. Pinning: usually none. If the keyword must be in position 1, pin 2 or 3 keyword headlines to position 1, never one.
7. Save the draft and run `gads critic --draft gads/plans/<name>-ad.json`. It must pass (14+) with nothing over the limits **before** they see it. Count characters with the tool, not by eye. A `[bracket]` left in a line, or a placeholder landing page, fails the draft: that is the point, it can't go live half-filled.
8. Read the draft once more as a person searching: the score checks that the ad has what it needs, not that it reads well. An ad stuffed with the right words can score high and still be bad. Fix the ones that sound like a list.
9. Show old and new side by side with both scores, and what you still need from them (`[brackets]`).
10. They add it as a **new** ad next to the old one (Ads → + → Responsive search ad). Two or three weeks later the numbers say which stays. Google allows 3 enabled per ad group; more spreads the traffic thin.

Draft file:

```json
{
  "keywords": ["emergency plumber austin", "24 hour plumber"],
  "ads": [
    {
      "group": "Emergency",
      "finalUrl": "https://www.example.com/emergency-plumber",
      "path1": "emergency", "path2": "austin",
      "headlines": ["Emergency Plumber Austin", { "text": "24/7 Emergency Plumber", "pinned": "HEADLINE_1" }],
      "descriptions": ["A licensed plumber at your door in 60 minutes. Call now for a free, fixed quote."]
    }
  ]
}
```

## Google's editorial rules that catch people

- No exclamation mark in a headline; one at most in a description.
- No words in capitals for effect (FREE, AMAZING); real acronyms are fine. No repeated punctuation.
- No phone number in the text: use a call asset.
- No "click here".
- Trademarks of others in ad text can be refused; superlatives ("best", "#1") need proof on the landing page.
- Regulated things (health claims, finance, legal, housing, jobs) have their own rules: if the business is in one, tell them to read Google's policy page for it before publishing.
- The law of their country can be stricter than Google. Health professions are the usual case (in Italy, for one, promotional claims and "free visit" offers by medical practices are restricted). You don't know their local rules: say so, and ask them to check an offer line with their professional body before it runs.
- Keyword insertion (`{KeyWord:Default Text}`), location insertion and countdowns are read by the critic as what the person will see (the default text).

## If the page is the problem

An ad that passes and a keyword that fits can still fail on the page: the check's "landing page below average" line and a home-page final URL are the signs. If `/conversion-teardown` is installed, offer to run it on that page.
