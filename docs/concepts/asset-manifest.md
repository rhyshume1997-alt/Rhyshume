# Asset manifest: Salt & Ember and Olive & Ivory (Rev 3)

Everything the two productions need, exactly. **Exists** means a file is already in the repository. **Needs production** means it does not exist and must be made.

**All generated visuals are for fictional concept demonstrations only. They do not depict a real business, customers or completed client work, and every page says so.** Check the generating tool's terms for commercial use before relying on any generated asset. Do not enlarge the current low resolution photographs and present them as originals: replace them.

## How to add an asset

- **Footage:** put `key.webm` and `key.mp4` in `c-3e9a41b7d20f58c6/cinematic/video/`, then set `"available": true` for that key in `data/footage.json`. No code change. The poster photograph stays as the fallback, and is what reduced motion, data saver and a failed load show.
- **Photographs:** put `name.webp` and `name.jpg` in `img/`, add an entry (id, file, w, h, alt, title, time, caption) to `data/olive-ivory.json`, and the sheet, the light table and the day pick it up. For Salt & Ember, replace the file of the same name.

## Summary

| Asset | Page | Type | Status |
|---|---|---|---|
| `se-hero-fire-4x5.webm + .mp4` | salt-ember | footage | needs production |
| `se-hero-fire-4x5-mobile.webm + .mp4` | salt-ember | footage | needs production |
| `se-embers-4x5.webm` | salt-ember | footage (optional) | needs production |
| `se-01-fire-grill.webp + .jpg` | salt-ember | photograph | Exists (low resolution 367 x 537). Needs a high resolution replacement. |
| `se-02-plated-food.webp + .jpg` | salt-ember | photograph | Exists (low resolution 339 x 537). Needs a high resolution replacement. |
| `se-03-wine-pour.webp + .jpg` | salt-ember | photograph | Exists (low resolution 323 x 537). Needs a high resolution replacement. |
| `se-04-dessert.webp + .jpg` | salt-ember | photograph | Exists (low resolution 407 x 537). Needs a high resolution replacement. |
| `se-05-shared-table.webp + .jpg` | salt-ember | photograph (optional) | needs production |
| `se-06-bar-detail.webp + .jpg` | salt-ember | photograph (optional) | needs production |
| `oi-hero-window-4x5.webm + .mp4` | olive-ivory | footage | needs production |
| `oi-hero-window-4x5-mobile.webm + .mp4` | olive-ivory | footage | needs production |
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

### `se-hero-fire-4x5.webm + .mp4`

- **Page:** salt-ember. **Type:** footage. **Status:** needs production
- **Scene or subject:** The hero fire. A charcoal grill with open flames, a steak searing on the bars, sparks rising into a dark kitchen.
- **Composition:** Flames rising centre-left, grill bars across the lower third, the steak low and slightly right, dark empty space top and right for the sparks to travel into. One steady subject, no people, no text.
- **Aspect ratio:** 4:5 portrait
- **Minimum useful resolution:** Master 2160 x 2700. Delivered 1080 x 1350.
- **Duration (footage):** 8 seconds, seamless loop (first and last frames must match).
- **Camera movement:** Locked off, or a very slow push in no more than 3 percent over the 8 seconds. No handheld, no whip, no zoom.
- **Lighting and colour direction:** The fire is the only key light. Amber and terracotta (the #dd6b40 family) with deep brown shadows (#1f1612). Highlights must not clip to white. Smoke stays low contrast. No blue.
- **Desktop crop:** Shown full frame at 4:5 in the plate, or full height at about 52 percent of the screen width when footage is live. Keep the flames and steak inside the central 80 percent.
- **Mobile crop:** Shown full frame at 4:5, up to half the screen height. Same crop. A lighter encode is supplied separately (se-hero-fire-4x5-mobile).
- **Encoding and delivery:** WebM (VP9) first, MP4 (H.264) second. Under 3 MB for desktop. No audio track. Poster still: se-01-fire-grill.
- **Generation prompt:** Image-to-video, using the supplied grill photograph as the first frame: Photographic, filmed on a cinema camera, 35mm lens, shallow depth of field, natural motion blur at 24 frames per second. A charcoal grill at night in a restaurant kitchen. Open flames rise and lick upward, a steak sears on the bars, embers and sparks drift up and to the left into darkness. Locked-off camera, extremely slow push in. Warm amber and terracotta firelight is the only light source, deep brown shadows. Seamless 8 second loop. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** Wired: set "available": true for se-hero-fire-4x5 in data/footage.json after adding the files.

### `se-hero-fire-4x5-mobile.webm + .mp4`

- **Page:** salt-ember. **Type:** footage. **Status:** needs production
- **Scene or subject:** The same fire loop, re-encoded for phones.
- **Composition:** Identical to se-hero-fire-4x5.
- **Aspect ratio:** 4:5 portrait
- **Minimum useful resolution:** 720 x 900
- **Duration (footage):** 8 seconds, seamless loop
- **Camera movement:** Identical.
- **Lighting and colour direction:** Identical.
- **Desktop crop:** Not used on desktop.
- **Mobile crop:** Used up to 767 px wide and for narrow tablets.
- **Encoding and delivery:** Under 1.2 MB. No audio.
- **Generation prompt:** Not a separate generation: re-encode se-hero-fire-4x5 at 720 x 900 (for example ffmpeg -i se-hero-fire-4x5.mp4 -vf scale=720:900 -crf 30).
- **Notes:** If this file is missing the page uses the poster on phones.

### `se-embers-4x5.webm`

- **Page:** salt-ember. **Type:** footage (optional). **Status:** needs production
- **Scene or subject:** An ember and spark pass to layer over the fire, on black.
- **Composition:** Sparks rising from the lower left to the upper right across the whole frame, varied sizes and brightness, a few large slow ones.
- **Aspect ratio:** 4:5 portrait
- **Minimum useful resolution:** 1080 x 1350
- **Duration (footage):** 8 seconds, seamless loop
- **Camera movement:** Locked off.
- **Lighting and colour direction:** Orange to yellow sparks on pure black so a screen blend can lay it over the fire. No background detail.
- **Desktop crop:** Laid over the hero plate.
- **Mobile crop:** Same, fewer sparks acceptable.
- **Encoding and delivery:** WebM, under 1 MB.
- **Generation prompt:** Text-to-video: Macro, locked off. Glowing orange and yellow embers and sparks rise slowly from the lower left to the upper right against a pure black background, varied sizes, a few large and slow, most small and quick. Seamless 8 second loop. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** No slot is wired for this layer yet. It would be added when the clip exists.

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

### `oi-hero-window-4x5.webm + .mp4`

- **Page:** olive-ivory. **Type:** footage. **Status:** needs production
- **Scene or subject:** The opening scene: a tall window with old curtains, a wedding dress on a hanger, daylight.
- **Composition:** The window fills the upper two thirds, the dress hangs centre, a dark armchair at the lower right, curtains left and right. Static room, only the air moves.
- **Aspect ratio:** 4:5 portrait
- **Minimum useful resolution:** Master 2160 x 2700. Delivered 1080 x 1350.
- **Duration (footage):** 6 to 8 seconds, seamless loop.
- **Camera movement:** Locked off, or a very slow push in no more than 2 percent. The curtains and the dress hem move, the room does not.
- **Lighting and colour direction:** Soft overcast daylight through the window. Ivory, warm stone and sage-grey tones, deep brown curtains. No clipping on the window. Faint dust in the light is welcome.
- **Desktop crop:** Shown at 4:5 in the hero plate, then docks into frame 01 of the proof sheet, so keep the subject centred. Larger plate when footage is live.
- **Mobile crop:** Shown at 4:5 under the introduction. Lighter encode supplied separately.
- **Encoding and delivery:** WebM first, MP4 second. Under 2.5 MB. No audio. Poster: oi-03-dress-window.
- **Generation prompt:** Image-to-video, using the supplied dress-window photograph as the first frame: Photographic, filmed on a cinema camera, 35mm lens, shallow depth of field, natural motion blur at 24 frames per second. A tall sash window with heavy old curtains and a wedding dress on a hanger. A gentle breeze moves the curtains and the hem of the dress very slightly, dust floats in the soft daylight. Locked-off camera, no people, the room itself does not move. Soft overcast daylight, ivory and warm stone tones. Seamless 6 second loop. No text, no logos, no watermarks, no readable signs, no recognisable faces, no extra fingers or distorted hands, no cartoon or illustration look, no heavy HDR.
- **Notes:** Wired: set "available": true for oi-hero-window-4x5 in data/footage.json after adding the files.

### `oi-hero-window-4x5-mobile.webm + .mp4`

- **Page:** olive-ivory. **Type:** footage. **Status:** needs production
- **Scene or subject:** The same loop, re-encoded for phones.
- **Composition:** Identical.
- **Aspect ratio:** 4:5 portrait
- **Minimum useful resolution:** 720 x 900
- **Duration (footage):** 6 to 8 seconds, seamless loop
- **Camera movement:** Identical.
- **Lighting and colour direction:** Identical.
- **Desktop crop:** Not used on desktop.
- **Mobile crop:** Used up to 767 px wide.
- **Encoding and delivery:** Under 1 MB. No audio.
- **Generation prompt:** Not a separate generation: re-encode oi-hero-window-4x5 at 720 x 900.
- **Notes:** If this file is missing the page uses the poster on phones.

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
