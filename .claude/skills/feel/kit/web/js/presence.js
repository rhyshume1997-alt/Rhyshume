// FEEL · presence.ts
// Exit animations for things that are removed from the page (a sheet, a toast, a menu):
// keep the element until its own CSS exit animation has finished, then let it go.
// The CSS decides how it leaves (feel.css, [data-feel-state="closed"]); this only waits.
// No dependencies. For React, see react.ts (usePresence).
function settled(el, cap = 1e3) {
  if (!el || typeof el.getAnimations !== "function") return Promise.resolve();
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      const running = el.getAnimations({ subtree: true }).filter((a) => a.playState === "running" || a.pending);
      if (!running.length) return resolve();
      const t = setTimeout(resolve, cap);
      Promise.allSettled(running.map((a) => a.finished)).then(() => {
        clearTimeout(t);
        resolve();
      });
    });
  });
}
export {
  settled
};
