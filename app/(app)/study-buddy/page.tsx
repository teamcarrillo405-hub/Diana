import { MessagesSquare } from "lucide-react";
import { StudyBuddyClient } from "./study-buddy-client";
import { PageShell } from "../page-shell";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; q?: string }>;
}) {
  const { source, q } = await searchParams;
  return (
    <PageShell
      active="Classes"
      eyebrow="Study buddy"
      title="Ask for help without handing over the work."
      subtitle="A quick Socratic helper for when you need a question, hint, or source-based next step."
      accent="var(--gl-purple-light)"
      icon={MessagesSquare}
      titleMaxWidth="28ch"
    >
      <StudyBuddyClient initialSource={source} initialQuestion={q} />
    </PageShell>
  );
}
