# Footage: how the site uses it, and how to add it

Every photographic section of the site is a **media slot** in `content/media.json`. Today each slot shows a
genuine Marpet photograph. When footage arrives, it replaces the photograph in that slot. Nothing else changes:
the same camera moves, steel transitions and typography apply to video and to stills.

The full list of slots, with what to film for each, is the **shot list**: `shot-list.html` on the development
site (linked from the yellow bar at the top of every page). On the development site, every placeholder
still also carries a yellow "To film" label.

## Where each slot appears

| Slot | Section |
|---|---|
| `home-weld`, `home-detail`, `home-reveal` | Homepage opening: welding close-up, finished detail, pull back to the workshop (the headline arrives here) |
| `home-design`, `home-workshop`, `home-site` | Homepage scroll story: Designed, Made in the workshop, Installed on site. Completed Marpet projects follow |
| `page-services`, `page-work`, `page-about`, `page-team`, `page-contact` | Page headers |
| `band-about` | Full-width film section on the About page |
| `service-<name>` | Each service page header (created automatically from the service's photograph) |

Project pages use only their own project photographs, and are not slots.

## Rules

- Real Marpet work only. Nothing generated, nothing from stock libraries presented as Marpet.
- People in shot must have agreed to appear. Client sites need the client's written permission.
- Concept images from the reference board are not used.

## Filming

- Landscape, 4K or 1080p, 25 fps. Sound is not used.
- Steady: tripod, slider or gimbal. Slow, deliberate moves read as cinematic; handheld shake does not.
- Keep the left third of the frame calm. Headlines sit there on desktop.
- Several takes of 15 to 30 s. They are trimmed to 8 to 15 s loops.
- Shoot the welding close-up and its wide pull-back as a pair, from the same position, so they cut together.

## Adding a clip

1. Encode it (commands below) into `site/assets/video/`, for example `site/assets/video/weld.mp4`.
2. In `content/media.json`, set the slot's `"video": "video/weld.mp4"`. Optionally set `"videoMobile"` (a smaller file for phones) and `"poster"` (a still frame; without one, the current photograph is the poster).
3. Run `npm run build`. The build stops with a plain message if a file is missing.

Optional: `"mode": "scrub"` makes scroll move through the clip instead of playing it. This suits slow camera moves (a pull back, a slide along a frame). It needs the extra keyframes shown below.

Before launch, set `"showShotNotes": false` in `content/media.json` so the yellow labels disappear.

## Encoding

Desktop (aim for 2 to 5 MB for 10 to 12 s):

```bash
ffmpeg -i original.mov -ss 2 -t 12 -vf "scale=1920:-2,fps=25" -c:v libx264 -profile:v high -crf 23 -preset slow -pix_fmt yuv420p -an -movflags +faststart site/assets/video/weld.mp4
```

Phone version (aim for 1 to 2 MB):

```bash
ffmpeg -i original.mov -ss 2 -t 12 -vf "scale=960:-2,fps=25" -c:v libx264 -profile:v high -crf 26 -preset slow -pix_fmt yuv420p -an -movflags +faststart site/assets/video/weld-mobile.mp4
```

For `"mode": "scrub"`, add `-g 5 -keyint_min 5` to either command, so the clip can be moved through smoothly in both directions.

Poster frame:

```bash
ffmpeg -ss 1 -i site/assets/video/weld.mp4 -frames:v 1 -q:v 4 site/assets/video/weld.jpg
```

Grade the footage to match the rest of the site (dark, crushed blacks, warm highlights, cool shadows) before
encoding, or ask for it to be graded. The photographs are graded by `tools/cine.py`.

## How video behaves on the site

- Loads only when needed: the homepage opening loads its first clip at once; everything else loads as it nears the screen.
- Plays only while it can be seen, muted and looping. On the homepage stage, only the shot on top plays.
- Reduced motion, a phone's data saver, or a file that fails to load: the poster frame is shown and no footage is downloaded.
- Navigation and the quote button never wait for video.

All of this is checked by the browser tests on `media-test.html`, which uses a generated test pattern labelled
"TEST PATTERN - NOT MARPET FOOTAGE". That clip appears nowhere else, and a test enforces it.
