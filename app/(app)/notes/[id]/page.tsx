import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, NotebookPen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { findRelatedNotes, type RelatedNoteCandidate } from "@/lib/notes/related";
import { NoteDetail } from "./note-detail";
import type { OutlineNode } from "@/lib/notes/types";
import { AppTopNav } from "../../app-top-nav";

const SF = "var(--font-display)";
const BODY = "var(--font-body)";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [profile, { data: n }, { data: classes }, { data: relatedCandidates }] = await Promise.all([
    loadProfile(),
    supabase
      .from("notes")
      .select("id, title, body_text, transcript_text, outline_json, action_items_json, assignment_id, updated_at, class_id, source, tags, ai_suggested_tags, classes(id, name, ai_mode)")
      .eq("id", id)
      .single(),
    supabase.from("classes").select("id, name").order("name"),
    supabase
      .from("notes")
      .select("id, title, body_text, transcript_text, class_id, tags, ai_suggested_tags, updated_at")
      .neq("id", id)
      .order("updated_at", { ascending: false })
      .limit(80),
  ]);
  if (!n) notFound();

  const outline = Array.isArray(n.outline_json) ? (n.outline_json as unknown as OutlineNode[]) : null;
  const currentForRelated: RelatedNoteCandidate = {
    id: n.id,
    title: n.title,
    body_text: n.body_text,
    transcript_text: n.transcript_text,
    class_id: n.class_id,
    tags: n.tags ?? [],
    ai_suggested_tags: n.ai_suggested_tags ?? [],
    updated_at: n.updated_at,
  };
  const relatedNotes = findRelatedNotes(
    currentForRelated,
    (relatedCandidates ?? []) as RelatedNoteCandidate[],
  );
  const classAiMode = noteAiMode(n);
  const readingPrefs = {
    bionic_reading: Boolean(profile?.bionic_reading),
    visual_pacing: profile?.visual_pacing ?? "off",
    line_focus: Boolean(profile?.line_focus),
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <AppTopNav active="Classes" />
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>

        {/* Header — back link + hero */}
        <header style={{ display: "grid", gap: "var(--space-8)" }}>
          <Link
            href="/notes"
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)", fontFamily: BODY, fontSize: "var(--text-12)", fontWeight: "var(--weight-600)", color: "var(--gl-text-muted)", textDecoration: "none" }}
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back to notes
          </Link>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-purple-light)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <NotebookPen size={13} aria-hidden="true" />
            Note detail
          </p>
          <h1 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0, maxWidth: "30ch" }}>
            {n.title}
          </h1>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-16)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", maxWidth: "44ch", margin: 0 }}>
            Turn this capture into class proof, recall, cards, or a study guide without losing the original note.
          </p>
        </header>

        {/* Note detail — client component with all interactive actions */}
        <NoteDetail
          id={n.id}
          bodyText={n.body_text}
          transcriptText={n.transcript_text}
          outline={outline}
          actionItems={
            Array.isArray(n.action_items_json)
              ? n.action_items_json.filter((item): item is string => typeof item === "string")
              : []
          }
          source={n.source ?? "manual"}
          tags={n.tags ?? []}
          aiSuggestedTags={n.ai_suggested_tags ?? []}
          relatedNotes={relatedNotes}
          readingPrefs={readingPrefs}
          ttsOn={Boolean(profile?.tts_enabled)}
          ttsProvider={profile?.tts_provider ?? "browser"}
          ttsSpeed={Number(profile?.tts_speed ?? 1)}
          ttsPitch={Number(profile?.tts_pitch ?? 1)}
          ttsVoice={profile?.tts_voice ?? "nova"}
          classId={n.class_id ?? null}
          ownerId={profile?.user_id ?? ""}
          classAiMode={classAiMode}
          classes={classes ?? []}
        />
      </div>
    </div>
  );
}

function noteAiMode(note: { classes?: unknown }): "red" | "yellow" | "green" {
  const joined = note.classes;
  const cls = Array.isArray(joined) ? joined[0] : joined;
  if (cls && typeof cls === "object" && "ai_mode" in cls) {
    const mode = (cls as { ai_mode?: unknown }).ai_mode;
    if (mode === "red" || mode === "yellow") return mode;
  }
  return "green";
}
