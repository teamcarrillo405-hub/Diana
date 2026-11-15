import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkCommandCenter, type WorkCommandItem } from "@/app/(app)/assignments/work-command-center";
import { PracticeTestSession } from "@/app/(app)/study-artifacts/[id]/practice-session";

export const metadata: Metadata = {
  title: "Hero product capture",
  robots: { index: false, follow: false },
};

const assignments: WorkCommandItem[] = [
  { id: "hero-english", title: "Find the evidence", className: "English 9", classColor: "#56adbc", dueAt: "2026-09-09T21:00:00", minutes: 35, kind: "essay", status: "todo", reasons: [] },
  { id: "hero-algebra", title: "Linear equations", className: "Algebra", classColor: "#d197bb", dueAt: "2026-09-09T23:00:00", minutes: 20, kind: "problem_set", status: "drafting", reasons: [] },
  { id: "hero-biology", title: "Cell biology quiz", className: "Biology", classColor: "#89a780", dueAt: "2026-09-11T09:00:00", minutes: 15, kind: "test_prep", status: "todo", reasons: [] },
  { id: "hero-history", title: "Compare two sources", className: "History", classColor: "#c5a262", dueAt: "2026-09-11T21:00:00", minutes: 25, kind: "reading", status: "todo", reasons: [] },
];

const quiz = [
  { question: "Which part of the cell contains its DNA?", choices: ["Nucleus", "Cell membrane", "Cytoplasm", "Ribosome"], answer: "Nucleus", hint: "Look for the part that stores genetic information.", sourceAnchor: "Cell biology class notes, page 2" },
  { question: "What does the cell membrane do?", choices: ["Controls what enters and leaves", "Stores genetic information", "Makes proteins"], answer: "Controls what enters and leaves", hint: "Think about the cell's boundary.", sourceAnchor: "Cell biology class notes, page 3" },
  { question: "Which structure makes proteins?", choices: ["Ribosome", "Nucleus", "Cell membrane"], answer: "Ribosome", hint: "It can be found in the cytoplasm.", sourceAnchor: "Cell biology class notes, page 4" },
];

export default async function HeroProductCapture({ searchParams }: {
  searchParams: Promise<{ screen?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { screen } = await searchParams;

  // Capture the real product components without enabling account actions.
  return <div inert style={{ minHeight: "100svh" }}>
    {screen === "practice" ? <PracticeTestSession
      artifactId="hero-preview"
      artifactTitle="Cell biology quiz"
      assignmentId={null}
      quiz={quiz}
      initialProgress={{ currentQuestion: 0, completed: false, completedAt: null, responses: {} }}
      initialResult={null}
    /> : <WorkCommandCenter assignments={assignments} nowIso="2026-09-08T16:00:00" />}
  </div>;
}
