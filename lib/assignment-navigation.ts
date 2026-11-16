import type { AssignmentStatus } from "@/lib/supabase/types";

export const WORK_RETURN_PATH = "/assignments?return=1";

export type AssignmentCollectionState = "active" | "review" | "ready" | "submitted";

export function assignmentCollectionState(status: AssignmentStatus): AssignmentCollectionState {
  if (status === "submitted" || status === "graded") return "submitted";
  if (status === "exporting") return "ready";
  if (status === "checking") return "review";
  return "active";
}

export function assignmentDestination(id: string, status: string) {
  const base = `/assignments/${encodeURIComponent(id)}`;
  return `${base}${status === "exporting" || status === "submitted" || status === "graded" ? "/submit" : "/workspace"}`;
}

export function assignmentActionLabel(status: AssignmentStatus) {
  if (status === "submitted" || status === "graded") return "View submission";
  if (status === "exporting") return "Review submission";
  if (status === "checking") return "Review work";
  if (status === "drafting") return "Resume";
  return "Start";
}

export function assignmentStatusLabel(status: AssignmentStatus) {
  return ({ todo: "Not started", drafting: "In progress", checking: "In review", exporting: "Ready to submit", submitted: "Submitted", graded: "Graded", abandoned: "Archived" })[status];
}

/** Illustration only. Teacher source material is opened inside the workspace. */
export function subjectArtwork(subject: string): string {
  const key = /chem/i.test(subject) ? "chemistry" : /bio/i.test(subject) ? "biology" : /math|algebra|geometry|calculus/i.test(subject) ? "math" : /history|social/i.test(subject) ? "history" : /english|literature/i.test(subject) ? "english" : /spanish|french|german|mandarin|language/i.test(subject) ? "languages" : /computer|coding|digital/i.test(subject) ? "computer-science" : /physics/i.test(subject) ? "physics" : /music|band|choir/i.test(subject) ? "music" : /art|design/i.test(subject) ? "art" : /econom/i.test(subject) ? "economics" : null;
  return key ? `/assets/landing-10k/subjects/${key}.webp` : "/assets/today-now/diana-signature-studio-v1-1678.webp";
}
