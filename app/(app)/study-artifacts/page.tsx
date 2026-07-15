import Link from "next/link";
import { Brain, CreditCard, FileText, FlaskConical, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageShell } from "../page-shell";

const ARTIFACT_META = {
  study_guide: { label: "Study guide", Icon: FileText, tone: "var(--diana-blue)" },
  practice_test: { label: "Practice test", Icon: Brain, tone: "var(--diana-pink)" },
  flashcard_set: { label: "Flashcard batch", Icon: CreditCard, tone: "var(--diana-teal)" },
} as const;

export default async function StudyArtifactsPage() {
  const supabase = await createClient();
  const { data: artifacts } = await supabase
    .from("study_artifacts")
    .select("id, title, artifact_type, study_mode, source_type, source_id, ai_policy, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(60);

  return (
    <PageShell active="More" eyebrow="Study lab" title="Study artifacts" subtitle="Practice tests, guides, and flashcards built from your real class material. You remain the author and reviewer." icon={FlaskConical} action={<Link href="/assignments" className="sd-button sd-button-primary"><Plus size={16} aria-hidden="true" />Choose source</Link>}>
      <section className="sd-grid sd-grid-3" aria-label="Artifact types">
        {Object.entries(ARTIFACT_META).map(([key, meta]) => {
          const count = (artifacts ?? []).filter((item) => item.artifact_type === key).length;
          return <div className="sd-panel sd-metric" key={key} style={{ "--sd-metric-tone": meta.tone } as React.CSSProperties}><meta.Icon size={17} aria-hidden="true" /><span className="sd-metric-label">{meta.label}</span><strong className="sd-metric-value">{count}</strong></div>;
        })}
      </section>

      <section className="sd-grid" style={{ marginTop: "1.25rem" }}>
        <div className="sd-section-head"><h2 className="sd-section-title">Saved artifacts</h2><span className="sd-chip">{artifacts?.length ?? 0} total</span></div>
        {(artifacts ?? []).length ? (
          <div className="sd-grid sd-grid-2">
            {artifacts!.map((artifact) => {
              const meta = ARTIFACT_META[artifact.artifact_type as keyof typeof ARTIFACT_META] ?? ARTIFACT_META.study_guide;
              return (
                <Link href={`/study-artifacts/${artifact.id}`} className="sd-panel sd-artifact-card" key={artifact.id} style={{ "--sd-artifact-tone": meta.tone } as React.CSSProperties}>
                  <span className="sd-class-icon"><meta.Icon size={18} aria-hidden="true" /></span>
                  <span><span className="sd-kicker">{meta.label}</span><strong>{artifact.title}</strong><small>{artifact.study_mode.replaceAll("_", " ")} · {formatDate(artifact.updated_at)}</small></span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="sd-panel sd-panel-pad"><h2 className="sd-section-title">Make class material easier to review</h2><p className="sd-subtitle">Open an assignment or note and choose cards, quiz, or study guide. Diana saves the result here.</p></div>
        )}
      </section>
    </PageShell>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}
