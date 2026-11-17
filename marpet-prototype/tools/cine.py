"""Cinematic grade for genuine Marpet photographs, plus the few textures the motion scenes need.

The photographs are not altered in content: no objects added or removed, nothing generated.
The grade only changes tone and colour, the way a photographer would in post: darker exposure,
crushed blacks, teal shadows, tungsten highlights, red resin floors muted, a soft bloom on the
brightest steel, and a vignette that falls off towards the ceiling.

Run from the prototype folder:  python3 tools/cine.py
Needs Pillow and numpy. Writes site/assets/img/cine/ (about 1.5 MB in total).
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter

SRC = 'site/assets/img/'
OUT = 'site/assets/img/cine/'
os.makedirs(OUT, exist_ok=True)


def to_np(im): return np.asarray(im.convert('RGB'), dtype=np.float32) / 255.0
def to_im(a): return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def grade(im, exposure=0.74, top_dark=0.72, vignette=0.7, warm=1.6, cx=0.55, cy=0.62):
    a = to_np(im)
    h, w, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); sat = (mx - mn) / (mx + 1e-5)
    # red and pink resin floors: pull saturation and brightness right down (a hue-selective adjustment)
    redness = np.clip((r - np.maximum(g, b)) * 3.2, 0, 1) * np.clip(sat * 2, 0, 1)
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    grey = lum[..., None]
    a = a * (1 - redness[..., None] * 0.82) + grey * redness[..., None] * 0.82 * 0.62
    # bright cyan and blue belts: keep the colour, lose the shout
    cyan = np.clip((b - r) * 2.4, 0, 1) * np.clip(sat * 1.6, 0, 1)
    lum0 = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])[..., None]
    a = a * (1 - cyan[..., None] * 0.55) + lum0 * 0.8 * cyan[..., None] * 0.55
    # overall saturation
    lum = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])[..., None]
    a = lum + (a - lum) * 0.68
    # exposure, then an S curve that crushes the blacks and keeps the steel highlights
    a = a * exposure
    a = np.clip(a, 0, 1)
    a = a * a * (3 - 2 * a) * 0.8 + a * 0.2
    a = np.clip((a - 0.035) / 0.965, 0, 1)
    # light falls off towards the ceiling and the edges, as if lit from low practical lamps
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    yy /= h; xx /= w
    top = 1 - top_dark * np.clip(1 - yy / 0.7, 0, 1) ** 1.3
    d = np.sqrt(((xx - cx) / 0.75) ** 2 + ((yy - cy) / 0.68) ** 2)
    vig = 1 - vignette * np.clip(d - 0.35, 0, 1) ** 1.3
    a = a * (top * vig)[..., None]
    # split tone: teal shadows, tungsten highlights
    lum = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])[..., None]
    sh = np.clip(1 - lum / 0.45, 0, 1); hi = np.clip((lum - 0.4) / 0.6, 0, 1)
    a = a + sh * np.array([-0.012, 0.012, 0.022]) * 1.4
    a = a * (1 + hi * np.array([0.10, 0.03, -0.09]) * warm)
    # bloom on the brightest steel
    bright = np.clip((lum - 0.62) / 0.38, 0, 1) * a
    bl = to_np(to_im(bright).filter(ImageFilter.GaussianBlur(max(6, w / 90))))
    a = 1 - (1 - a) * (1 - bl * np.array([0.55, 0.45, 0.34]))
    return to_im(a)


def sized(im, width):
    w, h = im.size
    if w != width: im = im.resize((width, round(h * width / w)), Image.LANCZOS)
    return im


def save(im, name, q=80):
    im.save(OUT + name, quality=q, method=6)
    print(name, im.size, os.path.getsize(OUT + name) // 1024, 'KB')


def unsharp(im): return im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))


projects = json.load(open('content/projects.json'))
services = json.load(open('content/services.json'))
heroes = sorted(set([p['hero'] for p in projects] + [s['hero'] for s in services] + ['IMG_0272.jpg', 'IMG_0276.jpg', 'general-fabrication-2.jpg']))

for f in heroes:
    im = Image.open(SRC + f).convert('RGB')
    w = im.size[0]
    big = unsharp(sized(im, 1600 if w >= 900 else 1280))
    stem = f.rsplit('.', 1)[0]
    save(grade(big), stem + '.webp', 78)
    # soft backdrop for layered scenes: blurred, darker, small (it is shown enlarged and out of focus)
    bg = sized(im, 480).filter(ImageFilter.GaussianBlur(10))
    save(grade(bg, exposure=0.62, vignette=0.5), stem + '-bg.webp', 60)

# ---- opening close-ups, cut from the 1024 px originals ----
# IMG_0272: the brushed side panel of a Marpet conveyor, with its button-head screws
p272 = Image.open(SRC + 'IMG_0272.jpg').convert('RGB')
panel = p272.crop((150, 300, 1000, 600))   # 850 x 300
save(grade(unsharp(sized(panel, 2000)), exposure=0.9, top_dark=0.2, vignette=0.45, cy=0.5), 'macro-panel.webp', 80)
# IMG_0283: the Marpet logo plate on the long conveyor's side frame
p283 = Image.open(SRC + 'IMG_0283.jpg').convert('RGB')
logo = p283.crop((150, 330, 830, 640))
save(grade(unsharp(sized(logo, 1800)), exposure=0.9, top_dark=0.15, vignette=0.5, cy=0.45), 'macro-frame.webp', 80)

# ---- textures ----
rng = np.random.default_rng(7)
# film grain, tiled over every scene
g = rng.normal(0.5, 0.18, (256, 256)).clip(0, 1)
Image.fromarray((g * 255).astype(np.uint8), 'L').save(OUT + 'grain.png', optimize=True)
print('grain.png', os.path.getsize(OUT + 'grain.png') // 1024, 'KB')
# brushed stainless sheet: long horizontal grain, faint cross scratches, slight waviness
W, H = 1600, 900
n = rng.normal(0, 1, (H, W // 8)).astype(np.float32)
streak = np.asarray(Image.fromarray(((n - n.min()) / (n.max() - n.min()) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=np.float32) / 255
fine = rng.normal(0, 1, (H, W)).astype(np.float32)
fine = np.asarray(Image.fromarray(((fine - fine.min()) / (fine.max() - fine.min()) * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(0)).resize((W, H)), dtype=np.float32) / 255
row = rng.normal(0, 1, (H, 1)).astype(np.float32) * 0.035
base = 0.5 + (streak - 0.5) * 0.22 + (fine - 0.5) * 0.05 + row
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
base += 0.05 * np.sin(xx / W * 3.1 + yy / H * 1.3)
for _ in range(36):   # light handling scratches
    x0, y0 = rng.uniform(0, W), rng.uniform(0, H); ang = rng.uniform(-0.5, 0.5); ln = rng.uniform(40, 260)
    t = np.linspace(0, 1, int(ln)); xs = (x0 + np.cos(ang) * ln * t).astype(int); ys = (y0 + np.sin(ang) * ln * t).astype(int)
    ok = (xs >= 0) & (xs < W) & (ys >= 0) & (ys < H); base[ys[ok], xs[ok]] += rng.uniform(0.04, 0.09)
steel = np.stack([base * 0.92, base * 0.95, base], -1)
save(to_im(steel).filter(ImageFilter.GaussianBlur(0.6)), 'steel.webp', 74)
