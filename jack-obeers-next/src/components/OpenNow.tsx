"use client";

import { useEffect, useState } from "react";
import { openStatus, type Status } from "@/lib/open-now";

/**
 * A small pill that says whether the shop is open, in UK time. Before the page runs it shows the plain hours, so the
 * pill is the same size and nothing moves when the live text arrives.
 */
export function OpenNow({ variant = "header" }: { variant?: "header" | "hero" }) {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    const tick = () => setS(openStatus());
    tick();
    const id = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []);
  return (
    <p className={`open-pill open-${variant}${s ? (s.open ? " is-open" : " is-closed") : ""}`} data-open-now={s ? (s.open ? "open" : "closed") : "unknown"}>
      <i aria-hidden="true" />
      <span>{s ? s.text : "Wednesday to Monday, 11am to 7pm"}</span>
    </p>
  );
}
