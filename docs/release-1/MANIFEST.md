# Release 1: the improved public website, without the Business Review backend

Branch: `claude/release-1-site`, cut from `origin/main` at 1bc5425. Source of the site work: `claude/business-review-integration` at c649492 (left untouched; it becomes Release 2).
This folder is documentation only. `docs` is in `.vercelignore`, so none of it is deployed.

## 1. Included files (35 changed, 0 deleted, against main)

Pages: `index.html` (new homepage, hero, sections, nav), `seo-and-ai-visibility.html` (new), `engineering.html`, `automation.html`, `automation-demos/index.html` (new), `about.html`, `websites.html`, `contact.html`, `local-business.html`, `privacy.html` (main's text, header and footer only), `tolra.html`, `csv.html`, `upgrade.html`, `404.html`, `council-digital-grants/index.html`, `insights/index.html`, `insights/what-to-put-on-an-engineering-firms-website.html`, `work/jnr-engineering.html`, `website-concepts/index.html` (header and footer only; its page copy is as on main).
Assets: `styles.css`, `home.css`, `contact.css`, `automation-demos.css` (new), `demo-engine.js`, `demo-scenarios.js`, `demo-ui.js` (new, the automation demonstrations; no network, no storage).
Discovery: `sitemap.xml`, `llms.txt`. JSON-LD is inside the pages.
Tests: `test/home.test.js`, `test/pages.test.js`, `test/flagship.test.js` (updated deliberately), `test/demos.test.js` (new, the demonstration tests), `test/release1.test.js` (new, guards against any Business Review link or file).
Docs: `docs/release-1/MANIFEST.md`, `docs/release-1/PRIVACY-TODO.md`.

One fix beyond the integration copy: `styles.css` ends with a rule so `.btn-on-ink` buttons (the closing navy band on most pages) show. On main a later `.btn` rule gave them the band colour, so the label was invisible. This also corrects those bands on production pages.

## 2. Excluded or disabled (not in this branch)

Files: `business-review/` (index, report, bot); `api/business-review.js`, `api/business-review-admin.js`; `api/_lib/br/`; `supabase/` (migration `20261120120000_business_review.sql` and its rollback); `br-form.js`, `br-render.js`, `br-report.js`, `br-automation.js`, `br.css`; the workbook Reviews module and rebuilt workbook (`w-82503121e7fdf54e/index.html` is byte-identical to main); `tools/br-ui-browser`, `tools/br-fullstack`, `tools/workbook-reviews`; every `test/br-*` file and `test/fixtures/business-review`; `docs/business-review`.
Configuration: `vercel.json` unchanged (no business-review functions, rewrites or crons); `.vercelignore` unchanged; `.env.example` unchanged (the new review variables, including BR_SALT, are not in this release).
Database: no migration, no table, no policy. Dependencies: none added (there is no package.json). Environment variables: none added. Paid APIs: none.
Pinned by `test/release1.test.js`: none of these paths exist, no page, sitemap entry, llms.txt line or JSON-LD links to /business-review.

## 3. Business review button and wording

Every "Free business review" header button, footer link and "See how your business compares" button became "Request a business review", linking to `/local-business#enquiry`. That is the existing "Tell me what you need" form (id `enquiry`, endpoint `/api/contact`, hidden `form=local`, Turnstile data-action `contact`). It has a "Not sure yet" option. Its success text is "Thank you. Your message has reached me, and I'll reply by email or phone."
Note shown beside the homepage button, in the homepage section, on the contact page route and above the form: "Tell me about your business and I will look at how you are found online and how you work. Choose 'Not sure yet' and mention a business review in your message."
The homepage "compare your online presence" section now describes a hand review by Rhys of the website and how enquiries reach the business, with practical suggestions. No timeframe, report, PDF, AI testing, competitor analysis or scores are promised (`test/release1.test.js` checks the copy). No form, field, API or Turnstile code changed.
One sentence of copy was added to the form's lead on `/local-business` (the "Asking for a business review?" note). The form element itself is unchanged.

## 4. Proof table (diff against origin/main 1bc5425)

| Area | Command | Result |
|---|---|---|
| api/ | `git diff origin/main --stat -- api` | empty |
| vercel.json | `git diff origin/main --stat -- vercel.json` | empty |
| supabase/ | `ls supabase` | does not exist; no file under it in the diff |
| .env.example, .vercelignore | `git diff origin/main --stat` | empty |
| workbook | `cmp w-82503121e7fdf54e/index.html <main copy>` | identical |
| concept pages c-3e9a41b7d20f58c6, c-09b37e50c043baaa | `git diff origin/main --stat -- <dir>` | empty |
| website-concepts demos (8 pages, video, css, js) | diff | only `website-concepts/index.html` changed, header and footer only |
| form scripts (form-check.js, contact.js, upgrade-live.js, nav.js, home.js, featured.js) | diff | empty |
| forms | `git diff origin/main -- local-business.html` filtered for form, input, select, option, textarea, turnstile, api/contact | no changed line in the form markup |
| tools/, fonts/, images/, preview/ | diff | empty |

## 5. Rollback

Production now (checked in Vercel, project rhyshume): `dpl_CkjMNYiU6aREWExawkkQ6Jqv9Fc6`, READY, main at 1bc5425. The one before it is `dpl_BkMJs3W1Q4zbyfyVA4JqR6eNkq16` (main ef3f31c, the Rev 2 homepage).
To roll back after Release 1 goes live: either revert the Release 1 merge commit on main (`git revert -m 1 <merge sha>`) and let Vercel deploy it, or in Vercel promote or roll back to `dpl_CkjMNYiU6aREWExawkkQ6Jqv9Fc6`. Nothing else needs undoing: there is no migration, data change or new setting.

## 6. Post-deploy smoke checklist

1. `/`, `/seo-and-ai-visibility`, `/engineering`, `/automation`, `/automation-demos`, `/about`, `/websites`, `/contact`, `/local-business`, `/privacy`, `/website-concepts/` return 200; `/business-review` returns 404.
2. Header button "Request a business review" opens `/local-business` at the form; "Not sure yet" is in the list.
3. Send one real test enquiry through that form (Not sure yet, say it is a test). Confirm it arrives by email and the "Sent" message shows.
4. `/sitemap.xml` and `/llms.txt` open and list no business-review URL.
5. `/automation-demos`: run each of the three demonstrations; the browser network tab shows no requests.
6. The workbook sign in page loads as before (`/w-82503121e7fdf54e/`).
7. Mobile (phone width): menu opens and closes, closing band buttons on `/engineering` and `/local-business` are readable.
8. Prices on `/local-business`, `/websites`, `/` unchanged: from £1,500, from £3,800, £35 a month, filming £200, Google search set up £150, listings and structured data £120, automation and AI set up £200, domain and email £60, 50% deposit, VAT line.
