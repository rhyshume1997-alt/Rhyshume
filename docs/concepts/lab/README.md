# Fire footage pipeline test

Evidence only, not used on any page. Renders a procedural fire as real video frames.

```
node render.js   # needs playwright; writes frames/f000.jpg to f119.jpg
ffmpeg -framerate 30 -i frames/f%03d.jpg -c:v libx264 -crf 21 -pix_fmt yuv420p fire-loop.mp4
```

Result: 120 frames in about 16 s, a 458 KB seamless loop. The picture is not good enough for a hero, which is the point: use footage, an image-to-video result or an FX-tool render.
