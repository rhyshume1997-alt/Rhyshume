"""Build the offline meeting pack: the workbook plus the eight working concept demos in one folder, so the demos open
   straight from the folder with no internet and no web server.
   Usage: python3 tools/workbook-meeting/build-pack.py <repo root> <output folder>
   The only change made to the concept files is in the copy: fonts are inlined into cinematic.css (browsers refuse to load
   fonts from a folder opened as a file) and the font preload tags are removed. The repository files are not touched."""
import base64, os, re, shutil, sys
root, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
shutil.rmtree(out, ignore_errors=True)
cin = 'c-3e9a41b7d20f58c6/cinematic'
shutil.copytree(os.path.join(root, cin), os.path.join(out, cin))
os.makedirs(os.path.join(out, 'w-82503121e7fdf54e'))
shutil.copy(os.path.join(root, 'w-82503121e7fdf54e/index.html'), os.path.join(out, 'w-82503121e7fdf54e/index.html'))
fonts = os.path.join(root, 'c-3e9a41b7d20f58c6/fonts')
css_path = os.path.join(out, cin, 'cinematic.css'); css = open(css_path, encoding='utf-8').read()
def inline(m):
    f = os.path.join(fonts, m.group(1))
    return 'url("data:font/woff2;base64,' + base64.b64encode(open(f, 'rb').read()).decode() + '")'
css = re.sub(r'url\("\.\./fonts/([^"]+\.woff2)"\)', inline, css); open(css_path, 'w', encoding='utf-8').write(css)
for f in os.listdir(os.path.join(out, cin)):
    if f.endswith('.html'):
        p = os.path.join(out, cin, f); h = open(p, encoding='utf-8').read()
        h = re.sub(r'<link[^>]*rel="preload"[^>]*fonts/[^>]*>\n?', '', h); open(p, 'w', encoding='utf-8').write(h)
guide = os.path.join(root, 'docs/workbook/meeting-guide.html')
if os.path.exists(guide): shutil.copy(guide, os.path.join(out, 'HOW TO RUN THE MEETING.html'))
open(os.path.join(out, 'START HERE.txt'), 'w').write('''RDH CLIENT MEETING PACK (fictional concepts and a practice-ready workbook)

1. Open  w-82503121e7fdf54e/index.html  in Chrome, Edge or Safari. Do not move it away from the other folder.
   It works with no internet. Open it the same way every time, because the browser keeps your work per way of opening.
2. Click START CLIENT MEETING (top left, big dark button).
3. Open HOW TO RUN THE MEETING.html for a one page guide.

The eight design demos are in c-3e9a41b7d20f58c6/cinematic . The workbook links to them. They are made-up businesses by Rhys Hume,
not real sites. Keep this pack private. Do not put real client records in it.

Always use "Save backup" during and after a meeting. Browser storage can be cleared by the browser.
''')
tot = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(out) for f in fs)
print('pack', round(tot / 1e6, 1), 'MB')
