import { ArrowLeft, CheckCircle2, FileText } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/capture.module.css";
import { createClient } from "@/lib/supabase/server";
import { ConfirmForm } from "@/app/(app)/inbox/[id]/confirm-form";

async function CaptureReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("inbox_items")
    .select(
      "id, raw, capture_mode, status, photo_storage_key, suggested_class_id, suggested_kind, suggested_due_at, suggestion_confidence, assignment_id, created_at",
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (!item) notFound();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, color")
    .eq("owner_id", user.id)
    .is("archived_at", null)
    .order("name", { ascending: true });

  let signedPhotoUrl: string | null = null;
  if (item.photo_storage_key) {
    const { data: signed } = await supabase.storage
      .from("inbox-photos")
      .createSignedUrl(item.photo_storage_key, 300);
    signedPhotoUrl = signed?.signedUrl ?? null;
  }

  const hasSuggestion =
    item.suggested_class_id !== null &&
    item.suggestion_confidence !== null &&
    item.suggestion_confidence >= 0.7;

  return (
    <StudentShell active="Work" className={styles.root} version="12">
      <main id="main-content" className={styles.main}>
        <Link href="/assignments"><ArrowLeft size={18} aria-hidden="true" /> Back to Work</Link>
        {item.status === "converted" && item.assignment_id ? (
          <section className="sd-inbox-terminal-state">
            <CheckCircle2 aria-hidden="true" />
            <p>Assignment added</p>
            <h1>Ready to start</h1>
            <Link href={`/assignments/${item.assignment_id}`}>Open assignment</Link>
          </section>
        ) : item.status === "dismissed" ? (
          <section className="sd-inbox-terminal-state">
            <FileText aria-hidden="true" />
            
            <h1>Capture set aside</h1>
            <Link href="/assignments">Return to Work</Link>
          </section>
        ) : (
          <>
            <section className="sd-inbox-capture-copy">
              <h1>Review capture</h1>
              <p>{item.raw.replace(/^\[Grayson demo\]\s*/iu, "")}</p>
              <time dateTime={item.created_at}>
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(item.created_at))}
              </time>
            </section>

            {signedPhotoUrl ? (
              // Captured student media remains owner-scoped through a short signed URL.
              <img
                className="sd-inbox-photo"
                src={signedPhotoUrl}
                alt="Captured schoolwork"
              />
            ) : null}

            <ConfirmForm
              inboxItemId={item.id}
              classes={classes ?? []}
              suggestedClassId={hasSuggestion ? item.suggested_class_id : null}
              suggestedKind={hasSuggestion ? item.suggested_kind : null}
              suggestedDueAt={hasSuggestion ? item.suggested_due_at : null}
            />
          </>
        )}
      </main>
    </StudentShell>
  );
}

export default CaptureReviewPage;
