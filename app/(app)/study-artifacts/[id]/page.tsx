import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/collection.module.css";
import { completeStudyArtifact } from "@/lib/study-helper/artifacts";
import { normalizePracticeProgress } from "@/lib/study-helper/practice-progress";
import { scorePracticeTest } from "@/lib/study-helper/practice-scoring";
import { normalizeQuizSupportState } from "@/lib/study-helper/quiz-support-fading";
import { createClient } from "@/lib/supabase/server";
import { authorizeSavedArtifactDisclosure } from "@/lib/learning-engine/saved-artifact-assistance";

import { PracticeTestSession } from "./practice-session";
import { ArtifactFlashcards } from "./artifact-flashcards";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export default async function StudyArtifactDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ classId?: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("study_artifacts")
    .select("id, owner_id, title, artifact_type, study_mode, source_type, source_id, class_id, payload, cards_saved_count, practice_settings, authorship_receipt, ai_policy, created_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!row) notFound();
  const { classId: requestedClassId } = await searchParams;
  const classId = row.class_id === requestedClassId ? row.class_id : null;
  const savedHref = classId ? `/classes/${encodeURIComponent(classId)}?section=quiz` : "/study?view=saved";

  const rawPayload = isRecord(row.payload) ? row.payload : {};
  const artifact = completeStudyArtifact({
    ...rawPayload,
    type: row.artifact_type,
    title: row.title,
    sourceTitle:
      typeof rawPayload.sourceTitle === "string" ? rawPayload.sourceTitle : row.title,
    sourceType: row.source_type,
    mode: row.study_mode,
    practiceSettings:
      rawPayload.practiceSettings ?? (isRecord(row.practice_settings) ? row.practice_settings : undefined),
    authorshipReceiptDetail:
      rawPayload.authorshipReceiptDetail ??
      (isRecord(row.authorship_receipt) ? row.authorship_receipt : undefined),
  });

  let assignmentId: string | null;
  try {
    ({ assignmentId } = await authorizeSavedArtifactDisclosure(supabase, user.id, row, {
      storedPayload: row.payload, artifact,
    }));
  } catch {
    return <StudentShell active={classId ? "Classes" : "More"} campus={Boolean(classId)}><main id="main-content" className={styles.main}>
      <h1>Study support is unavailable right now</h1>
      <p>Your saved work is still here. Try opening it again in a moment.</p>
      <Link href={savedHref}>Back to saved practice</Link>
    </main></StudentShell>;
  }

  if (row.artifact_type === "practice_test") {
    const progress = normalizePracticeProgress(rawPayload.practiceProgress);
    const result = Object.keys(progress.responses).length > 0
      ? scorePracticeTest(artifact.quiz, progress.responses)
      : null;
    return (
      <PracticeTestSession
        artifactId={row.id}
        artifactTitle={artifact.title}
        assignmentId={assignmentId}
        classId={classId}
        quiz={artifact.quiz}
        initialProgress={progress}
        initialResult={result}
        initialSupportState={normalizeQuizSupportState(rawPayload.quizSupportState)}
      />
    );
  }

  return <StudentShell active={classId ? "Classes" : "More"} campus={Boolean(classId)}><main id="main-content" className={styles.main}>
    <Link href={savedHref} className={styles.muted}><ArrowLeft size={16} aria-hidden="true" />{classId ? "Back to class" : "Back to Quiz"}</Link>
    <header className={styles.heading}><h1>{artifact.title}</h1></header>
    {artifact.type === "study_guide" ? <section className={styles.reading} aria-label="Study guide sections">{artifact.guide.map(section=><article key={section.heading}><h2>{section.heading}</h2><ul>{section.bullets.map(bullet=><li key={bullet}>{bullet}</li>)}</ul></article>)}</section> : <ArtifactFlashcards artifactId={row.id} cards={artifact.cards} savedCount={row.cards_saved_count ?? 0} />}
    <div className={styles.actions}><Link href={`/study?source=${row.source_type}:${row.source_id}`}>Create quiz from this source</Link><Link href={row.source_type === "assignment" ? `/assignments/${row.source_id}/workspace` : `/notes/${row.source_id}`}>Open source</Link></div>
    <details className={styles.muted}><summary>How Diana helped</summary><p>{artifact.authorshipReceipt}</p></details>
  </main></StudentShell>;
}
