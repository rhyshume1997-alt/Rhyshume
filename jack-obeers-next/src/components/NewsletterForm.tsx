"use client";

import { useState } from "react";
import { SpamGuard } from "@/components/SpamGuard";

/** The footer newsletter form. It posts to /api/newsletter, which checks everything before anything happens. */
export function NewsletterForm({ siteKey }: { siteKey: string | null }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0);
  const input = { minHeight: "3rem", padding: ".5rem 1rem", borderRadius: "99px", border: "2px solid var(--brass)", background: "#fffdf6", color: "var(--ink)" } as const;
  return (
    <form
      id="nl"
      noValidate
      style={{ display: "grid", gap: ".7rem" }}
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const email = form.elements.namedItem("email") as HTMLInputElement;
        const consent = form.elements.namedItem("consent") as HTMLInputElement;
        if (!email.value || !email.checkValidity()) return setMsg("Please enter a valid email address.");
        if (!consent.checked) return setMsg("Please tick the box so we know you are happy to hear from us.");
        setBusy(true);
        try {
          const res = await fetch("/api/newsletter", { method: "POST", body: new FormData(form) });
          const json = (await res.json()) as { ok?: boolean; message?: string };
          setMsg(json.message || (res.ok ? "Thank you." : "That did not work. Please try again."));
          if (json.ok) form.reset();
        } catch {
          setMsg("That did not work. Please try again.");
        } finally {
          setBusy(false);
          setRound((n) => n + 1);
        }
      }}
    >
      <label htmlFor="nl-e" style={{ fontWeight: 700 }}>Email</label>
      <input id="nl-e" name="email" type="email" autoComplete="email" maxLength={254} style={input} />
      <label style={{ display: "flex", gap: ".6rem" }}>
        <input type="checkbox" name="consent" style={{ width: "1.3rem", height: "1.3rem", flex: "none", marginTop: ".2rem" }} />
        <span>Yes, send me news and offers. I can unsubscribe at any time.</span>
      </label>
      <SpamGuard siteKey={siteKey} resetKey={round} />
      <button className="btn sm" type="submit" disabled={busy}>Join the list</button>
      <p id="nl-s" role="status">{msg}</p>
    </form>
  );
}
