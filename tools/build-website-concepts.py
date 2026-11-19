"""Publishes the eight working concepts at /website-concepts/<slug> by copying the finished implementations from the
   development folder (c-3e9a41b7d20f58c6/cinematic) and changing only what a public copy needs:
   asset paths, the robots decision (demonstrations are noindex,follow so made-up businesses are not indexed as real ones),
   a canonical address, and the link back to the portfolio. Interactions, motion and copy are not touched.
   Run from the repository root after any change to the development folder. The development folder itself is never deployed (.vercelignore)."""
import os, re, shutil
SRC = 'c-3e9a41b7d20f58c6/cinematic'; FONTS = 'c-3e9a41b7d20f58c6/fonts'; OUT = 'website-concepts'
SLUGS = ['olive-ivory', 'bright-circuit', 'salt-ember', 'sunny-hours', 'clear-ground', 'little-kettle', 'corner-shelf', 'oak-razor']
KEEP = {'portfolio.css', 'portfolio.js', 'index.html'}
for sub in ('img', 'video', 'data', 'fonts'):
    shutil.rmtree(os.path.join(OUT, sub), ignore_errors=True)
for f in os.listdir(SRC):
    p = os.path.join(SRC, f)
    if os.path.isfile(p) and f != 'index.html' and (f.endswith('.css') or f.endswith('.js')): shutil.copy(p, os.path.join(OUT, f))
shutil.copytree(os.path.join(SRC, 'img'), os.path.join(OUT, 'img'))
shutil.copytree(os.path.join(SRC, 'data'), os.path.join(OUT, 'data'))
os.makedirs(os.path.join(OUT, 'video'))
for f in os.listdir(os.path.join(SRC, 'video')):
    if f.endswith(('.webm', '.mp4')): shutil.copy(os.path.join(SRC, 'video', f), os.path.join(OUT, 'video', f))
os.makedirs(os.path.join(OUT, 'fonts'))
for f in os.listdir(FONTS): shutil.copy(os.path.join(FONTS, f), os.path.join(OUT, 'fonts', f))
css = open(os.path.join(OUT, 'cinematic.css'), encoding='utf-8').read().replace('../fonts/', 'fonts/'); open(os.path.join(OUT, 'cinematic.css'), 'w', encoding='utf-8').write(css)
for s in SLUGS:
    h = open(os.path.join(SRC, s + '.html'), encoding='utf-8').read()
    n = h.count('<meta name="robots" content="noindex,nofollow,noarchive">'); assert n == 1, s
    h = h.replace('<meta name="robots" content="noindex,nofollow,noarchive">', '<meta name="robots" content="noindex,follow">\n<link rel="canonical" href="https://www.rhyshume.co.uk/website-concepts/%s">' % s)
    h = h.replace('../fonts/', 'fonts/')
    h = h.replace('<a href="./">All proofs</a>', '<a href="/website-concepts/">All eight concepts</a>').replace('<a href="./">All proofs</a>', '<a href="/website-concepts/">All eight concepts</a>')
    h = re.sub(r'href="\./"', 'href="/website-concepts/"', h)
    h = re.sub(r'href="([a-z-]+)\.html"', lambda m: 'href="/website-concepts/%s"' % m.group(1) if m.group(1) in SLUGS else m.group(0), h)
    assert 'c-3e9a41b7d20f58c6' not in h, s
    open(os.path.join(OUT, s + '.html'), 'w', encoding='utf-8').write(h)
print('published', len(SLUGS), 'concepts to', OUT)
