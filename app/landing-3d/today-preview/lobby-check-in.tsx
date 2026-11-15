"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Heart, X } from "lucide-react";
import { TodayCheckInReview } from "./today-check-in-review";
import { containDialogTab } from "./dialog-keyboard";
import styles from "./lobby-consolidation.module.css";

export function LobbyCheckIn({ onSaved, onOpenChange }: { onSaved: () => void; onOpenChange: (open: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [host, setHost] = useState<Element | null>(null);
  // Keep the modal outside panels that can become inert at the desktop breakpoint.
  useEffect(() => { setHost(trigger.current?.closest("[data-lobby-mode]") ?? null); }, []);
  function close() {
    onOpenChange(false);
    const origin = trigger.current;
    const target = origin && !origin.closest("[inert], [aria-hidden='true']") ? origin : host?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    target?.focus({ preventScroll: true });
  }
  return <div className={styles.checkInAccess}>
    <button ref={trigger} type="button" aria-haspopup="dialog" className={styles.checkInTrigger} onClick={() => { dialog.current?.showModal(); onOpenChange(true); }}><Heart size={19} aria-hidden="true" /><span>Check in</span></button>
    <span className={styles.optional}>Optional</span>
    {host && createPortal(<dialog ref={dialog} className={styles.checkInDialog} aria-label="Check-In" onKeyDown={containDialogTab} onCancel={event => { event.preventDefault(); dialog.current?.close(); }} onClose={close}>
      <button type="button" className={styles.close} aria-label="Close check-in" onClick={() => dialog.current?.close()}><X size={22} aria-hidden="true" /></button>
      <TodayCheckInReview onSaved={onSaved} />
    </dialog>, host)}
  </div>;
}
