# Evidence-based audit checklist

Run per page, at 1440x900 and 390x844. Record what you measured, not what you assumed. Mark each finding Confirmed, Not reproduced or Unverified.

## Capture
- [ ] Screenshots at successive viewport-height positions, both widths. Look at every one.
- [ ] Horizontal overflow, console errors, layout shift (before scrolling), payload, h1 count.
- [ ] Media: does video play (muted, looping)? What are the intrinsic and rendered sizes?
- [ ] Measure LCP before scripted scrolling and log the LCP element. Headless numbers are a signal only.

## Defects first (functional, responsive, accessibility)
- [ ] Layout collapses or overlaps (compare computed `display`, bounding boxes, specificity clashes).
- [ ] Text clipped or broken mid-word; headings overflowing their container.
- [ ] Pinned or sticky elements covering content (sum their heights against the viewport).
- [ ] Keyboard: tab order; visible focus on every control (ring contrast vs what it sits on, at least 3:1), including banners and call bars.
- [ ] Contrast computed from real colour values (account for opacity and the true background).
- [ ] Touch targets at least 44px; text below 12px that carries information.
- [ ] Reduced motion (fewer and gentler), no-JavaScript, blocked-video states.
- [ ] Hover effects gated behind `(hover: hover) and (pointer: fine)`; press feedback present.

## Design quality
- [ ] One-second test: is the main thing obvious at both widths?
- [ ] De-slop: list AI-default patterns, give a replacement based on what the business does, keep any that carry the concept's tone and write down why.
- [ ] Does any proposal move this project toward a sibling? If so, reject or rework it.

## For every proposed fix, write
File, actual cause, proposed change, before and after evidence, regression risk, and whether it touches a protected design.

## Reviewer claims
Treat every reviewer or tool claim as a hypothesis. Re-measure it. Record claims that did not reproduce, so they are not repeated.
