"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { EVENT_CATEGORIES, REMINDERS, validatePersonalEvent, type EventCategory, type PersonalEvent } from "@/lib/calendar/personal-events";
import base from "@/components/student-shell/command.module.css";
import styles from "./personal-calendar.module.css";

export function EventEditor({ initial, onSave, onCancel, timeZone }: { timeZone: string; initial: PersonalEvent; onSave: (event: PersonalEvent) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const reader = useRef<FileReader | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => () => reader.current?.abort(), []);

  function update<K extends keyof PersonalEvent>(key: K, value: PersonalEvent[K]) {
    setDraft(current => ({ ...current, [key]: value })); setError(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = validatePersonalEvent(draft);
    if (message) { setError(message); requestAnimationFrame(() => errorRef.current?.focus()); return; }
    setSaving(true);
    try { await onSave({ ...draft, title: draft.title.trim(), location: draft.location.trim(), notes: draft.notes.trim() }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The event could not be saved. Try again."); requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { setSaving(false); }
  }
  function choosePhoto(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setError("Choose a JPG, PNG, or WebP photo under 3 MB."); return;
    }
    setReading(true); setError(null);
    const next = new FileReader(); reader.current?.abort(); reader.current = next;
    next.onload = () => { update("photo", String(next.result)); setReading(false); };
    next.onerror = () => { setReading(false); setError("This photo could not be opened. Try another image."); };
    next.readAsDataURL(file);
  }
  return <form className={styles.editor} onSubmit={submit} noValidate>
    <label className={styles.wide}>Event title<input autoFocus autoComplete="off" value={draft.title} maxLength={100} onChange={event => update("title", event.target.value)} placeholder="Practice, a performance, a plan..." /></label>
    <label>Category<select value={draft.category} onChange={event => update("category", event.target.value as EventCategory)}>{EVENT_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
    <label>Date<input type="date" value={draft.day} onChange={event => update("day", event.target.value)} /></label>
    <label className={`${styles.allDay} ${styles.wide}`}><input type="checkbox" checked={draft.allDay} onChange={event => update("allDay", event.target.checked)} /><span>All day</span></label>
    {!draft.allDay && <><label>Start time<input type="time" value={draft.time} onChange={event => update("time", event.target.value)} /></label><label>End time<input type="time" value={draft.endTime} onChange={event => update("endTime", event.target.value)} /></label></>}
    <label className={styles.wide}>Location <span>(optional)</span><input value={draft.location} maxLength={120} onChange={event => update("location", event.target.value)} placeholder="School gym, auditorium, home..." /></label>
    <label>Repeat<select value={draft.repeat} onChange={event => update("repeat", event.target.value as PersonalEvent["repeat"])}><option value="none">Does not repeat</option><option value="weekly">Every week</option></select></label>
    <label>Calendar reminder<select value={draft.reminder} onChange={event => update("reminder", event.target.value)}>{REMINDERS.map(reminder => <option key={reminder.value} value={reminder.value}>{reminder.label}</option>)}</select></label>
    {draft.repeat === "weekly" && <label className={styles.wide}>Repeat until<input type="date" min={draft.day} value={draft.repeatUntil} onChange={event => update("repeatUntil", event.target.value)} /></label>}
    <label className={styles.wide}>Notes <span>(optional)</span><textarea rows={2} value={draft.notes} maxLength={1000} onChange={event => update("notes", event.target.value)} /></label>
    <div className={`${styles.photoTools} ${styles.wide}`}>
      {draft.photo && <img src={draft.photo} alt="Selected event photo" />}
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Event photo" hidden onChange={event => { choosePhoto(event.target.files?.[0]); event.target.value = ""; }} />
      <button type="button" className={styles.photoButton} disabled={reading} onClick={() => fileInput.current?.click()}><ImagePlus aria-hidden="true" />{reading ? "Opening photo..." : draft.photo ? "Change photo" : "Add photo"}</button>
      {draft.photo && <button type="button" className={styles.removePhoto} title="Remove photo" aria-label="Remove photo" onClick={() => update("photo", "")}><X aria-hidden="true" /></button>}
    </div>
    {error && <p ref={errorRef} tabIndex={-1} className={`${styles.formError} ${styles.wide}`} role="alert">{error}</p>}
    <p className={`${styles.formNotice} ${styles.wide}`}>{timeZone}. Reminders are included when you add this event to your device calendar.</p>
    {initial.repeat === "weekly" && <p className={`${styles.formNotice} ${styles.wide}`}>Changes apply to the entire repeating series.</p>}
    <div className={`${styles.formActions} ${styles.wide}`}><button type="button" className={base.secondary} disabled={saving} onClick={onCancel}>Cancel</button><button type="submit" disabled={reading || saving} className={base.launch}>{saving ? "Saving..." : initial.id ? "Save changes" : "Add event"}</button></div>
  </form>;
}

