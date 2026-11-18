"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectLms } from "./lms-actions";
import styles from "./source-disconnect-button.module.css";

export function SourceDisconnectButton({ connectionId, calendarOnly = false }: {
  connectionId: string;
  calendarOnly?: boolean;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [message, setMessage] = useState("");

  function remove() {
    if (busy.current) return;
    busy.current = true;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await disconnectLms(connectionId);
        if (result.ok) {
          setRemoved(true);
          setConfirming(false);
          setMessage("Connection removed. Imported data is still in Diana.");
          router.refresh();
        } else {
          setMessage(result.message);
        }
      } catch {
        setMessage("The connection could not be removed. Try again shortly.");
      } finally {
        busy.current = false;
      }
    });
  }

  return <span className={styles.control}>
    {!removed ? <button ref={trigger} type="button" disabled={pending} aria-expanded={confirming} onClick={() => {
      setConfirming(value => !value);
      setMessage("");
    }}>Remove connection</button> : null}
    {confirming ? <span className={styles.confirmation} role="group" aria-label="Confirm Google connection removal">
      <span>{calendarOnly ? "Google Calendar syncing will stop." : "Google Calendar and Google Classroom syncing will stop."} Imported events, classes, and assignments will stay in Diana. Google Account permissions stay unchanged.</span>
      <span className={styles.actions}>
        <button type="button" disabled={pending} onClick={() => { setConfirming(false); setMessage(""); trigger.current?.focus(); }}>Cancel</button>
        <button type="button" disabled={pending} onClick={remove}>{pending ? "Removing" : "Confirm removal"}</button>
      </span>
    </span> : null}
    {message ? <output className={styles.feedback} data-attention={!removed || undefined} role="status" aria-live="polite">{message}</output> : null}
  </span>;
}
