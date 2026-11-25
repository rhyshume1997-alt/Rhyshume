// FEEL · presence.ts
// Exit animations for things that are removed from the page (a sheet, a toast, a menu):
// keep the element until its own CSS exit animation has finished, then let it go.
// The CSS decides how it leaves (feel.css, [data-feel-state="closed"]); this only waits.
// No dependencies. For React, see react.ts (usePresence).

/** Resolves when every animation and transition running on `el` (and inside it) has finished. Never waits longer than `cap` ms. */
export function settled(el: Element | null, cap = 1000): Promise<void> {
  if (!el || typeof (el as HTMLElement).getAnimations !== "function") return Promise.resolve();
  return new Promise((resolve) => {
    // One frame so the browser has started the animations the new state asked for.
    requestAnimationFrame(() => {
      const running = (el as HTMLElement).getAnimations({ subtree: true }).filter((a) => a.playState === "running" || a.pending);
      if (!running.length) return resolve();
      const t = setTimeout(resolve, cap);
      Promise.allSettled(running.map((a) => a.finished)).then(() => { clearTimeout(t); resolve(); });
    });
  });
}
