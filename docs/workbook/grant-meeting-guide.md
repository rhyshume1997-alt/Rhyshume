# Grant meeting guide (East Dunbartonshire Digital Support Grant)

A guided, one question at a time version of the client meeting for the Local Growth Fund digital support grant. It sits inside the Client Workbook next to the website meeting. It adds to the workbook, it does not replace anything.

## Open it

1. Open the workbook (the offline file, or the hosted copy after signing in).
2. Click **START CLIENT MEETING** (top left). The first block is **What kind of meeting?**. Choose **START GRANT MEETING** (or **START GRANT MEETING WITH THIS CLIENT** if a client is already open).
3. Other ways in: the sidebar **Grant > Grant meeting**, or the **Grant meeting** banner on the Client screen when the grant is ticked.
4. Name the client. Say OK to "practice run" if the client is made up.

Starting it ticks **A funding application** and sets the programme to the East Dunbartonshire pack. Nothing is submitted anywhere.

## The seven stages

| Stage | What it asks | Where the answers go |
|---|---|---|
| 1 The business | Name, main contact, trading address, trading since, legal form | Client screen fields, Contract company number. Trading since and legal form are kept in the meeting |
| 2 Can they get it? | One question per rule in the pack, then turnover, then a result | Can they get it (`S.elig`), turnover boxes |
| 3 The project | What they want, how they work today, the limit, what changes, benefits, alcohol check, the digital impact statement | What do they want done, Grant answers (`S.crit`), Licence check, a draft called the digital impact statement |
| 4 Costs | What the quote is for, price book items matched to the council list, VAT, totals, value for money answers, quotes held | Quote lines, Grant costs lines, Grant answers |
| 5 Proof to collect | One question per evidence item: who sends it, by when, status | Proof to collect (`S.evid`) |
| 6 Dates and next steps | Scheme dates, build weeks and planned dates, "nothing is started or paid until approved", deliverability answers, who does what, review | Dates, Grant answers, Still to do |
| 7 Send pack | Copy or print each client part, keep the internal record | See below |

Every question has a **Help for Rhys** box: what to ask, what a good answer sounds like, what to listen out for, what not to promise. **Hide my prompts** hides them when the client is looking at the screen. Each stage has a private notes box. Back and Next move one question. The stage strip jumps between stages.

Results are green (fine so far), amber (check this) or red (stop and check), always with a word as well as a colour. A red eligibility result tells you honestly that the business is probably not eligible. Next stays locked until you tick that you have checked with the council (or it is a practice run). The meeting never says an award is certain: funding is discretionary and the scheme maximum and the turnover rule are shown wherever money is shown.

## One set of fields, no drift

The meeting writes straight into the existing grant fields, so every Grant screen shows the same thing and a hand edit there is simply what the meeting shows next time. The only thing the meeting copies is cost lines: ticking a price book item adds a quote line, and the matching Grant costs line follows it. **If you change a Grant costs line by hand, the meeting leaves it alone.** The digital impact statement works like the other draft boxes: once you edit it by hand, new answers do not change it (Rebuild from answers puts it back).

Prices come only from **My prices**. An item with no price shows "no price yet" and adds nothing. Items the pack does not list (Google profile, domain and email, automation, marketing, hosting, maintenance) show as **ask the council** and count as not claimable until the council says otherwise. Over the cap is shown in red, and so is a grant above 10% of the turnover given.

## Send pack

Six client parts, each with **Copy** and **Print**: what we agreed, grant answers, evidence checklist, the itemised quote (the existing headed quote page, without bank details), the digital impact statement, and what you do next. There are also Copy everything, Print everything, Download (HTML) and a client copy JSON export.

The **internal record** is separate, in a red box: eligibility reasoning, your notes, assumptions, flagged unknowns, price and margin notes. It is not in any client part or in the client JSON. The screen warns if a private note ever appears in a client part.

## Saving and backup

- Autosave: every answer is saved in the browser as you type, and the meeting also saves a copy to the saved clients list on the hub every 20 seconds and when you move on. Reload and the meeting resumes at the same question.
- **Save** shows the time. **Save backup** downloads the whole project (includes your private notes, keep it to yourself).
- **Export grant record** (internal or client copy, JSON) and **Import a grant record** are on the hub and on the Grant meeting screen. Import replaces the grant answers in the open project, after a confirm.
- Nothing is encrypted and there is no password, as for the rest of the workbook. See SECURITY-NOTES.md. Do not store passwords or bank figures.

## Check with the council

The scheme facts come from the workbook pack (checked 10 Nov 2026) and its two source links. The council pages could not be read when this was built, so the dates, the 10% rule and the list of eligible items are not re-verified here. Before you give a date to a client, open the council page (link on the dates question) and tick the box. The flow shows a **Check with the council** flag for: both dates, discretionary funding, the claim process, which turnover counts, and anything the pack leaves unstated (number of quotes, decision time, extensions).

## Testing

`NODE_PATH=$(npm root -g) node tools/workbook-meeting/e2e-grant.js w-82503121e7fdf54e/index.html [shots dir] [axe.min.js]` runs the grant suite. `e2e.js` is the website meeting suite. `additive-check.py <old> <new>` proves a rebuild only adds. `hosted-check.js <repo>` checks the hosted sign in. Rebuild with `build-grant.py <workbook from main> <output>`.
