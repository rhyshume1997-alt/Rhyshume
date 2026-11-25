"use client";

import { useEffect, useRef, useState } from "react";

type Note = { id: string; t: number; name: string; path: string; look: string; text: string };
const KEY = "jo_notes";
const NAME_KEY = "jo_notes_name";

function read(): Note[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function write(n: Note[]) { try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {} }
const when = (t: number) => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const lookName = (l: string) => ({ original: "Original", classic: "Classic", backbar: "Back bar", cinematic: "Cinematic" } as Record<string, string>)[l] || "Original";

/**
 * A notes drawer down the side of every preview page, so the owner or a reviewer can write what they like.
 * Notes are saved in this browser (localStorage) and can be copied, downloaded or emailed. Previews only.
 */
export function CommentsPanel() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [all, setAll] = useState(false);
  const [path, setPath] = useState("/");
  const [look, setLook] = useState("original");
  const [msg, setMsg] = useState("");
  const btn = useRef<HTMLButtonElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNotes(read());
    try { setName(localStorage.getItem(NAME_KEY) || ""); } catch {}
    setPath(location.pathname);
    setLook(document.documentElement.dataset.look || "original");
  }, []);
  useEffect(() => { if (open) area.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  const save = () => {
    const t = text.trim();
    if (!t) return;
    try { localStorage.setItem(NAME_KEY, name); } catch {}
    const next = [{ id: String(Date.now()) + Math.random().toString(36).slice(2, 6), t: Date.now(), name: name.trim(), path, look, text: t }, ...read()];
    write(next); setNotes(next); setText(""); flash("Saved on this device");
  };
  const del = (id: string) => { const next = read().filter((n) => n.id !== id); write(next); setNotes(next); };
  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg(""), 2500); };
  const shown = all ? notes : notes.filter((n) => n.path === path);
  const asText = () => notes.slice().reverse().map((n) => `[${when(n.t)}] ${n.name || "No name"} · ${n.path} · ${lookName(n.look)} look\n${n.text}`).join("\n\n");
  const copy = async () => { try { await navigator.clipboard.writeText(asText()); flash("Copied. Paste it into a message"); } catch { flash("Could not copy; use Download"); } };
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([asText()], { type: "text/plain" }));
    a.download = "jack-obeers-preview-notes.txt"; a.click(); URL.revokeObjectURL(a.href);
  };
  const mail = () => { location.href = `mailto:?subject=${encodeURIComponent("Jack O'Beers preview notes")}&body=${encodeURIComponent(asText().slice(0, 1800))}`; };

  return (
    <>
      <button ref={btn} type="button" className="cm-tab" aria-expanded={open} aria-controls="cm-panel" onClick={() => setOpen((o) => !o)}>
        Notes{notes.length ? <b>{notes.length}</b> : null}
      </button>
      <aside id="cm-panel" className="cm-panel" aria-label="Preview notes" hidden={!open}>
        <div className="cm-head"><h2>Notes on this preview</h2><button type="button" className="cm-x" aria-label="Close notes" onClick={() => { setOpen(false); btn.current?.focus(); }}>&times;</button></div>
        <p className="cm-hint">Write anything: what you like, what to change. {`Page: ${path}, ${lookName(look)} look.`} Notes are saved on this device.</p>
        <label className="cm-l" htmlFor="cm-name">Your name</label>
        <input id="cm-name" className="cm-in" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        <label className="cm-l" htmlFor="cm-text">Your note</label>
        <textarea id="cm-text" ref={area} className="cm-in" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="cm-row"><button type="button" className="cm-save" onClick={save} disabled={!text.trim()}>Save note</button><span className="cm-msg" role="status">{msg}</span></div>
        <div className="cm-tabs" role="group" aria-label="Which notes to show">
          <button type="button" aria-pressed={!all} onClick={() => setAll(false)}>This page</button>
          <button type="button" aria-pressed={all} onClick={() => setAll(true)}>All ({notes.length})</button>
        </div>
        <ul className="cm-list">
          {shown.length === 0 && <li className="cm-empty">No notes yet.</li>}
          {shown.map((n) => (
            <li key={n.id}><p>{n.text}</p><small>{n.name || "No name"} · {when(n.t)}{all ? ` · ${n.path}` : ""} · {lookName(n.look)}</small><button type="button" className="cm-del" onClick={() => del(n.id)} aria-label={`Delete note from ${when(n.t)}`}>Delete</button></li>
          ))}
        </ul>
        <div className="cm-out"><button type="button" onClick={copy} disabled={!notes.length}>Copy all</button><button type="button" onClick={download} disabled={!notes.length}>Download</button><button type="button" onClick={mail} disabled={!notes.length}>Email</button></div>
      </aside>
    </>
  );
}
