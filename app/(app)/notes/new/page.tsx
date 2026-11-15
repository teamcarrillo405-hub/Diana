import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/capture.module.css";
import { loadProfile } from "@/lib/profile";
import type { ClassCandidate } from "@/lib/notes/class-router";
import { createClient } from "@/lib/supabase/server";
import { NoteEditor } from "./note-editor";

type NoteMode = "text" | "voice" | "audio" | "photo-pdf";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string; class?: string; mode?: string }>;
}) {
  const { assignment, class: requestedClassId, mode } = await searchParams;
  const profile = await loadProfile();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let classCandidates: ClassCandidate[] = [];

  if (user) {
    const [{ data: classes }, { data: recentAssignments }] = await Promise.all([
      supabase
        .from("classes")
        .select("id, name")
        .eq("owner_id", user.id)
        .is("archived_at", null)
        .order("name", { ascending: true })
        .limit(20),
      supabase
        .from("assignments")
        .select("title, class_id, created_at")
        .eq("owner_id", user.id)
        .not("class_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

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

  const initialMode: NoteMode = mode === "voice" || mode === "audio" || mode === "photo-pdf" ? mode : "text";
  const initialClassId = classCandidates.some((candidate) => candidate.id === requestedClassId)
    ? requestedClassId ?? null
    : null;

  return <StudentShell active="More" version="12" className={styles.root} profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url,photoOffsetX:profile?.photo_offset_x,photoOffsetY:profile?.photo_offset_y}}><main id="main-content" className={styles.main}><Link className={styles.back} href="/notes">Back to Notes</Link><header className={styles.heading}><h1>Add note</h1></header><NoteEditor assignmentId={assignment ?? null} initialClassId={initialClassId} initialMode={initialMode} classCandidates={classCandidates} /></main></StudentShell>;
}
