"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import type { DianaMotionStatus } from "./diana-idle-character";
import styles from "./today-now-proof.module.css";

export function dianaMotionPauseLabel(enabled: boolean, paused: boolean, status: DianaMotionStatus) {
  if (!enabled) return "Diana motion off";
  if (status === "reduced-motion") return "Diana motion off for reduced motion";
  if (status === "loading") return "Loading Diana motion";
  if (status === "unavailable") return "Diana motion unavailable";
  if (status === "performance-still") return "Diana still image";
  return paused ? "Play Diana motion" : "Pause Diana motion";
}

export function DianaMotionStatusMessage({ enabled, status }: { enabled: boolean; status: DianaMotionStatus }) {
  const message = !enabled ? "" : status === "unavailable"
    ? "Motion unavailable. Diana's still image is displayed."
    : status === "performance-still"
      ? "Diana's still image is displayed to keep this device smooth."
      : status === "reduced-motion"
        ? "Diana's still image is displayed for reduced motion."
        : "";
  return <span className={styles.motionStatus} role="status" aria-live="polite" aria-atomic="true">{message}</span>;
}

export function DianaMotionControls({ enabled, paused, status, onMode, onPause, onRestart, hidePause = false, hideStatus = false }: {
  enabled: boolean;
  paused: boolean;
  status: DianaMotionStatus;
  onMode: (motion: boolean) => void;
  onPause: () => void;
  onRestart: () => void;
  hidePause?: boolean;
  hideStatus?: boolean;
}) {
  const reduced = status === "reduced-motion";
  const motion = enabled && !reduced;
  const unavailable = status === "unavailable";
  const performanceStill = status === "performance-still";
  const pauseLabel = dianaMotionPauseLabel(enabled, paused, status);
  return <div className={styles.motionControls} role="group" aria-label="Diana appearance">
    <div className={styles.motionModes} role="group" aria-label="Character mode">
      <button type="button" aria-pressed={!motion} onClick={() => onMode(false)}>Still</button>
      <button type="button" aria-pressed={motion} disabled={reduced} title={reduced ? "Reduced motion is enabled" : undefined} onClick={() => onMode(true)}>Motion</button>
    </div>
    <div className={styles.motionActions}>
      {!hidePause && <button type="button" disabled={!motion || unavailable || performanceStill || status === "loading"} onClick={onPause} aria-label={pauseLabel} title={pauseLabel}>{paused ? <Play size={17} /> : <Pause size={17} />}</button>}
      <button type="button" disabled={!motion} onClick={onRestart} aria-label="Restart Diana motion" title="Restart Diana motion"><RotateCcw size={17} /></button>
    </div>
    {!hideStatus && <DianaMotionStatusMessage enabled={enabled} status={status} />}
  </div>;
}
