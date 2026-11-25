// FEEL · react.ts
// The kit for React (web): usePresence keeps a closing sheet or toast on the page until its
// exit animation ends; useDrag makes it follow the finger. Needs only React itself.
//
//   const ref = useRef<HTMLDivElement>(null);
//   const { mounted, state } = usePresence(open, ref);
//   useDrag(ref, { axis: "y", dismiss: 1, onDismiss: () => setOpen(false) }, mounted);
//   return mounted ? <div ref={ref} data-feel="sheet" data-feel-state={state}>…</div> : null;
"use client";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { drag, type DragOptions } from "./drag";
import { settled } from "./presence";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Keeps the element mounted while it plays its exit. `state` goes on data-feel-state. */
export function usePresence(open: boolean, ref: RefObject<Element | null>): { mounted: boolean; state: "open" | "closed" } {
  const [mounted, setMounted] = useState(open);
  const turn = useRef(0);
  useIso(() => {
    const mine = ++turn.current;
    if (open) { setMounted(true); return; }
    if (!mounted) return;
    settled(ref.current).then(() => { if (turn.current === mine) setMounted(false); });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return { mounted: open || mounted, state: open ? "open" : "closed" };
}

type UseDragOptions = Omit<DragOptions, "handle" | "fade"> & {
  handle?: RefObject<HTMLElement | null>;
  fade?: RefObject<HTMLElement | null>;
};

/** Binds drag() to a ref while `active` is true. Callbacks may change every render. */
export function useDrag(ref: RefObject<HTMLElement | null>, options: UseDragOptions, active = true): void {
  const latest = useRef(options);
  latest.current = options;
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const o = latest.current;
    return drag(el, {
      ...o,
      handle: o.handle?.current ?? undefined,
      fade: o.fade?.current ?? undefined,
      onMove: (a, b) => latest.current.onMove?.(a, b),
      onDismiss: () => latest.current.onDismiss?.(),
      onSettle: (a) => latest.current.onSettle?.(a),
    });
  }, [active, ref, options.axis, options.dismiss]); // eslint-disable-line react-hooks/exhaustive-deps
}
