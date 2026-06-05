"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAssignment } from "./actions";
import { VoiceTextarea } from "@/components/voice-textarea";
import type { AssignmentKind } from "@/lib/supabase/types";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { getCalibrationHint } from "@/lib/time-budget/calibration";
import { templateToDescription, type AssignmentTemplate } from "@/lib/templates/templates";

type ClassOption = { id: string; name: string; color: string };

const KINDS: AssignmentKind[] = [
  "essay",
  "lab",
  "problem_set",
  "presentation",
  "test_prep",
  "reading",
  "other",
];

export function NewAssignmentForm({
  classes,
  calibrationMap,
  templates,
  initialTemplateId = "",
}: {
  classes: ClassOption[];
  calibrationMap?: Record<string, { mean: number; n: number }>;
  templates: AssignmentTemplate[];
  initialTemplateId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialTemplate = templates.find((template) => template.id === initialTemplateId);
  const [templateId, setTemplateId] = useState<string>(initialTemplate?.id ?? "");
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [kind, setKind] = useState<AssignmentKind>((initialTemplate?.kind as AssignmentKind | undefined) ?? "other");
  const [dueAt, setDueAt] = useState("");
  const [estimate, setEstimate] = useState("");
  const [difficulty, setDifficulty] = useState<number>(3);
  const [readingLoad, setReadingLoad] = useState<number>(1);
  const [writingLoad, setWritingLoad] = useState<number>(1);
  const [description, setDescription] = useState(initialTemplate ? templateToDescription(initialTemplate) : "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give the assignment a title.");
    if (!classId) return setError("Pick a class.");

    startTransition(async () => {
      const result = await createAssignment({
        title: title.trim(),
        classId,
        kind,
        dueAt: dueAt || null,
        estimate: estimate ? Number(estimate) : null,
        difficulty,
        readingLoad,
        writingLoad,
        description: description.trim() || null,
        templateId: templateId || null,
      });
      if (result.error) return setError(result.error);
      router.push(`/assignments/${result.id}?intent=new`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4">
      {templates.length > 0 && (
        <Field label="Start from a template (optional)">
          <select
            value={templateId}
            onChange={(e) => {
              const next = e.target.value;
              setTemplateId(next);
              if (next) {
                const tmpl = templates.find((t) => t.id === next);
                if (tmpl) {
                  setKind(tmpl.kind as AssignmentKind);
                  setDescription(templateToDescription(tmpl));
                }
              }
            }}
            className="input"
          >
            <option value="">— No template —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <span className="text-xs text-muted">
            Pre-fills the checklist and the notes field. You can still edit anything.
          </span>
        </Field>
      )}

      <Field label="Title">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="e.g. Photosynthesis lab report"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Class">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="input"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AssignmentKind)}
            className="input"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>{KIND_LABEL[k]}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Due">
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Estimate (min)">
          <input
            type="number"
            min={1}
            max={600}
            inputMode="numeric"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            className="input"
            placeholder="e.g. 45"
          />
          {calibrationMap && estimate && (
            (() => {
              const stats = calibrationMap[kind];
              if (!stats) return null;
              const hint = getCalibrationHint(stats, Number(estimate));
              if (!hint) return null;
              return (
                <p className="mt-1 text-xs text-muted">
                  {hint}
                </p>
              );
            })()
          )}
        </Field>
      </div>

      <Field label={`Difficulty: ${difficulty}/5`}>
        <input
          type="range"
          min={1}
          max={5}
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          className="w-full"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={`Reading load: ${readingLoad}/5`}>
          <input
            type="range"
            min={0}
            max={5}
            value={readingLoad}
            onChange={(e) => setReadingLoad(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-xs text-muted">How much reading does this require?</span>
        </Field>
        <Field label={`Writing load: ${writingLoad}/5`}>
          <input
            type="range"
            min={0}
            max={5}
            value={writingLoad}
            onChange={(e) => setWritingLoad(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-xs text-muted">How much writing?</span>
        </Field>
      </div>

      <Field label="Notes">
        <VoiceTextarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onTranscript={(chunk) =>
            setDescription((d) => (d ? d + " " + chunk : chunk))
          }
          rows={3}
          className="input"
          placeholder="What does the teacher want? Anything to remember? Tap the mic to dictate."
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add task"}
        </button>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card));
          color: rgb(var(--fg));
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
        }
      `}</style>
    </form>
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
