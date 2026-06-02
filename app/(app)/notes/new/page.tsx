import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { ClassCandidate } from "@/lib/notes/class-router";
import { NoteEditor } from "./note-editor";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string }>;
}) {
  const { assignment } = await searchParams;
  const profile = await loadProfile();
  const ttsProvider = profile?.tts_provider === "openai" ? "openai" : "browser";

  // Fetch class candidates for the auto-router + class dropdown.
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

    // Fetch up to 10 most recent assignment titles per class. Single query
    // sorted by created_at; group client-side via reducer for simplicity.
    const { data: recentAssignments } = await supabase
      .from("assignments")
      .select("title, class_id, created_at")
      .eq("owner_id", user.id)
      .not("class_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    const recentByClass = new Map<string, string[]>();
    for (const a of recentAssignments ?? []) {
      if (!a.class_id || !a.title) continue;
      const list = recentByClass.get(a.class_id) ?? [];
      if (list.length < 10) list.push(a.title);
      recentByClass.set(a.class_id, list);
    }

    classCandidates = (classes ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      recentTitles: recentByClass.get(c.id) ?? [],
    }));
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">New note</h1>
        <p className="text-sm text-muted">
          Talk or type — Diana saves every 30 seconds.
        </p>
      </header>
      <NoteEditor
        assignmentId={assignment ?? null}
        ttsProvider={ttsProvider}
        classCandidates={classCandidates}
      />
    </div>
  );
}
