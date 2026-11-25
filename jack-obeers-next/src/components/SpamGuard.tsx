"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, o: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.turnstile) return resolve();
    let s = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (!s) {
      s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.defer = true;
      s.dataset.turnstile = "1";
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => resolve());
  });
}

/**
 * The hidden anti-spam parts every public form carries (see src/lib/antispam.ts and SPAM.md):
 *  - a honeypot field people never see and autofill does not know,
 *  - the moment the form appeared, so the server can tell a typed form from a script,
 *  - the Cloudflare Turnstile check, which shows nothing unless Cloudflare wants more proof.
 * Pass a new `resetKey` after each submit so the form gets a fresh check.
 * With no site key the form shows a plain note, and the server rejects the submit anyway.
 */
export function SpamGuard({ siteKey, resetKey }: { siteKey: string | null; resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [t, setT] = useState("");
  const [token, setToken] = useState("");
  useEffect(() => setT(String(Date.now())), []);
  useEffect(() => {
    if (!siteKey || !box.current) return;
    let gone = false;
    loadScript().then(() => {
      if (gone || !window.turnstile || !box.current || widget.current) return;
      widget.current = window.turnstile.render(box.current, {
        sitekey: siteKey,
        appearance: "interaction-only",
        callback: (x: string) => setToken(x),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
    });
    return () => {
      gone = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setToken("");
    if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
  }, [resetKey]);
  return (
    <>
      <div className="vh" aria-hidden="true">
        <label>
          Leave this empty
          <input type="text" name="contact_pref_zq" tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore="true" />
        </label>
      </div>
      <input type="hidden" name="_t" value={t} />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      {siteKey ? <div ref={box} className="ts-box" /> : <p className="note-s" role="status">This form is closed for now.</p>}
    </>
  );
}
