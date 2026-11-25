"use client";

import { useEffect } from "react";
import { initRev5 } from "@/lib/rev5";
import type { Product } from "@/lib/catalogue";

/** Runs the lifted Rev 5 behaviour (header, basket, the opening, the shelf, panels) for the current page. */
export function Behaviour({ products, solid }: { products: Product[]; solid: boolean }) {
  useEffect(() => {
    document.body.dataset.solid = solid ? "1" : "0";
    const stop = initRev5(products);
    return () => {
      stop();
      delete document.body.dataset.solid;
    };
  }, [products, solid]);
  return null;
}
