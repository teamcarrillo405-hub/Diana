"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Heart, Pause, Play, X } from "lucide-react";
import { StudentDesktopNav, type StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import type { TodayData } from "@/lib/dashboard/today-view";
import { TodayStageLayout, type TodayMode } from "./today-stage-layout";
import { DianaIdleCharacter } from "./lobby/diana-idle-character";
import { LobbyNow } from "./lobby/lobby-now";
import { LobbyProgress } from "./lobby/lobby-progress";
import { LobbyHistory } from "./lobby/lobby-history";
import styles from "./today-dashboard.module.css";
import proof from "./lobby/today-now-proof.module.css";
import menu from "./lobby/today-lobby-review.module.css";
import composition from "./lobby/today-now-composition.module.css";
import hub from "./lobby/lobby-consolidation.module.css";
import live from "./lobby/lobby-live.module.css";
import campus from "./lobby/campus-lobby.module.css";

const MODES: readonly TodayMode[] = ["now", "week", "milestones"];
const characterAssets = { poster: "/assets/today-now/diana-relit-poster-v1.webp", motion: "/assets/today-now/diana-relit-motion-v1.webm", posterPose: "relit" as const, motionPose: "relit" as const, pixelWidth: 752, pixelHeight: 1920 };

export function TodayDashboard({ data, profile, checkIn }: { data: TodayData; profile: StudentNavigationProfile; checkIn: ReactNode }) {
  const router = useRouter();
  const [mode, setMode] = useState<TodayMode>("now");
  const [paused, setPaused] = useState(false);
  const [dialog, setDialog] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLButtonElement | null>(null);
  const isPaused = paused || mode !== "now" || dialog;
  useEffect(() => {
    if (dialog && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!dialog && dialogRef.current?.open) dialogRef.current.close();
  }, [dialog]);
  function closeDialog() { setDialog(false); origin.current?.focus(); }
  return <div className={`${styles.preview} ${proof.proof} ${menu.lobby} ${composition.composition} ${hub.lobby} ${live.root} ${campus.campus}`} data-student-shell data-today-dashboard data-lobby-mode={mode} data-now-composition data-now-studio style={{ "--today-scene-image": "url('/assets/today-now/diana-campus-study-v1.webp')" } as CSSProperties}>
    <div className={composition.environment} aria-hidden="true"><Image src="/assets/today-now/diana-campus-study-v1.webp" alt="" fill priority unoptimized sizes="100vw" /></div>
    <StudentDesktopNav active="Lobby" {...profile} />
    <div className={`${styles.frame} ${proof.proofFrame}`}>
      <div className={live.sceneTools}>
        <span className={live.mobileDate}>{data.dateLabel}</span>
        <button className={live.motionToggle} aria-label={paused ? "Resume Diana motion" : "Pause Diana motion"} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}<span>{paused ? "Resume motion" : "Pause motion"}</span></button>
      </div>
      <main id="main-content" className={styles.grid} aria-label="Lobby" tabIndex={-1}>
      <h1 className={styles.srOnly}>Lobby</h1>
      <TodayStageLayout title="Lobby" railHeading={<><span className={campus.railIdentity}>DIANA <b>CAMPUS</b></span><span className={campus.railDate}>{data.dateLabel}</span></>} modes={MODES} labels={{ week: "Progress", milestones: "My Work" }} onSelectionChange={setMode} railIndicator artwork={<DianaIdleCharacter assets={characterAssets} displayGrade="none" floorMaterial="satin" paused={isPaused} />}>
        <section className={`${styles.panel} ${proof.nowPanel}`} aria-label="Today's Plan">
          <LobbyNow task={data.plan[0]} unavailable={data.assignmentsUnavailable} onRetry={() => router.refresh()} />
          <div className={hub.checkInAccess}><button className={hub.checkInTrigger} onClick={event => { origin.current = event.currentTarget; setDialog(true); }}><Heart size={18} aria-hidden="true" />Check-in</button><span className={hub.optional}>Optional</span></div>
          <Link className={live.allWork} href="/assignments">View all work</Link>
          <div className={campus.mobileGuide} aria-hidden="true"><div><span>YOUR STUDY SPACE</span><strong>One step at a time.</strong></div><div className={`${proof.mobileCharacter} ${campus.mobileFigure}`}><DianaIdleCharacter mobile assets={characterAssets} displayGrade="none" floorMaterial="satin" paused={isPaused} /></div></div>
        </section>
        <section className={`${styles.panel} ${styles.studyPanel}`} aria-label="Study Progress" data-review-performance data-lobby-progress><LobbyProgress data={data} /></section>
        <section className={`${styles.panel} ${campus.historyPanel}`} aria-label="My Work" data-review-performance data-lobby-history><LobbyHistory data={data} /></section>
      </TodayStageLayout>
    </main></div>
    <dialog ref={dialogRef} className={`${hub.checkInDialog} ${live.dialog}`} aria-labelledby="lobby-dialog-title" onClose={closeDialog} onCancel={closeDialog}><button className={hub.close} aria-label="Close" onClick={closeDialog}><X size={20} /></button><h2 id="lobby-dialog-title">Check-in</h2><div hidden={!dialog}>{checkIn}</div></dialog>
  </div>;
}
