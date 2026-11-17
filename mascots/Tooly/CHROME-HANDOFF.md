# Tooly: hand-off for Claude in Chrome

Tooly is the mascot for Tolra's AI helper: a spanner character. These are the instructions and prompts for drawing him in ChatGPT. The prompts come from the Mascot Designer skill and the brief in `brief.json`.

There are two stages. Stage 1 draws three ideas and stops so Rhys can choose. Stage 2 draws the chosen one in nine poses.

## Instructions for Claude in Chrome

You are drawing a mascot in ChatGPT on Rhys's behalf. Work in the ChatGPT tab he is signed in to.

- Use one new ChatGPT conversation for everything, so the images stay consistent.
- Send each prompt below exactly as written, one at a time. Wait until the image has finished before sending the next.
- Do not rewrite, shorten or combine the prompts.
- If ChatGPT refuses, errors, or says an image limit has been reached, stop and tell Rhys what it said. Do not retry more than once.
- Do not change any ChatGPT settings, and do not open any other site.

### Stage 1: three ideas

1. Start a new ChatGPT conversation.
2. Send the three Stage 1 prompts in order, one image each.
3. Stop. Tell Rhys the three ideas are ready and ask which one he wants: 1, 2 or 3.

### Stage 2: nine poses of the chosen idea

Do this only after Rhys has said which idea he chose.

1. In the same conversation, send: `Use idea number N from above as the model sheet for everything that follows.` with N replaced by his choice.
2. Send the nine Stage 2 prompts in the order given, one image each. Each one edits the chosen image, so there is nothing to upload.
3. After each image, download it with ChatGPT's download button.
4. When all nine are done, tell Rhys they are in his Downloads folder, in this order: idle, blink, wave, think, celebrate, oops, sleep, point, love.

## Stage 1 prompts

### Idea 1: Open-ended spanner (jaw like two ears)

```text
A mascot character for an app: a small open-ended spanner standing upright as a creature: the handle is its compact body with short stubby arms and legs, and the open C-shaped jaw at the top forms two rounded prongs above its oversized head like a pair of ears, with a hi-vis orange grip band around its middle.
Colour: bright cobalt blue body like #2E52B8, hi-vis safety orange grip band.
Its signature feature, which must read clearly even when tiny: the open spanner jaw on top of its head, like two rounded ears.
Personality you can read in the face and posture: capable, quick, plain-spoken; a workshop hand who gets on with it.
Look: a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.
Design it like a character designer at a top animation studio: one simple, memorable silhouette, big readable shapes, few details, appealing proportions (a big head or a round body, short limbs), a face placed low and wide apart for warmth, nothing generic.
Pose: standing in a relaxed neutral pose, arms relaxed at its sides, looking at the viewer with a gentle closed-mouth smile.
One single character, full body, centred, facing three-quarters toward the camera, generous empty margin all around (the character fills about 70% of the height). Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text, no letters, no logos, no props unless named. Square image.
```

### Idea 2: Adjustable spanner (orange thumbwheel)

```text
A mascot character for an app: a chunky adjustable spanner creature, wide and sturdy: a big square-jawed head with one fixed jaw and one sliding jaw forming a broad grin-shaped profile, a round knurled thumbwheel on its cheek, a short thick handle body with stubby arms and legs.
Colour: bright cobalt blue body like #2E52B8, hi-vis safety orange thumbwheel.
Its signature feature, which must read clearly even when tiny: the orange knurled thumbwheel on its cheek.
Personality you can read in the face and posture: capable, quick, plain-spoken; a workshop hand who gets on with it.
Look: a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.
Design it like a character designer at a top animation studio: one simple, memorable silhouette, big readable shapes, few details, appealing proportions (a big head or a round body, short limbs), a face placed low and wide apart for warmth, nothing generic.
Pose: standing in a relaxed neutral pose, arms relaxed at its sides, looking at the viewer with a gentle closed-mouth smile.
One single character, full body, centred, facing three-quarters toward the camera, generous empty margin all around (the character fills about 70% of the height). Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text, no letters, no logos, no props unless named. Square image.
```

### Idea 3: Ring spanner (notched ring round the face)

```text
A mascot character for an app: a ring spanner creature with a big round ring-shaped head: the face sits on a solid disc inside a thick ring with twelve tiny notches around its inner edge, on a short tapering handle body with stubby arms and legs and a small hexagonal nut held in one hand.
Colour: bright cobalt blue body like #2E52B8, hi-vis safety orange hexagonal nut.
Its signature feature, which must read clearly even when tiny: the thick notched ring around its round face.
Personality you can read in the face and posture: capable, quick, plain-spoken; a workshop hand who gets on with it.
Look: a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.
Design it like a character designer at a top animation studio: one simple, memorable silhouette, big readable shapes, few details, appealing proportions (a big head or a round body, short limbs), a face placed low and wide apart for warmth, nothing generic.
Pose: standing in a relaxed neutral pose, arms relaxed at its sides, looking at the viewer with a gentle closed-mouth smile.
One single character, full body, centred, facing three-quarters toward the camera, generous empty margin all around (the character fills about 70% of the height). Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text, no letters, no logos, no props unless named. Square image.
```

## Stage 2 prompts

Each begins "Edit the attached image". In ChatGPT that means the chosen idea from Stage 1.

### idle

```text
Edit the chosen idea image from earlier in this conversation: it is the model sheet for a mascot character.
Keep the exact same character: identical body shape, proportions, colours, materials, surface texture, face, eyes, accessories and render style; the same camera distance, the same angle and the same size in the frame, with its feet on the same ground line. It must look like the same toy, re-posed.
Only change the pose and expression: standing in a relaxed neutral pose, arms relaxed at its sides, looking at the viewer with a gentle closed-mouth smile.
The eyes keep exactly the reference's shape, size and colour (no new irises, no eyebrows the reference doesn't have) unless the pose closes them.
Look (unchanged): a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.
Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text. Square image, the same framing as the reference.
```

### blink

```text
Edit the chosen idea image from earlier in this conversation. EXACTLY the same image as the reference: same pose, same body, same arms, same angle, same size, same position. The ONLY change: both eyes are gently closed, drawn as soft curved closed-eye lines (a blink). Do not change anything else.
Transparent background (PNG with alpha). Square image, same framing as the reference.
```

### wave

```text
Edit the chosen idea image from earlier in this conversation: it is the model sheet for a mascot character.
Keep the exact same character: identical body shape, proportions, colours, materials, surface texture, face, eyes, accessories and render style; the same camera distance, the same angle and the same size in the frame, with its feet on the same ground line. It must look like the same toy, re-posed.
Only change the pose and expression: waving hello with one arm raised high and the hand or paw open, body leaning slightly into the wave, eyes happily squinted, mouth open in a cheerful smile.
The eyes keep exactly the reference's shape, size and colour (no new irises, no eyebrows the reference doesn't have) unless the pose closes them.
Look (unchanged): a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.
Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text. Square image, the same framing as the reference.
```

### think

```text
Edit the chosen idea image from earlier in this conversation: it is the model sheet for a mascot character.
Keep the exact same character: identical body shape, proportions, colours, materials, surface texture, face, eyes, accessories and render style; the same camera distance, the same angle and the same size in the frame, with its feet on the same ground line. It must look like the same toy, re-posed.
Only change the pose and expression: thinking, still standing on its feet: looking up and to the side with a curious, interested expression (not worried), one hand or paw touching its chin, the other arm relaxed, mouth a small pondering shape.
The eyes keep exactly the reference's shape, size and colour (no new irises, no eyebrows the reference doesn't have) unless the pose closes them.
Look (unchanged): a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.
Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text. Square image, the same framing as the reference.
```

### celebrate

```text
Edit the chosen idea image from earlier in this conversation: it is the model sheet for a mascot character.
Keep the exact same character: identical body shape, proportions, colours, materials, surface texture, face, eyes, accessories and render style; the same camera distance, the same angle and the same size in the frame, with its feet on the same ground line. It must look like the same toy, re-posed.
Only change the pose and expression: celebrating with joy: both arms thrown up high, eyes happily squeezed shut as upturned crescents, a big open-mouth smile, feet slightly apart as if mid-hop.
The eyes keep exactly the reference's shape, size and colour (no new irises, no eyebrows the reference doesn't have) unless the pose closes them.
Look (unchanged): a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.
Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text. Square image, the same framing as the reference.
```

### oops

```text
Edit the chosen idea image from earlier in this conversation: it is the model sheet for a mascot character.
Keep the exact same character: identical body shape, proportions, colours, materials, surface texture, face, eyes, accessories and render style; the same camera distance, the same angle and the same size in the frame, with its feet on the same ground line. It must look like the same toy, re-posed.
Only change the pose and expression: oops, a little worried: shoulders raised, both hands or paws up near its face in a nervous apologetic gesture, eyebrows tilted up, a small wobbly frown, one small light-blue sweat drop beside its head.
The eyes keep exactly the reference's shape, size and colour (no new irises, no eyebrows the reference doesn't have) unless the pose closes them.
Look (unchanged): a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.
Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text. Square image, the same framing as the reference.
```

### sleep

```text
Edit the chosen idea image from earlier in this conversation: it is the model sheet for a mascot character.
Keep the exact same character: identical body shape, proportions, colours, materials, surface texture, face, eyes, accessories and render style; the same camera distance, the same angle and the same size in the frame, with its feet on the same ground line. It must look like the same toy, re-posed.
Only change the pose and expression: fast asleep: sitting down on the ground with its legs out in front, eyes peacefully closed, head tilted slightly to one side, arms relaxed, a tiny calm smile.
The eyes keep exactly the reference's shape, size and colour (no new irises, no eyebrows the reference doesn't have) unless the pose closes them.
Look (unchanged): a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.
Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text. Square image, the same framing as the reference.
```

### point

```text
Edit the chosen idea image from earlier in this conversation: it is the model sheet for a mascot character.
Keep the exact same character: identical body shape, proportions, colours, materials, surface texture, face, eyes, accessories and render style; the same camera distance, the same angle and the same size in the frame, with its feet on the same ground line. It must look like the same toy, re-posed.
Only change the pose and expression: pointing: body turned slightly toward the viewer's right, one arm extended straight out pointing to the viewer's right, eager friendly expression looking the same way it points.
The eyes keep exactly the reference's shape, size and colour (no new irises, no eyebrows the reference doesn't have) unless the pose closes them.
Look (unchanged): a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.
Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text. Square image, the same framing as the reference.
```

### love

```text
Edit the chosen idea image from earlier in this conversation: it is the model sheet for a mascot character.
Keep the exact same character: identical body shape, proportions, colours, materials, surface texture, face, eyes, accessories and render style; the same camera distance, the same angle and the same size in the frame, with its feet on the same ground line. It must look like the same toy, re-posed.
Only change the pose and expression: full of love: hugging a big glossy red heart against its chest with both arms, eyes closed in a warm happy smile; the heart is made in exactly the same material and render style as the character.
The eyes keep exactly the reference's shape, size and colour (no new irises, no eyebrows the reference doesn't have) unless the pose closes them.
Look (unchanged): a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.
Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text. Square image, the same framing as the reference.
```

## After the drawing

Rhys uploads the nine PNGs to the Claude Code session. Claude checks each pose is the same character, says which to redo, then builds the animation, the film and the web kit from them.
