"use client";

import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Pause, Play, RotateCcw, Settings2, Volume2, VolumeX } from "lucide-react";
import { DianaMotionControls, DianaMotionStatusMessage, dianaMotionPauseLabel } from "./diana-motion-controls";
import styles from "./today-lobby-review.module.css";

export function TodayReviewTools({ children, sound, ...motion }: ComponentProps<typeof DianaMotionControls> & { children: ReactNode; sound?: { enabled: boolean; available: boolean; onToggle: () => void } }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const retry = (motion.status === "unavailable" || motion.status === "performance-still") && motion.enabled;
  const loading = motion.enabled && motion.status === "loading";
  const motionLabel = retry ? "Retry Diana motion" : dianaMotionPauseLabel(motion.enabled, motion.paused, motion.status);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <aside className={styles.reviewBar} aria-label="Design preview controls">
    <span className={styles.previewLabel}>Design preview <span aria-hidden="true">/</span> Sample data</span>
    <DianaMotionStatusMessage enabled={motion.enabled} status={motion.status} />
    <div ref={root} className={styles.reviewActions} onKeyDown={event => {
      if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); toggle.current?.focus(); }
    }}>
      <button type="button" disabled={!motion.enabled || motion.status === "reduced-motion" || loading} onClick={retry ? motion.onRestart : motion.onPause} aria-label={motionLabel} title={motionLabel}>{retry ? <RotateCcw size={17} /> : motion.paused ? <Play size={17} /> : <Pause size={17} />}</button>
      <button ref={toggle} type="button" aria-label="Review controls" title="Review controls" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}><Settings2 size={18} /></button>
      <div id={id} className={styles.reviewTray} hidden={!open}>
        <p>Preview scenario</p>
        {children}
        <p>Diana appearance</p>
        <DianaMotionControls {...motion} hidePause hideStatus />
        {sound && <div className={styles.soundSetting}><span>Menu sound<small>{sound.available ? sound.enabled ? "On" : "Off" : "Unavailable"}</small></span><button type="button" aria-label="Menu sound" title={sound.enabled ? "Mute menu sound" : "Enable menu sound"} aria-pressed={sound.enabled} disabled={!sound.available} onClick={sound.onToggle}>{sound.enabled ? <Volume2 size={19} /> : <VolumeX size={19} />}</button></div>}
      </div>
    </div>
  </aside>;
}
