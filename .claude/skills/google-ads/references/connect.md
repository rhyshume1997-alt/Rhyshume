# Getting the account in, and the changes out

Three ways in. Recommend A unless they can't run scripts.

## A. The export script (recommended: 3 minutes, once)

`gads script` writes `gads/export-script.js`. It only reads. Walk them through it, one step at a time:

1. Open Google Ads. At the top or in the left menu: **Tools → Bulk actions → Scripts**.
2. Press the blue **+** (New script). If Google offers templates, choose a blank one.
3. Delete what's in the editor. Open `gads/export-script.js`, copy all of it, paste.
4. Google shows **Authorize** above the editor (older screens: "Authorize now", then "Grant access"). Press it and pick the Google account. It asks for two things: Google Ads (to read the account) and Google Drive (to save one file there). Both are needed once.
5. Press **Run** (or **Preview**: this script changes nothing either way, and it saves the file in both).
6. A minute or two later the **Logs** say `Saved google-ads-export-<account>-<date>.json to your Google Drive`, with a link.
7. Open Drive, download the file (the file itself: right click → Download), and put it in `gads/exports/`. Dragging it into Claude Code works too: save it there for them.

Then `gads check`.

Good to know:
- A manager (MCC) account can't run it for all clients at once: open the client account first, then Scripts.
- To have a fresh file every Monday: in the Scripts list, set the script's **Frequency** to Weekly. Each run saves a new file.
- If the Logs show "part(s) could not be read", that's fine: the file says which, and the check works with the rest.
- The file holds campaign settings, keywords, ads, search terms and totals. No customer names, emails or payment details are in it.

## The changes: the second script

`gads fix <option numbers> --ok "<their words>"` writes `gads/changes/<date>-changes.js`. Its first lines list, in plain words, everything it will do.

1. Same place: **Tools → Bulk actions → Scripts → +**, paste, **Authorize**.
2. Press **Preview**. Nothing changes in a preview. Open the **Logs**: each line should match the list at the top of the script. `ok` means it would be done; `!! skipped` means something was renamed or changed since the check (the reason is next to it). Negatives, pauses and budgets also show in Google's **Changes** tab; setting changes (networks, location option, AI Max, pausing a campaign) appear in the Logs only, because the script doesn't send those at all during a preview.
3. If it matches, press **Run**.

What the script protects against: it stops if it's pasted into another account; it skips a campaign whose name changed, a keyword whose text changed, and a budget that isn't what the check saw; it never raises a budget by more than 20% in one step, and never touches a budget shared between campaigns. What it can do: add negative keywords, pause keywords, pause a campaign, switch off search partners / the Display Network / AI Max in a campaign, set the location option to Presence, raise a budget one step. Everything else is a click path.

If Google refuses one of the setting changes (the log says so), give them the click path for that option instead. This skill has been tested against Google's published API definitions and a simulator, so the first run on a real account is where a surprise would show: Preview exists for that.

## B. No scripts: a report and screenshots

Some people can't run scripts (no permission, a locked-down agency login).

- **Searches:** Google Ads → Campaigns → Insights and reports → **Search terms** → set the dates to the last 30 days → **Download** → .csv. Make sure the columns include Campaign, Clicks, Cost and Conversions. Then `gads searches --csv "<file>"`. The engine can't see their keywords this way, so read the list with extra care before anything is blocked.
- **Ads:** have them paste the headlines and descriptions (or a screenshot of the ad's edit screen). Put them in a draft file (`references/ads.md`) and run `gads critic --draft`.
- **Settings:** ask for screenshots of each campaign's **Settings** page (all sections open) and of Goals → Conversions → Summary. Read them against `gads plan` (the settings sheet for their goal) and go through it line by line. You can say what's wrong; you can't say what it cost, and say so.

## C. Google's own connector, or the API

Google publishes an MCP server for Google Ads (github.com/googleads/google-ads-mcp). It needs a Google Cloud project with the Google Ads API enabled and their own login; it reads, and it can't pause keywords, add negatives or change settings. If they already have it connected:

1. `gads queries` prints every read-only query the export uses, with the dates filled in.
2. Run each with the connector's `search` tool and save each result as `<query name>.json` in one folder (the rows as returned). Add `names.json` if you looked up place and language names: `{ "geo": { "geoTargetConstants/1026201": "Austin,Texas,United States" }, "languages": {} }`.
3. `gads assemble <folder>` builds the export into `gads/exports/`. Then `gads check` as usual.

Changes still go through the change script or their own clicks. Don't suggest setting up a Cloud project just for this: A is faster.
