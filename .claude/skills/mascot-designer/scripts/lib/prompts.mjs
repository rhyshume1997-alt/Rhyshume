// The words that make the pictures. One place for every style and every pose,
// so a mascot made today and one made next month come out the same family.

/** The six looks. `render` is said to the image model; `why` is for Claude's choice. */
export const STYLES = {
  clay: {
    name: "Soft clay",
    render: "a soft matte clay 3D render with the polish of a Pixar short or a premium designer toy: smooth rounded sculpted forms, a satin matte surface with very subtle subsurface scattering, soft studio light from the top left with a gentle rim light, soft ambient occlusion in the creases. Simple glossy black bean eyes with one small white highlight each, soft blush on the cheeks.",
    why: "Warm, friendly, premium, readable at any size. The default for consumer apps, money, health, habits, kids, anything that should feel safe and kind.",
  },
  plush: {
    name: "Plush",
    render: "a real plush toy photographed in a bright studio: soft short-pile minky fleece with visible fibres and soft seams, a simple soft pebble-like body, embroidered eyes and mouth in black thread (white felt behind the eyes where needed), soft even daylight, true product photography, slight fabric texture everywhere.",
    why: "Cosy, tactile, gentle, a bit funny. Wellness, sleep, journaling, social, family, cafes, anything you'd want to hug.",
  },
  fuzzy: {
    name: "Fuzzy",
    render: "a 3D render of a fluffy creature covered in dense, soft, groomed fur with individual strands visible at the silhouette, like a feature-animation monster: simple shapes under the fur, short stubby limbs, small glossy eyes, soft studio light from the top left.",
    why: "Lovable, cheeky, a little chaotic. Music, games, community, creative tools, a brand that wants to be loud and huggable.",
  },
  vinyl: {
    name: "Designer toy",
    render: "a collectible designer vinyl art toy: oversized head, compact body, stubby limbs, crisp sculpted shapes, smooth satin-painted vinyl with clean paint lines, small precise details, studio product shot, soft key light and a crisp rim light.",
    why: "Cool, collectible, a bit of attitude. Dev tools, AI assistants, fintech for young people, streetwear-ish brands, anything that wants to feel made, not cute.",
  },
  line: {
    name: "Flat line",
    render: "a flat vector illustration: one bold flat colour shape for the body with no shading, thick uniform black outlines for the face and for long bendy rubber-hose limbs, simple dot eyes and a confident line smile, crisp poster-like graphic design, no gradients, no texture, no 3D.",
    why: "Graphic, confident, editorial. Brands with a strong flat identity, packaging, web-first products, anything where the mascot sits next to big type.",
  },
  sticker: {
    name: "Retro sticker",
    render: "a die-cut sticker of a 1930s rubber-hose cartoon character: thick black ink outlines, printed in off-white plus exactly one spot colour, halftone dot shading in the spot colour, white pie-cut eyes with a little attitude, a thick off-white sticker border following the whole silhouette.",
    why: "Playful, nostalgic, a bit rebellious. Social, games, creator tools, brands that want personality over polish.",
  },
};

/** What every master must be. Said in every prompt. */
const FRAME = "One single character, full body, centred, facing three-quarters toward the camera, generous empty margin all around (the character fills about 70% of the height). Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text, no letters, no logos, no props unless named. Square image.";

/** The fixed set of poses every mascot gets. The order is the order of the pose sheet. */
export const POSES = [
  { id: "idle", label: "Idle", use: "always there: breathing, blinking",
    pose: "standing in a relaxed neutral pose, arms relaxed at its sides, looking at the viewer with a gentle closed-mouth smile" },
  { id: "blink", label: "Blink", use: "mixed into idle every few seconds", blink: true,
    pose: "EXACTLY the same image as the reference: same pose, same body, same arms, same angle, same size, same position. The ONLY change: both eyes are gently closed, drawn as soft curved closed-eye lines (a blink). Do not change anything else" },
  { id: "wave", label: "Hello", use: "onboarding, welcome back, sign-in",
    pose: "waving hello with one arm raised high and the hand or paw open, body leaning slightly into the wave, eyes happily squinted, mouth open in a cheerful smile" },
  { id: "think", label: "Thinking", use: "loading, processing, AI at work",
    pose: "thinking, still standing on its feet: looking up and to the side with a curious, interested expression (not worried), one hand or paw touching its chin, the other arm relaxed, mouth a small pondering shape" },
  { id: "celebrate", label: "Celebrate", use: "success, goal reached, streak, purchase",
    pose: "celebrating with joy: both arms thrown up high, eyes happily squeezed shut as upturned crescents, a big open-mouth smile, feet slightly apart as if mid-hop" },
  { id: "oops", label: "Oops", use: "errors, no connection, something failed",
    pose: "oops, a little worried: shoulders raised, both hands or paws up near its face in a nervous apologetic gesture, eyebrows tilted up, a small wobbly frown, one small light-blue sweat drop beside its head" },
  { id: "sleep", label: "Sleeping", use: "empty states, nothing yet, night, offline",
    pose: "fast asleep: sitting down on the ground with its legs out in front, eyes peacefully closed, head tilted slightly to one side, arms relaxed, a tiny calm smile" },
  { id: "point", label: "Pointing", use: "tips, tooltips, new features, look here",
    pose: "pointing: body turned slightly toward the viewer's right, one arm extended straight out pointing to the viewer's right, eager friendly expression looking the same way it points" },
  { id: "love", label: "Love", use: "thank you, ratings, upgrade, favourites",
    pose: "full of love: hugging a big glossy red heart against its chest with both arms, eyes closed in a warm happy smile; the heart is made in exactly the same material and render style as the character" },
];
export const POSE_IDS = POSES.map((p) => p.id);
/** Move names people use → pose ids ("hello" is drawn as the "wave" pose). */
export const POSE_ALIAS = { hello: "wave", thinking: "think", sleeping: "sleep", pointing: "point", celebrating: "celebrate", appear: "idle" };

/**
 * The master prompt: the character itself, drawn in its idle pose.
 * brief = { look, character, colour, feature, personality }
 */
export function masterPrompt(styleId, brief) {
  const s = STYLES[styleId];
  if (!s) throw new Error(`Unknown style "${styleId}". Styles: ${Object.keys(STYLES).join(", ")}`);
  return [
    `A mascot character for an app: ${brief.character.trim().replace(/\.?$/, ".")}`,
    brief.colour ? `Colour: ${brief.colour}.` : "",
    brief.feature ? `Its signature feature, which must read clearly even when tiny: ${brief.feature}.` : "",
    brief.personality ? `Personality you can read in the face and posture: ${brief.personality}.` : "",
    `Look: ${s.render}`,
    "Design it like a character designer at a top animation studio: one simple, memorable silhouette, big readable shapes, few details, appealing proportions (a big head or a round body, short limbs), a face placed low and wide apart for warmth, nothing generic.",
    `Pose: ${POSES[0].pose}.`,
    FRAME,
  ].filter(Boolean).join("\n");
}

/** A pose prompt: an edit of the master, which is attached as the reference image. */
export function posePrompt(styleId, poseId, note = "") {
  const s = STYLES[styleId];
  const p = POSES.find((x) => x.id === poseId);
  if (!p) throw new Error(`Unknown pose "${poseId}". Poses: ${POSE_IDS.join(", ")}`);
  if (p.blink) return [`Edit the attached image. ${p.pose}.`, note ? `Important: ${note}` : "", "Transparent background (PNG with alpha). Square image, same framing as the reference."].filter(Boolean).join("\n");
  return [
    "Edit the attached image: it is the model sheet for a mascot character.",
    "Keep the exact same character: identical body shape, proportions, colours, materials, surface texture, face, eyes, accessories and render style; the same camera distance, the same angle and the same size in the frame, with its feet on the same ground line. It must look like the same toy, re-posed.",
    `Only change the pose and expression: ${p.pose}.`,
    "The eyes keep exactly the reference's shape, size and colour (no new irises, no eyebrows the reference doesn't have) unless the pose closes them.",
    note ? `Important: ${note}` : "",
    `Look (unchanged): ${s.render}`,
    "Transparent background (PNG with alpha). No floor, no ground shadow, no backdrop, no text. Square image, the same framing as the reference.",
  ].filter(Boolean).join("\n");
}

/** Three different concepts from one brief, for the person to pick from. */
export const CONCEPT_TWISTS = [
  "",
  "Push the shape language further: a bolder, simpler, more iconic silhouette than the obvious version.",
  "Take a surprising but fitting angle on the same idea: a different creature or object that carries the same meaning.",
];
