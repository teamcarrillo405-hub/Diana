"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Heart, Pause, Play, X } from "lucide-react";
import { StudentDesktopNav, type StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { getAchievements, type AchievementLedger } from "@/lib/dashboard/achievements";
import type { TodayData } from "@/lib/dashboard/today-view";
import { TodayStageLayout, type TodayMode } from "./today-stage-layout";
import { DianaIdleCharacter } from "./lobby/diana-idle-character";
import { LobbyNow } from "./lobby/lobby-now";
import { LobbyProgress } from "./lobby/lobby-progress";
import { AchievementDetails, LobbyAchievements, type Achievement, type WeeklyAward } from "./lobby/lobby-achievements";
import styles from "./today-dashboard.module.css";
import proof from "./lobby/today-now-proof.module.css";
import menu from "./lobby/today-lobby-review.module.css";
import composition from "./lobby/today-now-composition.module.css";
import hub from "./lobby/lobby-consolidation.module.css";
import live from "./lobby/lobby-live.module.css";

const MODES: readonly TodayMode[] = ["now", "week", "milestones"];
const characterAssets = { poster: "/assets/today-now/diana-relit-poster-v1.webp", motion: "/assets/today-now/diana-relit-motion-v1.webm", posterPose: "relit" as const, motionPose: "relit" as const, pixelWidth: 752, pixelHeight: 1920 };

type Dialog = { kind: "check-in" } | { kind: "achievement"; achievement: Achievement };

export function TodayDashboard({ data, profile, checkIn, achievementLedger = null }: { data: TodayData; profile: StudentNavigationProfile; checkIn: ReactNode; achievementLedger?: AchievementLedger | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<TodayMode>("now");
  const [paused, setPaused] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLButtonElement | null>(null);
  const isPaused = paused || mode !== "now" || dialog !== null;
  const weeklyAward: WeeklyAward = { weekLabel: data.weekLabel, completed: data.finished, target: data.total, state: data.weeklyUnavailable ? "unavailable" : data.total === 0 ? "no-goal" : data.finished >= data.total ? "earned" : "in-progress" };
  useEffect(() => {
    if (dialog && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!dialog && dialogRef.current?.open) dialogRef.current.close();
  }, [dialog]);
  function closeDialog() { setDialog(null); origin.current?.focus(); }
  return <div className={`${styles.preview} ${proof.proof} ${menu.lobby} ${composition.composition} ${hub.lobby} ${live.root}`} data-student-shell data-today-dashboard data-lobby-mode={mode} data-now-composition data-now-studio style={{ "--today-scene-image": "url('/assets/today-now/diana-signature-studio-v1-1678.webp')" } as CSSProperties}>
    <div className={composition.environment} aria-hidden="true"><Image src="/assets/today-now/diana-signature-studio-v1-1678.webp" alt="" fill priority unoptimized sizes="100vw" /></div>
    <StudentDesktopNav active="Lobby" {...profile} />
    <div className={`${styles.frame} ${proof.proofFrame}`}>
      <div className={live.sceneTools}>
        <span className={live.mobileDate}>{data.dateLabel}</span>
        <button className={live.motionToggle} aria-label={paused ? "Resume Diana motion" : "Pause Diana motion"} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}<span>{paused ? "Resume motion" : "Pause motion"}</span></button>
      </div>
      <main id="main-content" className={styles.grid} aria-label="Lobby" tabIndex={-1}>
      <h1 className={styles.srOnly}>Lobby</h1>
      <div className={proof.mobileCharacter} aria-hidden="true"><DianaIdleCharacter mobile assets={characterAssets} displayGrade="none" floorMaterial="satin" paused={isPaused} /></div>
      <TodayStageLayout title="Lobby" railHeading={data.dateLabel} modes={MODES} labels={{ week: "Progress", milestones: "Achievements" }} onSelectionChange={setMode} railIndicator artwork={<DianaIdleCharacter assets={characterAssets} displayGrade="none" floorMaterial="satin" paused={isPaused} />}>
        <section className={`${styles.panel} ${proof.nowPanel}`} aria-label="Today's Plan">
          <LobbyNow task={data.plan[0]} unavailable={data.assignmentsUnavailable} onRetry={() => router.refresh()} />
          <div className={hub.checkInAccess}><button className={hub.checkInTrigger} onClick={event => { origin.current = event.currentTarget; setDialog({ kind: "check-in" }); }}><Heart size={18} aria-hidden="true" />Check-in</button><span className={hub.optional}>Optional</span></div>
          <Link className={live.allWork} href="/assignments">View all work</Link>
        </section>
        <section className={`${styles.panel} ${styles.studyPanel}`} aria-label="Study Progress" data-review-performance data-lobby-progress><LobbyProgress data={data} /></section>
        <section className={`${styles.panel} ${styles.achievementPanel}`} aria-label="Achievements" data-review-performance data-lobby-achievements><LobbyAchievements achievements={getAchievements(achievementLedger)} weeklyAward={weeklyAward} onInspect={(achievement, button) => { origin.current = button; setDialog({ kind: "achievement", achievement }); }} /></section>
      </TodayStageLayout>
    </main></div>
    <dialog ref={dialogRef} className={`${hub.checkInDialog} ${live.dialog}`} aria-labelledby="lobby-dialog-title" onClose={closeDialog} onCancel={closeDialog}><button className={hub.close} aria-label="Close" onClick={closeDialog}><X size={20} /></button><h2 id="lobby-dialog-title">{dialog?.kind === "achievement" ? dialog.achievement.title : "Check-in"}</h2><div hidden={dialog?.kind !== "check-in"}>{checkIn}</div>{dialog?.kind === "achievement" && <AchievementDetails achievement={dialog.achievement} />}</dialog>
  </div>;
}
