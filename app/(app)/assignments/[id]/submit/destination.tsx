"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import styles from "@/components/student-shell/submission.module.css";
import { setSubmissionUrl } from "../actions";
import { submissionWebLink } from "./web-link";

export function SubmissionDestination({ assignmentId, currentUrl, externalUrl, externalLabel, onOpenSchool, title, children, extraAction }: {
  assignmentId: string;
  currentUrl: string | null;
  externalUrl: string | null;
  externalLabel: string;
  onOpenSchool?: () => void;
  title: string;
  children: ReactNode;
  extraAction?: ReactNode;
}) {
  const inputId = useId();
  const [savedUrl, setSavedUrl] = useState(currentUrl);
  const [url, setUrl] = useState(currentUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const directLink = submissionWebLink(externalUrl);
  const studentLink = submissionWebLink(savedUrl);

  function saveUrl() {
    const value = url.trim();
    const link = submissionWebLink(value);
    if (value && !link) {
      setMessage("Enter a web link beginning with https:// or http://.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await setSubmissionUrl({ id: assignmentId, url: link });
      if (result.error) return setMessage(result.error);
      setSavedUrl(link);
      setUrl(link ?? "");
      setMessage(link ? "Submission link saved." : "Submission link removed.");
    });
  }

  return (
    <section className={styles.paper} aria-labelledby="submission-destination-title">
      <div className={styles.panelHeading}>
        <MapPin size={23} aria-hidden="true" />
        <div><p className={styles.eyebrow}>Destination</p><h2 id="submission-destination-title">{title}</h2></div>
      </div>
      <div className={styles.instructions}>{children}</div>
      {directLink || studentLink || extraAction ? (
        <div className={styles.controls}>
          {extraAction}
          {directLink ? <a className={styles.secondary} href={directLink} target="_blank" rel="noopener noreferrer" onClick={onOpenSchool}><ExternalLink size={17} aria-hidden="true" />{externalLabel}</a> : null}
          {studentLink && studentLink !== directLink ? <a className={styles.secondary} href={studentLink} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} aria-hidden="true" />Open saved submission link</a> : null}
        </div>
      ) : null}
      <details className={styles.options}>
        <summary>{savedUrl ? "Edit saved submission link" : "Add a submission link"}</summary>
        <form className={styles.form} noValidate onSubmit={(event) => { event.preventDefault(); saveUrl(); }}>
          <label htmlFor={inputId}>Submission link, optional</label>
          <div>
            <input id={inputId} type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" disabled={pending} />
            <button type="submit" className={styles.secondary} disabled={pending || url.trim() === (savedUrl ?? "")}>
              {pending ? "Saving" : savedUrl && !url.trim() ? "Remove link" : "Save link"}
            </button>
          </div>
        </form>
        {message ? <p className={styles.notice} role="status">{message}</p> : null}
      </details>
    </section>
  );
}
