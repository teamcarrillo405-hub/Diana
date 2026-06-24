export type NotebookLmParityFeatureId =
  | "source_ingestion"
  | "source_grounded_chat"
  | "citation_context"
  | "study_guide"
  | "practice_quiz"
  | "flashcards"
  | "mind_map"
  | "audio_readout"
  | "student_privacy"
  | "bounded_latency";

export type NotebookLmParityEvidence = Partial<Record<NotebookLmParityFeatureId, "absent" | "partial" | "ready">>;

export type NotebookLmParityResult = {
  score: number;
  possible: number;
  grade: "needs-build" | "close" | "launch-ready";
  features: Array<{
    id: NotebookLmParityFeatureId;
    label: string;
    weight: number;
    status: "absent" | "partial" | "ready";
    points: number;
  }>;
};

const FEATURE_WEIGHTS: Array<{ id: NotebookLmParityFeatureId; label: string; weight: number }> = [
  { id: "source_ingestion", label: "Notebook sources", weight: 12 },
  { id: "source_grounded_chat", label: "Source-grounded chat", weight: 18 },
  { id: "citation_context", label: "Cited answer context", weight: 12 },
  { id: "study_guide", label: "Study guide generation", weight: 10 },
  { id: "practice_quiz", label: "Practice quiz generation", weight: 10 },
  { id: "flashcards", label: "Flashcard generation", weight: 10 },
  { id: "mind_map", label: "Visual concept map", weight: 8 },
  { id: "audio_readout", label: "Audio readout", weight: 7 },
  { id: "student_privacy", label: "Student data privacy", weight: 8 },
  { id: "bounded_latency", label: "Bounded AI latency", weight: 5 },
];

export function scoreNotebookLmParity(evidence: NotebookLmParityEvidence): NotebookLmParityResult {
  const features = FEATURE_WEIGHTS.map((feature) => {
    const status = evidence[feature.id] ?? "absent";
    const multiplier = status === "ready" ? 1 : status === "partial" ? 0.5 : 0;
    return {
      ...feature,
      status,
      points: feature.weight * multiplier,
    };
  });
  const score = Math.round(features.reduce((sum, feature) => sum + feature.points, 0));
  const possible = FEATURE_WEIGHTS.reduce((sum, feature) => sum + feature.weight, 0);
  const grade = score >= 90 ? "launch-ready" : score >= 75 ? "close" : "needs-build";
  return { score, possible, grade, features };
}

export const dianaCurrentNotebookLmParityEvidence: NotebookLmParityEvidence = {
  source_ingestion: "ready",
  source_grounded_chat: "ready",
  citation_context: "ready",
  study_guide: "ready",
  practice_quiz: "ready",
  flashcards: "ready",
  mind_map: "ready",
  audio_readout: "ready",
  student_privacy: "ready",
  bounded_latency: "ready",
};
