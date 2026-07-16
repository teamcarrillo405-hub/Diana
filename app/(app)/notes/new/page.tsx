import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { NotebookPen } from "lucide-react";
import type { ClassCandidate } from "@/lib/notes/class-router";
import { NoteEditor } from "./note-editor";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";

const SF = "var(--font-display)";
const BODY = "var(--font-body)";

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
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>

        {/* Hero */}
        <header style={{ display: "grid", gap: "var(--space-8)" }}>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-purple-light)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <NotebookPen size={13} aria-hidden="true" />
            Notes studio
          </p>
          <h1 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0, maxWidth: "20ch" }}>
            Start with whatever you have.
          </h1>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-16)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", maxWidth: "44ch", margin: 0 }}>
            Type, talk, upload audio, or scan a page. Diana saves the capture and routes it to the right class.
          </p>
        </header>

        {/* Note editor */}
        <NoteEditor
          assignmentId={assignment ?? null}
          ttsProvider={ttsProvider}
          classCandidates={classCandidates}
        />
      </div>
      <StudentBottomNav />
    </div>
  );
}
