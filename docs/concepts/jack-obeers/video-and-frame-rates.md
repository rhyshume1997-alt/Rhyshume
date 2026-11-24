# Jack O'Beers: video, frame rates and camera settings

Filming with an **iPhone 16 Pro Max** and a **DJI Osmo Pocket 3**. Short answers first, details after.

## Can the website handle 4K video?
**Short answer: film in 4K, but the website should play a 1080p copy.** Browsers can technically play 4K, but a 4K clip is 50 to 200 MB for a short loop. On a phone or slow connection it would stall, drain data and slow the whole page. The site is built for short, muted, looping clips that start instantly.

- **Film in 4K** because it gives you room to crop and reframe, steadier digital stabilisation and sharper downscaled footage, and you can pull still photos from it.
- **Publish 1080p** (1920 x 1080), 25 fps, H.264 MP4 plus WebM, no sound, **under about 4 MB per clip**, **10 to 15 seconds**, seamless loop.
- **Phones get a 720p copy** (1280 x 720), under about 2 MB.
- **Each clip has a poster image** (a still frame) so something shows instantly.
- **Photos do the heavy lifting** for the big scroll backgrounds on the beers and keezer pages. Those are stills, not video, so quality stays sharp and the page stays light.
- I will do the compression for you from your originals (commands at the end). Do not upload 4K to the site.

If you ever want a video that plays as you scroll (the pint emptying as real footage), that needs a special encode with a keyframe on every frame (bigger files). It is possible, but the six-photo method is lighter and looks good, so it is the plan unless the shop wants more.

## Frame rates: recommended settings (UK)
The UK mains is 50 Hz, so **shoot 25 fps (or 50 fps) with a 1/50 (or 1/100) shutter** to avoid flickering from shop lights. Keep every normal clip on the **same frame rate** so cuts match.

| Shot | Record at | Shutter | Delivered as | Why |
|---|---|---|---|---|
| Walk-through, shop front, counter work | **4K 25 fps** | 1/50 | 1080p 25 fps | Natural, filmic motion, no light flicker |
| Hero pour, beer into glass | **4K 100 or 120 fps** | 1/200 or faster | Slowed to 25 fps, about 4x slower | Silky slow pour, foam rising, bubbles. This is the hero. |
| Tap pull, keg pour, cheese being cut | **4K 50 or 60 fps** | 1/100 | 25 fps, about 2x slow, or real time | Gentle slow motion, still very smooth |
| Hamper packing, overhead | **4K 25 fps** | 1/50 | 1080p 25 fps | Steady and clean |
| Talking clip with owner | **4K 25 fps** | 1/50 | 1080p 25 fps | Matches everything else |
| Time-lapse of the shop day (optional) | Interval or time-lapse mode | n/a | 1080p 25 fps | Nice for About / Contact |

**Do not mix 24, 30 and 25** within one video edit. Choose 25 for normal and 100 or 120 for slow motion, and stick to that. (24 fps is fine if you prefer a cinema look, but then keep to 24 and 96 or 120.)

## iPhone 16 Pro Max
- **Settings > Camera > Record Video:** pick **4K at 25 fps** for normal clips. For slow motion pick **4K at 120 fps** (check the exact options on your phone; some modes need High Efficiency).
- **Turn off HDR video** (Settings > Camera > Record Video > **HDR Video: off**). iPhone records Dolby Vision HDR by default, and HDR clips can look washed out or too bright on normal screens unless converted. For the website we want normal (SDR, Rec.709) video.
- **Format:** High Efficiency (HEVC) saves space. ProRes is huge, so only if you need heavy colour grading and have an SSD.
- **Lock exposure and focus:** tap and hold on the subject until "AE/AF Lock" appears. Turn **Action Mode off** (it crops the picture). Use the **1x main lens** for quality (the 5x is soft indoors).
- **Lighting and lens:** wipe the lens, switch the flash off, and shoot near a window or with a soft light. Hold it landscape, locked on a tripod or a stable stand.
- **Photos:** use the 48 MP ProRAW/HEIF only if you want very large files. **JPEG or HEIF at 12 MP** is fine for the site. For the six-frame pint and keezer sequences use the **tripod, same settings and the main lens**.

## DJI Osmo Pocket 3
Menu names can differ a little between firmware versions, so glance at each setting on the day. These are the settings to look for.

**Set once, before you start**
- **Card:** a fast microSD (V30 or better, 128 GB or more). 4K 120 fps fills a card quickly.
- **Resolution and frame rate (normal clips):** **4K, 25 fps** (shutter 1/50).
- **Slow-motion clips:** the **Slow Motion mode at 4K 120 fps** (about 4.8x slower when played back at 25 fps). Use this for the hero pour and the tap pull.
- **Colour:** **Normal** (standard colour), **not D-Log M or HLG**. D-Log and HLG look flat or washed out on the web unless graded. Keep the iPhone on SDR too so the two match.
- **Codec:** **H.265 (HEVC)** is fine and saves space; **H.264** is safest if the editing software struggles.
- **Exposure:** use **Pro mode** and set the shutter to **1/50** at 25 fps (about **1/240** at 120 fps), **ISO as low as the light allows**, and **lock exposure** so it does not pump when the camera moves. In bright daylight fit an **ND filter** to keep the shutter at 1/50.
- **White balance:** set it **manually** (about 3200 K under warm shop bulbs, 5600 K for daylight) and set the **same value on the iPhone**, so colours match between the two.
- **Stabilisation:** **RockSteady on** for walking shots, **off on a tripod**.
- **Gimbal mode:** **Follow** for walk-throughs and gentle pans; **Tilt lock** for steady push-ins and pans; use **FPV** only for a deliberate feel. Keep **SpinShot** off.
- **Screen and focus:** flip the screen to see yourself or tilt it to vertical only if you need a vertical clip. Autofocus is fine for most shots; **tap the subject** (glass, tap, product) to focus on it and keep the lens clean.
- **Sound:** record the built-in microphone for reference only. The website clips are **muted**, and do not play music in the shop (licensing).

**Per shot**

| Shot | Pocket 3 mode | Notes |
|---|---|---|
| Hero pour, tap pull, keg pour | Slow Motion, **4K 120 fps** | Backlight or side light, dark background, glass steady. Shoot a few takes. |
| Walk-through, shop front | **4K 25 fps**, Follow mode, RockSteady on | Slow steady walk, elbows tucked. |
| Deli counter, hamper packing | **4K 25 fps**, Tilt lock or on a tripod | Close, locked-off, hands only. |
| Product spins or details | **4K 25 fps**, tripod | Slow turntable or a slow slide. |

**Use the Pocket 3 for moving shots and slow-motion pours, and the iPhone 16 Pro Max for photos and any locked-off close-ups.** Match white balance and frame rate between them.

**Keep it going**
- Charge it fully (it records about two to three hours at 4K 25) and bring a spare battery or a power bank if you can.
- It can overheat in long 4K 120 recording; shoot short takes (10 to 20 seconds).
- Wipe the lens, and wipe fingerprints from the screen: smudges show in the footage.
- Transfer with a card reader or the cable; do not send the files through messaging apps.

## Keep the originals
- **Keep every original file** at full 4K and the highest frame rate (no re-saving, no WhatsApp, no AirDrop-as-compressed).
- Back them up twice that day. **Do not edit or compress the originals.** I make the website copies from them.
- Keep the **AirDrop / USB / cable transfer** to the laptop, not messaging apps (they shrink the video).

## What I do with your files (for reference)
Make the website versions with ffmpeg (from your originals):
```
# 1080p MP4 (H.264), 25 fps, no sound, instant start
ffmpeg -i original.mov -vf "scale=1920:-2,fps=25" -an -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart hero.mp4
# WebM (VP9)
ffmpeg -i original.mov -vf "scale=1920:-2,fps=25" -an -c:v libvpx-vp9 -crf 33 -b:v 0 hero.webm
# 720p phone copy
ffmpeg -i original.mov -vf "scale=1280:-2,fps=25" -an -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart hero-sm.mp4
# poster image
ffmpeg -i original.mov -frames:v 1 -vf "scale=1920:-2" hero-poster.jpg
# slow motion from 120 fps footage to 25 fps (about 4.8x slower)
ffmpeg -i slowmo.mov -vf "setpts=4.8*PTS,fps=25,scale=1920:-2" -an -c:v libx264 -crf 24 hero.mp4
```
Targets: hero under about 4 MB, other clips under about 3 MB each, all muted, all with a poster. The page pauses video that is off-screen or when the tab is hidden, and shows only the poster for visitors who prefer reduced motion.
