# Jack O'Beers: video, frame rates and camera settings

Filming with an **iPhone 16 Pro Max** and a **DJI** camera. Short answers first, details after.

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

## DJI
Which DJI is it (Osmo Pocket 3, Osmo Action, a drone, a gimbal)? The settings below work for any of them. **Tell me the model and I will give exact menu names.**
- **4K, 25 fps** for normal footage, **4K 100 or 120 fps** for slow motion (the Action cameras and Pocket 3 support this).
- **Colour profile: Normal / Rec.709**, not D-Log or HLG, unless you plan to grade it. HDR and log look flat on the web without conversion.
- **Shutter:** about double the frame rate (1/50 at 25 fps). In bright daylight use an **ND filter** so you can keep that shutter.
- **White balance:** set manually (3200 to 5600 K) rather than auto, so colours do not drift while filming.
- **Stabilisation:** on for walking shots, **off for locked-off tripod shots**.
- Use the DJI for **smooth moves** (walk-through, gimbal push-ins) and the iPhone for **detail and slow-motion pours**, or the other way round. Just match the frame rate and white balance between them.

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
