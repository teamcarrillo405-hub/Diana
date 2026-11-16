"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { CalendarDays, Clock3, Heart, Pause, Play, Plus } from "lucide-react";
import type { TodayData } from "@/lib/dashboard/today-view";
import { schoolColorText } from "@/lib/school-branding-display";
import { DianaIdleCharacter } from "@/components/dashboard/lobby/diana-idle-character";
import { LobbyProgress } from "@/components/dashboard/lobby/lobby-progress";
import { LobbyHistory } from "@/components/dashboard/lobby/lobby-history";
import { TodayStageLayout, type TodayMode } from "@/components/dashboard/today-stage-layout";
import layout from "@/components/dashboard/today-dashboard.module.css";
import proof from "@/components/dashboard/lobby/today-now-proof.module.css";
import menu from "@/components/dashboard/lobby/today-lobby-review.module.css";
import composition from "@/components/dashboard/lobby/today-now-composition.module.css";
import hub from "@/components/dashboard/lobby/lobby-consolidation.module.css";
import live from "@/components/dashboard/lobby/lobby-live.module.css";
import campus from "@/components/dashboard/lobby/campus-lobby.module.css";
import navigation from "@/components/screen-design/student-navigation.module.css";
import preview from "./preview.module.css";

const characterAssets = {
  poster: "/assets/today-now/diana-relit-poster-v1.webp",
  motion: "/assets/today-now/diana-relit-motion-v1.webm",
  posterPose: "relit" as const,
  motionPose: "relit" as const,
  pixelWidth: 752,
  pixelHeight: 1920,
};

// Fictional values only; no session or student records are accessed.
const sampleData: TodayData = {
  plan: [], deadlines: [], earlierWork: [], otherReady: [],
  subjects: [
    { name: "English", color: "#a9ddb8", minutes: 75 },
    { name: "Algebra", color: "#77c892", minutes: 50 },
    { name: "Biology", color: "#d1e8d7", minutes: 35 },
  ],
  weekRecords: [
    { id: "sample-3", title: "Cell structure notes", subject: "Biology", status: "Submitted", timing: "Submitted Wed, Nov 18", href: "/assignments/sample-3" },
    { id: "sample-1", title: "Linear equations practice set", subject: "Algebra", status: "In progress", timing: "Due Thu, Nov 19", href: "/assignments/sample-1" },
    { id: "sample-2", title: "Identity quote response", subject: "English", status: "Marked done", timing: "Due Fri, Nov 20", href: "/assignments/sample-2" },
  ],
  total: 6, finished: 3, submitted: 2, sessions: 4,
  planned: [30, 45, 35, 25, 0, 0, 0], studied: [25, 35, 30, 20, 0, 0, 0],
  currentDay: 3, today: "2026-11-19", dateLabel: "Thursday, Nov 19",
  weekLabel: "Nov 16 - Nov 22", horizonLabel: "Thursday, Nov 26",
  assignmentsUnavailable: false, weeklyUnavailable: false, studyUnavailable: false, submissionsUnavailable: false,
};
const modes: readonly TodayMode[] = ["now", "week", "milestones"];
const tigardStyle = {
  "--school-primary": "#086224", "--school-primary-text": schoolColorText("#086224"),
  "--school-secondary": "#000000", "--school-secondary-text": schoolColorText("#000000"), "--school-trim": "color-mix(in srgb, #000000 45%, white)",
} as CSSProperties;

/** Interactive design sample: only local section and chart selection are enabled. */
export function LobbyPreviewContent() {
  const [mode, setMode] = useState<TodayMode>("now");
  return <>
    <div className={preview.notice} role="note">Lobby design preview · Sample data · Read-only · Tigard High School</div>
    <div className={`${layout.preview} ${proof.proof} ${menu.lobby} ${composition.composition} ${hub.lobby} ${live.root} ${campus.campus}`} data-student-shell data-today-dashboard data-lobby-mode={mode} data-now-composition data-now-studio data-school-primary="true" data-school-secondary="true" style={tigardStyle}>
      <div className={composition.environment} aria-hidden="true"><Image src="/assets/today-now/diana-campus-southwest-4k-v1.webp" alt="" fill priority unoptimized sizes="100vw" /></div>
      <div className={`${campus.schoolSceneBanner} ${preview.tigardSceneBanner}`} aria-hidden="true"><span>TIGARD HIGH SCHOOL</span><div><img src="/assets/school-examples/tigard-wordmark.jpg" alt="" /></div></div>
      <header className={navigation.navigation} data-student-navigation>
        <a className={navigation.brand} aria-label="Diana Lobby"><img src="/screendesign/brand/diana-logo-tight-no-shadow.png" alt="Diana" width="140" height="46" /><span className={navigation.campusWordmark} aria-hidden="true">Diana</span></a>
        <span className={navigation.campusTagline}>Your personalized<br />learning assistant</span>
        <nav aria-label="Sample navigation">{["Lobby", "Work", "Classes", "Calendar", "More"].map(label => <a key={label} aria-current={label === "Lobby" ? "page" : undefined}>{label}</a>)}</nav>
        <div className={navigation.actions}><a className={navigation.add}><Plus size={18} aria-hidden="true" /><span>Add</span></a><a className={navigation.account} aria-label="Sample student"><span aria-hidden="true">S</span></a></div>
      </header>
      <div className={`${layout.frame} ${proof.proofFrame}`}>
        <div className={live.sceneTools}><span className={`${live.mobileDate} ${campus.mobileCampus}`}><img className={`${campus.mobileSchoolLogo} ${campus.customSchoolLogo}`} src="/assets/school-examples/tigard-t-mark.jpg" alt="Tigard mark" width={38} height={34} /><span className={campus.mobileCampusText}><strong>DIANA CAMPUS</strong><span>{sampleData.dateLabel}</span></span></span><button className={live.motionToggle} disabled><Pause size={18} aria-hidden="true" /><span>Pause motion</span></button></div>
        <main id="main-content" className={layout.grid} aria-label="Lobby preview">
          <h1 className={layout.srOnly}>Lobby design preview</h1>
          <TodayStageLayout title="Lobby" modes={modes} labels={{ week: "Progress", milestones: "My Work" }} onSelectionChange={setMode} railIndicator railHeading={<><img className={`${campus.schoolLogo} ${campus.customSchoolLogo}`} src="/assets/school-examples/tigard-t-mark.jpg" alt="Tigard mark" width={82} height={62} /><span className={campus.railIdentity}>DIANA <b>CAMPUS</b></span><span className={campus.railDate}>Tigard High School<br />{sampleData.dateLabel}</span></>} artwork={<DianaIdleCharacter assets={characterAssets} displayGrade="none" floorMaterial="satin" paused />}>
            <section className={`${layout.panel} ${proof.nowPanel}`} aria-label="Today's Plan">
              <div className={proof.nowLayout} data-now-layout><div className={proof.briefing} data-now-briefing>
                <div data-now-heading><p className={proof.eyebrow} data-campus-eyebrow>YOUR NEXT MOVE</p><div className={preview.mobileTigardWordmark} aria-hidden="true"><img src="/assets/school-examples/tigard-wordmark.jpg" alt="" /></div><div data-now-identity><div className={proof.subject} data-now-subject><span>Algebra I</span></div></div><h2 className={proof.assignmentTitle} data-now-title>Linear equations practice set</h2></div>
                <div data-now-action><dl className={proof.meta} data-now-meta><div className={proof.metaItem}><dt><Clock3 size={15} aria-hidden="true" /> Estimated time</dt><dd>35 min</dd></div><div className={proof.metaItem}><dt><CalendarDays size={15} aria-hidden="true" /> Due</dt><dd>Tomorrow</dd></div></dl><a className={proof.start} data-now-start aria-disabled="true"><Play size={17} fill="currentColor" aria-hidden="true" /><span>Start</span></a></div>
              </div></div>
              <div className={hub.checkInAccess}><button className={hub.checkInTrigger} disabled><Heart size={18} aria-hidden="true" />Check-in</button><span className={hub.optional}>Optional</span></div>
              <a className={live.allWork} aria-disabled="true">View all work</a>
              <div className={campus.mobileGuide} aria-hidden="true"><div><span>YOUR STUDY SPACE</span><strong>One step at a time.</strong></div><div className={`${proof.mobileCharacter} ${campus.mobileFigure}`}><DianaIdleCharacter mobile assets={characterAssets} displayGrade="none" floorMaterial="satin" paused /></div></div>
            </section>
            <section className={`${layout.panel} ${layout.studyPanel}`} aria-label="Study Progress" data-review-performance data-lobby-progress><LobbyProgress data={sampleData} sample logoUrl="/assets/school-examples/tigard-t-mark.jpg" /></section>
            <section className={`${layout.panel} ${campus.historyPanel}`} aria-label="My Work" data-review-performance data-lobby-history><LobbyHistory data={sampleData} sample logoUrl="/assets/school-examples/tigard-t-mark.jpg" /></section>
          </TodayStageLayout>
        </main>
      </div>
    </div>
  </>;
}
