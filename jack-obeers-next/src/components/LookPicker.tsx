"use client";

import { useEffect, useState } from "react";

const LOOKS = [
  { id: "original", label: "Original" },
  { id: "backbar", label: "Back bar" },
  { id: "cinematic", label: "Cinematic" },
] as const;

/** A small switch so the owner can compare the three looks. Shown on previews only, never on the live site. */
export function LookPicker() {
  const [look, setLook] = useState<string>("original");
  useEffect(() => {
    setLook(document.documentElement.dataset.look || "original");
    // Scenes and the back bar hero slide their words in when they come into view.
    const els = document.querySelectorAll<HTMLElement>(".look-bb, .cin-scene");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.4 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  const pick = (id: string) => {
    try { sessionStorage.setItem("jo_look", id); } catch {}
    const u = new URL(location.href);
    u.searchParams.set("look", id);
    u.hash = "";
    location.href = u.toString();
  };
  return (
    <aside className="look-picker" aria-label="Preview look">
      <span>Look</span>
      {LOOKS.map((l) => (
        <button key={l.id} type="button" aria-pressed={look === l.id} onClick={() => pick(l.id)}>{l.label}</button>
      ))}
    </aside>
  );
}
