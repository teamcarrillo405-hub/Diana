import { MessagesSquare } from "lucide-react";
import { StudyBuddyClient } from "./study-buddy-client";
import { PageShell } from "../page-shell";
import { loadProfile } from "@/lib/profile";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; q?: string }>;
}) {
  const { source, q } = await searchParams;
  const profile = await loadProfile();
  const tutorName = profile?.tutor_persona === "xavier" ? "Tutor Xavier" : profile?.tutor_persona === "maya" ? "Tutor Maya" : "Coach Diana";
  const tutorStyle = profile?.tutor_style ?? "socratic";
  const initialMode = tutorStyle === "direct" ? "hint" : "guide";
  const styleDescription = tutorStyle === "supportive"
    ? "encouraging guidance with a clear student-owned next move"
    : tutorStyle === "direct"
      ? "brief explanations and concrete next actions"
      : "questions and hints that lead you toward the next step";
  return (
    <PageShell
      active="Classes"
      eyebrow="Study buddy"
      title="Ask for help without handing over the work."
      subtitle={`${tutorName} uses ${styleDescription}.`}
      accent="var(--gl-purple-light)"
      icon={MessagesSquare}
      titleMaxWidth="28ch"
    >
      <StudyBuddyClient initialSource={source} initialQuestion={q} initialMode={initialMode} tutorName={tutorName} tutorStyle={tutorStyle} complexity={profile?.tutor_complexity ?? "balanced"} />
    </PageShell>
  );
}
