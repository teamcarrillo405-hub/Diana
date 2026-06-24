import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { ClassCandidate } from "@/lib/notes/class-router";
import { NoteEditor } from "./note-editor";
import {
  NexusArcadeScene,
  NexusPageHeader,
  NexusPageShell,
} from "@/components/nexus/nexus-ui";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string }>;
}) {
  const { assignment } = await searchParams;
  const profile = await loadProfile();
  const ttsProvider = profile?.tts_provider === "openai" ? "openai" : "browser";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let classCandidates: ClassCandidate[] = [];

  if (user) {
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("name", { ascending: true })
      .limit(20);

    const { data: recentAssignments } = await supabase
      .from("assignments")
      .select("title, class_id, created_at")
      .eq("owner_id", user.id)
      .not("class_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    const recentByClass = new Map<string, string[]>();
    for (const assignmentRow of recentAssignments ?? []) {
      if (!assignmentRow.class_id || !assignmentRow.title) continue;
      const list = recentByClass.get(assignmentRow.class_id) ?? [];
      if (list.length < 10) list.push(assignmentRow.title);
      recentByClass.set(assignmentRow.class_id, list);
    }

    classCandidates = (classes ?? []).map((classRow) => ({
      id: classRow.id,
      name: classRow.name,
      recentTitles: recentByClass.get(classRow.id) ?? [],
    }));
  }

  return (
    <NexusPageShell className="notes-new-page space-y-8">
      <NexusPageHeader
        eyebrow="Notes studio"
        title={<>Start with whatever you have.</>}
        description="Type, talk, upload audio, or scan a page. Diana saves the capture and routes it to the right class."
        visual={<NexusArcadeScene />}
        tone="purple"
      />
      <NoteEditor
        assignmentId={assignment ?? null}
        ttsProvider={ttsProvider}
        classCandidates={classCandidates}
      />
    </NexusPageShell>
  );
}
