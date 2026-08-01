import { notFound, redirect } from "next/navigation";

import { findRelatedNotes, type RelatedNoteCandidate } from "@/lib/notes/related";
import type { OutlineNode } from "@/lib/notes/types";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

import { NoteDetail } from "./note-detail";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, { data: note }, { data: classes }, { data: relatedCandidates }] = await Promise.all([
    loadProfile(),
    supabase
      .from("notes")
      .select("id, title, body_text, transcript_text, outline_json, action_items_json, assignment_id, updated_at, class_id, source, tags, ai_suggested_tags, classes(id, name, ai_mode)")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single(),
    supabase
      .from("classes")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("name"),
    supabase
      .from("notes")
      .select("id, title, body_text, transcript_text, class_id, tags, ai_suggested_tags, updated_at")
      .eq("owner_id", user.id)
      .neq("id", id)
      .order("updated_at", { ascending: false })
      .limit(80),
  ]);
  if (!note) notFound();

  const outline = Array.isArray(note.outline_json)
    ? (note.outline_json as unknown as OutlineNode[])
    : null;
  const currentForRelated: RelatedNoteCandidate = {
    id: note.id,
    title: note.title,
    body_text: note.body_text,
    transcript_text: note.transcript_text,
    class_id: note.class_id,
    tags: note.tags ?? [],
    ai_suggested_tags: note.ai_suggested_tags ?? [],
    updated_at: note.updated_at,
  };
  const relatedNotes = findRelatedNotes(
    currentForRelated,
    (relatedCandidates ?? []) as RelatedNoteCandidate[],
  );
  const readingPrefs = {
    bionic_reading: Boolean(profile?.bionic_reading),
    visual_pacing: profile?.visual_pacing ?? "off",
    line_focus: Boolean(profile?.line_focus),
  };

  return (
    <NoteDetail
      id={note.id}
      title={note.title}
      bodyText={note.body_text}
      transcriptText={note.transcript_text}
      outline={outline}
      actionItems={
        Array.isArray(note.action_items_json)
          ? note.action_items_json.filter((item): item is string => typeof item === "string")
          : []
      }
      source={note.source ?? "manual"}
      tags={note.tags ?? []}
      aiSuggestedTags={note.ai_suggested_tags ?? []}
      relatedNotes={relatedNotes}
      readingPrefs={readingPrefs}
      ttsOn={Boolean(profile?.tts_enabled)}
      ttsProvider={profile?.tts_provider ?? "browser"}
      ttsSpeed={Number(profile?.tts_speed ?? 1)}
      ttsPitch={Number(profile?.tts_pitch ?? 1)}
      ttsVoice={profile?.tts_voice ?? "nova"}
      classId={note.class_id ?? null}
      ownerId={user.id}
      classAiMode={noteAiMode(note)}
      classes={classes ?? []}
    />
  );
}

function noteAiMode(note: { classes?: unknown }): "red" | "yellow" | "green" {
  const joined = note.classes;
  const classroom = Array.isArray(joined) ? joined[0] : joined;
  if (classroom && typeof classroom === "object" && "ai_mode" in classroom) {
    const mode = (classroom as { ai_mode?: unknown }).ai_mode;
    if (mode === "red" || mode === "yellow") return mode;
  }
  return "green";
}
