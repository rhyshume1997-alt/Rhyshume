# Searches and negative keywords

A keyword is what they bid on. A search term is what a person really typed. The gap between the two is where most wasted money is.

`gads searches` prints, per campaign:
- **Block:** words and searches that spent and brought nothing.
- **Look:** the biggest searches that brought nothing but haven't spent enough to cut on numbers alone.
- **Add:** searches that converted twice or more and aren't keywords yet.

## How the engine picks

- A **single search** is proposed as an exact negative (`[roto rooter austin]`) when it alone spent 3× the target with nothing back.
- A **word** is proposed as a phrase negative (`"supply"`) when no search containing it ever converted and it shows up in 2+ searches that together spent 3× the target. A word blocks more than a search does, so it needs at least as much behind it.
- A word from the short list of words that are almost never a buyer in any trade (jobs, salary, diy, course, pdf, wiki, reddit…) needs half the target. "Free", "cheap", "reviews", "school", "video" are **not** on that list: they are buyers for too many businesses.
- Everything else that spent and brought nothing shows under **Look**: the biggest five per campaign, whatever the target.
- Never proposed: a word that is in one of the campaign's keywords, in the brand, in the place names, in the business name or in the brief's `keep` list; a word with even one conversion; anything already a negative (campaign, ad group, a list, or the account-level list); a search Google marks as excluded.
- A negative is written exactly as people typed it, accents included: to Google `università` and `universita` are two different negatives.
- With no target cost in the brief it uses what a result costs in that campaign; with no results at all, clicks (40).

## Your part: meaning

The engine counts; it can't read. Before `gads fix`, go through every proposed word against what the business sells:

- A buyer for *this* business? Leave it out: `--skip "course, training"` for a training company; `--skip "reviews"` if they want comparison shoppers.
- A word with two lives in their language? In Italian "corso" is a course and an avenue (Corso Buenos Aires): blocking it blocks street searches too. Check before it goes in.
- Too wide? "supply" blocks "plumbing supply store" (good) and "water supply line repair" (a job). Offer the narrower phrase: block `"supply store"` instead, by hand.
- A competitor's name: their call. Some want those clicks; most can't afford them. Say what it cost and ask.

For each LOOK search, give a verdict in one line: on topic (keep, it needs more time or a better ad), or off topic (block by hand now).

Say plainly what a negative does: a phrase negative blocks every future search containing those words in that order; an exact one blocks only that search.

## What negatives don't do

Negatives don't match close variants: `"job"` doesn't block "jobs". Misspellings are covered; plurals and synonyms aren't. When a word is blocked, add its plural too (the engine proposes each form it saw; add the missing one by hand or tell them).

## Where they live

- **Campaign level** (what the change script adds): Campaigns → Audiences, keywords, and content → Search keywords → Negative search keywords.
- **A list** shared by several campaigns (Tools → Shared library → Exclusion lists): better for the words that are wrong everywhere (jobs, salary, diy). Suggest making one once the same word has been blocked in two campaigns.
- Limits, from Google: 10,000 negatives per campaign, 20 lists of 5,000, 1,000 at account level.

## Match types today

- **Exact** `[emergency plumber]`: searches with the same meaning or intent.
- **Phrase** `"emergency plumber"`: searches that include the meaning.
- **Broad** `emergency plumber`: searches *related* to it; Google also uses the landing page and the other keywords. A keyword typed with no symbols is broad.

The check compares broad match's cost per result with phrase and exact. Broad isn't wrong as such: with conversion bidding and enough data it works. With little data, start on phrase and exact and widen later.

## What Google doesn't show

Low-volume searches are left out of the report. The check says how much went to searches it can't list when that's over 15% of a campaign. (A very big account can also have more searches than one export carries: then the check says "Cut short" instead, and nothing is blamed on Google.) Nothing to do about it except tighter match types and good negatives.

## From a report file

`gads searches --csv "Search terms report.csv"` (Campaigns → Insights and reports → Search terms → Download → .csv, with Campaign, Clicks, Cost and Conversions columns). The engine can't see the keywords there, so it may propose a word that's part of what they sell: read every line.
