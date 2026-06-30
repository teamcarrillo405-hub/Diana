import { StudyBuddyClient } from "./study-buddy-client";
import { AppTopNav } from "../app-top-nav";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; q?: string }>;
}) {
  const { source, q } = await searchParams;
  return (
    <>
      <AppTopNav active="Classes" />
      <div className="diana-page space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">Study buddy</p>
          <h1 className="text-display">Ask for help without handing over the work</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            A quick Socratic helper for when you need a question, hint, or source-based next step.
          </p>
        </header>
        <StudyBuddyClient initialSource={source} initialQuestion={q} />
      </div>
    </>
  );
}
