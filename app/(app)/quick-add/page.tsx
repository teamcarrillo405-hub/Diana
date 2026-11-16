import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentShell } from "@/components/student-shell/student-shell";
import { WORK_RETURN_PATH } from "@/lib/assignment-navigation";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { AssignmentUploadForm } from "./assignment-upload-form";
import styles from "./intake.module.css";

export default async function QuickAddPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; classId?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, { data: classes, error }, params] = await Promise.all([
    loadProfile(),
    supabase.from("classes").select("id,name").eq("owner_id", user.id).is("archived_at", null).order("name"),
    searchParams,
  ]);
  const classId = params.classId ?? params.class;
  const retryPath = classId ? `/quick-add?classId=${encodeURIComponent(classId)}` : "/quick-add";

  return (
    <StudentShell active="Work" showAdd={false} profile={{
      displayName: profile?.display_name,
      photoUrl: profile?.photo_url,
      photoOffsetX: profile?.photo_offset_x,
      photoOffsetY: profile?.photo_offset_y,
    }}>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Link href={WORK_RETURN_PATH} className={styles.back}><ArrowLeft size={17} aria-hidden="true" /> Work</Link>
        <header className={styles.heading}><h1>Add assignment</h1></header>
        {error ? (
          <section className={`${styles.panel} ${styles.notice}`}>
            <h2>Classes couldn’t load</h2>
            <Link className={styles.secondary} href={retryPath}>Try again</Link>
          </section>
        ) : classes?.length ? (
          <AssignmentUploadForm classes={classes} initialClassId={classId} />
        ) : (
          <section className={`${styles.panel} ${styles.notice}`}>
            <h2>Add a class first</h2>
            <Link className={styles.primary} href="/classes?create=1&intake=add">Add class <Plus size={18} aria-hidden="true" /></Link>
          </section>
        )}
      </main>
    </StudentShell>
  );
}
