import Link from "next/link";
import { ArrowLeft, BookOpenCheck, Brain, CreditCard, FileText, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { completeStudyArtifact } from "@/lib/study-helper/artifacts";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "../../page-shell";

export default async function StudyArtifactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("study_artifacts")
    .select("id, title, artifact_type, study_mode, payload, ai_policy, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();
  const artifact = completeStudyArtifact(row.payload);
  const Icon = artifact.type === "practice_test" ? Brain : artifact.type === "flashcard_set" ? CreditCard : FileText;

  return (
    <PageShell active="More" eyebrow={artifact.type.replaceAll("_", " ")} title={artifact.title} subtitle={artifact.summary} icon={Icon} action={<Link href="/study-artifacts" className="sd-button"><ArrowLeft size={16} aria-hidden="true" />Study lab</Link>}>
      <section className="sd-panel sd-panel-pad sd-artifact-trust">
        <ShieldCheck size={18} aria-hidden="true" />
        <div><h2 className="sd-section-title">Authorship check</h2><p>{artifact.authorshipReceipt}</p></div>
      </section>

      {artifact.type === "practice_test" ? (
        <section className="sd-grid" style={{ marginTop: "1rem" }}>
          <div className="sd-section-head"><h2 className="sd-section-title">Practice session</h2><span className="sd-chip">{artifact.quiz.length} questions</span></div>
          {artifact.quiz.map((item, index) => (
            <article className="sd-panel sd-panel-pad sd-practice-question" key={`${index}-${item.question}`}>
              <span className="sd-chip">Question {index + 1}</span>
              <h2>{item.question}</h2>
              {item.choices.length ? <ol>{item.choices.map((choice) => <li key={choice}>{choice}</li>)}</ol> : <textarea className="sd-input" rows={4} aria-label={`Response to question ${index + 1}`} placeholder="Write your own response before opening the source check" />}
              <details><summary>Hint</summary><p>{item.hint}</p></details>
              <details><summary>Source check</summary><p>{item.answer}</p><small>{item.sourceAnchor}</small></details>
            </article>
          ))}
        </section>
      ) : null}

      {artifact.type === "study_guide" ? (
        <section className="sd-grid sd-grid-2" style={{ marginTop: "1rem" }}>
          {artifact.guide.map((section) => <article className="sd-panel sd-panel-pad" key={section.heading}><h2 className="sd-section-title">{section.heading}</h2><ul className="sd-guide-list">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></article>)}
        </section>
      ) : null}

      {artifact.type === "flashcard_set" ? (
        <section className="sd-grid sd-grid-2" style={{ marginTop: "1rem" }}>
          {artifact.cards.map((card, index) => <article className="sd-panel sd-panel-pad sd-study-card" key={`${index}-${card.front}`}><span className="sd-chip">Card {index + 1}</span><h2>{card.front}</h2><details><summary>Reveal answer</summary><p>{card.back}</p><small>{card.sourceAnchor}</small></details></article>)}
        </section>
      ) : null}

      <section className="sd-panel sd-panel-pad" style={{ marginTop: "1rem" }}>
        <h2 className="sd-section-title"><BookOpenCheck size={15} aria-hidden="true" /> Next review</h2>
        <p className="sd-subtitle">{artifact.reviewLoop.nextReviewAction}</p>
      </section>
    </PageShell>
  );
}
