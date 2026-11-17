# The settings, one by one

For each: what it does, when ON is right, how the check judges it, where it lives. The rule behind all of them: a setting is wrong when it isn't what the brief asks for **or** when it spent money and brought nothing. A setting that earns its place is kept, whatever the textbook says.

`gads plan` prints the right values for their goal (the settings sheet).

## Networks (Search campaigns)

- **Search partners:** other sites' search boxes (Google doesn't list which). Included by default in a new Search campaign. The check splits the spend: wrong if partners got at least 1× the target and no results, or at least 2× the target with results costing over 1.3× what Google itself costs. Less than that spent there: "too little to judge". Cheaper there than on Google → keep, and it says so.
- **Display Network inside a Search campaign:** leftover budget goes to banners on sites and apps, shown to people who weren't searching. Wrong unless the brief allows it. If they want banners: a separate campaign with its own budget, so its numbers are its own.
- Where: Campaigns → the campaign's Settings → Networks.

## Location

- **Location option.** "Presence": people in or regularly in the place. "Presence or interest": also people elsewhere who search about it. Google recommends the wider one. For a local service, a shop that ships to one country, a clinic: Presence. For hotels, movers, real estate, events, tourism: the wider one is the point (`reach: "interested"` in the brief).
  The check shows what went to people outside (`AREA_OF_INTEREST`) and what came back. If outsiders convert at a fair cost it becomes their call, not a WRONG.
- **Locations.** None set means every country. The check compares the names with the brief and asks when they don't match. A radius is listed as "N km around …".
- Where: Settings → Locations (the option is under "Location options").

## AI Max (Search)

On by default in every new Search campaign since 2026. Three parts:
- **Search term matching:** shows ads on searches beyond the keywords.
- **Text customization** (was "automatically created assets"): Google writes headlines and descriptions from the site.
- **Final URL expansion:** sends the click to another page of the site.

It also took over the old "broad match for the whole campaign" setting. The check reads what AI Max's own searches cost and brought (`AI_MAX_*` sources) next to the person's keywords. Worse than 1.3× → WRONG with the money; as good → keep. With no split and under 30 conversions a month → off: it has nothing to aim with. Never tell them it's bad as such; with data and good keywords it can find searches they'd miss. Suggest a 4-week test once the campaign is steady, reading what it matched.
Where: Campaigns → Settings → the campaign → AI Max.

## Bidding

What Google's own pages say (support.google.com/google-ads, November 2026):
- Target CPA can start with no history; judge it over 30 days with at least 30 conversions.
- Target ROAS needs at least 15 conversions in the last 30 days (Search and Shopping).
- Learning lasts at most 7 days; budget and target changes don't restart it.

How the check reads it:
- Conversion bidding with no conversions coming in → WRONG: fix tracking, use Maximize clicks with a top bid meanwhile.
- Target ROAS while the account has under 15 conversions in 30 days → CHECK. Switching to "Maximize conversion value" with no target removes the only brake: Google then spends the whole budget.
- A target set while page views were counted as results → WRONG: the day the tracking is fixed the real cost shows and the old target chokes the campaign. Raise the target the same day.
- A shared (portfolio) strategy's target isn't in the export: the check says so and doesn't judge it.
- A target more than 30% under what a result really costs → CHECK: it holds the ads back. Set it near the real cost and step down 10 to 15% every two weeks (a practitioners' rule, not Google's).
- Under 15 conversions with conversion bidding → CHECK: wait with a steady budget, or Maximize clicks until 15.
- Maximize clicks or manual with 30+ conversions → CHECK: enough to bid for results.
- Target impression share outside a brand campaign → CHECK: it buys position, not results.

## Budget

The daily budget is an average. Google may spend up to 2× in a day and at most 30.4× in a month. The check adds the daily budgets and compares 30.4× with the brief's month.

"Runs out" (lost impression share to budget, 20% or more): more budget only when results come under the limit, one +20% step, then two weeks. Over the limit: lower the bids or the target instead, so the same money buys more clicks. No raise is ever proposed while the budgets already add up to more than the month, while page views are counted as results, or on a budget shared between campaigns (a raise there raises it for all of them: by hand only).

## Auto-apply recommendations

When on, Google makes changes by itself: new keywords, broad match, new targets, new ads. The check lists what is switched on, in words. Off by default in this skill's sheet: they still see every recommendation and choose.
Where: Recommendations → "Automatically apply recommendations" → Manage.
If the check says auto-apply was "not read", ask them to open that screen and tell you what's ticked.

## Tracking (the account block)

Nothing else matters until this is right.
- **No conversion action, or none primary:** bidding and the Conversions column only see primary ones. Goals → Conversions → Summary.
- **Many clicks, zero conversions:** the tag is probably broken. Have them do a test conversion themselves.
- **Counting:** Google's advice is "One" for leads, "Every" for sales. A form sent three times by one person is one lead.
- **Soft actions as primary** (page views, add to cart, outbound clicks): Google bids for those instead of results. Set them to Secondary.
- **The same result counted twice:** the website tag and a Google Analytics import both primary. Keep one.
- **Sales without amounts:** no return on ad spend, no value bidding.
- **Auto-tagging off:** clicks can't be tied to conversions. Admin → Account settings.
- In the EEA, UK and Switzerland, Google needs consent signals (consent mode) to keep measuring; if conversions dropped after a cookie banner went in, that's the first place to look.

## The extras under the ad (assets)

Sitelinks (Google suggests at least 4; more is better), callouts, structured snippets, images, a call asset (on opening hours, for calls), a location asset (for visits; it comes from the Business Profile, and the export can't see it: ask). They make the ad bigger for the same cost per click. Add them at account level so every campaign has them.

## A campaign that spends and brings nothing

Search, Shopping and Performance Max at 3× the limit with no result: WRONG, with a pause on offer. Display, Video and Demand Gen are often run to be seen, so the same numbers there are a question, not a verdict. Between 1× and 3×: worth a look, nothing more.

## Performance Max

- **Final URL expansion** and text automation are on by default. Keep the expansion only with the pages that can't sell excluded.
- **Brand exclusions:** without them it can buy searches for the business's own name and count them as its wins. The check flags it when the brief has a brand.
- **Asset groups rated Poor:** Google fills the gaps with auto-made assets.
- It now has campaign-level negative keywords, search themes, and channel and search-term reports: read those in Google Ads; this export doesn't carry them.
- Run it after Search works, not instead of it.

## Quality Score

1 to 10 per keyword, from three parts: expected click rate, ad relevance, landing page. Google says it is not an input to the auction: it's a diagnosis. The check lists keywords at 3 or under that are spending, with the part that's below average: ad relevance → the ad doesn't say what they typed (rewrite, or move the keyword to its own ad group); landing page → the page; expected click rate → the ad or the match.
