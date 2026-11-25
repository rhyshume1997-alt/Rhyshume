"use client";

import { useEffect } from "react";

/**
 * A safety net so the basket icon opens the drawer on every page, including a page that has no basket code of its own
 * (for example an error page). When the normal basket code is running it does nothing.
 */
export function CartFallback() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement | null)?.closest?.("[data-open-cart]");
      if (!t || document.documentElement.dataset.rev5 === "1") return;
      e.preventDefault();
      (document.getElementById("cart") as HTMLDialogElement | null)?.showModal();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
