# Marpet Fabrications website: development build status

Development build on branch `claude/beautiful-hawking-dh0pog`. Not merged, not launched, not deployed. Every page carries `noindex`.

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
| Unit and build-output tests | `npm test` | 134 passed, 0 failed |
| Browser tests | `npm run test:browser` | 280 passed, 0 failed |
| Existing site tests (repository root) | `node --test test/*.test.js` | 154 passed, 0 failed |

The site itself is plain HTML, CSS and JavaScript, so there is no TypeScript source. Type checking covers the Node-side code through JSDoc types.

The browser suite covers, at 1440, 820 and 412 pixels wide:

- every page: no script errors, no sideways scrolling, and no serious or critical accessibility failures from axe-core (WCAG 2.1 A and AA rules plus best practice);
- navigation by plate, menu and photograph; back and forward; direct addresses; focus moving to the new page;
- the homepage opening: menu and quote button usable from the start, skip, no replay for returning visitors;
- the project filter;
- the enquiry form: error summary, focus, field marking, recovery, and the honest "not sent" state;
- keyboard skip link, reduced motion, and the site with scripts switched off.

Limits of that evidence: browsers were headless Chromium with a software GPU. Safari, Firefox and real phones have not been tested. Automated accessibility scanning finds only part of what a manual review would.

## Enquiry journey

- The form validates in the browser, has a honeypot and a timing field, and reports errors accessibly.
- The server function `api/enquiry.js` is written and unit tested against mocked services. It verifies Cloudflare Turnstile, then sends through Resend, and reports success only after the email is accepted.
- **It is not connected.** No sending account, sending domain, Turnstile keys or host exist yet. Until they do, the form says plainly that nothing was sent and offers the enquiry as a ready-written email to info@marpet.co.uk.

## Remaining content needed from Marpet

1. Vector or high resolution logo.
2. Higher resolution photographs, and workshop and people photographs. The largest existing image is 1024 x 768.
3. LinkedIn company page address. None is linked from the existing site and none was found by search.
4. Team names, roles, biographies and approved portraits.
5. Real project titles, dates, scope and technical detail; client names only where approved.
6. Technical capability for each service.
7. Founding date wording (existing site: early 80s; registry listings: incorporated February 1997).
8. Road spelling: Fullarton or Fullerton (registry listings use Fullarton).
9. Confirmation that each named customer may still be published.
10. Whether Dentistry and Catering are still offered, and whether the fax number is still used.
11. Approved wording for the JNR Engineering relationship and permission to use its logo.
12. Privacy notice text.
13. Measured drawings or more photographs of a conveyor. Drive, underside and belt return are not modelled.

## Remaining technical items

1. Enquiry sending: Resend account and verified domain, Turnstile site key and secret, and a host for the function.
2. Hosting and domain: where the site will live, and DNS access for launch and the 11 redirects (`site/redirects.json`).
3. Real-device testing: frame rate on phones (use `phone-test.html`), Safari and Firefox.
4. Analytics: none installed.
5. Clean addresses: the build uses flat file names (`service-pipework.html`). Production should serve `/services/pipework`.
6. Repository: this build lives in a folder of the Rhys Hume site repository. It should move to its own repository before launch.

## Changes outside this folder

- `vercel.json`: deployments switched off for this branch only (made in the previous round, to stop automatic previews).
- `test/pages.test.js`: this folder added to the skip list of the existing site's page test.
