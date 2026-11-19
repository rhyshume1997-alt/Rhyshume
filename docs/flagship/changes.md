# Rev 2 release: redesigned home page and public website concepts

## What this release contains
- **Home page** (`index.html`, `home.css`, `home.js`, `featured.css`, `featured.js`): new positioning (attractive websites and the systems that make them useful, four things I do), a hero example that rebuilds itself for four different jobs, four featured concepts as editorial bands each with a small working demonstration (Sunny Hours Club, Little Kettle Café, Bright Circuit Electrical, The Corner Shelf), all eight concepts, a clear "Real work and work in progress" divider, and a new "What is in the starting price" section. Marpet, JNR, RDH Coaching, Tolra (pilot), validation, grants, contact routes, structured data and SEO metadata are kept.
- **Public portfolio** `/website-concepts/` and eight public demonstrations `/website-concepts/<slug>`, built by `tools/build-website-concepts.py` from the finished development copies. Every concept shows "Concept by Rhys Hume, not a live site." Forms are inert, nothing is stored, sent, booked or paid.
- Fixes to the known defects: Corner Shelf title and shelf overflow, Sunny Hours sticky bar, Oak & Razor poster framing.
- Menu link "Website concepts" on every public page, sitemap entry, indexing headers, `.vercelignore` for the development copies.

## Indexing decisions
- `/website-concepts/` is indexable and in the sitemap.
- The eight demonstrations are `noindex, follow` (meta and header), so made-up businesses are not indexed as real ones, and are not in the sitemap.
- The hidden development copies (`c-3e9a41b7d20f58c6/cinematic`) keep `noindex,nofollow,noarchive` and are excluded from deployment by `.vercelignore`.

## Not in this release
- The Client Workbook. It is a private tool. The hosted copy at `w-82503121e7fdf54e` is unchanged by this release (it was already in the repository and deployed before; see `docs/workbook/SECURITY-NOTES` on the workbook branch). The upgraded workbook lives on `claude/client-meeting`.

## Prices
The brief states Standard website from £2,200 and care plan £60 a month. Everything already live says from £1,500 (website), from £3,800 (website with quote workflow) and from £35 a month (care plan). No price was changed in this release. Change them in one pass across `index.html`, `engineering.html`, `local-business.html` and the tests when confirmed.

## Assets to upgrade in a future design pass
- All eight clips are 736 x 400 (soft when large). Higher resolution masters and portrait phone clips are needed.
- Oak & Razor poster is the clip's first frame (736 x 400), softer than the earlier 1672 px still.
- No supporting photography exists for six concepts; they use drawn illustration and native frames. Olive & Ivory has nine low resolution frames (three more planned). Salt & Ember has four low resolution menu photographs.
