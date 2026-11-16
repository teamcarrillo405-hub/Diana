import { ArrowLeft, ArrowRight, Camera, FileText, Mic } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentShell } from "@/components/student-shell/student-shell";
import { WORK_RETURN_PATH } from "@/lib/assignment-navigation";
import styles from "../../quick-add/intake.module.css";

function captureSummary(raw: string) {
  const content = raw.replace(/^\[Grayson demo\]\s*/iu, "").replace(/\s+/gu, " ").trim();
  return content.length > 100 ? `${content.slice(0, 100).trimEnd()}…` : content;
}

export default async function CapturesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.from("inbox_items")
    .select("id,raw,created_at,capture_mode")
    .eq("owner_id", user.id)
    .in("status", ["unclassified", "classified"])
    .order("created_at", { ascending: false });
  const captures = data ?? [];
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

  return (
    <StudentShell active="Work">
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Link href={WORK_RETURN_PATH} className={styles.back}><ArrowLeft size={17} aria-hidden="true" /> Work</Link>
        <header className={styles.heading}><h1>Captured work</h1></header>
        {error ? (
          <section className={`${styles.panel} ${styles.notice}`}>
            <h2>Captured work couldn’t load</h2>
            <Link href="/assignments/captures" className={styles.secondary}>Try again</Link>
          </section>
        ) : captures.length ? (
          <ul className={styles.list} aria-label="Captures to review">
            {captures.map(capture => {
              const Icon = capture.capture_mode === "photo" ? Camera : capture.capture_mode === "voice" ? Mic : FileText;
              const label = capture.capture_mode === "photo" ? "Photo" : capture.capture_mode === "voice" ? "Voice note" : "Text";
              return (
                <li key={capture.id}>
                  <Link className={styles.captureRow} href={`/assignments/captures/${capture.id}`}>
                    <Icon size={19} aria-hidden="true" />
                    <span>
                      <strong>{captureSummary(capture.raw) || label}</strong>
                      <small className={styles.muted}>{label} · <time dateTime={capture.created_at}>{date.format(new Date(capture.created_at))}</time></small>
                    </span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <section className={`${styles.panel} ${styles.notice}`}><h2>No captures to review</h2></section>
        )}
      </main>
    </StudentShell>
  );
}
