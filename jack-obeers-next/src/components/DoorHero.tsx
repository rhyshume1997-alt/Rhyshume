"use client";

import { useEffect, useRef } from "react";
import { BRAND } from "@/lib/brand";

/**
 * The opening. The shop front fills the screen. As you scroll, the view pushes in on the real door,
 * the door swings open and the inside of the shop fills the screen. Then the page carries on.
 * Reduced motion: a still picture with the door ajar and a "Come in" button.
 */
export function DoorHero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const facade = el.querySelector<HTMLElement>(".door-facade");
    if (!facade) return;
    const d = BRAND.door;
    el.style.setProperty("--open", reduced ? "0.32" : "0");
    if (reduced) {
      el.classList.add("rm");
      return;
    }
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let raf = 0, cur = 0, tgt = 0;
    const progress = () => {
      const r = el.getBoundingClientRect();
      const max = el.offsetHeight - innerHeight;
      return Math.min(1, Math.max(0, -r.top / max));
    };
    const paint = () => {
      raf = 0;
      cur += (tgt - cur) * 0.16;
      if (Math.abs(tgt - cur) < 0.001) cur = tgt; else raf = requestAnimationFrame(paint);
      const fw = facade.offsetWidth, fh = facade.offsetHeight;
      const fill = Math.max(innerWidth / (d.width * fw), innerHeight / (d.height * fh)) * 1.04;
      const push = ease(Math.min(1, cur / 0.82));
      const s = 1 + (fill - 1) * push;
      const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
      const tx = -((cx - 0.5) * fw) * push, ty = -((cy - 0.5) * fh) * push;
      el.style.setProperty("--tx", tx + "px");
      el.style.setProperty("--ty", ty + "px");
      el.style.setProperty("--s", String(s));
      el.style.setProperty("--open", String(ease(Math.min(1, Math.max(0, (cur - 0.28) / 0.42)))));
      const cp = Math.max(0, 1 - cur * 6);
      el.style.setProperty("--copy", String(cp));
      el.classList.toggle("copy-gone", cp < 0.05);
      el.style.setProperty("--in", String(Math.min(1, Math.max(0, (cur - 0.8) / 0.18))));
    };
    const onScroll = () => { tgt = progress(); if (!raf) raf = requestAnimationFrame(paint); };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    onScroll();
    const go = el.querySelector<HTMLElement>("[data-come-in]");
    const onGo = (e: Event) => {
      e.preventDefault();
      const t = document.getElementById("shelf");
      if (t) scrollTo({ top: t.getBoundingClientRect().top + scrollY - 4, behavior: "smooth" });
    };
    go?.addEventListener("click", onGo);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); go?.removeEventListener("click", onGo); cancelAnimationFrame(raf); };
  }, []);

  const d = BRAND.door;
  const doorStyle = { left: `${d.left * 100}%`, top: `${d.top * 100}%`, width: `${d.width * 100}%`, height: `${d.height * 100}%` };
  const cx = (d.left + d.width / 2) * 100, cy = (d.top + d.height / 2) * 100;

  return (
    <section ref={root} className="door-stage" aria-label="Opening">
      <div className="door-sticky">
        <div className="door-facade" style={{ transformOrigin: `${cx}% ${cy}%` }}>
          {BRAND.facade ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="door-photo" src={BRAND.facade} alt="The front of Jack O’Beers & Deli on Station Road, Milngavie" />
          ) : (
            <svg className="door-art" viewBox="0 0 1600 1000" role="img" aria-label="Temporary drawing of the shop front">
              <defs>
                <pattern id="brick" width="80" height="40" patternUnits="userSpaceOnUse"><rect width="80" height="40" fill="#6b2f1f" /><path d="M0 0H80M0 20H80M20 0V20M60 20V40" stroke="#4a1f14" strokeWidth="3" fill="none" /></pattern>
                <pattern id="awn" width="80" height="60" patternUnits="userSpaceOnUse"><rect width="40" height="60" fill="#c7402d" /><rect x="40" width="40" height="60" fill="#f2e6c8" /></pattern>
              </defs>
              <rect width="1600" height="1000" fill="url(#brick)" />
              <rect x="0" y="920" width="1600" height="80" fill="#3b2a22" />
              <rect x="560" y="40" width="480" height="236" rx="34" fill="#f6efe0" stroke="#d9a441" strokeWidth="8" />
              <image href={BRAND.logo} x="640" y="48" width="320" height="220" preserveAspectRatio="xMidYMid meet" />
              <rect x="110" y="290" width="1380" height="62" fill="url(#awn)" />
              <rect x="150" y="400" width="480" height="500" rx="24" fill="#f3d9a0" stroke="#2a1a10" strokeWidth="10" />
              <rect x="970" y="400" width="480" height="500" rx="24" fill="#f3d9a0" stroke="#2a1a10" strokeWidth="10" />
              {[0, 1, 2].map((i) => (<rect key={"l" + i} x="180" y={560 + i * 110} width="420" height="10" fill="#8a4b12" />))}
              {[0, 1, 2].map((i) => (<rect key={"r" + i} x="1000" y={560 + i * 110} width="420" height="10" fill="#8a4b12" />))}
              <rect x="672" y="342" width="256" height="590" rx="14" fill="#2a1a10" />
            </svg>
          )}
          <div className="doorway" style={doorStyle}>
            <div className="doorway-in" style={BRAND.interior ? { backgroundImage: `url(${BRAND.interior})` } : undefined}>
              {!BRAND.interior && <div className="in-art" aria-hidden="true" />}
            </div>
            <div className="door-leaf" aria-hidden="true"><i className="knob" /></div>
          </div>
        </div>
        <div className="door-copy">
          <p className="mono">Craft beer &middot; cider &middot; wine &middot; deli &middot; gifts</p>
          <h1 className="big">Fresh from keg to bottle, <span className="acc">no foam, no fuss.</span></h1>
          <p className="lede">An independent British drinks shop and deli at 13 Station Road, Milngavie. Scroll to push the door open.</p>
          <p><a className="btn" href="#shelf" data-come-in="">Come in</a> <a className="btn ghost" href="/drinks?c=beers">Shop beers</a></p>
          <p className="hours-pill"><i></i>Open Wednesday to Monday, 11am to 7pm</p>
        </div>
        <div className="door-inside" aria-hidden="true"><b>Come in</b><span>Pick a shelf below</span></div>
        {!BRAND.facade && <p className="img-tag">Temporary drawing. The shop&rsquo;s own photo goes here.</p>}
        <p className="scrollcue" aria-hidden="true">Scroll</p>
      </div>
    </section>
  );
}
