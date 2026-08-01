// lib/homework-mission/subjects.ts
// Subject-mode resolution and per-subject hand-in field schema. The
// design defines exactly 6 modes sharing one shell — this maps a real
// assignment (kind + class name) onto one of them, and defines each mode's
// field labels/hints/placeholders per the locked design copy.
import type { AssignmentKind } from "@/lib/supabase/types";

export type HmSubject = "reading" | "math" | "science" | "history" | "english" | "athletics";

export const SUBJECT_META: Record<HmSubject, { label: string; accent: string; materialLabel: string }> = {
  reading: { label: "Reading", accent: "#f25fb0", materialLabel: "The passage" },
  math: { label: "Math", accent: "#b09cff", materialLabel: "The problem" },
  science: { label: "Science", accent: "#36e07a", materialLabel: "What you did in class" },
  history: { label: "History", accent: "#ffd24a", materialLabel: "The source" },
  english: { label: "English", accent: "#29d0ff", materialLabel: "The prompt" },
  athletics: { label: "Athletics", accent: "#5b9bff", materialLabel: "Today's session" },
};

export function resolveSubjectMode(a: { kind: AssignmentKind }, className: string | null): HmSubject {
  const name = className ?? "";
  if (a.kind === "reading") return "reading";
  if (a.kind === "problem_set" || a.kind === "test_prep") return "math";
  if (a.kind === "lab") return "science";
  if (a.kind === "essay") return "english";
  if (/hist|social studies|gov|civic|econ|geo|apush/i.test(name)) return "history";
  if (/\bpe\b|physical|health|sport|fitness|gym|athlet/i.test(name)) return "athletics";
  if (/bio|chem|physics|science|environ/i.test(name)) return "science";
  return "english";
}

export type HmField = {
  key: string;
  label: string;
  hint: string;
  placeholder: string;
  multi: boolean;
  rows?: number;
};

// Per-subject hand-in fields. Math fields apply per problem rather than once
// per assignment.
export const SUBJECT_FIELDS: Record<HmSubject, HmField[]> = {
  reading: [
    { key: "main", label: "Main idea", hint: "one sentence: what is this mostly about?", placeholder: "The passage is about…", multi: false },
    { key: "summary", label: "Your summary", hint: "3–4 sentences, your own words", placeholder: "In your own words…", multi: true, rows: 4 },
  ],
  math: [
    { key: "plan", label: "My plan", hint: "what will you do first?", placeholder: "First I will…", multi: false },
    { key: "workmono", label: "Work it out", hint: "every step, no skipping", placeholder: "Show each step here…", multi: true, rows: 6 },
    { key: "answer", label: "Final answer", hint: "your answer, clearly stated", placeholder: "The answer is…", multi: false },
  ],
  science: [
    { key: "hypo", label: "Hypothesis", hint: "if → then → because", placeholder: "If…, then…, because…", multi: true, rows: 2 },
    { key: "expl", label: "Explanation", hint: "what happened, and why", placeholder: "This happened because…", multi: true, rows: 3 },
    { key: "error", label: "One source of error", hint: "what could have thrown it off?", placeholder: "One thing that could affect the results is…", multi: true, rows: 2 },
  ],
  history: [
    { key: "claim", label: "Claim", hint: "your answer in one sentence", placeholder: "The source shows that…", multi: false },
    { key: "evidence", label: "Evidence + reasoning", hint: "the quote, and why it backs your claim", placeholder: "The source states \"…\" which shows…", multi: true, rows: 3 },
    { key: "final", label: "Your answer", hint: "put it together, claim first", placeholder: "Write your full answer here…", multi: true, rows: 5 },
  ],
  english: [
    { key: "thesis", label: "Thesis", hint: "point + so-what", placeholder: "The author uses… which shows…", multi: true, rows: 2 },
    { key: "plan", label: "Paragraph plan", hint: "one line per paragraph", placeholder: "P1: …\nP2: …\nP3: …", multi: true, rows: 3 },
    { key: "draft", label: "Your draft", hint: "this is what you hand in", placeholder: "Start with your thesis and keep going…", multi: true, rows: 9 },
  ],
  athletics: [
    { key: "did", label: "What you did", hint: "sets, drills, minutes", placeholder: "Warm-up, then…", multi: true, rows: 2 },
    { key: "felt", label: "How it felt", hint: "energy, soreness, focus", placeholder: "I felt…", multi: true, rows: 2 },
    { key: "improve", label: "One improvement", hint: "small and specific", placeholder: "Next time I'll…", multi: false },
  ],
};
