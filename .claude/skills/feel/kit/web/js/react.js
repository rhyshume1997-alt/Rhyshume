"use client";
// FEEL · react.ts
// The kit for React (web): usePresence keeps a closing sheet or toast on the page until its
// exit animation ends; useDrag makes it follow the finger. Needs only React itself.
//
//   const ref = useRef<HTMLDivElement>(null);
//   const { mounted, state } = usePresence(open, ref);
//   useDrag(ref, { axis: "y", dismiss: 1, onDismiss: () => setOpen(false) }, mounted);
//   return mounted ? <div ref={ref} data-feel="sheet" data-feel-state={state}>…</div> : null;
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { drag } from "./drag.js";
import { settled } from "./presence.js";
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
function usePresence(open, ref) {
  const [mounted, setMounted] = useState(open);
  const turn = useRef(0);
  useIso(() => {
    const mine = ++turn.current;
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    settled(ref.current).then(() => {
      if (turn.current === mine) setMounted(false);
    });
  }, [open]);
  return { mounted: open || mounted, state: open ? "open" : "closed" };
}
function useDrag(ref, options, active = true) {
  const latest = useRef(options);
  latest.current = options;
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const o = latest.current;
    return drag(el, {
      ...o,
      handle: o.handle?.current ?? void 0,
      fade: o.fade?.current ?? void 0,
      onMove: (a, b) => latest.current.onMove?.(a, b),
      onDismiss: () => latest.current.onDismiss?.(),
      onSettle: (a) => latest.current.onSettle?.(a)
    });
  }, [active, ref, options.axis, options.dismiss]);
}
export {
  useDrag,
  usePresence
};
