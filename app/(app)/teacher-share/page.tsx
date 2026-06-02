import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { classCompletionAnalytics } from "@/lib/portal/teacher";
import { IepImport } from "../settings/iep-import";
import { TeacherPortalClient } from "./teacher-portal-client";

export default async function TeacherPortalPage() {
  const supabase = await createClient();
  const profile = await loadProfile();
  const { data: { user } } = await supabase.auth.getUser();

  const ownerId = user?.id ?? "";
  const [{ data: classes }, { data: assignments }, { data: roster }, { data: notes }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, ai_mode")
      .eq("owner_id", ownerId)
      .order("name"),
    supabase
      .from("assignments")
      .select("id, title, class_id, status, ai_mode_override")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("class_roster_members")
      .select("id, class_id, display_name, role, status, email")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("teacher_progress_notes")
      .select("id, author_name, note_text, visible_to_parent, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const classRows = (classes ?? []) as Array<{ id: string; name: string; ai_mode: string }>;
  const assignmentRows = (assignments ?? []) as Array<{
    id: string;
    title: string;
    class_id: string;
    status: string;
    ai_mode_override: string | null;
  }>;
  const analytics = classCompletionAnalytics(classRows.map((row) => row.id), assignmentRows);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Teacher portal</p>
        <h1 className="text-2xl font-bold">Assignments, roster, and accommodations</h1>
        <p className="text-sm text-muted">
          Student-controlled tools for teacher-created work, class contacts, AI policy, progress notes, and IEP / 504 setup.
        </p>
      </header>

      <TeacherPortalClient
        classes={classRows}
        assignments={assignmentRows}
        roster={(roster ?? []) as Array<{ id: string; class_id: string; display_name: string; role: string; status: string; email: string | null }>}
        notes={(notes ?? []) as Array<{ id: string; author_name: string; note_text: string; visible_to_parent: boolean; created_at: string }>}
        analytics={analytics}
        profile={{
          extra_time_pct: Number(profile?.extra_time_pct ?? 0),
          tts_enabled: Boolean(profile?.tts_enabled),
          dyslexia_font: Boolean(profile?.dyslexia_font),
          accommodations: (profile?.accommodations ?? []) as string[],
        }}
      />

      <IepImport />
    </div>
  );
}
