// FEEL · nav.ts
// Page changes with a direction, for apps that change pages themselves (a client router,
// tabs, steps): the browser's View Transitions, told which way the person is going.
// feel.css draws it: forward slides in from the trailing side, back from the leading side,
// "fade" crossfades (tabs, same place with new content). Where the browser has no
// View Transitions, the page simply changes.
//
//   go(() => router.push("/settings"), "forward");
//   go(() => setTab("billing"), "fade");
//
// Next.js App Router (16.2+) does not need this: use <Link transitionTypes={["feel-forward"]}>
// with React's <ViewTransition> (references/web.md, "Page change").
let turn = 0;
function go(update, way = "forward") {
  const doc = document;
  if (typeof doc.startViewTransition !== "function") {
    return Promise.resolve(update()).then(() => {
    });
  }
  const root = document.documentElement;
  const mine = ++turn;
  root.setAttribute("data-feel-nav", way);
  const vt = doc.startViewTransition(update);
  return vt.finished.catch(() => {
  }).finally(() => {
    if (turn === mine) root.removeAttribute("data-feel-nav");
  });
}
export {
  go
};
