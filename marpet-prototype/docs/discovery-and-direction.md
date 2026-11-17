# Marpet Fabrications redesign: discovery and direction

Rev 1 response. Proposal and prototype only. Nothing here is deployed, and nothing touches marpet.co.uk or jnrengineering.co.uk.

## 1. Material I could access

**marpet.co.uk, all 11 pages** (fetched 17 November 2026): `index`, `about`, `services`, `contact`, `conveyor-belts`, `production-lines`, `pipework`, `access-platform`, `catering`, `dentistry`, `generalfabrication` (all `.html`). No `robots.txt` or `sitemap.xml` exists.

- **Logo:** one file, `images/logo.jpg`, 293x107, white "MF" mark and "Marpet Fabrications 1997 Limited" on a blue gradient. No vector.
- **Colours:** `#091431`, `#172853`, `#4565AE`, `#5985CE`, `#3C5492`. Fonts: Bebas Neue and Arial.
- **Photographs:** 68, all catalogued in `asset-register.md`. Largest is 1024x768. Forty are 291x187.
- **Services (7):** Conveyor belts, Production lines, Pipework, Access platforms, Catering, Dentistry, General fabrication.
- **Copy:** short. Homepage intro, About (two sentences), Services (two lists), Catering and Dentistry intros. The other service pages only say "Some examples of our ...".
- **Contact:** Unit 4 Clyde Workshops, Fullarton Road, Glasgow G32 8YL. Tel 0141 641 1778, fax 0141 641 7118, info@marpet.co.uk. Registered in Scotland 172812, VAT 680561724.
- **Customers named on the site:** Warburtons, Diageo, Barrs, Lightbody, Lees of Scotland, Aulds, Pinneys of Annan, Walter Black Foods, Scotbeef, Vion.
- **Search metadata:** every page has a title, description and keywords. The Dentistry page carries the conveyor description by mistake.
- **Not on the site:** LinkedIn link, team, projects with names or dates, certifications, machinery list, testimonials.

**jnrengineering.co.uk:** navy and `#2B4B9E` blue, condensed display headings, Archivo body, IBM Plex Mono labels, GSAP with ScrollTrigger and Lenis. Its footer lists "Family: Marpet Fabrications" linking to marpet.co.uk.

**This repository:** `images/marpet-fabrications.jpg` (a screenshot of the existing site) and three mentions of Marpet. No Marpet source code or design files.

**References**

| Reference | Result |
|---|---|
| motionsites.ai `?prompt=cordex` | Loads as a JavaScript shell. The Cordex prompt could not be read. Paid prompt library; terms allow use in client sites, no resale |
| scrolltide.co | Not accessible. It redirects to `www.scrolltide.co`, which this session's network blocks. Not reviewed |
| scrollshaders.com | Reviewed. Paid WebGL background shaders (a "Liquid Metal" shelf). Backgrounds only, nothing for assembly or page transitions. Not used |
| tympanus.net/codrops | Not accessible (Cloudflare challenge). From search only: "On-Scroll Folding 3D Cardboard Box with Three.js and GSAP" (2022) and "Large Image to Content Page Transition" with GSAP Flip (2022) are the two closest articles. Demos are MIT unless stated |
| animorio folding screen transition | Reviewed. Concertina fold with per-panel lighting in GSAP and CSS. Also relevant there: `exploded-view-watch-on-scroll`, `list-to-detail-transition`, `column-shutter`. Licence allows client sites, no redistribution. No code was copied |
| gsap.com | Reviewed. Free for commercial use including ScrollTrigger and Flip since April 2025 under Webflow's standard licence. Not open source |
| spline.design | Reviewed. Hosted 3D tool; free tier watermarks exports. Not needed |
| theatrejs.com | Reviewed. Keyframe editor for three.js. Useful later if the assembly is hand-tuned; licence not confirmed |
| reactbits.dev | Reviewed. "Scroll Expand" and "Scroll Stack" are near our frame and stack ideas. React only, so not used in a static build |
| ui.aceternity.com | Reviewed. `expandable-card`, `card-stack`, `container-scroll-animation`. React only, not used |
| impeccable.style | Reviewed. A design-quality command set for coding agents, not a component library |

Everything in the prototype was written for it. No reference code or assets were copied.

## 2. Sitemap

| New page | Prototype file | Replaces (301 redirect) |
|---|---|---|
| Home | `index.html` | `/index.html` |
| Services | `services.html` | `/services.html` |
| Conveyor systems | `service-conveyor-systems.html` | `/conveyor-belts.html` |
| Production lines | `service-production-lines.html` | `/production-lines.html` |
| Industrial pipework | `service-pipework.html` | `/pipework.html` |
| Access platforms | `service-access-platforms.html` | `/access-platform.html` |
| Catering fabrication | `service-catering.html` | `/catering.html` |
| Dentistry equipment | `service-dentistry.html` | `/dentistry.html` |
| General fabrication | `service-general-fabrication.html` | `/generalfabrication.html` |
| Our Work | `work.html` | new |
| Project (one per project) | `project-<slug>.html` | new |
| About Marpet | `about.html` | `/about.html` |
| Meet the Team | `team.html` | new |
| Contact | `contact.html` | `/contact.html` |
| Privacy | not built | new, needed once the form is live |

In production the URLs become `/services/conveyor-systems`, `/work/<slug>` and so on. The prototype is flat so it runs from any folder.

## 3. Two concepts

**A. Conveyor Assembly.** A real-time 3D stainless belt conveyor assembles in the hero and carries the existing logo on a bolted plate. Labels on the model link to services. Built at `index.html`.

**B. Architectural Fabrication.** The page is made of sheet metal panels that fold open on hinges to show photographs. CSS only. Built at `concept-b.html`.

The comparison table is on `storyboard.html`. Summary: A wins on realism, impact and relevance. B wins on mobile, performance, build cost and maintenance.

## 4. Conveyor hero storyboard

Six frames captured from the running prototype are on `storyboard.html`. Total 7.5 seconds.

1. **Arrival, 0 to 1.5 s.** One brushed side frame travels in along its length, close to camera.
2. **Legs, 1.3 to 2.6 s.** Three square-tube leg frames with adjustable feet roll in. Camera pulls back.
3. **Frame closes, 2.0 to 3.4 s.** Far side frame, cross members and slider bed.
4. **Running gear, 2.9 to 4.5 s.** End rollers, flange bearings, drive, control box, then the blue belt feeds across.
5. **Brand reveal, 4.5 to 6.0 s.** The frame lowers onto its feet. The logo plate swings up and four bolts turn in.
6. **Website reveal, 6.0 to 7.5 s.** Camera pulls back, headline and buttons rise in, the belt runs.

Rules built in: header, navigation and the quote button work from the first frame. Skip button, Escape, scroll or touch ends the intro. It plays once per browser. Reduced motion shows the finished model with a still belt. No WebGL or no JavaScript shows a still image.

The model is illustrative. It copies features from Marpet's photographs (folded side frames, square legs with feet, orange flange bearings, blue modular belt, a control box with stop button, the MF mark on a side panel) but it is not a specific machine, and the page says so under the hero.

## 5. Page transition system

One system, three variants, same steel, bolts and easing.

- **Plate (default).** The clicked item becomes a steel plate that lifts, tips toward the viewer, fills the screen, then swings open on a left hinge. 620 ms in, 560 ms out. Back closes the hinge and lowers the plate away.
- **Shutter.** A roller shutter drops and lifts. Used for Contact and every quote button.
- **Frame.** A project photograph lifts off the grid, expands to full screen and lands in the project page's frame.

Every page is a real HTML file. The script intercepts same-site links, fetches the next page, swaps `<main>`, and updates the URL with the History API. Direct URLs, back, forward, open-in-new-tab and no-JavaScript all behave normally. If a fetch fails it falls back to a normal page load. Reduced motion swaps instantly. Focus moves to the new page and its title is announced.

## 6. Connecting to JNR Engineering

- Shared: navy and blue palette, condensed uppercase headings, the same motion library. The two sites read as related without sharing a logo or layout.
- Separate: Marpet uses steel plates and photographs of fabrications; JNR keeps its own identity and its own quote form.
- Section built: two steel doors marked "Fabricated" and "Machined" slide apart to show JNR's logo, a one-line description and a link out. It appears on Home and About.
- Not stated: ownership or group structure. JNR's footer says "Family"; this repository's site says "sister company". The wording needs approval.
- JNR photographs of machined parts would improve the reveal. None were used because none are published on JNR's site beyond its logo.

## 7. Recommended technology

| Job | Choice | Why |
|---|---|---|
| Hero | three.js, real-time, procedural model | Interactive, small, no asset pipeline. The model can be swapped for a Blender export later |
| Hero timeline | GSAP | One timeline that can be skipped, scrubbed and replayed |
| Page transitions and components | CSS 3D with the Web Animations API | No library, works with reduced motion, cheap on phones |
| Photographs into pages | The frame transition above | GSAP Flip was not needed for one element |
| Site build | Static HTML from JSON content | Fast, cheap to host, nothing to patch |

Considered and not chosen: a prerendered Blender video (most realistic, but 3 to 8 MB, not interactive, and it needs a modeller and reference measurements), React Three Fiber (adds React for one scene), Spline (hosted runtime, watermark on the free tier), Theatre.js (worth adding only if the assembly is hand-keyframed later).

If the hero needs to look photographic rather than "good real-time", the upgrade path is a Blender model built from measured Marpet drawings, exported as compressed glTF into the same scene.

## 8. Challenges and risks

- **Photography is the main limit.** Nothing is wide enough for full screen. The design frames photographs small on purpose.
- **Hero cost.** three.js is about 180 KB gzipped once minified. It loads after first paint and is skipped entirely when WebGL is missing.
- **Low-power phones.** Pixel ratio and shadow size are capped, and rendering stops when the hero is off screen. Real-device testing is still needed.
- **Realism ceiling.** A procedural model has no welds, fixings or wear. It reads as a clean product render, not a photograph.
- **Low resolution logo.** The JPG softens on the plate close-up.
- **Transition fatigue.** About one second per navigation. If it feels slow in review, shorten it or keep the plate for first-level navigation only.
- **Client-side navigation.** Analytics and any third-party embed must be re-initialised after each swap.

## 9. Missing content and open decisions

1. Founding date: the site says "early 80's", the logo says "1997 Limited".
2. Road name: "Fullarton" and "Fullerton" both appear.
3. LinkedIn company page URL.
4. Whether Dentistry and Catering are still offered, and whether the fax number is still in use.
5. Whether each customer name may still be published.
6. Vector logo.
7. High resolution photographs; workshop and people photographs.
8. Project details for each photograph set. The eleven project titles in the prototype are working titles written from the photographs.
9. Technical capability per service.
10. Team names, roles, biographies, portraits and approvals.
11. JNR relationship wording, and permission to use JNR's logo.
12. Where the enquiry form should send, and who answers it.
13. Hosting and domain access for marpet.co.uk.

**LinkedIn feed.** There is no official auto-updating company feed widget. LinkedIn's API for reading page posts is a vetted product aimed at social media tools, with 60-day tokens, and approval for a single company website is not assured. Third-party widgets exist (Elfsight, Juicer, SociableKIT, roughly $5 to $25 a month) but inject their own markup and styling. Scraping breaches LinkedIn's user agreement. Recommendation: a managed section. Someone pastes the post link, a photograph and one line into the content file; the site shows it in the steel panel and links to the real post. The prototype is built this way, with empty slots.

**Content management.** Start with the JSON files in `content/` in a private repository: one entry per service, project, team member and LinkedIn post, photographs in a folder, site rebuilt on save. No database, no login to attack, no monthly fee. If Marpet staff need to edit without help, add a Git-based editor (Decap CMS or similar) with login through the host. A hosted CMS such as Sanity is only worth it if non-technical staff will post weekly.

## 10. Recommendation

Build Concept A's hero on Concept B's panel system, which is what the prototype does.

- The conveyor is Marpet's lead product on the existing site and in the photographs, so the one expensive animation is about the right thing.
- Everything else (navigation, service plates, frames, shutters, team plates) is CSS, so the site stays quick and maintainable past the homepage.
- The photographs cannot carry a cinematic site at their current size. A 3D hero gives the homepage a strong image that does not depend on them, and it is labelled as illustrative.
- Each piece degrades on its own: no WebGL gives a still, reduced motion gives instant pages, no JavaScript gives an ordinary website.

Next step after review: agree scope, then a production implementation plan (Phase 6). Nothing is to be deployed or merged before that.
