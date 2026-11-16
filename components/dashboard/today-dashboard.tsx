"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Heart, Pause, Play, X } from "lucide-react";
import { StudentDesktopNav, type StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import type { TodayData } from "@/lib/dashboard/today-view";
import { formatCampusName } from "@/lib/school-branding";
import { schoolColor, schoolColorText, schoolLogo } from "@/lib/school-branding-display";
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
const room = "/assets/today-now/diana-campus-southwest-4k-v1.webp";
const characterAssets = {
  poster: "/assets/today-now/diana-relit-poster-v1.webp",
  motion: "/assets/today-now/diana-relit-motion-v1.webm",
  posterPose: "relit" as const,
  motionPose: "relit" as const,
  pixelWidth: 752,
  pixelHeight: 1920,
};

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

export function TodayDashboard({ data, profile, checkIn, schoolBranding }: {
  data: TodayData;
  profile: StudentNavigationProfile;
  checkIn: ReactNode;
  schoolBranding?: SchoolBranding;
}) {
  const router = useRouter();
  return <CampusLobby
    data={data}
    navigation={<StudentDesktopNav active="Lobby" {...profile} />}
    checkIn={checkIn}
    schoolBranding={schoolBranding}
    onRetry={() => router.refresh()}
  />;
}

export function CampusLobby({ data, navigation, checkIn, schoolBranding, onRetry, preview }: {
  data: TodayData;
  navigation: ReactNode;
  checkIn?: ReactNode;
  schoolBranding?: SchoolBranding;
  onRetry?: () => void;
  preview?: { logo: string };
}) {
  const [mode, setMode] = useState<TodayMode>("now");
  const [paused, setPaused] = useState(false);
  const [dialog, setDialog] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLButtonElement | null>(null);
  const primary = schoolColor(schoolBranding?.primaryColor);
  const secondary = schoolColor(schoolBranding?.secondaryColor);
  const logo = preview?.logo ?? schoolLogo(schoolBranding?.logoUrl);
  const name = formatCampusName(schoolBranding?.name);
  const sceneStyle = {
    "--today-scene-image": `url('${room}')`,
    ...(primary ? { "--school-primary": primary, "--school-primary-text": schoolColorText(primary) } : {}),
    ...(secondary ? { "--school-secondary": secondary, "--school-secondary-text": schoolColorText(secondary), "--school-trim": `color-mix(in srgb, ${secondary} 45%, white)` } : {}),
  } as CSSProperties;
  const isPaused = Boolean(preview) || paused || dialog;

  useEffect(() => {
    if (dialog && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!dialog && dialogRef.current?.open) dialogRef.current.close();
  }, [dialog]);

  function closeDialog() {
    setDialog(false);
    origin.current?.focus();
  }

  return <div
    className={`${styles.preview} ${proof.proof} ${menu.lobby} ${composition.composition} ${hub.lobby} ${live.root} ${campus.campus}`}
    data-student-shell data-today-dashboard data-campus-experience data-lobby-mode={mode} data-now-composition data-now-studio
    data-school-primary={primary ? "true" : undefined} data-school-secondary={secondary ? "true" : undefined} style={sceneStyle}
  >
    <div className={`${composition.environment} ${campus.campusEnvironment}`} aria-hidden="true">
      <div className={campus.roomPlate}>
        <Image src={room} alt="" fill priority unoptimized sizes="100vw" />
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
          <div className={campus.mobilePortrait} aria-hidden="true">
            <DianaIdleCharacter mobile assets={characterAssets} floorMaterial="satin" paused={isPaused || mode !== "now"} />
          </div>
          {!preview && <button className={live.motionToggle} aria-label={paused ? "Resume Diana motion" : "Pause Diana motion"} aria-pressed={paused} onClick={() => setPaused(current => !current)}>
            {paused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
            <span>{paused ? "Resume motion" : "Pause motion"}</span>
          </button>}
        </div>
        <TodayStageLayout
          title="Lobby" modes={MODES} labels={{ week: "Progress", milestones: "My Work" }} onSelectionChange={setMode}
          railHeading={<>
            <span className={campus.railIdentity}>{name}</span>
            <span className={campus.railDate}>{data.dateLabel}</span>
          </>}
          artwork={<DianaIdleCharacter assets={characterAssets} floorMaterial="satin" paused={isPaused} />}
        >
          <section className={`${styles.panel} ${proof.nowPanel}`} aria-label="Today's Plan">
            <LobbyNow task={data.plan[0]} unavailable={data.assignmentsUnavailable} onRetry={onRetry} sample={Boolean(preview)} />
            <div className={hub.checkInAccess}>
              <button className={hub.checkInTrigger} disabled={Boolean(preview)} onClick={event => { origin.current = event.currentTarget; setDialog(true); }}>
                <Heart size={18} aria-hidden="true" />Check-in
              </button>
              <span className={hub.optional}>Optional</span>
            </div>
            {preview
              ? <a className={live.allWork} aria-disabled="true">View all work</a>
              : <Link className={live.allWork} href="/assignments">View all work</Link>}
          </section>
          <section className={`${styles.panel} ${styles.studyPanel}`} aria-label="Study Progress" data-review-performance data-lobby-progress>
            <LobbyProgress data={data} sample={Boolean(preview)} />
          </section>
          <section className={`${styles.panel} ${campus.historyPanel}`} aria-label="My Work" data-review-performance data-lobby-history>
            <LobbyHistory data={data} sample={Boolean(preview)} />
          </section>
        </TodayStageLayout>
      </main>
    </div>
    {!preview && <dialog ref={dialogRef} className={`${hub.checkInDialog} ${live.dialog}`} aria-labelledby="lobby-dialog-title" onClose={closeDialog} onCancel={closeDialog}>
      <button className={hub.close} aria-label="Close" onClick={closeDialog}><X size={20} /></button>
      <h2 id="lobby-dialog-title">Check-in</h2>
      <div hidden={!dialog}>{checkIn}</div>
    </dialog>}
  </div>;
}
