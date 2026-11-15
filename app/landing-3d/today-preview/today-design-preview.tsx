"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { PreviewNavigation } from "../_components/preview-navigation";
import { WorkspaceConceptReview } from "../workspace-concept-review/workspace-concept-review";
import { lobbyWorkspaceFixture, type FixtureId } from "../workspace-concept-review/fixtures";
import { ArrowUpRight, Award, BookOpen, CalendarDays, CheckCheck, ChevronRight, FileCheck2, Heart, LayoutGrid, MoreHorizontal, Plus, RotateCcw, Settings2, Sparkles, Timer, X } from "lucide-react";
import { DianaWordmark } from "@/components/screen-design/primitives";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { formatMinutes, getPreviewData, reviewSubjectColors, type PreviewScenario, type PreviewTask } from "./preview-data";
import styles from "@/components/dashboard/today-dashboard.module.css";
import { PanelHeading, ProgressRing, WeeklyBars, SubjectDonut } from "@/components/dashboard/today-graphics";
import { TodayStageLayout, type TodayMode } from "@/components/dashboard/today-stage-layout";
import { TodayNowProof } from "./today-now-proof";
import { DianaIdleCharacter, type DianaCharacterAssets, type DianaMotionStatus } from "./diana-idle-character";
import { TodayReviewTools } from "./today-review-tools";
import { TodaySessionPreview } from "./today-session-preview";
import { TodayWeekReview, type MilestoneKind, type ReviewMilestone } from "./today-progress-review";
import { AchievementDetails, TodayAchievementsReview } from "./today-achievements-review";
import { usePreviewAchievements } from "./use-preview-achievements";
import { usePreviewWeeklyAward } from "./use-preview-weekly-award";
import { TodayUpcomingReview } from "./today-upcoming-review";
import { TodayCheckInReview } from "./today-check-in-review";
import { TodayStudyMixReview } from "./today-study-mix-review";
import proofStyles from "./today-now-proof.module.css";
import lobbyStyles from "./today-lobby-review.module.css";
import type { TimerState } from "@/lib/timer/timer";
import { useMenuAudio } from "./use-menu-audio";
import compositionStyles from "./today-now-composition.module.css";
import sceneAssets from "./diana-scene-assets.json";
import { usePreviewLaunch, type PreviewSessionServices } from "./use-preview-launch";
import { TodayLaunchDialog } from "./today-launch-dialog";
import { containDialogTab } from "./dialog-keyboard";
import { TODAY_TIMING, useTodaySequence } from "./use-today-sequence";
import { LobbyCheckIn } from "./lobby-check-in";
import { LobbyProgressReview } from "./lobby-progress-review";
import hubStyles from "./lobby-consolidation.module.css";

const LOBBY_MODES: readonly TodayMode[] = ["now", "week", "milestones"];

const reviewedAssets = { poster: sceneAssets.matchingPoster.src, motion: sceneAssets.motion.src, posterPose: "motion" as const, pixelWidth: sceneAssets.motion.width, pixelHeight: sceneAssets.motion.height };

export type TodayCharacterAssets = DianaCharacterAssets & { displayGrade?: CSSProperties["filter"] };
export type TodayBackgroundAssets = Pick<typeof sceneAssets.background, "src" | "srcSet" | "mobileSrcSet">;

type DialogContent = { title: string; subtitle: string; body: ReactNode };
type SessionCheck = "normal" | "slow" | "timeout" | "open-error" | "record-error";

function previewWait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException("Canceled", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, milliseconds);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

function PreviewCheckIn({ onSaved }: { onSaved?: () => void }) {
  const [energy, setEnergy] = useState("Okay");
  const [sleep, setSleep] = useState(8);
  const [movement, setMovement] = useState("Walk");
  const [minutes, setMinutes] = useState(30);
  const [saved, setSaved] = useState(false);
  return <form className={styles.checkIn} onSubmit={event => { event.preventDefault(); setSaved(true); onSaved?.(); }} onChange={() => setSaved(false)}>
    <div className={styles.energyRow}><span>Energy</span><div role="group" aria-label="Energy" className={styles.energyOptions}>{["Low", "Okay", "Good"].map(value => <button key={value} type="button" aria-pressed={energy === value} onClick={() => { setEnergy(value); setSaved(false); }}>{value}</button>)}</div></div>
    <label className={styles.rangeRow}><span>Sleep <output>{sleep} hrs</output></span><input type="range" min="0" max="12" step=".5" value={sleep} onChange={event => setSleep(Number(event.target.value))} aria-label="Sleep" style={{ "--fill": `${sleep / 12 * 100}%` } as CSSProperties} /></label>
    <div className={styles.movementRow}><label>Movement<select aria-label="Movement type" value={movement} onChange={event => setMovement(event.target.value)}>{["Walk", "Run", "Bike", "Team sport", "Strength", "Stretch", "Dance", "Other"].map(value => <option key={value}>{value}</option>)}</select></label><label className={styles.rangeRow}><span><span className={styles.srOnly}>Movement minutes</span><output>{minutes} min</output></span><input type="range" aria-label="Movement minutes" min="0" max="180" step="5" value={minutes} onChange={event => setMinutes(Number(event.target.value))} style={{ "--fill": `${minutes / 180 * 100}%` } as CSSProperties} /></label></div>
    <button type="submit" className={styles.checkInSave} data-state={saved ? "saved" : "choosing"}>{saved ? "Saved for today" : "Save check-in"}</button>
    <span className={styles.srOnly} role="status">{saved ? "Check-in saved in this preview only." : ""}</span>
  </form>;
}

export function TodayDesignPreview({ motionReview = false, compositionReview = false, assetsReview = false, lobbyReview = false, diagnostics = false, sessionServices, characterAssets, backgroundAssets }: { motionReview?: boolean; compositionReview?: boolean; assetsReview?: boolean; lobbyReview?: boolean; diagnostics?: boolean; sessionServices?: PreviewSessionServices; characterAssets?: TodayCharacterAssets; backgroundAssets?: TodayBackgroundAssets }) {
  const background = assetsReview && backgroundAssets ? backgroundAssets : sceneAssets.background;
  const menuAudio = useMenuAudio();
  const sequence = useTodaySequence(assetsReview, menuAudio.play);
  const [motionPaused, setMotionPaused] = useState(false);
  const [lobbyMode, setLobbyMode] = useState<TodayMode>("now");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(!compositionReview || assetsReview);
  const [motionVersion, setMotionVersion] = useState(0);
  const [motionStatus, setMotionStatus] = useState<DianaMotionStatus>("loading");
  const [scenario, setScenario] = useState<PreviewScenario>("typical");
  const [resetVersion, setResetVersion] = useState(0);
  const scenarioKey = `${scenario}-${resetVersion}`;
  const data = getPreviewData(scenario);
  const achievementCollection = usePreviewAchievements(scenario, motionReview);
  const weeklyAward = usePreviewWeeklyAward(scenario, motionReview);
  const plan = motionReview ? data.plan.map(task => ({ ...task, color: reviewSubjectColors[task.subject] ?? task.color })) : data.plan;
  const [previewSessions, setPreviewSessions] = useState<Record<string, number>>({});
  const [dialog, setDialog] = useState<DialogContent | null>(null);
  const [sessionTask, setSessionTask] = useState<PreviewTask | null>(null);
  const [workspaceFixture, setWorkspaceFixture] = useState<FixtureId | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [openedWork, setOpenedWork] = useState<Record<string, boolean>>({});
  const [sessionNotes, setSessionNotes] = useState<Record<string, string>>({});
  const [sessionSnapshots, setSessionSnapshots] = useState<Record<string, TimerState | undefined>>({});
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitle = useRef<HTMLHeadingElement>(null);
  const dialogOrigin = useRef<HTMLElement | null>(null);
  const taskReturnFocus = useRef<HTMLElement | null>(null);
  const activeSession = useRef<string | null>(null);
  const sessionIds = useRef<Record<string, string>>({});
  const sessionSequence = useRef(0);
  const recorded = useRef(new Set<string>());
  const revision = useRef(0);
  const [sessionCheck, setSessionCheck] = useState<SessionCheck>("normal");
  const recordErrorShown = useRef(false);
  const services: PreviewSessionServices = sessionServices ?? {
    open: sessionCheck === "normal" || sessionCheck === "record-error" ? undefined : (_task, signal) => {
      if (sessionCheck === "open-error") return Promise.reject(new Error("Preview readiness unavailable"));
      return previewWait(sessionCheck === "timeout" ? 30000 : 2000, signal);
    },
    record: sessionCheck === "record-error" ? () => {
      if (!recordErrorShown.current) { recordErrorShown.current = true; return Promise.reject(new Error("Preview recording unavailable")); }
    } : undefined,
  };
  const launch = usePreviewLaunch((task, origin) => {
    if (assetsReview) sequence.sessionOpened();
    taskReturnFocus.current = origin;
    activeSession.current = task.id;
    const fixture = lobbyReview ? lobbyWorkspaceFixture(task.id) : null;
    if (fixture) {
      setWorkspaceFixture(fixture);
      setOpenedWork(current => ({ ...current, [task.id]: true }));
      setWorkspaceOpen(true);
      return;
    }
    sessionIds.current[task.id] ??= `${task.id}-${++sessionSequence.current}`;
    setSessionTask(task);
  }, services.open, assetsReview ? { minimumMs: sequence.reduced ? 0 : TODAY_TIMING.launch, waitingMs: sequence.reduced ? 150 : TODAY_TIMING.waiting } : undefined);
  const activeSessionId = sessionTask ? sessionIds.current[sessionTask.id] : undefined;
  const characterPaused = motionPaused || workspaceOpen || sequence.holdCharacter || sessionTask !== null || dialog !== null || launch.state !== null || checkInOpen || (lobbyReview && lobbyMode !== "now");
  const extraMinutes = Math.floor(Object.values(previewSessions).reduce((sum, seconds) => sum + seconds, 0) / 60);
  const studied = data.studied.map((minutes, index) => minutes + (index === 2 && !data.unavailable ? extraMinutes : 0));
  const studiedTotal = studied.reduce((sum, minutes) => sum + minutes, 0);
  const plannedTotal = data.planned.reduce((sum, minutes) => sum + minutes, 0);
  const sessions = data.sessions + Object.keys(previewSessions).length;

  const restoreFocus = useCallback((origin: HTMLElement | null) => {
    requestAnimationFrame(() => {
      const target = origin?.isConnected && !origin.closest("[inert]") ? origin : document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      target?.focus({ preventScroll: true });
      if (!assetsReview && target?.closest("[data-now-composition]")) {
        target.animate?.([{ boxShadow: "0 0 0 2px #f1f7f3" }, { boxShadow: "0 0 0 2px transparent" }], { duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 480 });
      }
    });
  }, [assetsReview]);

  useEffect(() => {
    if (dialog && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (dialog) dialogTitle.current?.focus();
    if (!dialog && dialogRef.current?.open) {
      dialogRef.current.close();
      if (!activeSession.current && !launch.state) restoreFocus(dialogOrigin.current);
    }
  }, [dialog, launch.state, restoreFocus]);

  function closeDetails() {
    if (assetsReview) sequence.returned();
    else menuAudio.play("return");
    setDialog(null);
  }

  function openDetails(content: DialogContent, origin = document.activeElement as HTMLElement | null) {
    if (launch.isActive() || activeSession.current) return;
    if (assetsReview) sequence.detail();
    dialogOrigin.current = origin;
    setDialog(content);
  }

  function showTask(task: PreviewTask, origin = document.activeElement as HTMLElement | null) {
    if (launch.isActive() || activeSession.current) return;
    if (motionReview && !assetsReview) menuAudio.play("confirm");
    taskReturnFocus.current = origin;
    openDetails({ title: task.title, subtitle: `${task.subject} / ${task.ready ? "Ready to submit" : `Due ${task.date}`}`, body: <div className={styles.taskDetail}>
      {task.ready && <p>Your draft is complete. Review it before confirming submission.</p>}
      {!motionReview && <><p>{!task.ready ? "Next step" : null}</p><h3>{task.id === "history" ? "Choose three sources for your argument." : task.ready ? "Review your paragraph and evidence." : `Continue your ${task.subject.toLowerCase()} work.`}</h3></>}
      {!task.ready && <p className={styles.sessionLength}><Timer size={20} />{task.minutes}-minute study session</p>}
      <p className={styles.previewDisclosure}>Sample assignment. Changes stay in this preview.</p>
      <button className={styles.primaryAction} onClick={() => {
        if (motionReview && !task.ready) { startTask(task, taskReturnFocus.current); return; }
        if (assetsReview) sequence.detail();
        else if (motionReview) menuAudio.play("confirm");
        if (!task.ready) setPreviewSessions(current => ({ ...current, [task.id]: task.minutes * 60 }));
        setDialog({ title: task.ready ? "Submission review" : "Session finished", subtitle: "Preview only", body: <p>{task.ready ? "The live dashboard will open your existing submission review. Nothing has been submitted from this preview." : "The sample Wednesday study total and session milestone have updated. No account records were changed."}</p> });
      }}>{task.ready ? <FileCheck2 size={18} /> : <CheckCheck size={18} />}{task.ready ? "Review submission" : motionReview ? sessionSnapshots[task.id] ? "Resume session" : "Start session" : "Finish sample session"}</button>
    </div> }, origin);
  }

  function showUpcoming(origin: HTMLElement) {
    openDetails({ title: "Upcoming work", subtitle: "Sample week / Sep 9 - 15", body: <ul className={styles.deadlineList} data-deadline-dialog-list>
      {data.deadlines.length ? data.deadlines.map(task => <li key={task.id} data-ready={task.ready || undefined}>
        <button type="button" aria-haspopup="dialog" onClick={() => showTask(task, origin)}>
          <span className={`${styles.calendarTile} ${task.ready ? styles.readyTile : ""}`} aria-hidden="true">{task.ready ? <FileCheck2 size={22} /> : <><span>SEP</span><b>{task.day}</b></>}</span>
          <span className={styles.deadlineCopy}><strong>{task.title}</strong><small>{task.subject} <span>/</span> {task.date}</small><em className={task.ready ? styles.readyLabel : undefined}>{task.due}</em></span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </li>) : <li>No upcoming work in this sample.</li>}
    </ul> }, origin);
  }

  function startTask(task: PreviewTask, origin = document.activeElement as HTMLElement | null) {
    if (!motionReview) { showTask(task); return; }
    if (activeSession.current || launch.isActive()) return;
    if (assetsReview) sequence.launch();
    else menuAudio.play("launch");
    taskReturnFocus.current = origin;
    setDialog(null);
    launch.begin(task, origin);
  }

  const milestones: (ReviewMilestone & { asset: string; description: string })[] = [
    { id: "work", title: "Work completed", name: "Assignments completed", value: data.finished, asset: "work-completed.svg", description: "Assignments completed this week. Each assignment counts once; submitting it is a separate milestone." },
    { id: "focus", title: "Time well spent", name: "Sessions finished", value: sessions, asset: "sessions-finished.svg", description: "Finished study sessions this week. In the live version this will use recorded sessions, not assignment estimates." },
    { id: "submitted", title: "Handed in", name: "Work submitted", value: data.submitted, asset: "work-submitted.svg", description: "Assignments explicitly submitted this week. Ready-to-submit work has not been counted." },
  ];

  function showMilestone(id: MilestoneKind) {
    const milestone = milestones.find(item => item.id === id);
    if (!milestone) return;
    if (motionReview && !assetsReview) menuAudio.play("confirm");
    openDetails({ title: milestone.title, subtitle: milestone.name, body: <><p className={styles.milestoneCount}>{data.unavailable ? "Unavailable" : milestone.value}<span>{data.unavailable ? "" : " this week"}</span></p><p>{milestone.description}</p>{!milestone.value && !data.unavailable && <p>Your first recorded milestone will appear here.</p>}</> });
  }

  function resetPreview(next: PreviewScenario, resetAchievements = false) {
    if (resetAchievements) { achievementCollection.reset(next); weeklyAward.reset(next); }
    sequence.reset();
    revision.current += 1;
    launch.cancel();
    activeSession.current = null;
    sessionIds.current = {};
    recorded.current.clear();
    recordErrorShown.current = false;
    setScenario(next);
    setResetVersion(current => current + 1);
    setPreviewSessions({});
    setDialog(null);
    setSessionTask(null);
    setWorkspaceFixture(null);
    setWorkspaceOpen(false);
    setOpenedWork({});
    setSessionNotes({});
    setSessionSnapshots({});
  }
  const previewControls = <div><label htmlFor="preview-scenario" className={styles.srOnly}>Preview scenario</label><select id="preview-scenario" value={scenario} onChange={event => resetPreview(event.target.value as PreviewScenario)}><option value="typical">Typical week</option><option value="busy">Busy week</option><option value="new">Fresh start</option><option value="complete">Week complete</option><option value="unavailable">Data unavailable</option></select><button type="button" title="Reset preview" aria-label="Reset preview" onClick={() => resetPreview("typical", true)}><RotateCcw size={16} /></button></div>;

  // Playback effects depend on asset identity; status updates must not restart the decoder.
  const characterProps = useMemo(() => {
    const { displayGrade, ...candidateAssets }: TodayCharacterAssets = characterAssets ?? reviewedAssets;
    return {
      assets: assetsReview ? characterAssets ? candidateAssets : reviewedAssets : undefined,
      displayGrade: assetsReview ? displayGrade : undefined,
    };
  }, [assetsReview, characterAssets]);
  const desktopCharacter = <DianaIdleCharacter key={`desktop-${motionVersion}`} diagnostics={diagnostics} {...characterProps} floorMaterial={assetsReview ? "satin" : "atrium"} enabled={motionEnabled} paused={characterPaused} onStatusChange={setMotionStatus} />;

  return <><div hidden={workspaceOpen} inert={workspaceOpen || undefined}><div className={`${styles.preview} ${proofStyles.proof} ${motionReview ? lobbyStyles.lobby : ""} ${compositionReview ? compositionStyles.composition : ""} ${lobbyReview ? hubStyles.lobby : ""}`} data-lobby-mode={lobbyReview ? lobbyMode : undefined} data-now-composition={compositionReview || undefined} data-now-studio={assetsReview || undefined} data-menu-sequence={assetsReview ? sequence.phase : undefined} style={assetsReview ? { ...sequence.style, "--today-scene-image": `url('${background.src}')` } as CSSProperties : undefined}>
    {assetsReview && <div className={compositionStyles.environment} aria-hidden="true"><picture><source media="(max-width: 760px)" srcSet={background.mobileSrcSet} sizes="100vw" /><source srcSet={background.srcSet} sizes="(max-width: 900px) max(100vw, calc(177.778svh - 117.333px)), max(100vw, 1736px)" /><Image src={background.src} alt="" fill loading="eager" fetchPriority="high" unoptimized sizes="100vw" /></picture></div>}
    {lobbyReview ? <PreviewNavigation active="Lobby" /> : <StudentDesktopNav active="Lobby" displayName="Alex" wordmarkTone={motionReview ? "light" : "dark"} />}
    {!lobbyReview && <header className={styles.mobileHeader} data-preview-mobile-header><DianaWordmark tight tone={motionReview ? "light" : "dark"} /><Link href="/quick-add" aria-label="Add assignment"><Plus size={20} /></Link><span className={styles.avatar}>A</span></header>}
    {motionReview ? <TodayReviewTools enabled={motionEnabled} paused={motionPaused} status={motionStatus}
      sound={{ enabled: menuAudio.enabled, available: menuAudio.available, onToggle: menuAudio.toggle }}
      onMode={enabled => { setMotionEnabled(enabled); if (enabled) { setMotionPaused(false); setMotionVersion(value => value + 1); } }}
      onPause={() => setMotionPaused(value => !value)}
      onRestart={() => { setMotionPaused(false); setMotionVersion(value => value + 1); }}
    >{previewControls}{assetsReview && <label>Session check<select aria-label="Session check" value={sessionCheck} onChange={event => { setSessionCheck(event.target.value as SessionCheck); recordErrorShown.current = false; }}><option value="normal">Normal</option><option value="slow">Slow opening</option><option value="timeout">Opening timeout</option><option value="open-error">Opening error</option><option value="record-error">Recording retry</option></select></label>}</TodayReviewTools> : <aside className={styles.previewTools} aria-label="Design preview controls"><span><Settings2 size={15} />Design preview <i /> Sample data</span>{previewControls}</aside>}
    <div className={`${styles.frame} ${proofStyles.proofFrame}`}>
      <main id={workspaceOpen ? undefined : "main-content"} className={styles.grid} aria-label={lobbyReview ? "Lobby design preview" : "Today design preview"}>
        <h1 className={styles.srOnly}>{lobbyReview ? "Lobby" : "Today"}</h1>
        <div className={proofStyles.mobileCharacter} aria-hidden="true">
          {motionReview ? <DianaIdleCharacter key={`mobile-${motionVersion}`} mobile diagnostics={diagnostics} {...characterProps} floorMaterial={assetsReview ? "satin" : "atrium"} enabled={motionEnabled} paused={characterPaused} onStatusChange={setMotionStatus} /> : <Image src="/images/today-diana-cutout.png" alt="" fill sizes="160px" quality={90} />}
        </div>
        <TodayStageLayout railIndicator={motionReview} title={lobbyReview ? "Lobby" : "Today"} modes={lobbyReview ? LOBBY_MODES : undefined} labels={motionReview ? { week: lobbyReview ? "Progress" : "This Week", subjects: "Study Mix", milestones: "Achievements" } : undefined} onSelectionChange={motionReview ? mode => { if (lobbyReview) setLobbyMode(mode); if (assetsReview) { launch.cancel(); sequence.select(); } else menuAudio.play("select"); } : undefined} imageSrc="/images/today-diana-cutout.png" imageSizes="(max-width: 760px) 1px, 340px" imageQuality={90} artwork={motionReview ? <>{compositionReview && !assetsReview && <div className={compositionStyles.floorPlane}><span className={compositionStyles.castShadow} /><span className={compositionStyles.reflection} /></div>}{desktopCharacter}</> : undefined}>
        <section className={`${styles.panel} ${proofStyles.nowPanel}`} aria-label="Today's Plan">
          <TodayNowProof tasks={plan} scenario={scenario} onTask={showTask} onStart={startTask} compact={motionReview} composition={compositionReview} graphicLanguage={assetsReview} focused={lobbyReview} resumable={!!(plan[0] && (openedWork[plan[0].id] || sessionSnapshots[plan[0].id]))} launchPending={launch.state !== null} pausedSessions={Object.fromEntries(Object.entries(sessionSnapshots).flatMap(([id, snapshot]) => snapshot ? [[id, snapshot.remainingMs]] : []))} />
          {lobbyReview && <LobbyCheckIn key={scenarioKey} onSaved={() => { achievementCollection.recordCheckIn(); sequence.feedback("complete"); }} onOpenChange={open => { setCheckInOpen(open); if (open) { launch.cancel(); sequence.detail(); } else sequence.returned(); }} />}
        </section>
        <section className={`${styles.panel} ${styles.studyPanel}`} aria-label="Study Progress" data-review-performance={motionReview || undefined} data-lobby-progress={lobbyReview || undefined}>
          {lobbyReview ? <LobbyProgressReview key={scenarioKey} completed={data.finished} total={data.total} planned={data.planned} studied={studied} subjects={data.subjects} unavailable={data.unavailable} /> : motionReview ? <TodayWeekReview key={scenarioKey} completed={data.finished} total={data.total} planned={data.planned} studied={studied} unavailable={data.unavailable} /> : <>
          <PanelHeading title="Study Progress" label="Your week in motion" action={<span className={styles.smallIcon}><Sparkles size={19} /></span>} />
          <div className={styles.studyGraphics}><ProgressRing completed={data.finished} total={data.total} unavailable={data.unavailable} /><WeeklyBars key={scenarioKey} planned={data.planned} studied={studied} unavailable={data.unavailable} /></div>
          <div className={styles.progressSummary}><div><strong>{data.unavailable ? "--" : data.finished}<span> / {data.total}</span></strong><p>assignments complete</p></div><div><strong>{data.unavailable ? "--" : formatMinutes(studiedTotal)}<span> / {formatMinutes(plannedTotal)}</span></strong><p>{data.unavailable ? "Study history unavailable" : "planned study time"}</p></div></div>
          </>}
        </section>
        {!lobbyReview && <section className={`${styles.panel} ${styles.deadlinePanel}`} aria-label="Upcoming Deadlines" data-review-upcoming={motionReview || undefined}>
          {motionReview ? <TodayUpcomingReview deadlines={data.deadlines} earlierWork={data.earlierWork} unavailable={data.unavailable} onTask={showTask} onViewAll={showUpcoming} /> : <>
          <PanelHeading title="Upcoming Deadlines" label="Seven days ahead" action={<button className={styles.iconButton} title="View all upcoming work" aria-label="View all upcoming work" aria-haspopup="dialog" onClick={event => showUpcoming(event.currentTarget)}><ArrowUpRight size={20} /></button>} />
          <ul className={styles.deadlineList}>{data.deadlines.slice(0, 3).map(task => <li key={task.id} data-ready={task.ready || undefined}><button onClick={() => showTask(task)}><span className={`${styles.calendarTile} ${task.ready ? styles.readyTile : ""}`} aria-hidden="true">{task.ready ? <FileCheck2 size={22} /> : <><span>SEP</span><b>{task.day}</b></>}</span><span className={styles.deadlineCopy}><strong>{task.title}</strong><small>{task.subject} <span>/</span> {task.date}</small><em className={task.ready ? styles.readyLabel : undefined}>{task.due}</em></span><ChevronRight size={16} /></button></li>)}</ul>
          {!!data.earlierWork.length && <div className={styles.earlierWork}><h3>Earlier work</h3><ul className={styles.deadlineList}>{data.earlierWork.map(task => <li key={task.id}><button onClick={() => showTask(task)}><span className={`${styles.calendarTile} ${styles.earlierTile}`} aria-hidden="true"><span>SEP</span><b>{task.day}</b></span><span className={styles.deadlineCopy}><strong>{task.title}</strong><small>{task.subject} <span>/</span> {task.date}</small></span><ChevronRight size={16} /></button></li>)}</ul></div>}
          {!data.deadlines.length && <div className={styles.empty}><CalendarDays size={30} /><h3>Room in your week</h3><p>No upcoming deadlines in this sample.</p></div>}
          {!!data.deadlines.length && <p className={styles.panelFooter}><CalendarDays size={14} />{data.deadlines.length > 3 ? `${data.deadlines.length} upcoming / ` : ""}Through Tuesday, Sep 15</p>}
          </>}
        </section>}
        {!lobbyReview && <section className={`${styles.panel} ${styles.checkInPanel}`} aria-label="Check-In" data-review-check-in={motionReview || undefined}>
          {motionReview ? <TodayCheckInReview key={scenarioKey} onSaved={() => { achievementCollection.recordCheckIn(); sequence.feedback("complete"); }} /> : <><PanelHeading title="Check-In" label="Before you focus" action={<span className={styles.smallIcon}><Heart size={19} /></span>} /><PreviewCheckIn key={scenarioKey} /></>}
        </section>}
        {!lobbyReview && <section className={`${styles.panel} ${styles.subjectPanel}`} aria-label={motionReview ? "Study Mix" : "Subject Overview"} data-review-study-mix={motionReview || undefined}>
          {motionReview ? <TodayStudyMixReview key={scenarioKey} subjects={data.subjects} unavailable={data.unavailable} /> : <><PanelHeading title="Subject Overview" label="This week's mix" action={<span className={styles.smallIcon}><BookOpen size={19} /></span>} /><SubjectDonut key={scenarioKey} subjects={data.subjects} /><p className={styles.panelFooter}>Share of estimated assignment work this week</p></>}
        </section>}
        <section className={`${styles.panel} ${styles.achievementPanel}`} aria-label="Achievements" data-review-performance={motionReview || undefined} data-lobby-achievements={lobbyReview || undefined}>
          {motionReview ? <TodayAchievementsReview key={scenarioKey} achievements={achievementCollection.achievements} weeklyAward={weeklyAward.award} storageUnavailable={achievementCollection.storageUnavailable || weeklyAward.storageUnavailable}
            onInspect={(achievement, origin) => {
              if (!assetsReview) menuAudio.play("confirm");
              openDetails({ title: achievement.title, subtitle: "Lifetime badge", body: <AchievementDetails achievement={achievement} /> }, origin);
            }} /> : <><PanelHeading title="Achievements" label="Your work, recorded" action={<span className={styles.smallIcon}><Award size={19} /></span>} />
          <div className={styles.badges}>{milestones.map(({id,title,name,value,asset}) => <button key={name} className={styles.badge} data-earned={value > 0 && !data.unavailable} onClick={() => showMilestone(id)}>
            <Image className={styles.milestoneArt} src={`/images/today-milestones/${asset}`} width={128} height={140} alt="" />
            <strong>{title}</strong><span className={styles.badgeNumber}>{data.unavailable ? "--" : value}</span><small>{name}</small>
          </button>)}</div>
          <p className={styles.achievementFooter}><Sparkles size={15} />{data.unavailable ? "Your history is temporarily unavailable" : data.finished ? "Every bit of progress counts." : "Your first milestones start here."}</p>
          </>}
        </section>
        </TodayStageLayout>
      </main>
    </div>
    {!lobbyReview && <nav className={styles.mobileNav} aria-label="Primary mobile"><a href="#main-content" aria-current="page"><LayoutGrid size={21} /><span>Today</span></a><Link href="/assignments"><FileCheck2 size={21} /><span>Work</span></Link><Link href="/classes"><BookOpen size={21} /><span>Classes</span></Link><Link href="/calendar"><CalendarDays size={21} /><span>Calendar</span></Link><Link href="/more"><MoreHorizontal size={21} /><span>More</span></Link></nav>}
    <dialog ref={dialogRef} className={styles.dialog} data-review-dialog={motionReview || undefined} onKeyDown={containDialogTab} onCancel={event => { event.preventDefault(); closeDetails(); }} onClick={event => { if (event.target === event.currentTarget) closeDetails(); }} aria-labelledby="preview-dialog-title"><div><header><p>{dialog?.subtitle}</p><button className={styles.iconButton} aria-label="Close details" onClick={closeDetails}><X size={20} /></button></header><h2 ref={dialogTitle} tabIndex={-1} id="preview-dialog-title">{dialog?.title}</h2>{dialog?.body}</div></dialog>
    {launch.state && launch.state.status !== "preparing" && <TodayLaunchDialog returnLabel={lobbyReview ? "Back to Lobby" : undefined} task={launch.state.task} error={launch.state.status === "error"} authoredMotion={assetsReview} onRetry={() => { if (assetsReview) sequence.launch(); launch.retry(); }} onBack={() => { const origin = launch.state?.origin ?? null; launch.cancel(); if (assetsReview) sequence.returned(); else menuAudio.play("return"); restoreFocus(origin); }} />}
    {motionReview && sessionTask && <TodaySessionPreview returnLabel={lobbyReview ? "Back to Lobby" : undefined} key={activeSessionId} task={sessionTask} notes={sessionNotes[sessionTask.id] ?? ""} snapshot={sessionSnapshots[sessionTask.id]} returnFocus={taskReturnFocus.current} authoredMotion={assetsReview}
      onNotes={value => setSessionNotes(current => ({ ...current, [sessionTask.id]: value }))}
      onFinish={async (seconds, signal, expiresAt) => {
        const version = revision.current;
        if (!activeSessionId || signal.aborted) throw new DOMException("Canceled", "AbortError");
        if (recorded.current.has(activeSessionId)) return { recorded: true as const };
        await services.record?.(sessionTask, seconds, signal);
        if (signal.aborted || revision.current !== version || Date.now() >= expiresAt) throw new DOMException("Canceled", "AbortError");
        if (recorded.current.has(activeSessionId)) return { recorded: true as const };
        recorded.current.add(activeSessionId);
        achievementCollection.recordSession(activeSessionId);
        setPreviewSessions(current => ({ ...current, [activeSessionId]: seconds }));
        sequence.feedback("complete");
        return { recorded: true as const };
      }}
      onClose={snapshot => { if (assetsReview) sequence.returned(); else menuAudio.play("return"); setSessionSnapshots(current => ({ ...current, [sessionTask.id]: snapshot })); if (!snapshot) delete sessionIds.current[sessionTask.id]; activeSession.current = null; setSessionTask(null); }} />}
  </div></div>{workspaceFixture && <div hidden={!workspaceOpen} inert={!workspaceOpen || undefined}><WorkspaceConceptReview initialFixture={workspaceFixture} isActive={workspaceOpen} onFocusTime={seconds => { if (seconds > 0) setPreviewSessions(current => ({ ...current, workspace: seconds })); }} onBack={() => {
    setWorkspaceOpen(false);
    activeSession.current = null;
    if (assetsReview) sequence.returned();
    restoreFocus(taskReturnFocus.current);
  }} /></div>}</>;
}
