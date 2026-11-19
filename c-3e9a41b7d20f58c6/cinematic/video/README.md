# Footage folder

Each hero has two compositions. Name the finished clips after their key in `../data/footage.json`, with `.webm` and `.mp4` extensions, then set `"available": true` for that key. Nothing else changes.

| Key | Used for | Composition |
|---|---|---|
| `se-hero-fire-16x9` | Salt & Ember, 640 px and wider | 16:9 landscape, fire right, dark space left |
| `se-hero-fire-mobile-4x5` | Salt & Ember, phones | 4:5 portrait, composed separately |
| `oi-hero-window-16x9` | Olive & Ivory, 640 px and wider | 16:9 landscape, dress and window right |
| `oi-hero-portrait-4x5` | Olive & Ivory, phones | 4:5 portrait, the plate that docks into the sheet |

A `poster` field in the manifest names a still of the same composition, as `img/<poster>.webp` and `.jpg`. It is used before the clip plays and whenever the clip does not: reduced motion, data saver, a missing file, a failed load.

Specifications and generation prompts: `docs/concepts/asset-manifest.md`. File sizes there are starting targets, not hard limits.

No clip is in this folder yet.
