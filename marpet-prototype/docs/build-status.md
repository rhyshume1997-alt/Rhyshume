# Marpet Fabrications website: development build status

Development build on branch `claude/beautiful-hawking-dh0pog`. Not merged and not launched. Every page carries `noindex`.

## Shareable preview

- Address: https://marpet-fabrications-preview.vercel.app
- A separate Vercel project (`marpet-fabrications-preview`), serving only `marpet-prototype/site` from this branch. It is unlisted: anyone with the link can open it, no login, and search engines are told not to index it.
- The rhyshume.co.uk project is not involved. Its deployments stay off for this branch, and a redirect in the root `vercel.json` keeps this folder off that site.
- Each push to this branch builds a new preview at the long branch address. The short address above is pointed at a build by hand, so it needs re-pointing after changes.
- To take it down, delete the `marpet-fabrications-preview` project in Vercel.

The visual upgrade (pinned homepage scene, services viewing frame, staggered work gallery) is described in `visual-upgrade.md`, with measurements and screen recordings.

## What is built

| Area | Pages | Notes |
|---|---|---|
| Home | `index.html` | Live 3D conveyor hero with assembly opening, intro, services stack, featured work, customers, JNR section, LinkedIn section, enquiry call to action |
| Services | `services.html` + 7 service pages | Stacked steel plates; each service page has Marpet photographs, verified copy, related projects and a call to action |
| Our Work | `work.html` + 11 project pages | Filter by service; framed photographs open into project pages |
| About | `about.html` | Verified company text; steel beams assemble round the photographs |
| Team | `team.html` | Lift-plate structure with four labelled empty slots |
| Contact | `contact.html` | Validated enquiry form, direct details |
| Other | `privacy.html`, `404.html` | Privacy shows what the form collects; the notice itself awaits approved text |
| Development only | `dev-notes.html`, `material-test.html`, `phone-test.html` | Open items, realism comparison, on-device benchmark |

29 pages in total.

## Evidence

| Check | Command | Result |
|---|---|---|
| Build, with content validation | `npm run build` | 29 pages built; viewer bundle 709 KB (156 KB compressed) |
| Type check (build script, server, content schema, enquiry function) | `npm run typecheck` | 0 errors |
| Unit and build-output tests | `npm test` | 135 passed, 0 failed |
| Browser tests | `npm run test:browser` | 300 passed, 0 failed |
| Existing site tests (repository root) | `node --test test/*.test.js` | 154 passed, 0 failed |

The site itself is plain HTML, CSS and JavaScript, so there is no TypeScript source. Type checking covers the Node-side code through JSDoc types.

The browser suite covers, at 1440, 820 and 412 pixels wide:

- every page: no script errors, no sideways scrolling, and no serious or critical accessibility failures from axe-core (WCAG 2.1 A and AA rules plus best practice);
- navigation by plate, menu and photograph; back and forward; direct addresses; focus moving to the new page;
- the homepage opening: menu and quote button usable from the start, skip, no replay for returning visitors;
- the opening film: plays on a wide screen, skip stops it and hands over to the live model, not downloaded with reduced motion;
- steel sheet reveals: decoration only, never block the page, clear of the section once it is in place;
- Our Work scenes: one backdrop per project, large photographs, layers moving with scroll;
- the project filter;
- the enquiry form: error summary, focus, field marking, recovery, and the honest "not sent" state;
- keyboard skip link, reduced motion, and the site with scripts switched off.

Limits of that evidence: browsers were headless Chromium with a software GPU. Safari, Firefox and real phones have not been tested. Automated accessibility scanning finds only part of what a manual review would.

## Enquiry journey

- The form validates in the browser, has a honeypot and a timing field, and reports errors accessibly.
- The server function `api/enquiry.js` is written and unit tested against mocked services. It verifies Cloudflare Turnstile, then sends through Resend, and reports success only after the email is accepted.
- **It is not connected.** No sending account, sending domain, Turnstile keys or host exist yet. Until they do, the form says plainly that nothing was sent and offers the enquiry as a ready-written email to info@marpet.co.uk.

## Decisions applied (director, 17 November 2026)

- Founding date: incorporated 1997, from company registry listings. The "early 80s" wording is not used.
- Address: Fullarton Road, as in the registry listings, with a Google Maps link. Company number SC172812.
- Customers: the ten names from the existing site are published.
- Fax number: still in use and shown.
- JNR Engineering: described as Marpet's sister company. Enquiries stay separate.
- Service capability: taken from the existing site and shown on every service and project page.
- Privacy notice: written from what the site actually does.
- Enquiry sending: to be connected later.

The registry details came from company listing sites found by search, not from Companies House directly.

## Remaining content needed from Marpet

1. Logo: a vector or high resolution file. Replace `site/assets/img/logo.jpg` or set `logo` in `content/company.json`; the header and the 3D logo plate both use it.
2. LinkedIn company page address, in `content/linkedin.json`. Until then the section shows "Page address to be added".
3. Team names, roles, biographies and approved portraits. Four empty plates are shown.
4. Higher resolution photographs, and workshop and people photographs. The largest existing image is 1024 x 768.
5. Real project titles, dates and scope. Project pages currently use the service description and capability; no client is named.
6. Whether Dentistry and Catering are still offered. Both are kept from the existing site.
7. A read of the privacy notice before launch, and an update once the sending service is chosen.
8. Measured drawings or more photographs of a conveyor. Drive, underside and belt return are not modelled.

## Remaining technical items

1. Enquiry sending: Resend account and verified domain, Turnstile site key and secret, and a host for the function.
2. Hosting and domain: where the site will live, and DNS access for launch and the 11 redirects (`site/redirects.json`).
3. Real-device testing: frame rate on phones (use `phone-test.html`), Safari and Firefox.
4. Analytics: none installed.
5. Clean addresses: the build uses flat file names (`service-pipework.html`). Production should serve `/services/pipework`.
6. Repository: this build lives in a folder of the Rhys Hume site repository. It should move to its own repository before launch.

## Changes outside this folder

- `vercel.json`: deployments switched off for this branch only, and a redirect that keeps `/marpet-prototype/` off rhyshume.co.uk.
- `.vercelignore`: hides everything in this folder from Vercel except the built `site` folder.
- `test/pages.test.js`: this folder added to the skip list of the existing site's page test.
