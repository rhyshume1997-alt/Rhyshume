"""Make the dark, blurred backdrop for each Our Work scene from the project's own lead photograph.
Run from the prototype folder after adding or changing a project:  python3 tools/backdrops.py
Needs Pillow. Output: site/assets/img/bg/<photo>.jpg (about 4 KB each)."""
import json, os, re
from PIL import Image, ImageFilter, ImageEnhance

os.makedirs('site/assets/img/bg', exist_ok=True)
for p in json.load(open('content/projects.json')):
    im = Image.open('site/assets/img/' + p['hero']).convert('RGB')
    im.thumbnail((480, 480))
    im = im.filter(ImageFilter.GaussianBlur(14))
    im = ImageEnhance.Color(im).enhance(0.75)
    im = ImageEnhance.Brightness(im).enhance(0.42)
    im.thumbnail((240, 240))
    im.save('site/assets/img/bg/' + re.sub(r'\.\w+$', '.jpg', p['hero']), quality=60)
    print(p['hero'])
