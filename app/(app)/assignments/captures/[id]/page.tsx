import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { StudentShell } from "@/components/student-shell/student-shell";
import { createClient } from "@/lib/supabase/server";
import { hasOwnerStoragePrefix } from "@/lib/security/upload-validation";
import { ConfirmForm } from "@/app/(app)/inbox/[id]/confirm-form";
import styles from "../../../quick-add/intake.module.css";

const CAPTURES_PATH = "/assignments/captures";

export default async function CaptureReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reviewPath = `${CAPTURES_PATH}/${id.data}`;
  const { data: item, error } = await supabase.from("inbox_items")
    .select("id,raw,capture_mode,status,photo_storage_key,suggested_class_id,suggested_kind,suggested_due_at,suggestion_confidence,assignment_id")
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!item && !error) notFound();

  const terminal = item?.status === "converted" || item?.status === "dismissed";
  const original = item?.raw.replace(/^\[Grayson demo\]\s*/iu, "").trim() ?? "";
  const photoKey = item?.photo_storage_key;
  const [classes, photo] = item && !terminal ? await Promise.all([
    supabase.from("classes").select("id,name").eq("owner_id", user.id).is("archived_at", null).order("name"),
    photoKey && hasOwnerStoragePrefix(user.id, photoKey) ? supabase.storage.from("inbox-photos").createSignedUrl(photoKey, 300) : null,
  ]) : [null, null];
  const hasSuggestion = (item?.suggestion_confidence ?? 0) >= 0.7;
  const heading = item?.status === "converted" ? "Assignment added" : item?.status === "dismissed" ? "Capture set aside" : "Review capture";

  return (
    <StudentShell active="Work" className={styles.room}>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <Link href={CAPTURES_PATH} className={styles.back}><ArrowLeft size={17} aria-hidden="true" /> Captured work</Link>
        <header className={styles.heading}><h1>{heading}</h1></header>
        {error || !item ? (
          <section className={`${styles.panel} ${styles.notice}`}>
            <h2>This capture couldn’t load</h2>
            <Link className={styles.secondary} href={reviewPath}>Try again</Link>
          </section>
        ) : terminal ? (
          <section className={`${styles.panel} ${styles.notice}`}>
            {item.status === "converted" && item.assignment_id ? (
              <Link className={styles.primary} href={`/assignments/${item.assignment_id}`}>
                Open assignment <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ) : (
              <p className={styles.muted}>{item.status === "converted" ? "The assignment is no longer available." : "You can review your other captures in Captured work."}</p>
            )}
          </section>
        ) : (
          <div className={styles.reviewGrid}>
            <section className={`${styles.panel} ${styles.original}`}>
              <h2>{item.capture_mode === "photo" ? "Original photo" : item.capture_mode === "voice" ? "Voice transcript" : "Original text"}</h2>
              {item.capture_mode === "photo" ? photo?.data?.signedUrl ? (
                // This owner-scoped URL expires shortly after it is issued.
                <img src={photo.data.signedUrl} alt="Captured schoolwork" />
              ) : (
                <div className={styles.notice}><p>Photo couldn’t load.</p><Link className={styles.secondary} href={reviewPath}>Try again</Link></div>
              ) : <p className={styles.sourceText}>{original}</p>}
            </section>
            <ConfirmForm
              inboxItemId={item.id}
              classes={classes?.data ?? []}
              classLoadError={Boolean(classes?.error)}
              defaultTitle={original.replace(/\s+/gu, " ").slice(0, 160) || "Captured assignment"}
              suggestedClassId={hasSuggestion ? item.suggested_class_id : null}
              suggestedKind={hasSuggestion ? item.suggested_kind : null}
              suggestedDueAt={hasSuggestion ? item.suggested_due_at : null}
            />
          </div>
        )}
      </main>
    </StudentShell>
  );
}
