"use client";

import { useState, useTransition } from "react";
import { BarChart3, ClipboardCheck, FileText, ShieldCheck, Users } from "lucide-react";
import type { AssignmentKind } from "@/lib/supabase/types";
import type { ClassAnalytics } from "@/lib/portal/teacher";
import {
  confirmAccommodations,
  createPortalAssignment,
  saveAssignmentAiPolicy,
  saveProgressNote,
  saveRosterMember,
} from "./actions";

type ClassRow = { id: string; name: string; ai_mode: string };
type AssignmentRow = {
  id: string;
  title: string;
  class_id: string;
  status: string;
  ai_mode_override: string | null;
};
type RosterRow = { id: string; class_id: string; display_name: string; role: string; status: string; email: string | null };
type NoteRow = { id: string; author_name: string; note_text: string; visible_to_parent: boolean; created_at: string };
type ProfileSnapshot = {
  extra_time_pct: number;
  tts_enabled: boolean;
  dyslexia_font: boolean;
  accommodations: string[];
};

const KINDS: AssignmentKind[] = ["essay", "lab", "problem_set", "presentation", "test_prep", "reading", "other"];

export function TeacherPortalClient({
  classes,
  assignments,
  roster,
  notes,
  analytics,
  profile,
}: {
  classes: ClassRow[];
  assignments: AssignmentRow[];
  roster: RosterRow[];
  notes: NoteRow[];
  analytics: ClassAnalytics[];
  profile: ProfileSnapshot;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [assignmentClass, setAssignmentClass] = useState(classes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AssignmentKind>("other");
  const [dueAt, setDueAt] = useState("");
  const [description, setDescription] = useState("");
  const [rubricText, setRubricText] = useState("");
  const [aiModeOverride, setAiModeOverride] = useState("");
  const [rosterName, setRosterName] = useState("");
  const [rosterEmail, setRosterEmail] = useState("");
  const [rosterRole, setRosterRole] = useState("teacher");
  const [noteText, setNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");
  const [noteClass, setNoteClass] = useState(classes[0]?.id ?? "");
  const [noteAssignment, setNoteAssignment] = useState("");
  const [noteVisible, setNoteVisible] = useState(true);
  const [confirmBy, setConfirmBy] = useState("");
  const [confirmClass, setConfirmClass] = useState(classes[0]?.id ?? "");
  const [confirmNotes, setConfirmNotes] = useState("");
  const [policyAssignment, setPolicyAssignment] = useState(assignments[0]?.id ?? "");
  const [policyMode, setPolicyMode] = useState("");

  function createAssignment() {
    setStatus(null);
    startTransition(async () => {
      const result = await createPortalAssignment({
        classId: assignmentClass,
        title,
        kind,
        dueAt: dueAt || null,
        description: description.trim() || null,
        rubricText: rubricText.trim() || null,
        aiModeOverride: aiModeOverride ? aiModeOverride as "green" | "yellow" | "red" : null,
      });
      if (result.ok) {
        setStatus("Assignment created.");
        setTitle("");
        setDescription("");
        setRubricText("");
      } else {
        setStatus(result.error);
      }
    });
  }

  function addRoster() {
    setStatus(null);
    startTransition(async () => {
      const result = await saveRosterMember({
        classId: assignmentClass,
        displayName: rosterName,
        email: rosterEmail.trim() || null,
        role: rosterRole as "teacher" | "student" | "aide" | "guardian",
      });
      if (result.ok) {
        setStatus("Roster entry saved.");
        setRosterName("");
        setRosterEmail("");
      } else {
        setStatus(result.error);
      }
    });
  }

  function addProgressNote() {
    setStatus(null);
    startTransition(async () => {
      const result = await saveProgressNote({
        classId: noteClass || null,
        assignmentId: noteAssignment || null,
        authorName: noteAuthor,
        noteText,
        visibleToParent: noteVisible,
      });
      if (result.ok) {
        setStatus("Progress note saved.");
        setNoteText("");
      } else {
        setStatus(result.error);
      }
    });
  }

  function confirmCurrentAccommodations() {
    setStatus(null);
    startTransition(async () => {
      const result = await confirmAccommodations({
        classId: confirmClass || null,
        confirmedBy: confirmBy,
        notes: confirmNotes.trim() || null,
      });
      if (result.ok) {
        setStatus("Accommodation confirmation saved.");
        setConfirmNotes("");
      } else {
        setStatus(result.error);
      }
    });
  }

  function updatePolicy() {
    setStatus(null);
    startTransition(async () => {
      const result = await saveAssignmentAiPolicy({
        assignmentId: policyAssignment,
        aiModeOverride: policyMode ? policyMode as "green" | "yellow" | "red" : null,
      });
      setStatus(result.ok ? "Assignment AI policy saved." : result.error);
    });
  }

  if (classes.length === 0) {
    return <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted">Create a class first, then return here.</p>;
  }

  return (
    <div className="space-y-6">
      {status && <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted">{status}</p>}

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold"><FileText size={16} /> Create assignment</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Class">
            <select value={assignmentClass} onChange={(event) => setAssignmentClass(event.target.value)} className="input">
              {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select value={kind} onChange={(event) => setKind(event.target.value as AssignmentKind)} className="input">
              {KINDS.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
            </select>
          </Field>
          <Field label="Title">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="input" />
          </Field>
          <Field label="Due">
            <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="input" />
          </Field>
        </div>
        <Field label="Assignment AI policy">
          <select value={aiModeOverride} onChange={(event) => setAiModeOverride(event.target.value)} className="input">
            <option value="">Use class policy</option>
            <option value="green">Allow AI help</option>
            <option value="yellow">Citation help only</option>
            <option value="red">No AI help</option>
          </select>
        </Field>
        <Field label="Prompt or notes">
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="input" />
        </Field>
        <Field label="Rubric">
          <textarea value={rubricText} onChange={(event) => setRubricText(event.target.value)} rows={4} className="input" />
        </Field>
        <button type="button" onClick={createAssignment} disabled={pending || !title.trim()} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          Create assignment
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} /> Assignment AI policy</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <select value={policyAssignment} onChange={(event) => setPolicyAssignment(event.target.value)} className="input">
            {assignments.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
          </select>
          <select value={policyMode} onChange={(event) => setPolicyMode(event.target.value)} className="input">
            <option value="">Use class policy</option>
            <option value="green">Allow AI help</option>
            <option value="yellow">Citation help only</option>
            <option value="red">No AI help</option>
          </select>
          <button type="button" onClick={updatePolicy} disabled={pending || !policyAssignment} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-border/30 disabled:opacity-50">
            Save policy
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold"><BarChart3 size={16} /> Assignment analytics</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {analytics.map((row) => {
            const cls = classes.find((item) => item.id === row.classId);
            return (
              <div key={row.classId} className="rounded-lg border border-border bg-bg p-3">
                <p className="text-sm font-medium">{cls?.name ?? "Class"}</p>
                <p className="mt-2 text-2xl font-semibold">{row.completionRate}%</p>
                <p className="text-xs text-muted">{row.completed} of {row.total} assignments complete</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold"><Users size={16} /> Class roster</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input value={rosterName} onChange={(event) => setRosterName(event.target.value)} placeholder="Name" className="input" />
          <input value={rosterEmail} onChange={(event) => setRosterEmail(event.target.value)} placeholder="Email" className="input" />
          <select value={rosterRole} onChange={(event) => setRosterRole(event.target.value)} className="input">
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="aide">Aide</option>
            <option value="guardian">Guardian</option>
          </select>
          <button type="button" onClick={addRoster} disabled={pending || !rosterName.trim()} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-border/30 disabled:opacity-50">Invite</button>
        </div>
        {roster.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {roster.map((row) => (
              <li key={row.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{row.display_name}</span>
                <span className="text-xs text-muted">{row.role} - {row.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold"><ClipboardCheck size={16} /> Progress notes</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={noteAuthor} onChange={(event) => setNoteAuthor(event.target.value)} placeholder="Author name" className="input" />
          <select value={noteClass} onChange={(event) => setNoteClass(event.target.value)} className="input">
            <option value="">No class</option>
            {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </div>
        <select value={noteAssignment} onChange={(event) => setNoteAssignment(event.target.value)} className="input">
          <option value="">No assignment</option>
          {assignments.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
        </select>
        <textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} rows={3} placeholder="Progress note" className="input" />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={noteVisible} onChange={(event) => setNoteVisible(event.target.checked)} />
          Visible in parent summary
        </label>
        <button type="button" onClick={addProgressNote} disabled={pending || !noteText.trim() || !noteAuthor.trim()} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-border/30 disabled:opacity-50">Save note</button>
        {notes.length > 0 && (
          <ul className="space-y-2">
            {notes.slice(0, 5).map((row) => (
              <li key={row.id} className="rounded-lg border border-border bg-bg p-3 text-sm">
                <p className="font-medium">{row.author_name}</p>
                <p className="text-muted">{row.note_text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} /> Accommodation confirmation</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={confirmBy} onChange={(event) => setConfirmBy(event.target.value)} placeholder="Confirmed by" className="input" />
          <select value={confirmClass} onChange={(event) => setConfirmClass(event.target.value)} className="input">
            <option value="">All classes</option>
            {classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </div>
        <div className="rounded-lg border border-border bg-bg p-3 text-sm text-muted">
          <p>Extra time: {profile.extra_time_pct}%</p>
          <p>TTS: {profile.tts_enabled ? "on" : "off"}</p>
          <p>Reading font: {profile.dyslexia_font ? "dyslexia-friendly" : "standard"}</p>
          <p>Accommodations: {profile.accommodations.join(", ") || "none listed"}</p>
        </div>
        <textarea value={confirmNotes} onChange={(event) => setConfirmNotes(event.target.value)} rows={2} placeholder="Confirmation note" className="input" />
        <button type="button" onClick={confirmCurrentAccommodations} disabled={pending || !confirmBy.trim()} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-border/30 disabled:opacity-50">Confirm active accommodations</button>
      </section>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--bg));
          color: rgb(var(--fg));
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
