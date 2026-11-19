# Asset manifest: Salt & Ember and Olive & Ivory (Rev 3)

Everything the two productions need, exactly. **Exists** means a file is already in the repository. **Needs production** means it does not exist and must be made.

**All generated visuals are for fictional concept demonstrations only. They do not depict a real business, customers or completed client work, and every page says so.** Check the generating tool's terms for commercial use before relying on any generated asset. Do not enlarge the current low resolution photographs and present them as originals: replace them.

## How to add an asset

- **Footage:** put `key.webm` and `key.mp4` in `c-3e9a41b7d20f58c6/cinematic/video/`, then set `"available": true` for that key in `data/footage.json`. No code change. Each hero has a **desktop and tablet** clip (16:9, 640 px and wider) and a separately composed **phone** clip (portrait, under 640 px). A key with a `poster` field also needs that poster as `img/<poster>.webp` and `.jpg`. The poster stays as the fallback, and is what reduced motion, data saver and a failed load show.
- **Quality first:** the file sizes in this manifest are starting targets, not limits. Make and approve the masters at full quality, then make the delivery versions and measure bytes, largest paint, layout shift, dropped frames and CPU before fixing the sizes.
- **Photographs:** put `name.webp` and `name.jpg` in `img/`, add an entry (id, file, w, h, alt, title, time, caption) to `data/olive-ivory.json`, and the sheet, the light table and the day pick it up. For Salt & Ember, replace the file of the same name.

## Summary

| Asset | Page | Type | Status |
|---|---|---|---|
| `se-hero-fire-16x9.webm + .mp4` | salt-ember | footage (desktop and tablet) | needs production |
| `se-hero-fire-16x9.webp + .jpg (poster)` | salt-ember | photograph (poster for the desktop clip) | needs production. A temporary 1672 x 941 reference still exists outside the repository. |
| `se-hero-fire-mobile-4x5.webm + .mp4` | salt-ember | footage (phones) | needs production |
| `se-embers-4x5.webm` | salt-ember | footage (optional) | needs production |
| `se-01-fire-grill.webp + .jpg` | salt-ember | photograph | Exists (low resolution 367 x 537). Needs a high resolution replacement. |
| `se-02-plated-food.webp + .jpg` | salt-ember | photograph | Exists (low resolution 339 x 537). Needs a high resolution replacement. |
| `se-03-wine-pour.webp + .jpg` | salt-ember | photograph | Exists (low resolution 323 x 537). Needs a high resolution replacement. |
| `se-04-dessert.webp + .jpg` | salt-ember | photograph | Exists (low resolution 407 x 537). Needs a high resolution replacement. |
| `se-05-shared-table.webp + .jpg` | salt-ember | photograph (optional) | needs production |
| `se-06-bar-detail.webp + .jpg` | salt-ember | photograph (optional) | needs production |
| `oi-hero-window-16x9.webm + .mp4` | olive-ivory | footage (desktop and tablet) | needs production |
| `oi-hero-window-16x9.webp + .jpg (poster)` | olive-ivory | photograph (poster for the desktop clip) | needs production. A temporary 1672 x 941 reference still exists outside the repository. |
| `oi-hero-portrait-4x5.webm + .mp4` | olive-ivory | footage (phones) | needs production |
| `oi-03-dress-window.webp + .jpg` | olive-ivory | photograph | Exists (low resolution 349 x 544). Needs a high resolution replacement. |
| `oi-02-flowers.webp + .jpg` | olive-ivory | photograph | Exists (low resolution 395 x 544). Needs a high resolution replacement. |
| `oi-04-rings-vows.webp + .jpg` | olive-ivory | photograph | Exists (low resolution 332 x 544). Needs a high resolution replacement. |
| `oi-01-couple-walking.webp + .jpg` | olive-ivory | photograph | Exists (low resolution 358 x 544). Needs a high resolution replacement. |
| `oi-05-shoes-and-letter.webp + .jpg` | olive-ivory | photograph | Needs production. |
| `oi-06-cufflinks.webp + .jpg` | olive-ivory | photograph | Needs production. |
| `oi-07-aisle-wide.webp + .jpg` | olive-ivory | photograph | Needs production. |
| `oi-08-confetti.webp + .jpg` | olive-ivory | photograph | Needs production. |
| `oi-09-speeches.webp + .jpg` | olive-ivory | photograph | Needs production. |
| `oi-10-first-dance.webp + .jpg` | olive-ivory | photograph | Needs production. |
| `oi-11-cake-detail.webp + .jpg` | olive-ivory | photograph | Needs production. |
| `oi-12-last-light.webp + .jpg` | olive-ivory | photograph | Needs production. |

## Specifications

### `se-hero-fire-16x9.webm + .mp4`

- **Page:** salt-ember. **Type:** footage (desktop and tablet). **Status:** needs production
- **Scene or subject:** The desktop and tablet hero. A full width cinematic scene: a steak searing on charcoal bars in open flame, sparks rising, a dark kitchen. Fire and steak sit in the right 55 percent of the frame. The left 45 percent is dark negative space for the restaurant name.
- **Composition:** Landscape. Steak low and right of centre (about 60 to 90 percent across, 55 to 85 percent down), flames rising behind it to the top edge, grill bars across the lower right, embers low. The left 45 percent is near black and calm: no flames, no bright sparks, no smoke lit from behind, so cream type stays readable (left 45 percent of the frame at or below about 15 percent luminance in every frame). No people, no text. Keep nothing essential in the outer 6 percent top and bottom, because the page crops 16:9 down to as wide as 21:9 with the picture anchored 72 percent from the left.
- **Aspect ratio:** 16:9 landscape
- **Minimum useful resolution:** Master 3840 x 2160 (at least 2560 x 1440). Delivered 1920 x 1080, with an optional 2560 x 1440 tier.
- **Duration (footage):** 8 to 10 seconds, seamless loop (first and last frames must match).
- **Camera movement:** Locked off, or a very slow push in of at most 3 percent over the loop, drifting towards the fire. No handheld, no whip, no zoom, no cut.
- **Lighting and colour direction:** The fire is the only key light. Amber and terracotta (the #dd6b40 family) with deep brown shadows (#1f1612). Highlights must not clip to white. Smoke stays low contrast and on the right. No blue.
- **Desktop crop:** Full width behind the name, full height of the hero stage, picture anchored 72 percent from the left, cover crop. The name sits over the dark left half and the lede and buttons below it.
- **Mobile crop:** Not used under 640 px wide (phones use se-hero-fire-mobile-4x5). Tablets 640 to 895 px wide show it uncropped at 16:9 above the name.
- **Encoding and delivery:** Master first at the highest quality the tool gives (no size limit). Then WebM (VP9) and MP4 (H.264), no audio track. Starting targets for delivery, not hard limits: about 6 MB each at 1080p. Raise the quality if the fire looks blocky, then measure (bytes, largest paint, dropped frames, CPU).
- **Generation prompt:** Image-to-video, using the supplied landscape fire and steak still as the first frame (or text-to-video from this prompt). Photographic, filmed on a cinema camera, 35mm lens, shallow depth of field, natural motion blur at 24 frames per second. A steak searing on a charcoal grill in a dark restaurant kitchen. Wide landscape frame. The steak and flames are on the right half of the frame, flames rising and licking upward behind the steak, sparks drifting up and to the right. The entire left half of the frame stays near black and empty. Locked-off camera, an extremely slow push in towards the fire. Warm amber and terracotta firelight is the only light source, deep brown shadows, no blue. Seamless 8 second loop. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** Wired: set "available": true for se-hero-fire-16x9 in data/footage.json after adding the files. The name reads the brightness of the right half of the clip for its flicker. Rhys supplied a landscape still of this composition in the chat (about 1672 x 941). It is not in the repository yet and is too small for a 1920 px desktop poster, so it is a temporary reference only.

### `se-hero-fire-16x9.webp + .jpg (poster)`

- **Page:** salt-ember. **Type:** photograph (poster for the desktop clip). **Status:** needs production. A temporary 1672 x 941 reference still exists outside the repository.
- **Scene or subject:** A still frame of the desktop hero composition, shown before and instead of the clip (reduced motion, data saver, slow connections, load failure).
- **Composition:** Identical to se-hero-fire-16x9. Best taken as a frame from the final approved clip so poster and clip match exactly.
- **Aspect ratio:** 16:9 landscape
- **Minimum useful resolution:** 2560 x 1440. Do not upscale the 1672 px still.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Identical to the clip.
- **Desktop crop:** Shown full width behind the name, cover crop, anchored 72 percent from the left.
- **Mobile crop:** Not used on phones.
- **Encoding and delivery:** WebP and JPEG, under 300 KB each at 1920 px wide (initial target).
- **Generation prompt:** Export frame 1 of the approved clip, or generate with: A photograph, 35mm lens, shallow depth of field. A steak searing on a charcoal grill, flames and sparks rising behind it on the right half of a wide landscape frame, the left half near black and empty. Warm amber firelight only, deep brown shadows. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** Once the file exists the manifest already points at it (poster field in data/footage.json). Until the clip is available the page keeps the portrait poster layout. Rhys supplied a landscape still of this composition in the chat (about 1672 x 941). It is not in the repository yet and is too small for a 1920 px desktop poster, so it is a temporary reference only.

### `se-hero-fire-mobile-4x5.webm + .mp4`

- **Page:** salt-ember. **Type:** footage (phones). **Status:** needs production
- **Scene or subject:** The phone hero, composed on its own (not a crop of the desktop clip). The same fire and steak, centred, with the flames filling the frame.
- **Composition:** Portrait. Steak in the lower third, centred. Flames rising to the top edge, sparks drifting up. Subject within the central 80 percent. No text sits on this scene on phones (the name is below it), so the frame can be bright.
- **Aspect ratio:** 4:5 portrait
- **Minimum useful resolution:** Master 2160 x 2700. Delivered 1080 x 1350, with a 720 x 900 tier for slow connections.
- **Duration (footage):** 8 seconds, seamless loop.
- **Camera movement:** Locked off, or a push in of at most 3 percent. No handheld.
- **Lighting and colour direction:** Same grade as the desktop clip: amber and terracotta key from the fire, deep brown shadows, no clipping, no blue.
- **Desktop crop:** Not used at 640 px wide and above.
- **Mobile crop:** Full width at 4:5, up to half the screen height (cover crop, centred).
- **Encoding and delivery:** WebM and MP4, no audio. Starting target about 2.5 MB each at 1080 x 1350 (not a hard limit).
- **Generation prompt:** Image-to-video, using the supplied portrait grill photograph (se-01-fire-grill) or a portrait re-frame of the landscape still as the first frame: Photographic, filmed on a cinema camera, 35mm lens, shallow depth of field, natural motion blur at 24 frames per second. Portrait frame. A steak searing on a charcoal grill, centred in the lower third, tall flames rising behind it to the top of the frame, embers and sparks drifting upward. Locked-off camera, extremely slow push in. Warm amber and terracotta firelight is the only light source, deep brown shadows. Seamless 8 second loop. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** Wired: key se-hero-fire-mobile-4x5. If a separate phone poster is made, add a poster field for it in data/footage.json; until then the existing portrait photograph (se-01-fire-grill) is the phone poster.

### `se-embers-4x5.webm`

- **Page:** salt-ember. **Type:** footage (optional). **Status:** needs production
- **Scene or subject:** An ember and spark pass to layer over the fire, on black.
- **Composition:** Sparks rising from the lower left to the upper right across the whole frame, varied sizes and brightness, a few large slow ones.
- **Aspect ratio:** 16:9 or 4:5 (one per composition)
- **Minimum useful resolution:** 1920 x 1080 or 1080 x 1350
- **Duration (footage):** 8 seconds, seamless loop
- **Camera movement:** Locked off.
- **Lighting and colour direction:** Orange to yellow sparks on pure black so a screen blend can lay it over the fire. No background detail.
- **Desktop crop:** Laid over the hero stage.
- **Mobile crop:** Same, fewer sparks acceptable.
- **Encoding and delivery:** WebM, about 1 MB (starting target).
- **Generation prompt:** Text-to-video: Macro, locked off. Glowing orange and yellow embers and sparks rise slowly from the lower left to the upper right against a pure black background, varied sizes, a few large and slow, most small and quick. Seamless 8 second loop. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** No slot is wired for this layer. It would be added only if the clip exists and the hero needs it.

### `se-01-fire-grill.webp + .jpg`

- **Page:** salt-ember. **Type:** photograph. **Status:** Exists (low resolution 367 x 537). Needs a high resolution replacement.
- **Scene or subject:** The fire on the grill. Also the menu photograph for From the fire and the poster for the hero.
- **Composition:** A steak on charcoal bars with tall flames behind it, sparks in the air. Centre the steak low, flames above.
- **Aspect ratio:** 2:3 portrait (current files are close to this)
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Low key, warm candle and fire light, deep brown shadows, terracotta accents. Dark editorial grade, no flash, no blue.
- **Desktop crop:** Menu plate about 34 rem tall, cover crop, subject in the central 70 percent.
- **Mobile crop:** Menu photograph pinned at the top of the screen, about 34 percent of the screen height, cover crop. Keep the subject in the middle band.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide.
- **Generation prompt:** A photograph, 85mm lens, shallow depth of field, low key. The fire on the grill. Also the menu photograph for From the fire and the poster for the hero. A steak on charcoal bars with tall flames behind it, sparks in the air. Centre the steak low, flames above. Warm candlelight and firelight only, dark brown background, terracotta and amber tones, natural film grain, 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `se-02-plated-food.webp + .jpg`

- **Page:** salt-ember. **Type:** photograph. **Status:** Exists (low resolution 339 x 537). Needs a high resolution replacement.
- **Scene or subject:** To start: charred vegetables and leaves on a dark plate.
- **Composition:** A single dark ceramic bowl from slightly above, vegetables and herbs, warm wood table, one hand blurred at the edge.
- **Aspect ratio:** 2:3 portrait (current files are close to this)
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Low key, warm candle and fire light, deep brown shadows, terracotta accents. Dark editorial grade, no flash, no blue.
- **Desktop crop:** Menu plate about 34 rem tall, cover crop, subject in the central 70 percent.
- **Mobile crop:** Menu photograph pinned at the top of the screen, about 34 percent of the screen height, cover crop. Keep the subject in the middle band.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide.
- **Generation prompt:** A photograph, 85mm lens, shallow depth of field, low key. To start: charred vegetables and leaves on a dark plate. A single dark ceramic bowl from slightly above, vegetables and herbs, warm wood table, one hand blurred at the edge. Warm candlelight and firelight only, dark brown background, terracotta and amber tones, natural film grain, 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `se-03-wine-pour.webp + .jpg`

- **Page:** salt-ember. **Type:** photograph. **Status:** Exists (low resolution 323 x 537). Needs a high resolution replacement.
- **Scene or subject:** To drink: red wine poured into a glass.
- **Composition:** A glass centred, wine mid-pour from a bottle neck at the top, candle bokeh behind, dark wood below.
- **Aspect ratio:** 2:3 portrait (current files are close to this)
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Low key, warm candle and fire light, deep brown shadows, terracotta accents. Dark editorial grade, no flash, no blue.
- **Desktop crop:** Menu plate about 34 rem tall, cover crop, subject in the central 70 percent.
- **Mobile crop:** Menu photograph pinned at the top of the screen, about 34 percent of the screen height, cover crop. Keep the subject in the middle band.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide.
- **Generation prompt:** A photograph, 85mm lens, shallow depth of field, low key. To drink: red wine poured into a glass. A glass centred, wine mid-pour from a bottle neck at the top, candle bokeh behind, dark wood below. Warm candlelight and firelight only, dark brown background, terracotta and amber tones, natural film grain, 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `se-04-dessert.webp + .jpg`

- **Page:** salt-ember. **Type:** photograph. **Status:** Exists (low resolution 407 x 537). Needs a high resolution replacement.
- **Scene or subject:** Something sweet: a sponge pudding with cream and berries.
- **Composition:** The pudding centred on a dark plate, icing sugar falling from above, dark background.
- **Aspect ratio:** 2:3 portrait (current files are close to this)
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Low key, warm candle and fire light, deep brown shadows, terracotta accents. Dark editorial grade, no flash, no blue.
- **Desktop crop:** Menu plate about 34 rem tall, cover crop, subject in the central 70 percent.
- **Mobile crop:** Menu photograph pinned at the top of the screen, about 34 percent of the screen height, cover crop. Keep the subject in the middle band.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide.
- **Generation prompt:** A photograph, 85mm lens, shallow depth of field, low key. Something sweet: a sponge pudding with cream and berries. The pudding centred on a dark plate, icing sugar falling from above, dark background. Warm candlelight and firelight only, dark brown background, terracotta and amber tones, natural film grain, 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `se-05-shared-table.webp + .jpg`

- **Page:** salt-ember. **Type:** photograph (optional). **Status:** needs production
- **Scene or subject:** A course to share: plates in the middle of a candlelit table.
- **Composition:** Overhead view of three or four plates and hands reaching in, no faces, dark wood.
- **Aspect ratio:** 2:3 portrait
- **Minimum useful resolution:** 2400 x 3600
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Low key, warm candle light, deep brown shadows, terracotta accents.
- **Desktop crop:** Menu plate, cover crop.
- **Mobile crop:** Pinned menu photograph, cover crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB at 1200 px wide.
- **Generation prompt:** A photograph, 85mm lens, shallow depth of field, low key. A course to share: plates in the middle of a candlelit table. Overhead view of three or four plates and hands reaching in, no faces, dark wood. Warm candlelight only, dark brown background, 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** Would add a fifth and sixth course. Needs a copy decision first.

### `se-06-bar-detail.webp + .jpg`

- **Page:** salt-ember. **Type:** photograph (optional). **Status:** needs production
- **Scene or subject:** The bar: a bottle and glasses.
- **Composition:** Close detail of bottles and glasses on a dark bar, candle reflections.
- **Aspect ratio:** 2:3 portrait
- **Minimum useful resolution:** 2400 x 3600
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Low key, warm candle light, deep brown shadows, terracotta accents.
- **Desktop crop:** Menu plate, cover crop.
- **Mobile crop:** Pinned menu photograph, cover crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB at 1200 px wide.
- **Generation prompt:** A photograph, 85mm lens, shallow depth of field, low key. The bar: a bottle and glasses. Close detail of bottles and glasses on a dark bar, candle reflections. Warm candlelight only, dark brown background, 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** Would add a fifth and sixth course. Needs a copy decision first.

### `oi-hero-window-16x9.webm + .mp4`

- **Page:** olive-ivory. **Type:** footage (desktop and tablet). **Status:** needs production
- **Scene or subject:** The desktop and tablet background scene: a tall sash window with long linen curtains and a wedding dress on a hanger in daylight, a wall and a floor in warm daylight. The dress and window sit in the right third. Only the air moves: curtains, dress hem, dust and light.
- **Composition:** Landscape. The window and dress occupy the right third (about 62 to 92 percent across, dress hanging at about 72 to 78 percent). The band between about 48 and 66 percent across must stay calm (plain curtain and wall) because the portrait print (about 15rem wide) sits on it. The left 45 percent is a plain wall in soft light, empty, because the name is written there in sage green and the copy is set in dark ink. Keep the left 45 percent light: aim for an ivory or pale stone tone (at or above roughly 75 percent luminance, about #d8cfbf or lighter) so dark ink and the sage green name keep at least 4.5:1 contrast. Keep nothing essential in the outer 6 percent top and bottom (the page crops 16:9 as wide as 21:9, anchored 72 percent from the left).
- **Aspect ratio:** 16:9 landscape
- **Minimum useful resolution:** Master 3840 x 2160 (at least 2560 x 1440). Delivered 1920 x 1080, with an optional 2560 x 1440 tier.
- **Duration (footage):** 8 to 10 seconds, seamless loop.
- **Camera movement:** Locked off, or a push in of at most 2 percent. The room does not move; curtains, hem and dust do.
- **Lighting and colour direction:** Soft overcast daylight from the window, ivory, warm stone and sage-grey tones, brown floor. No clipping on the window. Faint dust in the light is welcome. A consistent warm neutral grade matching the photographs.
- **Desktop crop:** Behind the opening, full width, cover crop anchored 72 percent from the left. It fades and drifts away on scroll while the portrait print travels into the proof sheet.
- **Mobile crop:** Not used under 640 px wide (phones use oi-hero-portrait-4x5). Tablets 640 to 895 px wide show it uncropped at 16:9 above the name.
- **Encoding and delivery:** Master first at the highest quality the tool gives (no size limit). Then WebM (VP9) and MP4 (H.264), no audio. Starting targets for delivery, not hard limits: about 5 MB each at 1080p. Raise the quality if curtain detail smears, then measure.
- **Generation prompt:** Image-to-video, using the supplied landscape dress and window still as the first frame, with the left wall lightened to a pale ivory: Photographic, filmed on a cinema camera, 35mm lens, shallow depth of field, natural motion blur at 24 frames per second. A bright room with a tall sash window and long linen curtains, a wedding dress on a wooden hanger in the window, a plain pale ivory wall on the left half of the frame, a worn wooden floor. A gentle breeze moves the curtains and the hem of the dress slightly, dust floats in the soft daylight. Locked-off camera, no people, the room itself does not move. Soft overcast daylight, ivory and warm stone tones. Seamless 8 second loop. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** Wired: set "available": true for oi-hero-window-16x9 in data/footage.json after adding the files. Legibility check before approval: ink (#2c2a25) and sage (#5b6f55) type over the left 45 percent of every frame. Rhys supplied a landscape still of this composition in the chat (about 1672 x 941). It is not in the repository yet and is too small for a 1920 px desktop poster, so it is a temporary reference only. Its left wall is a mid warm tone: see the legibility note.

### `oi-hero-window-16x9.webp + .jpg (poster)`

- **Page:** olive-ivory. **Type:** photograph (poster for the desktop clip). **Status:** needs production. A temporary 1672 x 941 reference still exists outside the repository.
- **Scene or subject:** A still frame of the desktop background composition, shown before and instead of the clip.
- **Composition:** Identical to oi-hero-window-16x9, including the pale left wall.
- **Aspect ratio:** 16:9 landscape
- **Minimum useful resolution:** 2560 x 1440. Do not upscale the 1672 px still.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Identical to the clip.
- **Desktop crop:** Shown as the backdrop, cover crop anchored 72 percent from the left.
- **Mobile crop:** Not used on phones.
- **Encoding and delivery:** WebP and JPEG, under 300 KB each at 1920 px wide (initial target).
- **Generation prompt:** Export frame 1 of the approved clip, or generate with: A photograph, 35mm lens, soft overcast daylight. A bright room with a tall sash window, long linen curtains and a wedding dress on a wooden hanger in the window, on the right third of a wide landscape frame, a plain pale ivory wall on the left half, a worn wooden floor. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** Once the file exists the manifest already points at it (poster field in data/footage.json). Until then the page keeps the portrait layout. Rhys supplied a landscape still of this composition in the chat (about 1672 x 941). It is not in the repository yet and is too small for a 1920 px desktop poster, so it is a temporary reference only. Its left wall is a mid warm tone: see the legibility note.

### `oi-hero-portrait-4x5.webm + .mp4`

- **Page:** olive-ivory. **Type:** footage (phones). **Status:** needs production
- **Scene or subject:** The phone hero, composed on its own: the same window, curtains and dress, framed in portrait. On phones this plate is the photograph that docks into the proof sheet.
- **Composition:** Portrait. The dress centred, the window behind it filling the upper two thirds, curtains either side. Subject within the central 70 percent (the plate docks into a 2:3 sheet frame, so top and bottom edges may be trimmed).
- **Aspect ratio:** 4:5 portrait
- **Minimum useful resolution:** Master 2160 x 2700. Delivered 1080 x 1350, with a 720 x 900 tier for slow connections.
- **Duration (footage):** 8 seconds, seamless loop.
- **Camera movement:** Locked off, or a push in of at most 2 percent.
- **Lighting and colour direction:** Same as the landscape clip: soft overcast daylight, ivory and warm stone, no clipped window.
- **Desktop crop:** Not used at 640 px wide and above (the plate there is the still photograph).
- **Mobile crop:** About 70 percent of the screen width, in the plate that travels into frame 01.
- **Encoding and delivery:** WebM and MP4, no audio. Starting target about 2 MB each at 1080 x 1350 (not a hard limit).
- **Generation prompt:** Image-to-video, using the supplied portrait dress-window photograph (oi-03-dress-window) as the first frame: Photographic, filmed on a cinema camera, 35mm lens, shallow depth of field, natural motion blur at 24 frames per second. Portrait frame. A tall sash window with heavy linen curtains and a wedding dress on a hanger centred in the window. A gentle breeze moves the curtains and the hem of the dress very slightly, dust floats in the soft daylight. Locked-off camera, no people. Soft overcast daylight, ivory and warm stone tones. Seamless 8 second loop. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** Wired: key oi-hero-portrait-4x5. Poster is the existing oi-03-dress-window.

### `oi-03-dress-window.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Exists (low resolution 349 x 544). Needs a high resolution replacement.
- **Scene or subject:** 08:40 Getting ready: the dress in the window. Also the hero poster and the first frame. (sheet frame 01)
- **Composition:** Dress on a hanger centred in a tall window, curtains each side.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. 08:40 Getting ready: the dress in the window. Also the hero poster and the first frame. Dress on a hanger centred in a tall window, curtains each side. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `oi-02-flowers.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Exists (low resolution 395 x 544). Needs a high resolution replacement.
- **Scene or subject:** 11:20 The details: a bouquet on a stone sill. (sheet frame 02)
- **Composition:** White roses and greenery on a worn stone ledge, window light from the left.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. 11:20 The details: a bouquet on a stone sill. White roses and greenery on a worn stone ledge, window light from the left. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `oi-04-rings-vows.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Exists (low resolution 332 x 544). Needs a high resolution replacement.
- **Scene or subject:** 14:00 The vows: hands joined and a ring. (sheet frame 03)
- **Composition:** Close on two joined hands, an open book blurred behind, no faces.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. 14:00 The vows: hands joined and a ring. Close on two joined hands, an open book blurred behind, no faces. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `oi-01-couple-walking.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Exists (low resolution 358 x 544). Needs a high resolution replacement.
- **Scene or subject:** 18:30 Golden hour: a couple walking away through long grass. (sheet frame 04)
- **Composition:** Backs to camera, hand in hand, a castle and hills far behind, low sun.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. 18:30 Golden hour: a couple walking away through long grass. Backs to camera, hand in hand, a castle and hills far behind, low sun. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `oi-05-shoes-and-letter.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Needs production.
- **Scene or subject:** Getting ready: shoes and a handwritten letter on a dresser. (sheet frame 05)
- **Composition:** Satin shoes beside a folded letter and a ring box, window light, shallow depth.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. Getting ready: shoes and a handwritten letter on a dresser. Satin shoes beside a folded letter and a ring box, window light, shallow depth. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `oi-06-cufflinks.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Needs production.
- **Scene or subject:** Getting ready: a groom fastening a cufflink. (sheet frame 06)
- **Composition:** Hands and a kilt-tweed sleeve only, no face, soft side light.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. Getting ready: a groom fastening a cufflink. Hands and a kilt-tweed sleeve only, no face, soft side light. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `oi-07-aisle-wide.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Needs production.
- **Scene or subject:** The ceremony: the room from the back as guests turn. (sheet frame 07)
- **Composition:** Looking down an aisle between rows of chairs, backs of heads, a bright doorway at the far end.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. The ceremony: the room from the back as guests turn. Looking down an aisle between rows of chairs, backs of heads, a bright doorway at the far end. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `oi-08-confetti.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Needs production.
- **Scene or subject:** After the ceremony: a couple walking through confetti. (sheet frame 08)
- **Composition:** Backs to camera, petals in the air, daylight, a stone building behind.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. After the ceremony: a couple walking through confetti. Backs to camera, petals in the air, daylight, a stone building behind. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `oi-09-speeches.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Needs production.
- **Scene or subject:** The speeches: raised glasses. (sheet frame 09)
- **Composition:** A row of hands raising glasses over a long candlelit table, no faces, warm light.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. The speeches: raised glasses. A row of hands raising glasses over a long candlelit table, no faces, warm light. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `oi-10-first-dance.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Needs production.
- **Scene or subject:** The dancing: a couple from behind on the dance floor. (sheet frame 10)
- **Composition:** Warm string lights, soft motion, dress hem swirling, no faces.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. The dancing: a couple from behind on the dance floor. Warm string lights, soft motion, dress hem swirling, no faces. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `oi-11-cake-detail.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Needs production.
- **Scene or subject:** The cake: hands and a knife. (sheet frame 11)
- **Composition:** Two hands on a knife at the first cut, a plain cake with greenery, no faces.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. The cake: hands and a knife. Two hands on a knife at the first cut, a plain cake with greenery, no faces. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

### `oi-12-last-light.webp + .jpg`

- **Page:** olive-ivory. **Type:** photograph. **Status:** Needs production.
- **Scene or subject:** The end of the day: two figures against the last light. (sheet frame 12)
- **Composition:** Small silhouettes at the edge of a field at dusk, a few lit windows far away.
- **Aspect ratio:** 2:3 portrait. All twelve frames must be portrait 2:3 for the sheet layout as built.
- **Minimum useful resolution:** 2400 x 3600. Do not upscale the current files.
- **Duration (footage):** n/a
- **Camera movement:** n/a
- **Lighting and colour direction:** Natural light, documentary look, a consistent warm neutral grade (ivory, stone, sage, soft brown). No flash, no heavy HDR, no teal and orange.
- **Desktop crop:** Sheet cell about 280 px wide, cover crop; light table print up to about 600 px tall. Keep the subject in the central 70 percent.
- **Mobile crop:** Sheet cell about half the screen width; light table print up to about 60 percent of the screen height. Same crop.
- **Encoding and delivery:** WebP and JPEG, under 250 KB each at 1200 px wide. Then add an entry to data/olive-ivory.json.
- **Generation prompt:** A photograph in the style of documentary wedding photography, 50mm lens, natural light, shallow depth of field, a warm neutral grade. The end of the day: two figures against the last light. Small silhouettes at the edge of a field at dusk, a few lit windows far away. 2:3 portrait. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.

## Prompt notes

- For image-to-video tools (Runway, Veo, Kling, Sora or similar) use the supplied still as the first frame, then paste the prompt. Generate several takes and keep the one whose loop is cleanest.
- Check every clip frame by frame for warped hands, melting fabric, flickering edges and text. Reject anything that has them.
- To make a loop seamless, crossfade the last second of the clip into the first, or generate a clip that ends on its first frame.
- Label generated footage as generated. The pages already say "Generated concept image" and switch to "Concept footage" when a clip is live. Change that wording if real filmed footage replaces it.
