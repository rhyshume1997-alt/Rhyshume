"use client";

import { useActionState } from "react";
import { createEvent, login, type FormState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined);
  return (
    <form action={action} className="own-form" autoComplete="on">
      <label htmlFor="o-name">Name</label>
      <input id="o-name" name="name" type="text" autoComplete="username" required />
      <label htmlFor="o-pass">Password</label>
      <input id="o-pass" name="password" type="password" autoComplete="current-password" required />
      <button className="btn" type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      <p role="alert" className="own-err">{state?.error}</p>
    </form>
  );
}

export function EventForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createEvent, undefined);
  return (
    <form action={action} className="own-form" key={state?.ok ? state.message : "f"}>
      <label htmlFor="e-title">Event name</label>
      <input id="e-title" name="title" type="text" maxLength={100} required />
      <div className="own-row">
        <div>
          <label htmlFor="e-date">Date</label>
          <input id="e-date" name="date" type="date" required />
        </div>
        <div>
          <label htmlFor="e-time">Time (optional)</label>
          <input id="e-time" name="time" type="time" />
        </div>
        <div>
          <label htmlFor="e-price">Ticket price, in pounds</label>
          <input id="e-price" name="price" type="number" inputMode="decimal" min="0" max="500" step="0.01" defaultValue="0" required />
        </div>
      </div>
      <label htmlFor="e-desc">What is it? (optional)</label>
      <textarea id="e-desc" name="description" rows={4} maxLength={1000} />
      <button className="btn" type="submit" disabled={pending}>{pending ? "Adding…" : "Add the event"}</button>
      <p role="status" className={state?.error ? "own-err" : "own-ok"}>{state?.error || state?.message}</p>
    </form>
  );
}
