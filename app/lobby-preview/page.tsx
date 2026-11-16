import type { Metadata } from "next";
import Image from "next/image";
import { CalendarDays, ChartNoAxesColumnIncreasing, ClipboardList, Clock3, Heart, House, Pause, Play, Plus } from "lucide-react";
import { DianaIdleCharacter } from "@/components/dashboard/lobby/diana-idle-character";
import layout from "@/components/dashboard/today-dashboard.module.css";
import proof from "@/components/dashboard/lobby/today-now-proof.module.css";
import menu from "@/components/dashboard/lobby/today-lobby-review.module.css";
import composition from "@/components/dashboard/lobby/today-now-composition.module.css";
import hub from "@/components/dashboard/lobby/lobby-consolidation.module.css";
import live from "@/components/dashboard/lobby/lobby-live.module.css";
import campus from "@/components/dashboard/lobby/campus-lobby.module.css";
import navigation from "@/components/screen-design/student-navigation.module.css";
import preview from "./preview.module.css";

export const metadata: Metadata = {
  title: "Lobby design preview",
  description: "A read-only preview of the Diana Lobby using sample data.",
  robots: { index: false, follow: false },
};

const characterAssets = {
  poster: "/assets/today-now/diana-relit-poster-v1.webp",
  motion: "/assets/today-now/diana-relit-motion-v1.webm",
  posterPose: "relit" as const,
  motionPose: "relit" as const,
  pixelWidth: 752,
  pixelHeight: 1920,
};
const previewTabs = [
  { label: "Now", Icon: House },
  { label: "Progress", Icon: ChartNoAxesColumnIncreasing },
  { label: "My Work", Icon: ClipboardList },
];

/** A static design specimen. It has no student session, links or live actions. */
export default function LobbyPreviewPage() {
  return <>
    <div className={preview.notice} role="note">Lobby design preview · Sample data · Read-only</div>
    <div className={`${layout.preview} ${proof.proof} ${menu.lobby} ${composition.composition} ${hub.lobby} ${live.root} ${campus.campus}`} data-student-shell data-today-dashboard data-lobby-mode="now" data-now-composition data-now-studio>
      <div className={composition.environment} aria-hidden="true"><Image src="/assets/today-now/diana-campus-southwest-4k-v1.webp" alt="" fill priority unoptimized sizes="100vw" /></div>
      <header className={navigation.navigation} data-student-navigation>
        <a className={navigation.brand} aria-label="Diana Lobby"><img src="/screendesign/brand/diana-logo-tight-no-shadow.png" alt="Diana" width="140" height="46" /><span className={navigation.campusWordmark} aria-hidden="true">Diana</span></a>
        <span className={navigation.campusTagline}>Your personalized<br />learning assistant</span>
        <nav aria-label="Sample navigation">{["Lobby", "Work", "Classes", "Calendar", "More"].map(label => <a key={label} aria-current={label === "Lobby" ? "page" : undefined}>{label}</a>)}</nav>
        <div className={navigation.actions}><a className={navigation.add}><Plus size={18} aria-hidden="true" /><span>Add</span></a><a className={navigation.account} aria-label="Sample student"><span aria-hidden="true">S</span></a></div>
      </header>
      <div className={`${layout.frame} ${proof.proofFrame}`}>
        <div className={live.sceneTools}><span className={`${live.mobileDate} ${campus.mobileCampus}`}><img className={campus.mobileSchoolLogo} src="/assets/today-now/campus-building-mark.svg" alt="" width={38} height={34} /><span className={campus.mobileCampusText}><strong>DIANA CAMPUS</strong><span>Wednesday, Nov 18</span></span></span><button className={live.motionToggle} disabled><Pause size={18} aria-hidden="true" /><span>Pause motion</span></button></div>
        <main id="main-content" className={layout.grid} aria-label="Lobby preview">
          <h1 className={layout.srOnly}>Lobby design preview</h1>
          <div className={layout.stageWorkspace} data-today-stage-workspace>
            <nav className={layout.stageRail} data-today-stage-rail aria-label="Sample Lobby categories" role="tablist" aria-orientation="vertical">
              <p className={layout.railKicker}><img className={campus.schoolLogo} src="/assets/today-now/campus-building-mark.svg" alt="" width={82} height={62} /><span className={campus.railIdentity}>DIANA <b>CAMPUS</b></span><span className={campus.railDate}>Wednesday, Nov 18</span></p>
              {previewTabs.map(({ label, Icon }, index) => <button type="button" role="tab" key={label} disabled aria-selected={index === 0}><Icon size={21} strokeWidth={2.2} aria-hidden="true" focusable="false" /><span>{label}</span></button>)}
            </nav>
            <div className={layout.stage} data-today-stage>
              <div className={layout.stageImage} data-today-stage-image aria-hidden="true"><DianaIdleCharacter assets={characterAssets} displayGrade="none" floorMaterial="satin" paused /></div>
              <div className={layout.stageVeil} aria-hidden="true" />
              <div className={layout.stageDeck} data-today-stage-deck>
                <section className={`${layout.panel} ${proof.nowPanel} ${layout.stagePanel}`} aria-label="Today's Plan" data-active="true">
                  <div className={proof.nowLayout} data-now-layout><div className={proof.briefing} data-now-briefing>
                    <div data-now-heading><p className={proof.eyebrow} data-campus-eyebrow>YOUR NEXT MOVE</p><div data-now-identity><div className={proof.subject} data-now-subject><span>Algebra I</span></div></div><h2 className={proof.assignmentTitle} data-now-title>Linear equations practice set</h2></div>
                    <div data-now-action><dl className={proof.meta} data-now-meta><div className={proof.metaItem}><dt><Clock3 size={15} aria-hidden="true" /> Estimated time</dt><dd>35 min</dd></div><div className={proof.metaItem}><dt><CalendarDays size={15} aria-hidden="true" /> Due</dt><dd>Tomorrow</dd></div></dl><a className={proof.start} data-now-start aria-disabled="true"><Play size={17} fill="currentColor" aria-hidden="true" /><span>Start</span></a></div>
                  </div></div>
                  <div className={hub.checkInAccess}><button className={hub.checkInTrigger} disabled><Heart size={18} aria-hidden="true" />Check-in</button><span className={hub.optional}>Optional</span></div>
                  <a className={live.allWork} aria-disabled="true">View all work</a>
                  <div className={campus.mobileGuide} aria-hidden="true"><div><span>YOUR STUDY SPACE</span><strong>One step at a time.</strong></div><div className={`${proof.mobileCharacter} ${campus.mobileFigure}`}><DianaIdleCharacter mobile assets={characterAssets} displayGrade="none" floorMaterial="satin" paused /></div></div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </>;
}
