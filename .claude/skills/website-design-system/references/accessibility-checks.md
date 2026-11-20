# Accessibility, motion and responsive checks

Thresholds, and how each is measured. Run at 1440px and 390px (mobile emulation with touch). Measure; do not estimate from screenshots.

## Thresholds

| Check | Threshold |
| --- | --- |
| Body text contrast | at least 4.5:1 (large text at least 3:1) |
| Keyboard focus indicator | at least 3:1 against what it sits on |
| Touch targets | at least 44px |
| Informative text | not below 12px |
| Horizontal overflow | none at any width tested |
| Hover effects | only inside `(hover: hover) and (pointer: fine)`; nothing depends on hover |
| Press feedback | present on pressable controls (scale about 0.97) |
| Reduced motion | fewer and gentler, not none: keep short fades, remove travel and loops |
| Looping or auto-moving media over 5 seconds | a way to pause it (WCAG 2.2.2), unless essential |
| Heavy media | must not delay the first view |

## Measurements (Playwright `page.evaluate`)

Helpers (blend opacity before computing contrast):

```js
const lum=(r,g,b)=>{const f=c=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
const rgba=s=>{const m=s.match(/rgba?\(([^)]+)\)/);const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return{r:p[0],g:p[1],b:p[2],a:p[3]??1}};
const cr=(a,b)=>{const x=lum(a.r,a.g,a.b),y=lum(b.r,b.g,b.b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
const bg=el=>{for(let e=el;e;e=e.parentElement){const c=rgba(getComputedStyle(e).backgroundColor);if(c.a>.5)return c}return{r:255,g:255,b:255,a:1}};
```

**Focus ring against its band.** Press Tab once so `:focus-visible` applies, then `el.focus({focusVisible:true})`, read `getComputedStyle(el).outlineColor` and compare with `bg(bandElement)`. Do this for every link and button in banners, call bars and dark sections, not only in the main content. A ring in the same colour as the band is invisible.

**Text contrast with opacity.** Multiply opacity up the ancestor chain, blend the foreground over the real background, then compare. Scroll the element into view first: elements revealed on scroll can sit at opacity 0 and give a false reading.

**Mid-word breaks.** For each heading or label, split into words and compare `ctx.measureText(word)` with `el.clientWidth`. A word wider than its box means a mid-word break (check `overflow-wrap`). Sweep widths (for example 360, 390, 600, 768, 900, 1024, 1180, 1280, 1366, 1440, 1600, 1800, 1920, 2200): a fix that works at one width can fail at another.

**Pinned chrome.** Sum the heights of elements whose computed `position` is `sticky` or `fixed`, visible in the viewport, at a mid-page scroll position on a phone. Report it against the viewport height.

**Overlap.** Compare `getBoundingClientRect()` intersections between a moving or sticky element and text blocks while sweeping scroll position.

**Layout that collapses.** Compare computed `display` and `gridTemplateColumns` with the stylesheet's intent. Specificity clashes (for example `.js .js-only` against a single-class rule) are a common cause.

**First-view check.** Measure how much of the main headline or call to action lies inside the viewport at common sizes (1280x720, 1366x768, 1440x900, 1536x864, 1920x1080, plus a tall one that must not change).

## Keyboard and motion

- Tab through the page: order is logical, every control is reachable, focus is visible everywhere, including skip links, banners and bars.
- Run the signature interaction by keyboard only, and with touch emulation.
- Reduced motion: emulate `prefers-reduced-motion: reduce`; essential content must not depend on an animation finishing.
- No-JavaScript and blocked-video states are designed, not accidental.

## Performance

Measure LCP before any scripted scrolling and log the LCP element; the last LCP entry after scrolling can be an element that painted later and gives a false figure. Headless software-rendered numbers are a signal only; confirm on a real or throttled profile before acting.

## Regression

Full-page screenshots (static, reduced motion) of baseline and branch at both widths. Pages a change should not touch must be pixel-identical.
