import Link from "next/link";
import {
  BookMarked,
  ChevronRight,
  FileText,
  History,
  Layers3,
  Plus,
  Sparkles,
} from "lucide-react";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import { createClient } from "@/lib/supabase/server";

import { generateStudyArtifact } from "./actions";

const ARTIFACT_META = {
  practice_test: {
    label: "Practice test",
    description: "A source-linked exam rehearsal from your current class material.",
    assetId: "practice-test-visual" as const,
    Icon: FileText,
    tone: "blue",
  },
  study_guide: {
    label: "Study guide",
    description: "A condensed outline that keeps every idea connected to its source.",
    assetId: "study-guide-visual" as const,
    Icon: BookMarked,
    tone: "pink",
  },
  flashcard_set: {
    label: "Flashcard batch",
    description: "Editable card drafts that enter the real FSRS review flow after you save them.",
    assetId: "flashcard-batch-visual" as const,
    Icon: Layers3,
    tone: "neutral",
  },
} as const;

type ArtifactType = keyof typeof ARTIFACT_META;

const studyModeFor = (type: ArtifactType) => {
  if (type === "practice_test") return "retrieval_quiz" as const;
  if (type === "flashcard_set") return "flashcard_builder" as const;
  return "guided_steps" as const;
};

async function createFromStudyLab(formData: FormData) {
  "use server";

  const source = String(formData.get("source") ?? "");
  const [sourceType, sourceId] = source.split(":", 2);
  const rawType = String(formData.get("artifactType") ?? "practice_test");
  const artifactType: ArtifactType =
    rawType === "study_guide" || rawType === "flashcard_set"
      ? rawType
      : "practice_test";

  if ((sourceType !== "assignment" && sourceType !== "note") || !sourceId) {
    redirect("/study-artifacts?notice=choose-source");
  }

  const result = await generateStudyArtifact({
    sourceType,
    sourceId,
    artifactType,
    studyMode: studyModeFor(artifactType),
  });
  if (!result.ok) {
    redirect("/study-artifacts?notice=creation-paused");
  }
  redirect(`/study-artifacts/${result.id}`);
}

export default async function StudyArtifactsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: artifacts }, { data: assignments }, { data: notes }, params] =
    await Promise.all([
      supabase
        .from("study_artifacts")
        .select("id, title, artifact_type, study_mode, source_type, source_id, ai_policy, created_at, updated_at")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(60),
      supabase
        .from("assignments")
        .select("id, title")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(30),
      supabase
        .from("notes")
        .select("id, title")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(30),
      searchParams,
    ]);

  const sources = [
    ...(assignments ?? []).map((assignment) => ({
      value: `assignment:${assignment.id}`,
      label: assignment.title,
      kind: "Assignment",
    })),
    ...(notes ?? []).map((note) => ({
      value: `note:${note.id}`,
      label: note.title || "Untitled note",
      kind: "Note",
    })),
  ];
  const notice =
    params.notice === "choose-source"
      ? "Choose real class material before creating a study artifact."
      : params.notice === "creation-paused"
        ? "The study artifact is still open to try again. Check the source and class AI setting."
        : null;

  return (
    <ScreenDesignViewport className="sd-study-lab">
      <header className="sd-study-lab-header">
        <div>
          <DianaWordmark />
          <a href="#saved-artifacts" aria-label="Open artifact history">
            <History aria-hidden="true" />
          </a>
        </div>
        <h1>
          Study<br />
          <span>Lab</span>
        </h1>
        <p>Generate study material</p>
      </header>

      <main className="sd-study-lab-scroll">
        {notice ? <p className="sd-study-lab-notice" role="status">{notice}</p> : null}

        {sources.length > 0 ? (
          <form action={createFromStudyLab} className="sd-study-lab-generator">
            <label className="sd-study-lab-source">
              <span>Build from</span>
              <select name="source" aria-label="Study source" defaultValue={sources[0]?.value}>
                {sources.map((source) => (
                  <option value={source.value} key={source.value}>
                    {source.kind}: {source.label}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="sd-study-lab-types">
              <legend>Choose an artifact type</legend>
              {Object.entries(ARTIFACT_META).map(([key, meta], index) => (
                <label className="sd-study-lab-type" data-tone={meta.tone} key={key}>
                  <input
                    type="radio"
                    name="artifactType"
                    value={key}
                    defaultChecked={index === 0}
                  />
                  <span className="sd-study-lab-type-copy">
                    <span className="sd-study-lab-type-icon">
                      <meta.Icon aria-hidden="true" />
                    </span>
                    <strong>{meta.label}</strong>
                    <small>{meta.description}</small>
                  </span>
                  <SourceMedia
                    assetId={meta.assetId}
                    width={320}
                    height={320}
                    alt={`${meta.label} visual`}
                    className="sd-study-lab-type-image"
                  />
                </label>
              ))}
            </fieldset>

            <button type="submit" aria-label="Create study artifact" className="sd-study-lab-create">
              <span>
                <Sparkles aria-hidden="true" />
                Create new artifact
              </span>
            </button>
          </form>
        ) : (
          <section className="sd-study-lab-empty-source">
            <h2>Add a source first</h2>
            <p>A real assignment or note gives Diana the class material for an honest study set.</p>
            <Link href="/assignments">Choose class material</Link>
          </section>
        )}

        <section id="saved-artifacts" className="sd-study-lab-saved" aria-label="Saved study artifacts">
          <div>
            <h2>Saved artifacts</h2>
            <span>{artifacts?.length ?? 0}</span>
          </div>
          {(artifacts ?? []).length > 0 ? (
            <div className="sd-study-lab-saved-list">
              {artifacts!.map((artifact) => {
                const meta =
                  ARTIFACT_META[artifact.artifact_type as ArtifactType] ?? ARTIFACT_META.study_guide;
                return (
                  <Link
                    href={`/study-artifacts/${artifact.id}`}
                    key={artifact.id}
                    aria-label={`Open ${artifact.title}`}
                  >
                    <span data-tone={meta.tone}><meta.Icon aria-hidden="true" /></span>
                    <span>
                      <small>{meta.label}</small>
                      <strong>{artifact.title}</strong>
                      <time dateTime={artifact.updated_at}>{formatDate(artifact.updated_at)}</time>
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="sd-study-lab-honest-empty">
              <h3>Your study lab is ready.</h3>
              <p>Choose a source and artifact type above. Saved material will stay here.</p>
            </div>
          )}
        </section>
      </main>

      <Link href="/assignments" className="sd-study-lab-quick-add" aria-label="Choose class material">
        <Plus aria-hidden="true" />
      </Link>
    </ScreenDesignViewport>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(value),
  );
}
