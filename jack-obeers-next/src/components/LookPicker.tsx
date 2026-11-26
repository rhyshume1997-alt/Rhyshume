"use client";

import { useEffect, useState } from "react";

const LOOKS = [
  { id: "behind", label: "Behind the Counter" },
  { id: "original", label: "Original" },
  { id: "classic", label: "Classic" },
  { id: "backbar", label: "Back bar" },
  { id: "cinematic", label: "Cinematic" },
] as const;

/** Preview only: the back bar and cinematic scenes slide their words in, the polaroid settles and the beer mats slide out, once, when they come into view. */
export function LookEffects() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".look-bb, .cin-scene, .polaroid, .deli-lead");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.4 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return null;
}

/** The look switch, shown inside the preview drawer. It reloads the page on the chosen look and remembers it for the tab. */
export function LookSwitch() {
  const [look, setLook] = useState<string>("behind");
  useEffect(() => { setLook(document.documentElement.dataset.look || "behind"); }, []);
  const pick = (id: string) => {
    try { sessionStorage.setItem("jo_look", id); } catch {}
    const u = new URL(location.href);
    u.searchParams.set("look", id);
    u.hash = "";
    location.href = u.toString();
  };
  return (
    <div className="cm-looks" role="group" aria-label="Choose a look">
      {LOOKS.map((l) => (
        <button key={l.id} type="button" aria-pressed={look === l.id} onClick={() => pick(l.id)}>{l.label}</button>
      ))}
    </div>
  );
}
