"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StudentDesktopNav, type StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import type { TodayData } from "@/lib/dashboard/today-view";
import type { LobbyEnergy } from "@/lib/dashboard/lobby-check-in";
import { lobbyRecommendationReason, type LobbyCheckInUpdate, type LobbyRecommendation } from "@/lib/dashboard/lobby-recommendation";
import type { CheckInWeek } from "@/lib/wellness/check-in-week";
import { formatCampusName } from "@/lib/school-branding";
import { schoolColor, schoolColorText, schoolLogo } from "@/lib/school-branding-display";
import { TodayStageLayout, type TodayMode } from "./today-stage-layout";
import { LobbyNow } from "./lobby/lobby-now";
import { LobbyThisWeek } from "./lobby/lobby-this-week";
import { LobbyCheckInCompletion } from "./lobby/lobby-check-in-completion";
import { LobbyCheckInWeek } from "./lobby/lobby-check-in-week";
import styles from "./today-dashboard.module.css";
import proof from "./lobby/today-now-proof.module.css";
import menu from "./lobby/today-lobby-review.module.css";
import composition from "./lobby/today-now-composition.module.css";
import hub from "./lobby/lobby-consolidation.module.css";
import live from "./lobby/lobby-live.module.css";
import campus from "./lobby/campus-lobby.module.css";

const MODES: readonly TodayMode[] = ["now", "check-in", "week"];
const room = "/assets/today-now/diana-campus-with-guide-4k.webp";
const mobileRoom = "/assets/today-now/diana-campus-with-guide-mobile.webp";

type SchoolBranding = {
  name?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
};

function SchoolPennant({ logo, compact = false }: { logo: string; compact?: boolean }) {
  return <div className={`${campus.schoolSceneBanner}${compact ? ` ${campus.compactPennant}` : ""}`} data-school-scene aria-hidden="true">
    <div className={campus.pennant}>
      <span className={campus.pennantMark}><img src={logo} alt="" /></span>
    </div>
  </div>;
}

export function TodayDashboard({ data, profile, checkIn, checkInWeek, schoolBranding, recommendation }: {
  data: TodayData;
  profile: StudentNavigationProfile;
  checkIn: ReactNode;
  checkInWeek?: CheckInWeek;
  schoolBranding?: SchoolBranding;
  recommendation?: LobbyRecommendation;
}) {
  const router = useRouter();
  return <CampusLobby
    data={data}
    navigation={<StudentDesktopNav active="Lobby" {...profile} />}
    checkIn={checkIn}
    checkInWeek={checkInWeek}
    schoolBranding={schoolBranding}
    recommendation={recommendation}
    onRetry={() => router.refresh()}
  />;
}

export function CampusLobby({ data, navigation, checkIn, checkInWeek, schoolBranding, onRetry, preview, recommendation }: {
  data: TodayData;
  navigation: ReactNode;
  checkIn?: ReactNode;
  checkInWeek?: CheckInWeek;
  schoolBranding?: SchoolBranding;
  onRetry?: () => void;
  preview?: { logo: string };
  recommendation?: LobbyRecommendation;
}) {
  const [mode, setMode] = useState<TodayMode>("now");
  const [savedCheckIn, setSavedCheckIn] = useState<LobbyCheckInUpdate>();
  const nowPanel = useRef<HTMLElement>(null);
  const nextTask = data.plan[0];
  const primary = schoolColor(schoolBranding?.primaryColor);
  const secondary = schoolColor(schoolBranding?.secondaryColor);
  const logo = preview?.logo ?? schoolLogo(schoolBranding?.logoUrl);
  const name = formatCampusName(schoolBranding?.name);
  const sceneStyle = {
    "--today-scene-image": "none",
    "--campus-mobile-scene": `url('${mobileRoom}')`,
    ...(primary ? { "--school-primary": primary, "--school-primary-text": schoolColorText(primary) } : {}),
    ...(secondary ? { "--school-secondary": secondary, "--school-secondary-text": schoolColorText(secondary), "--school-trim": `color-mix(in srgb, ${secondary} 45%, white)` } : {}),
  } as CSSProperties;

  const checkInNote = savedCheckIn
    ? lobbyRecommendationReason(savedCheckIn, recommendation, nextTask) ?? "Check-in saved."
    : undefined;
  function finishCheckIn(energy: LobbyEnergy, signalId: string) {
    setSavedCheckIn({ energy, signalId, before: recommendation, previousTask: nextTask });
    setMode("now");
    onRetry?.();
  }

  useLayoutEffect(() => {
    if (!savedCheckIn) return;
    nowPanel.current?.focus({ preventScroll: true });
    if (window.matchMedia?.("(max-width: 760px)").matches) {
      nowPanel.current?.scrollIntoView?.({ block: "start" });
    }
  }, [savedCheckIn]);

  return <div
    className={`${styles.preview} ${proof.proof} ${menu.lobby} ${composition.composition} ${hub.lobby} ${live.root} ${campus.campus}`}
    data-student-shell data-today-dashboard data-campus-experience data-lobby-mode={mode} data-now-composition data-now-studio
    data-school-primary={primary ? "true" : undefined} data-school-secondary={secondary ? "true" : undefined} style={sceneStyle}
  >
    <div className={`${composition.environment} ${campus.campusEnvironment}`} aria-hidden="true">
      <div className={campus.roomPlate}>
        <picture className={campus.roomArt}>
          <source media="(min-width: 1180px)" srcSet={room} />
          <img data-campus-art src={mobileRoom} alt="" width={1010} height={428} fetchPriority="high" />
        </picture>
        {logo && <SchoolPennant logo={logo} />}
      </div>
    </div>
    {navigation}
    <div className={`${styles.frame} ${proof.proofFrame}`}>
      <main id="main-content" className={styles.grid} aria-label={preview ? "Lobby preview" : "Lobby"} tabIndex={-1}>
        <h1 className={styles.srOnly}>{preview ? "Lobby design preview" : "Lobby"}</h1>
        <div className={`${live.sceneTools} ${campus.campusTools}`}>
          <span className={`${live.mobileDate} ${campus.mobileCampus}`}>
            <span className={campus.mobileCampusText}><strong>{name}</strong><span>{data.dateLabel}</span></span>
          </span>
          {logo && <SchoolPennant logo={logo} compact />}
        </div>
        <TodayStageLayout
          title="Lobby" modes={MODES} labels={{ "check-in": "Check-in" }} selectedMode={mode} onSelectionChange={setMode}
          railHeading={<>
            <span className={campus.railIdentity}>{name}</span>
            <span className={campus.railDate}>{data.dateLabel}</span>
          </>}
          artwork={false}
        >
          <section ref={nowPanel} className={`${styles.panel} ${proof.nowPanel}`} aria-label="Today's Plan">
            <LobbyNow task={nextTask} unavailable={data.assignmentsUnavailable} onRetry={onRetry} sample={Boolean(preview)} checkInNote={checkInNote} />
            {preview
              ? <a className={live.allWork} aria-disabled="true">View all work</a>
              : <Link className={live.allWork} href="/assignments">View all work</Link>}
          </section>
          <section className={styles.panel} aria-label="Check-in" data-lobby-check-in>
            <header className={campus.checkInHeading}>
              <div className={campus.checkInTitle}>
                <h2>Check-in</h2>
                <span>Optional</span>
              </div>
              <p>Energy helps Diana choose your next assignment.</p>
            </header>
            <LobbyCheckInCompletion.Provider value={finishCheckIn}>
              {checkIn}
            </LobbyCheckInCompletion.Provider>
            {checkInWeek && <LobbyCheckInWeek week={checkInWeek} />}
          </section>
          <section className={styles.panel} aria-label="This Week" data-review-performance data-lobby-week>
            <LobbyThisWeek data={data} sample={Boolean(preview)} />
          </section>
        </TodayStageLayout>
      </main>
    </div>
  </div>;
}
