import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Battery,
  BookOpenCheck,
  Brain,
  Camera,
  CheckCircle2,
  Circle,
  Clock3,
  Crosshair,
  GraduationCap,
  Leaf,
  Lock,
  LucideIcon,
  Orbit,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { ClarityOrb, type DianaOrbState } from "@/components/signal/clarity-orb";
import { RefreshAnalysisButton } from "@/components/student-portal/refresh-analysis-button";
import type { FirstWeekJourney } from "@/lib/journey/first-week";
import type { BudgetItem } from "@/lib/time-budget/compute";

const fallbackDotCount = 138;

const fallbackDots = Array.from({ length: fallbackDotCount }, (_, index) => {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (fallbackDotCount - 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const angle = goldenAngle * index;
  const depth = Math.sin(angle) * radius;
  const shellNoise =
    0.92 +
    Math.sin(index * 1.713) * 0.052 +
    Math.cos(index * 0.691) * 0.036;
  const x = radius * Math.cos(angle) * shellNoise * (1 + Math.sin(index * 0.37) * 0.035);
  const projectedY = y * shellNoise * (0.95 + Math.cos(index * 0.41) * 0.04);
  const scaleNoise = 0.9 + Math.sin(index * 2.317) * 0.08 + Math.cos(index * 0.823) * 0.045;

  return {
    x: 50 + x * 36,
    y: 50 + projectedY * 34,
    scale: (0.78 + (depth + 1) * 0.13) * scaleNoise,
    opacity: 0.46 + (depth + 1) * 0.2,
    size: 0.88 + Math.max(0, depth) * 0.16 + Math.sin(index * 1.119) * 0.06,
  };
});

const brainDockStates = [
  { energy: "low", label: "Low", brain: "low", note: "start small", icon: Leaf },
  { energy: "medium", label: "Okay", brain: "okay", note: "steady", icon: Battery },
  { energy: "high", label: "On it", brain: "on-it", note: "more motion", icon: Zap },
] as const;

const orbStateLabel: Record<DianaOrbState, string> = {
  low: "low",
  okay: "okay",
  "on-it": "on it",
  overwhelmed: "stuck",
  creative: "creative",
};

export type SubjectSignalTone = "cyan" | "pink" | "gold" | "blue" | "purple";

export type SubjectSignal = {
  label: string;
  detail: string;
  nextTitle: string;
  href: string;
  count: number;
  statusLabel: string;
  score: number;
  tone: SubjectSignalTone;
  meters: Array<{
    label: string;
    value: number;
  }>;
};

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function clampMeter(value: number) {
  return Math.max(6, Math.min(100, Math.round(value)));
}

export function StudentTodayCommandCenter({
  studentName,
  taskTitle,
  nextMove,
  href,
  minutes,
  reason,
  missionChannel,
  missionType,
  missionLoadLabel,
  missionProofLabel,
  doneTodayCount,
  leftTodayCount,
  whyReasons,
  brainState,
  readingControl,
  subjectSignals,
  subjectCount,
  bodySupportTitle,
  bodySupportDetail,
  bodySupportHref,
  styleMode,
  fullModeHref,
  calmModeHref,
  captureHref = "/quick-add",
  capturedTodayCount,
  readyTodayCount,
  submittedTodayCount,
  needsCheckCount,
}: {
  studentName: string;
  taskTitle: string;
  nextMove: string;
  href: string;
  minutes: number;
  reason: string;
  missionChannel: string;
  missionType: string;
  missionLoadLabel: string;
  missionProofLabel: string;
  doneTodayCount: number;
  leftTodayCount: number;
  whyReasons: string[];
  brainState: DianaOrbState;
  readingControl?: ReactNode;
  subjectSignals: SubjectSignal[];
  subjectCount?: number;
  bodySupportTitle: string;
  bodySupportDetail: string;
  bodySupportHref: string;
  styleMode: "full" | "calm-light";
  fullModeHref: string;
  calmModeHref: string;
  captureHref?: string;
  capturedTodayCount: number;
  readyTodayCount: number;
  submittedTodayCount: number;
  needsCheckCount: number;
}) {
  const compactTitle = compactText(taskTitle, 72);
  const compactMove = compactText(nextMove, 120);
  const recoveryHref = href.includes("?") ? `${href}&support=stuck` : `${href}?support=stuck`;
  const triedSupportHref = href.includes("?") ? `${href}&support=tried` : `${href}?support=tried`;
  const exampleSupportHref = href.includes("?") ? `${href}&support=example` : `${href}?support=example`;
  const visibleReasons = whyReasons.length > 0
    ? whyReasons.slice(0, 3)
    : ["small enough to start", "keeps proof visible", "matches the selected state"];
  const activeSubjects = Math.max(1, subjectCount ?? subjectSignals.length);
  const displayName = studentName.trim().split(/\s+/)[0] || "there";
  const initials = displayName.slice(0, 1).toUpperCase();
  const avatarName = displayName.toLowerCase() === "grayson" ? "G-money" : displayName;
  const questPreview = subjectSignals.slice(0, 3);
  const primaryReason = visibleReasons[0] ?? reason;

  return (
    <section className="student-nexus-home pm-dashboard" data-orb-state={brainState} data-nexus-mode={styleMode}>
      <div className="pm-lobby" data-screenshot-moment="right-now">
        <div className="pm-lobby-topbar">
          <div>
            <p className="student-nexus-kicker">{displayName} Mission Control</p>
            <strong>{activeSubjects} active {activeSubjects === 1 ? "subject" : "subjects"}</strong>
          </div>
          <div className="pm-topline-actions">
            <Link href={captureHref} className="pm-capture-action touch-target">
              <Camera size={16} />
              Capture
            </Link>
            <NexusStyleToggle mode={styleMode} fullHref={fullModeHref} calmHref={calmModeHref} />
          </div>
        </div>

        <div className="pm-lobby-scene">
          <div className="pm-quest-preview" aria-label="Next queue preview">
            <div className="pm-quest-preview-head">
              <span>Quest path</span>
              <strong>Next 3</strong>
            </div>
            <div className="pm-quest-nodes" role="list">
              {questPreview.map((subject, index) => (
                <Link
                  key={`${subject.label}-${index}`}
                  href={subject.href}
                  className="pm-quest-node"
                  data-tone={subject.tone}
                  role="listitem"
                  aria-label={`${subject.label}: ${subject.nextTitle}`}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{subject.label}</strong>
                  <em>{compactText(subject.nextTitle, 34)}</em>
                  <small>{subject.statusLabel}</small>
                </Link>
              ))}
            </div>
          </div>

          <div className="pm-lobby-stage" aria-hidden="true">
            <div className="pm-map-grid" />
            <strong className="pm-player-tag">{avatarName}</strong>
            <div className="pm-avatar-platform">
              <span className="pm-avatar-ring" />
              <div className="pm-avatar-token">
                <span>{initials}</span>
              </div>
              <em>{orbStateLabel[brainState]}</em>
            </div>
            <div className="pm-scene-pill pm-scene-pill-one">{missionChannel}</div>
            <div className="pm-scene-pill pm-scene-pill-two">{missionLoadLabel}</div>
            <div className="pm-stage-mission">
              <span>Mission now</span>
              <strong>{compactTitle}</strong>
              <em>{compactMove}</em>
            </div>
          </div>

          <LobbyLevelDock currentBrain={brainState} />

          <article className="pm-next-card pm-lobby-mission" aria-labelledby="mission-now-title">
            <div className="pm-next-label">
              <Crosshair size={16} />
              Mission now
            </div>
            <div className="pm-mission-meta" aria-label="Mission details">
              <span>{missionChannel}</span>
              <span>{missionType}</span>
              <span>{reason}</span>
            </div>
            <h1 id="mission-now-title">{compactTitle}</h1>
            <div className="pm-first-action">
              <span>First action</span>
              <p>{compactMove}</p>
            </div>
            <details className="pm-lobby-reason">
              <summary className="touch-target">
                <CheckCircle2 size={15} />
                <span>Picked because {primaryReason}.</span>
              </summary>
              <ul>
                {visibleReasons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
            <div className="pm-next-actions">
              <Link href={href} className="student-nexus-primary touch-target">
                Start next mission
                <ArrowRight size={19} />
              </Link>
              <details className="pm-stuck-menu">
                <summary className="student-nexus-secondary touch-target pm-stuck-link">
                  I&apos;m stuck
                </summary>
                <div className="pm-stuck-popover">
                  <Link href={triedSupportHref}>Show what I tried</Link>
                  <Link href={recoveryHref}>Make it smaller</Link>
                  <Link href={exampleSupportHref}>Show similar example</Link>
                </div>
              </details>
              <RefreshAnalysisButton />
            </div>
            <div className="pm-mission-facts" aria-label="Mission signals">
              <span><Clock3 size={15} /> {missionLoadLabel}</span>
              <span><ShieldCheck size={15} /> {missionProofLabel}</span>
            </div>
          </article>
        </div>
      </div>

      <details className="student-subject-board pm-today-board pm-full-queue">
        <summary className="pm-full-queue-summary touch-target">
          <div>
            <p className="student-nexus-kicker">Full queue</p>
            <h2>Open the inventory when you need the whole map.</h2>
          </div>
          <span>{leftTodayCount} open · {capturedTodayCount} captured · {needsCheckCount} needs check</span>
        </summary>

        <div className="pm-inventory-list">
          {subjectSignals.map((subject, index) => (
            <Link
              key={`${subject.label}-${index}`}
              href={subject.href}
              className="pm-inventory-row"
              data-tone={subject.tone}
            >
              <span className="pm-inventory-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="pm-inventory-main">
                <strong>{subject.label}</strong>
                <em>{subject.nextTitle}</em>
              </span>
              <span className="pm-inventory-detail">{subject.detail}</span>
              <span className="pm-inventory-status">{subject.statusLabel}</span>
              <span className="pm-inventory-meters" aria-hidden="true">
                {subject.meters.map((meter) => (
                  <span key={meter.label} className="pm-inventory-meter">
                    <small>{meter.label}</small>
                    <i>
                      <b
                        style={
                          {
                            "--subject-meter": `${clampMeter(meter.value)}%`,
                          } as CSSProperties
                        }
                      />
                    </i>
                  </span>
                ))}
              </span>
              <span className="pm-inventory-open">
                Open
                <ArrowRight size={17} className="pm-inventory-arrow" />
              </span>
            </Link>
          ))}
        </div>
      </details>

      {readingControl && (
        <div className="today-mini-control pm-reading-control">
          <p>View</p>
          {readingControl}
        </div>
      )}
    </section>
  );
}

function LobbyLevelDock({ currentBrain }: { currentBrain: DianaOrbState }) {
  const normalizedCurrent = currentBrain === "creative" ? "on-it" : currentBrain;
  const activeIndex = Math.max(0, brainDockStates.findIndex((state) => state.brain === normalizedCurrent));
  const levelLabel = activeIndex === 0 ? "Low" : activeIndex === 1 ? "Steady" : "Ready";

  return (
    <div className="pm-level-dock" aria-label="Motivation and concentration level">
      <div className="pm-level-orb">
        <small>LVL</small>
        <strong>{activeIndex + 1}</strong>
      </div>
      <div>
        <p>Motivation / concentration</p>
        <strong>{levelLabel}</strong>
      </div>
      <div className="pm-level-options">
        {brainDockStates.map(({ energy, label, brain, icon: Icon }) => {
          const active = brain === normalizedCurrent;
          return (
            <Link
              key={brain}
              href={`/dashboard?energy=${energy}&brain=${brain}`}
              className={`pm-level-option touch-target ${active ? "is-active" : ""}`}
              aria-current={active ? "true" : undefined}
            >
              <Icon size={14} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NexusStyleToggle({
  mode,
  fullHref,
  calmHref,
}: {
  mode: "full" | "calm-light";
  fullHref: string;
  calmHref: string;
}) {
  return (
    <div className="student-nexus-mode-toggle" aria-label="Page style">
      <Link href={fullHref} aria-current={mode === "full" ? "true" : undefined}>
        Full Nexus
      </Link>
      <Link href={calmHref} aria-current={mode === "calm-light" ? "true" : undefined}>
        Calm Light Nexus
      </Link>
    </div>
  );
}

export function DianaOrbCommand({
  brainState,
  minutes,
  title,
  nextMove,
}: {
  brainState: DianaOrbState;
  minutes: number;
  title: string;
  nextMove: string;
}) {
  const coreTitle = compactText(title, 36);
  const coreMove = compactText(nextMove, 58);

  return (
    <div className="diana-orb-command" aria-label="Diana next move orb">
      <div className="diana-orb-field" aria-hidden="true" />
      <div className="clarity-orb-shell diana-command-orb-shell">
        <div className="clarity-orb-static" aria-hidden="true">
          {fallbackDots.map((dot, index) => (
            <span
              key={index}
              className="clarity-orb-dot"
              style={
                {
                  "--dot-x": `${dot.x}%`,
                  "--dot-y": `${dot.y}%`,
                  "--dot-scale": dot.scale,
                  "--dot-opacity": dot.opacity,
                  "--dot-size": dot.size,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <ClarityOrb
          size={820}
          visualScale={0.68}
          state={brainState}
          className="clarity-orb-canvas"
          label={`Diana ${orbStateLabel[brainState]} orb for the next ${minutes} minutes`}
        />
        <div className="clarity-orb-core diana-command-orb-core" aria-hidden="true">
          <span className="clarity-orb-state">{orbStateLabel[brainState]}</span>
          <strong>{minutes} minutes</strong>
          <em>{coreTitle}</em>
          <small><span>First move</span>{coreMove}</small>
        </div>
      </div>
    </div>
  );
}

export function BrainStateDock({ currentBrain }: { currentBrain: DianaOrbState }) {
  const normalizedCurrent = currentBrain === "creative" ? "on-it" : currentBrain;

  return (
    <div className="brain-state-dock" aria-label="Brain state">
      <div className="brain-state-dock-top">
        <p>Brain state</p>
        {currentBrain === "overwhelmed" && <span>Stuck support on</span>}
      </div>
      <div className="brain-state-dock-grid">
        {brainDockStates.map(({ energy, label, brain, note, icon: Icon }) => {
          const active = brain === normalizedCurrent;
          return (
            <Link
              key={brain}
              href={`/dashboard?energy=${energy}&brain=${brain}`}
              className={`brain-state-dock-button touch-target ${active ? "is-active" : ""}`}
              data-brain-state={brain}
              aria-current={active ? "true" : undefined}
            >
              <span className="brain-state-dock-orb">
                <Icon size={16} />
              </span>
              <span>
                <strong>{label}</strong>
                <small>{note}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function NextMovePanel({
  title,
  nextMove,
  href,
  minutes,
  reason,
}: {
  title: string;
  nextMove: string;
  href: string;
  minutes: number;
  reason: string;
}) {
  return (
    <div className="next-move-panel">
      <div>
        <p className="next-move-eyebrow">Your next {minutes} minutes</p>
        <h2>{title}</h2>
        <p>{nextMove}</p>
      </div>
      <Link href={href} className="next-move-primary touch-target">
        Start this move
        <ArrowRight size={19} />
      </Link>
      <ProofChips reason={reason} />
    </div>
  );
}

export function ProofChips({ reason }: { reason: string }) {
  return (
    <div className="proof-chip-row" aria-label="Proof and authorship">
      <span className="is-proof"><ShieldCheck size={15} /> Yours</span>
      <span><BookOpenCheck size={15} /> Source visible</span>
      <span><Sparkles size={15} /> Your words stay yours</span>
      <span><Clock3 size={15} /> {reason}</span>
    </div>
  );
}

export function FuturePathMiniCard() {
  return (
    <Link href="/future-path" className="future-path-mini">
      <span className="future-path-line" aria-hidden="true" />
      <p>
        <GraduationCap size={15} />
        Future Path
      </p>
      <strong>Add one proof point this week.</strong>
      <small>You are building your college story.</small>
    </Link>
  );
}

export function LaunchSequence({ journey }: { journey: FirstWeekJourney }) {
  if (!journey.show) return null;

  return (
    <section className="launch-sequence" aria-labelledby="launch-sequence-title">
      <div className="launch-sequence-heading">
        <div>
          <p>Launch sequence</p>
          <h2 id="launch-sequence-title">First setup move.</h2>
        </div>
        <span>{journey.doneCount} of {journey.steps.length} live</span>
      </div>
      <ol className="launch-path">
        {journey.steps.map((step, index) => {
          const active = journey.active?.key === step.key;
          const locked = !step.done && !active;
          return (
            <li
              key={step.key}
              className={`launch-step ${step.done ? "is-done" : active ? "is-active" : "is-locked"}`}
              style={{ "--step-index": index } as CSSProperties}
            >
              <Link href={step.href} aria-current={active ? "step" : undefined}>
                <span className="launch-node">
                  {step.done ? (
                    <CheckCircle2 size={18} />
                  ) : locked ? (
                    <Lock size={16} />
                  ) : (
                    <Circle size={18} />
                  )}
                </span>
                <span className="launch-copy">
                  <strong>{step.title}</strong>
                  <small>{active ? step.detail : locked ? `Step ${index + 1}` : "Complete"}</small>
                </span>
                {active && <ArrowRight size={18} className="launch-arrow" />}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function SignalCard({
  title,
  status,
  action,
  href,
  icon: Icon,
  accent,
}: {
  title: string;
  status: string;
  action: string;
  href: string;
  icon: LucideIcon;
  accent: "brain" | "proof" | "future";
}) {
  return (
    <Link href={href} className="signal-action-card" data-accent={accent}>
      <span className="signal-action-icon">
        <Icon size={18} />
      </span>
      <span className="signal-action-copy">
        <strong>{title}</strong>
        <em>{status}</em>
        <small>{action}</small>
      </span>
      <ArrowRight size={17} className="signal-action-arrow" />
    </Link>
  );
}

export function SignalCardGrid() {
  return (
    <section className="signal-card-grid" aria-label="Student signals">
      <SignalCard
        title="My Brain"
        status="Reading support ready."
        action="Adjust brain day"
        href="/me"
        icon={Brain}
        accent="brain"
      />
      <SignalCard
        title="Proof"
        status="1 original thought saved."
        action="View receipts"
        href="/proof"
        icon={ShieldCheck}
        accent="proof"
      />
      <SignalCard
        title="Future"
        status="1 proof point this week."
        action="Add to college story"
        href="/future-path"
        icon={GraduationCap}
        accent="future"
      />
    </section>
  );
}

export function SupportCueDrawer({ children }: { children: ReactNode }) {
  return (
    <details className="today-drawer support-cue-drawer">
      <summary className="touch-target">
        <span>
          <Brain size={17} />
          Support cues
        </span>
        <small>Open</small>
      </summary>
      <div className="today-drawer-content">
        {children}
      </div>
    </details>
  );
}

export function TonightDrawer({
  totalMinutes,
  items,
  dueCount,
  firstCardId,
}: {
  totalMinutes: number;
  items: BudgetItem[];
  dueCount: number;
  firstCardId: string | null;
}) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const label = items.length === 0 ? "Clear" : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <details className="today-drawer tonight-drawer">
      <summary className="touch-target">
        <span>
          <Orbit size={17} />
          What&apos;s left tonight?
        </span>
        <small>{label}</small>
      </summary>
      <div className="today-drawer-content tonight-drawer-content">
        {dueCount > 0 && firstCardId && (
          <Link href={`/flashcards/${firstCardId}/review`} className="tonight-review-link">
            <Brain size={17} />
            <span>
              <strong>{dueCount === 1 ? "1 card ready." : `${dueCount} cards ready.`}</strong>
              <small>Review when you have 5 minutes.</small>
            </span>
            <ArrowRight size={16} />
          </Link>
        )}

        {items.length === 0 ? (
          <p className="tonight-empty">Nothing estimated. Add time estimates when you want a clearer night map.</p>
        ) : (
          <ul className="tonight-list">
            {items.map((item) => (
              <li key={item.assignmentId}>
                <span>{item.title}</span>
                <small>~{item.effectiveMinutes} min</small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
