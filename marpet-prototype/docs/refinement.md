# Refinement, 18 November 2026

A focused refinement of the existing site, not a redesign. Structure, services, projects, company content
and the enquiry journey are unchanged.

## Homepage opening

- About 4 seconds, homepage only, first visit only. Close on brushed Marpet steel pulling into focus as a
  light crosses it, the Marpet plate, then a pull back to the production hall.
- Nothing waits for it. The menu and header quote button are live from the first frame; the headline and
  hero buttons fade in within the first second. The page scrolls freely: scrolling, Skip or Escape ends the
  opening at once.
- Slow connection: if the first picture has not arrived within 0.7 s, the finished still is shown instead
  and the opening is skipped. Reduced motion and returning visitors get the still straight away.
- The still is the graded hall photograph (IMG_0283), preloaded as the page's main image.
- Footage: put a clip in the `home-weld` slot of `content/media.json` and it plays once in place of the
  photographs, then fades to the still. If it has not started within 1.2 s, the still is used. See
  `docs/footage.md`.
- The pinned scroll story is gone. Designed, Made in the workshop and Installed on site are now an ordinary
  three-column section (one column on phones), each still a media slot ready for footage.

## Typography

- Archivo (headings, navigation, labels, buttons) and Inter (text), self-hosted, about 84 KB in total
  (variable weight, Latin). Both are SIL Open Font Licence; licences are in `site/assets/fonts/`.
- Headings: sentence case, heavy (800/750), tight tracking. Small labels (eyebrows, navigation, buttons,
  crumbs) carry the uppercase, tracked wide. Body text 16 px, line height 1.65, lines kept under 68
  characters.
- Homepage headline: Archivo 800, about 112 px on desktop and 46 to 52 px on phones.
- The Marpet logo is unchanged.

## Less motion

Removed: the pinned homepage scenes, steel sheets covering sections, steel panels over project photographs,
the shutters in the Services viewer, word-by-word heading reveals, the plate/shutter page transitions, the
pinned film band and the moving grain.

Kept, gently: a short fade between pages (about 0.36 s), headings and cards rising into place once,
photographs drifting slightly slower than the page, a crossfade in the Services viewer, and a very slow drift
on the homepage still.

## Recordings and screenshots

- `review/video/homepage-refined-desktop.mp4`, `homepage-refined-phone.mp4`: the opening, then an ordinary
  scroll. Captured frame by frame at the designed speed.
- `review/refinement/`: desktop, tablet and phone screenshots.
