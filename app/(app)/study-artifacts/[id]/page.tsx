import Link from "next/link";
import { ArrowLeft, BookOpenCheck, CheckCircle2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { completeStudyArtifact } from "@/lib/study-helper/artifacts";
import { normalizePracticeProgress } from "@/lib/study-helper/practice-progress";
import { createClient } from "@/lib/supabase/server";

import { PracticeTestSession } from "./practice-session";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export default async function StudyArtifactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("study_artifacts")
    .select("id, owner_id, title, artifact_type, study_mode, source_type, source_id, payload, practice_settings, authorship_receipt, ai_policy, created_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!row) notFound();

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

  if (row.artifact_type === "practice_test") {
    const score =
      typeof rawPayload.score === "number" && Number.isFinite(rawPayload.score)
        ? rawPayload.score
        : null;
    return (
      <PracticeTestSession
        artifactId={row.id}
        artifactTitle={artifact.title}
        quiz={artifact.quiz}
        initialProgress={normalizePracticeProgress(rawPayload.practiceProgress)}
        score={score}
      />
    );
  }

  return (
    <ScreenDesignViewport className="sd-artifact-detail">
      <header className="sd-artifact-detail-header">
        <Link href="/study-artifacts" aria-label="Back to study lab">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <DianaWordmark />
        <span aria-hidden="true" />
      </header>

      <main className="sd-artifact-detail-scroll">
        <div className="sd-artifact-detail-title">
          <span>{artifact.type.replaceAll("_", " ")}</span>
          <h1>{artifact.title}</h1>
          <p>{artifact.summary}</p>
        </div>

        <section className="sd-artifact-authorship">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <h2>Authorship check</h2>
            <p>{artifact.authorshipReceipt}</p>
          </div>
        </section>

        {artifact.type === "study_guide" ? (
          <section className="sd-artifact-detail-sections" aria-label="Study guide sections">
            {artifact.guide.map((section) => (
              <article key={section.heading}>
                <h2>{section.heading}</h2>
                <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
              </article>
            ))}
          </section>
        ) : (
          <section className="sd-artifact-detail-sections" aria-label="Flashcard drafts">
            {artifact.cards.map((card, index) => (
              <article key={`${index}-${card.front}`}>
                <span>Card {index + 1}</span>
                <h2>{card.front}</h2>
                <details>
                  <summary>Reveal answer</summary>
                  <p>{card.back}</p>
                  <small>{card.sourceAnchor}</small>
                </details>
              </article>
            ))}
          </section>
        )}

        <section className="sd-artifact-next-review">
          <BookOpenCheck aria-hidden="true" />
          <div>
            <h2>Next review</h2>
            <p>{artifact.reviewLoop.nextReviewAction}</p>
          </div>
        </section>
      </main>
    </ScreenDesignViewport>
  );
}
