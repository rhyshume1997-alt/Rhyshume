# Concept notes: Rosskeen Engineering

Made on 2026-11-12 from the pages listed below. Nobody has checked this yet. Read every line of copy before it goes anywhere.

## What changed and why

1. The phone number (01349854100) and a Get a quote button sit at the top of the page, and on a phone a call bar stays at the bottom of the screen. Why: someone on a phone can ring or ask for a quote without scrolling.
2. The main text goes from about 676 words on their home page to about 125 words, with 4 services taken from their own pages. Why: shorter text reads better on a phone, and nothing is added that they have not said.
3. A demo form called "Send us your drawing" takes drawings and photos and posts nowhere. Why: it shows how an enquiry could look without collecting anything from anyone.

## Every line of copy on the page

| Where | Text |
| --- | --- |
| Skip link | Skip to content |
| Banner | Concept by Rhys Hume, not a live site |
| Header | Rosskeen Engineering |
| Header | 01349854100 |
| Header button | Get a quote |
| Headline | Machining, fabrication and welding in Invergordon |
| Intro | A medium sized engineering company at Invergordon. We provide machining, fabrication, welding and mechanical fitting services. |
| Area | Based at Auchintoul, Invergordon. |
| Hero button | Get a quote |
| Proof strip 1 | Based in Invergordon |
| Proof strip 2 | Started in 2005 |
| Proof strip 3 | Fabrication shop 120m x 40m |
| Proof strip 4 | Machining up to 10 te |
| Before and after heading | Before and after |
| Before and after left caption | Their site today |
| Before and after right caption | The concept |
| Before and after note 1 | Their phone number is a tap-to-call link on the first phone screen. The concept keeps it in the header and in a bar at the bottom of the screen that stays in view. |
| Before and after note 2 | I found no quote button on their page when it loaded on a phone. The concept has one in the header and one under the headline. |
| Before and after note 3 | Their main heading reads "Rosskeen Engineering Ltd". The concept heading says what they do and where, in 6 words. |
| Before and after note 4 | None of the pages I read has a file upload field. The concept form has one. |
| Before and after note 5 | The main text on their home page is about 676 words. The concept uses about 125. |
| Table column | Their site today |
| Table column | The concept |
| Table row | Tap-to-call phone number on the first screen |
| Table value | Yes |
| Table value | Yes |
| Table row | Quote button on the first screen |
| Table value | No |
| Table value | Yes |
| Table row | Page wider than a phone screen |
| Table value | No |
| Table value | No |
| Table row | Drawing upload on the home page |
| Table value | No |
| Table value | Yes |
| Table row | Lighthouse mobile performance score |
| Table value | 73 out of 100 |
| Table value | 100 out of 100 |
| Table row | Largest contentful paint |
| Table value | 5 s |
| Table value | 0.9 s |
| Speed note | Their site’s scores come from Lighthouse, the tool behind PageSpeed, run on GitHub’s computer on 2026-11-12 with phone settings, median of 3 runs. The concept’s scores, with its animations on, come from the same tool run on a different computer on 2026-11-12, median of 3 runs, so the two columns are not a like for like test. Check the live address on PageSpeed Insights once it is published. |
| Photo space | Placeholder: your workshop photo here |
| Services heading | What we do |
| Service 1 title | Machining and mechanical fitting |
| Service 1 text | Machining in a large, well equipped shop, with C.N.C turning and milling for batch runs. |
| Service 1 sizes | Components up to 10 te |
| Service 2 title | Fabrication, welding and sheet metal |
| Service 2 text | Pipework and structures in carbon and stainless steel, from small components to large assemblies. |
| Service 2 sizes | Fabrication shop 120m x 40m |
| Service 3 title | Insulation, cladding and ductwork |
| Service 3 text | Sheet metal and insulation work, including foam glass, rockwool and foam insulations. |
| Service 4 title | Hydraulic ram refurbishment and installations |
| Service 4 text | Rebuild of hydraulic rams and installation of hydraulic systems on site. |
| About heading | About |
| About | Rosskeen Engineering Limited started in 2005 as the result of a management buyout. The management and workforce are well respected for their depth of knowledge and quality of service. |
| Quote heading | Send us your drawing |
| Quote intro | Tell us what you need. Attach your drawings or photos. |
| Form label | Name |
| Form label | Email |
| Form label | Phone (optional) |
| Form label | What do you need? |
| Form label | Drawings or photos (optional) |
| Form button | Send |
| Form note | Demo only. Nothing is sent from this form. |
| Form message after Send | Demo only. Nothing was sent. |
| Contact heading | Contact |
| Contact label | Phone: |
| Contact phone | 01349854100 |
| Contact label | Email: |
| Contact email | davie.wood@rosskeenengineering.co.uk |
| Footer | Rosskeen Engineering. Concept by Rhys Hume, not a live site. The text and photos come from rosskeenengineering.co.uk. |
| Sticky call bar (phones only) | Call 01349854100 |

## Facts taken from their site

- Pages read: https://www.rosskeenengineering.co.uk/
- Phone: 01349854100
- Email: davie.wood@rosskeenengineering.co.uk
- Logo: none found, the name is shown as text
- Photos (linked from their site, not copied): none found, a marked photo space is shown
- Skipped 14 photo(s) hosted somewhere other than their own site.

## Measured

- Phone screenshots are 390 x 844 and were taken on 2026-11-12. The one of their site shows it as it loaded then, including any banners.
- Their site: tap-to-call link found, quote button not found, page width 320px on a 390px screen, upload field not found, Lighthouse mobile score 73 (runs: 73, 70, 76), largest contentful paint 5 s
- The concept: tap-to-call link found, quote button found, page width 390px on a 390px screen, upload field found, Lighthouse mobile score 100 (runs: 100, 100, 100), largest contentful paint 0.9 s

## Check by hand

- No photos were found on their site, so the page shows a marked photo space. Ask them for one, or leave the space.
- The screenshot of their current site is shown on the page. Check you are happy for it to be public.
- Compare each line above with their live site. Anything you cannot find there comes out.
- Photos, logo and the screenshot of their current site belong to them. This page is open to anyone once merged, so do not merge it without their say so.

## Motion (on by default, every niche)

Plain CSS and a little vanilla JS, written into the page. No libraries, no build step, no extra requests. It adds no words.
- Scroll reveal: sections and service cards fade up once, 400ms, staggered 60ms. Anything in view on load just shows.
- Before and after: a drag slider with arrow keys, only when both screenshots are on the page.
- Facts row: quantities on their site (not years) count up once when scrolled into view.
- Header: stays at the top, shrinks slightly and gains a shadow after the first scroll.
- Service cards: a small lift and a line that grows under the title on hover and keyboard focus. The titles link to the quote form so the cards can take keyboard focus.
- Hero: a slow soft colour drift behind the headline, no video.
- Get a quote buttons: a soft ring every 8 seconds, until the first touch, click or key press.
- Everything above is off when the visitor asks for reduced motion (the slider still works), and with JavaScript off the page shows all content normally.

One thing to check: the fourth proof line reads "Machining up to 10 te" as it does on their site. I have not confirmed that "te" means tonnes. Unverified, ask them before it goes anywhere.
