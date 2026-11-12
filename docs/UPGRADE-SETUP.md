# Upgrade my site: setup (browser only)

How it works: a prospect fills in rhyshume.co.uk/upgrade. The request lands as a row in your Google Sheet.
You tick Approve, which starts the Build preview Action. You check the pull request, make the preview link,
paste it in the row and tick Send link. The script checks the link opens without a login, then emails it from your Gmail.

## Steps, in order

1. Merge this pull request after reading it. The form shows but saves nothing until step 7 is done.
2. Make a new Google Sheet called "Upgrade requests". Open Extensions, then Apps Script.
3. Delete what is there and paste in all of `tools/upgrade-sheet.gs`. Save.
4. In the function box at the top, pick `setup` and press Run. Allow the permissions it asks for. This makes the Requests tab.
5. In GitHub (Settings, Developer settings, Fine-grained tokens), make a token for only the Rhyshume repo with Actions: Read and write. Copy it.
6. In Apps Script, open Project Settings, then Script Properties, and add:
   - `SHARED_SECRET`: a long random string you make up (40 or more letters and numbers)
   - `GITHUB_TOKEN`: the token from step 5
   - `NOTIFY_EMAIL`: rhys@rhyshume.co.uk
7. Press Deploy, then New deployment, type Web app, Execute as Me, Who has access Anyone. Copy the URL ending in /exec.
8. In Apps Script, open Triggers (the clock), add a trigger: function `onSheetEdit`, From spreadsheet, On edit.
9. In Vercel (rhyshume project, Settings, Environment Variables), add `UPGRADE_SHEET_URL` (the /exec URL) and
   `UPGRADE_SHEET_SECRET` (the same string as SHARED_SECRET). Then redeploy.
10. Test with your own details: fill in rhyshume.co.uk/upgrade with a site and an email on the same domain. A row should appear.

## Each request

1. Check the row is a real firm. Set Niche to engineering if it is one. Tick Approve.
2. Wait for the Action to finish. Open its pull request (branch preview-<slug>) and check nothing is made up.
3. Do NOT merge preview pull requests. Merging puts the preview on the public site.
4. In Vercel, open the preview deployment for that branch, press Share, choose Anyone with the link, copy the link.
5. Paste it into Preview link and tick Send link. If the link asks for a login, nothing is sent and Notes says why.
6. After about 30 days, switch that share back to Only people with access.

Note: Vercel's docs say Hobby accounts can only make one shareable link in total. Check your plan before relying on
one share link per prospect.
