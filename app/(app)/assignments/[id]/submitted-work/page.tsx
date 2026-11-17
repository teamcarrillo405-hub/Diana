import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import { z } from "zod";

import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/submission.module.css";
import { SubmittedPdfPreview } from "@/components/submitted-pdf-preview";
import { WORK_RETURN_PATH } from "@/lib/assignment-navigation";
import { formatHandInTime } from "@/lib/assignment-submission-time";
import { loadSubmittedWork, submittedFilePath } from "@/lib/assignment-submitted-work";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { submissionWebLink } from "../submit/web-link";

export default async function SubmittedWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [work, profile] = await Promise.all([
    loadSubmittedWork({ supabase, ownerId: user.id, assignmentId: id.data }),
    loadProfile(),
  ]);
  if (!work) notFound();

  const { assignment, provider, copy } = work;
  const title = copy?.source === "school" ? "Copy sent to school" : copy ? "Diana’s saved copy" : "Saved copy";
  const schoolUrl = submissionWebLink(assignment.externalUrl) ?? submissionWebLink(assignment.submissionUrl);
  const submittedTime = formatHandInTime(assignment.submittedAt, profile?.timezone);
  const file = copy?.kind === "file" ? copy : null;
  const fileUrl = file ? submittedFilePath(assignment.id, file.id) : null;
  const pdf = file?.mimeType === "application/pdf";

  return (
    <StudentShell active="Work" className={styles.root} profile={{
      displayName: profile?.display_name,
      photoUrl: profile?.photo_url,
      photoOffsetX: profile?.photo_offset_x,
      photoOffsetY: profile?.photo_offset_y,
    }}>
      <main id="main-content" className={styles.main}>
        <nav aria-label="Submission navigation" className={styles.routeLinks}>
          <Link href={`/assignments/${assignment.id}/submit`} className={styles.back}><ArrowLeft size={18} aria-hidden="true" />Back to submission</Link>
          <Link href={WORK_RETURN_PATH} className={styles.back}>Back to Work</Link>
        </nav>
        <header className={styles.title}>
          <p className={styles.eyebrow}>Submitted work</p>
          <h1>{assignment.title}</h1>
          <p className={styles.submittedMeta}>{assignment.className} · {provider ? `Confirmed by ${provider}` : "Recorded in Diana"}
            {assignment.submittedAt && submittedTime ? <> · <time dateTime={assignment.submittedAt}>{submittedTime}</time></> : null}
          </p>
        </header>
        <section className={`${styles.paper} ${styles.submittedPacket}`} aria-labelledby="saved-work-title">
          <header className={styles.submittedPacketHeader}>
            <div className={styles.panelHeading}>
              <FileText size={23} aria-hidden="true" />
              <div>
                <h2 id="saved-work-title">{title}</h2>
                {file ? <p className={styles.savedFilename}>{file.filename}</p> : null}
              </div>
            </div>
            {fileUrl || schoolUrl ? (
              <div className={styles.controls}>
                {fileUrl ? <a href={fileUrl} className={styles.primary} download><Download size={17} aria-hidden="true" />{pdf ? "Download PDF" : "Download file"}</a> : null}
                {schoolUrl ? <a href={schoolUrl} target="_blank" rel="noopener noreferrer" className={styles.secondary}>Open school assignment<ExternalLink size={16} aria-hidden="true" /></a> : null}
              </div>
            ) : null}
          </header>
          {copy?.source === "diana" ? <p className={styles.savedCopyNote}>Diana saved this copy before you recorded the hand-in.</p> : null}
          {pdf && fileUrl ? <SubmittedPdfPreview key={fileUrl} url={fileUrl} /> : null}
          {copy?.kind === "text" ? <pre className={styles.submittedText}>{copy.text}</pre> : null}
          {!copy ? <p className={styles.savedCopyNote}>{work.copyUnavailable ? "Diana couldn’t open the saved copy for this hand-in." : "Diana has no saved copy for this hand-in."}</p> : null}
        </section>
      </main>
    </StudentShell>
  );
}
