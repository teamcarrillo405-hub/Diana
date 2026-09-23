"use client";

import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Dumbbell,
  Moon,
  Sun,
  Target,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import {
  DEFAULT_LANDING_PAGE_CONFIG,
  type LandingPageConfig,
  type LandingNodeId,
} from "@/lib/landing-page/config";
import type {
  LearningHurdle,
  ScreenDesignOnboardingAnswers,
  StudySchedulePreference,
} from "@/lib/onboarding/screendesign";
import type { ScreenDesignOnboardingStep } from "@/lib/onboarding/screendesign-step";

import { completeScreenDesignOnboarding } from "./actions";

const HURDLE_OPTIONS: readonly {
  id: LearningHurdle;
  label: string;
  description: string;
  icon: typeof Clock3;
}[] = [
  {
    id: "time_management",
    label: "Time Management",
    description: "Balancing practice and study.",
    icon: Clock3,
  },
  {
    id: "exam_stress",
    label: "Exam Stress",
    description: "Clutch performance under pressure.",
    icon: BrainCircuit,
  },
  {
    id: "complex_concepts",
    label: "Complex Concepts",
    description: "Hard topics made easy.",
    icon: BookOpen,
  },
  {
    id: "staying_consistent",
    label: "Staying Consistent",
    description: "Hitting your study marks daily.",
    icon: Target,
  },
] as const;

const SCHEDULE_OPTIONS: readonly {
  id: StudySchedulePreference;
  label: string;
  description: string;
  icon: typeof Sun;
  tone: "morning" | "practice" | "night";
}[] = [
  {
    id: "morning",
    label: "Morning Hustle",
    description: "Before classes & early gym sessions.",
    icon: Sun,
    tone: "morning",
  },
  {
    id: "after_practice",
    label: "After-Practice Grind",
    description: "Post-workout focus boost.",
    icon: Dumbbell,
    tone: "practice",
  },
  {
    id: "late_night",
    label: "Late Night Sessions",
    description: "Quiet focus when everyone else is asleep.",
    icon: Moon,
    tone: "night",
  },
] as const;

interface ScreenDesignOnboardingProps {
  readonly initialStep?: ScreenDesignOnboardingStep;
  readonly initialLearningHurdle?: LearningHurdle | null;
  readonly initialStudySchedulePreference?: StudySchedulePreference | null;
  readonly onComplete?: (answers: ScreenDesignOnboardingAnswers) => void;
  readonly presentation?: "wizard" | "scroll";
  readonly landingConfig?: LandingPageConfig;
}

export function ScreenDesignOnboarding({
  initialStep = "welcome",
  initialLearningHurdle = "exam_stress",
  initialStudySchedulePreference = "after_practice",
  onComplete,
  presentation = "wizard",
  landingConfig = DEFAULT_LANDING_PAGE_CONFIG,
}: ScreenDesignOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState<ScreenDesignOnboardingStep>(initialStep);
  const [learningHurdle, setLearningHurdle] =
    useState<LearningHurdle | null>(initialLearningHurdle);
  const [studySchedulePreference, setStudySchedulePreference] =
    useState<StudySchedulePreference | null>(initialStudySchedulePreference);
  const [sleepGoal, setSleepGoal] = useState(8);
  const [movementGoal, setMovementGoal] = useState(4);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  const goTo = (nextStep: ScreenDesignOnboardingStep) => {
    setFeedback(null);
    if (presentation === "scroll") {
      const target = document.getElementById(`public-home-${nextStep}`);
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      target?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
      return;
    }
    setStep(nextStep);
  };

  const complete = () => {
    if (
      !learningHurdle
      || !studySchedulePreference
      || pending
      || submittingRef.current
    ) return;

    setFeedback(null);
    if (onComplete) {
      submittingRef.current = true;
      try {
        onComplete({
          learningHurdle,
          studySchedulePreference,
        });
      } catch {
        submittingRef.current = false;
        setFeedback(
          "Those choices are still selected. Continue again when you are ready.",
        );
      }
      return;
    }

    submittingRef.current = true;
    startTransition(async () => {
      try {
        const result = await completeScreenDesignOnboarding({
          learningHurdle,
          studySchedulePreference,
          sleepGoal,
          movementGoal,
        });

        if (!result.ok) {
          submittingRef.current = false;
          if (result.reason === "validation") {
            setFeedback(
              result.fieldErrors.wellnessGoals
                ?? result.fieldErrors.studySchedulePreference
                ?? result.fieldErrors.learningHurdle
                ?? "Choose the options that feel closest today.",
            );
            return;
          }
          setFeedback(result.error);
          return;
        }

        router.push("/dashboard");
      } catch {
        submittingRef.current = false;
        setFeedback("Those choices are still selected. Try saving again when you are ready.");
      }
    });
  };

  if (presentation === "scroll") {
    return (
      <>
        <ScreenDesignViewport
          id="public-home-welcome"
          className="sd-source-onboarding sd-public-home-panel"
          data-onboarding-step="welcome"
          aria-label="Diana welcome"
        >
          <WelcomeScreen
            asSection
            surfaceId="public-home-welcome-content"
            content={landingConfig.onboarding.hero}
            onContinue={() => goTo("educational")}
          />
        </ScreenDesignViewport>
        <ScreenDesignViewport
          id="public-home-educational"
          className="sd-source-onboarding sd-public-home-panel"
          data-onboarding-step="educational"
          aria-label="Diana educational overview"
        >
          <EducationalScreen
            asSection
            surfaceId="public-home-educational-content"
            content={landingConfig.onboarding.education}
            onBack={() => goTo("welcome")}
            onContinue={() => goTo("challenge")}
          />
        </ScreenDesignViewport>
        <ScreenDesignViewport
          id="public-home-challenge"
          className="sd-source-onboarding sd-public-home-panel"
          data-onboarding-step="challenge"
          aria-label="Diana learning challenge"
        >
          <ChallengeScreen
            asSection
            surfaceId="public-home-challenge-content"
            content={landingConfig.onboarding.challenge}
            selected={learningHurdle}
            onSelect={setLearningHurdle}
            onBack={() => goTo("educational")}
            onContinue={() => goTo("schedule")}
          />
        </ScreenDesignViewport>
        <ScreenDesignViewport
          id="public-home-schedule"
          className="sd-source-onboarding sd-public-home-panel"
          data-onboarding-step="schedule"
          aria-label="Diana study schedule"
        >
          <ScheduleScreen
            asSection
            surfaceId="public-home-schedule-content"
            content={landingConfig.onboarding.schedule}
            selected={studySchedulePreference}
            onSelect={setStudySchedulePreference}
            onBack={() => goTo("challenge")}
            onContinue={complete}
            pending={pending}
            feedback={feedback}
            showWellnessGoals={false}
            sleepGoal={sleepGoal}
            movementGoal={movementGoal}
            onSleepGoalChange={setSleepGoal}
            onMovementGoalChange={setMovementGoal}
          />
        </ScreenDesignViewport>
      </>
    );
  }

  return (
    <ScreenDesignViewport
      className="sd-source-onboarding"
      data-onboarding-step={step}
      aria-label="Diana onboarding"
    >
      {step === "welcome" ? (
        <WelcomeScreen
          content={landingConfig.onboarding.hero}
          onContinue={() => goTo("educational")}
        />
      ) : null}
      {step === "educational" ? (
        <EducationalScreen
          content={landingConfig.onboarding.education}
          onBack={() => goTo("welcome")}
          onContinue={() => goTo("challenge")}
        />
      ) : null}
      {step === "challenge" ? (
        <ChallengeScreen
          content={landingConfig.onboarding.challenge}
          selected={learningHurdle}
          onSelect={setLearningHurdle}
          onBack={() => goTo("educational")}
          onContinue={() => goTo("schedule")}
        />
      ) : null}
      {step === "schedule" ? (
        <ScheduleScreen
          content={landingConfig.onboarding.schedule}
          selected={studySchedulePreference}
          onSelect={setStudySchedulePreference}
          onBack={() => goTo("challenge")}
          onContinue={complete}
          pending={pending}
          feedback={feedback}
          showWellnessGoals
          sleepGoal={sleepGoal}
          movementGoal={movementGoal}
          onSleepGoalChange={setSleepGoal}
          onMovementGoalChange={setMovementGoal}
        />
      ) : null}
    </ScreenDesignViewport>
  );
}

interface OnboardingSurfaceProps {
  readonly asSection?: boolean;
  readonly surfaceId?: string;
}

function OnboardingSurface({
  asSection = false,
  surfaceId,
  className,
  children,
}: OnboardingSurfaceProps & {
  readonly className: string;
  readonly children: ReactNode;
}) {
  if (asSection) {
    return (
      <section id={surfaceId} className={className}>
        {children}
      </section>
    );
  }

  return (
    <main id="main-content" className={className}>
      {children}
    </main>
  );
}

function DianaLogo({
  size,
  nodeId,
}: {
  readonly size: "hero" | "header";
  readonly nodeId?: LandingNodeId;
}) {
  return (
    <span
      className="sd-landing-logo-node"
      data-landing-node={nodeId}
      data-landing-movable="true"
    >
      <SourceMedia
        assetId="diana-logo"
        width={size === "hero" ? 96 : 56}
        height={size === "hero" ? 30 : 18}
        alt="DIANA logo"
        className={
          size === "hero"
            ? "sd-onboarding-logo sd-onboarding-logo-hero"
            : "sd-onboarding-logo sd-onboarding-logo-header"
        }
      />
    </span>
  );
}

function WelcomeScreen({
  onContinue,
  asSection,
  surfaceId,
  content,
}: {
  readonly onContinue: () => void;
  readonly content: LandingPageConfig["onboarding"]["hero"];
} & OnboardingSurfaceProps) {
  return (
    <OnboardingSurface
      asSection={asSection}
      surfaceId={surfaceId}
      className="sd-onboarding-state sd-onboarding-welcome"
    >
      <img
        src={content.backgroundUrl}
        alt=""
        aria-hidden="true"
        width={1586}
        height={992}
        fetchPriority="high"
        className="sd-onboarding-welcome-background"
        data-landing-node="hero.background"
        data-landing-movable="false"
      />
      <header className="sd-onboarding-welcome-header">
        <DianaLogo size="hero" nodeId="hero.logo" />
      </header>
      <div className="sd-onboarding-welcome-copy">
        <h1 data-landing-node="hero.title" data-landing-movable="true">
          {content.title}
          <span>{content.accentTitle}</span>
        </h1>
        <p
          data-landing-node="hero.subtitle"
          data-landing-movable="true"
        >
          {content.subtitle}
        </p>
      </div>
      <footer className="sd-onboarding-footer">
        <button
          type="button"
          onClick={onContinue}
          className="sd-onboarding-primary"
          data-landing-node="hero.cta"
          data-landing-movable="true"
        >
          {content.cta}
        </button>
      </footer>
    </OnboardingSurface>
  );
}

function HeaderBack({ onBack }: { readonly onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="sd-onboarding-back" aria-label="Back">
      <ChevronLeft aria-hidden="true" />
    </button>
  );
}

function EducationalScreen({
  onBack,
  onContinue,
  asSection,
  surfaceId,
  content,
}: {
  readonly onBack: () => void;
  readonly onContinue: () => void;
  readonly content: LandingPageConfig["onboarding"]["education"];
} & OnboardingSurfaceProps) {
  return (
    <OnboardingSurface
      asSection={asSection}
      surfaceId={surfaceId}
      className="sd-onboarding-state sd-onboarding-educational"
    >
      <header className="sd-onboarding-header sd-onboarding-header-centered">
        <HeaderBack onBack={onBack} />
        <DianaLogo size="header" nodeId="education.logo" />
        <span aria-hidden="true" className="sd-onboarding-header-spacer" />
      </header>
      <div className="sd-onboarding-scroll sd-onboarding-education-scroll">
        <div
          className="sd-onboarding-section-title"
          data-landing-node="education.heading"
          data-landing-movable="true"
        >
          <span>{content.eyebrow}</span>
          <h1>{content.title}</h1>
        </div>
        <section
          className="sd-onboarding-stat-card"
          aria-labelledby="gpa-stat-heading"
          data-landing-node="education.stat"
          data-landing-movable="true"
        >
          <TrendingUp aria-hidden="true" className="sd-onboarding-stat-watermark" />
          <SourceMedia
            assetId="onboarding-gpa-progress-chart"
            width={224}
            height={224}
            alt="GPA progress chart"
            className="sd-onboarding-gpa-chart"
          />
          <div className="sd-onboarding-stat-copy">
            <strong>{content.statValue}</strong>
            <p id="gpa-stat-heading">
              {content.statPrefix} <span>{content.statBrand}</span>{" "}
              {content.statMiddle} <b>{content.statResult}</b>
            </p>
          </div>
        </section>
        <div className="sd-onboarding-benefits">
          <Benefit
            icon={Clock3}
            tone="blue"
            title={content.benefits[0]!.title}
            nodeId="education.benefit.time"
          >
            {content.benefits[0]!.body}
          </Benefit>
          <Benefit
            icon={Target}
            tone="pink"
            title={content.benefits[1]!.title}
            nodeId="education.benefit.precision"
          >
            {content.benefits[1]!.body}
          </Benefit>
        </div>
      </div>
      <footer className="sd-onboarding-footer">
        <button
          type="button"
          onClick={onContinue}
          className="sd-onboarding-primary"
          data-landing-node="education.cta"
          data-landing-movable="true"
        >
          {content.cta}
        </button>
      </footer>
    </OnboardingSurface>
  );
}

function Benefit({
  icon: Icon,
  tone,
  title,
  children,
  nodeId,
}: {
  readonly icon: typeof Clock3;
  readonly tone: "blue" | "pink";
  readonly title: string;
  readonly children: string;
  readonly nodeId: LandingNodeId;
}) {
  return (
    <div
      className="sd-onboarding-benefit"
      data-landing-node={nodeId}
      data-landing-movable="true"
    >
      <span className="sd-onboarding-benefit-icon" data-tone={tone}>
        <Icon aria-hidden="true" />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </div>
  );
}

function QuizHeader({
  current,
  title,
  onBack,
  headingNodeId,
  logoNodeId,
}: {
  readonly current: 1 | 2;
  readonly title: React.ReactNode;
  readonly onBack: () => void;
  readonly headingNodeId: LandingNodeId;
  readonly logoNodeId: LandingNodeId;
}) {
  return (
    <header className="sd-onboarding-quiz-header">
      <div className="sd-onboarding-quiz-nav">
        <HeaderBack onBack={onBack} />
        <DianaLogo size="header" nodeId={logoNodeId} />
        <span>{current}/4</span>
      </div>
      <div className="sd-onboarding-progress" aria-label={`Step ${current} of 4`}>
        <span style={{ width: `${current * 25}%` }} />
      </div>
      <h1 data-landing-node={headingNodeId} data-landing-movable="true">
        {title}
      </h1>
    </header>
  );
}

function ChallengeScreen({
  selected,
  onSelect,
  onBack,
  onContinue,
  asSection,
  surfaceId,
  content,
}: {
  readonly selected: LearningHurdle | null;
  readonly onSelect: (value: LearningHurdle) => void;
  readonly onBack: () => void;
  readonly onContinue: () => void;
  readonly content: LandingPageConfig["onboarding"]["challenge"];
} & OnboardingSurfaceProps) {
  const options = content.options.map((option) => ({
    ...option,
    icon: HURDLE_OPTIONS.find((candidate) => candidate.id === option.id)!.icon,
  }));

  return (
    <OnboardingSurface
      asSection={asSection}
      surfaceId={surfaceId}
      className="sd-onboarding-state sd-onboarding-quiz"
    >
      <QuizHeader
        current={1}
        onBack={onBack}
        title={content.title}
        headingNodeId="challenge.heading"
        logoNodeId="challenge.logo"
      />
      <div className="sd-onboarding-scroll sd-onboarding-challenge-scroll">
        <div className="sd-onboarding-challenge-options" role="radiogroup" aria-label="Learning hurdle">
          {options.map((option, index) => {
            const Icon = option.icon;
            const active = option.id === selected;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelect(option.id)}
                onKeyDown={(event) =>
                  handleRadioKey(event, options, index, onSelect)
                }
                tabIndex={active || (!selected && index === 0) ? 0 : -1}
                data-option-id={option.id}
                className="sd-onboarding-challenge-option"
                data-active={active}
                data-landing-node={`challenge.option.${option.id}`}
                data-landing-movable="true"
              >
                <span className="sd-onboarding-challenge-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="sd-onboarding-option-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                {active ? <CheckCircle2 aria-hidden="true" className="sd-onboarding-check" /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <footer className="sd-onboarding-footer">
        <button
          type="button"
          aria-label="Select learning hurdle"
          onClick={onContinue}
          disabled={!selected}
          className="sd-onboarding-primary"
          data-landing-node="challenge.cta"
          data-landing-movable="true"
        >
          {content.cta}
        </button>
      </footer>
    </OnboardingSurface>
  );
}

function ScheduleScreen({
  selected,
  onSelect,
  onBack,
  onContinue,
  pending,
  feedback,
  showWellnessGoals = false,
  sleepGoal,
  movementGoal,
  onSleepGoalChange,
  onMovementGoalChange,
  asSection,
  surfaceId,
  content,
}: {
  readonly selected: StudySchedulePreference | null;
  readonly onSelect: (value: StudySchedulePreference) => void;
  readonly onBack: () => void;
  readonly onContinue: () => void;
  readonly pending: boolean;
  readonly feedback: string | null;
  readonly showWellnessGoals?: boolean;
  readonly sleepGoal: number;
  readonly movementGoal: number;
  readonly onSleepGoalChange: (value: number) => void;
  readonly onMovementGoalChange: (value: number) => void;
  readonly content: LandingPageConfig["onboarding"]["schedule"];
} & OnboardingSurfaceProps) {
  const options = content.options.map((option) => {
    const presentation = SCHEDULE_OPTIONS.find(
      (candidate) => candidate.id === option.id,
    )!;
    return {
      ...option,
      icon: presentation.icon,
      tone: presentation.tone,
    };
  });

  return (
    <OnboardingSurface
      asSection={asSection}
      surfaceId={surfaceId}
      className="sd-onboarding-state sd-onboarding-quiz"
    >
      <QuizHeader
        current={2}
        onBack={onBack}
        title={content.title}
        headingNodeId="schedule.heading"
        logoNodeId="schedule.logo"
      />
      <div className="sd-onboarding-scroll sd-onboarding-schedule-scroll">
        <div className="sd-onboarding-schedule-options" role="radiogroup" aria-label="Study schedule">
          {options.map((option, index) => {
            const Icon = option.icon;
            const active = option.id === selected;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelect(option.id)}
                onKeyDown={(event) =>
                  handleRadioKey(event, options, index, onSelect)
                }
                tabIndex={active || (!selected && index === 0) ? 0 : -1}
                data-option-id={option.id}
                className="sd-onboarding-schedule-option"
                data-active={active}
                data-tone={option.tone}
                data-landing-node={`schedule.option.${option.id}`}
                data-landing-movable="true"
              >
                {option.id === "after_practice" && active ? (
                  <span className="sd-onboarding-choice-badge">
                    {content.choiceBadge}
                  </span>
                ) : null}
                <span className="sd-onboarding-schedule-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="sd-onboarding-option-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </button>
            );
          })}
        </div>
        {showWellnessGoals ? (
          <section className="sd-onboarding-wellness-targets" aria-labelledby="wellness-targets-title">
            <div className="sd-onboarding-wellness-targets-head">
              <span>Wellness targets</span>
              <p id="wellness-targets-title">Set a starting point. You can adjust it later.</p>
            </div>
            <label className="sd-onboarding-wellness-target">
              <span>Sleep</span>
              <output>{sleepGoal.toFixed(1)} hrs</output>
              <input
                type="range"
                min="4"
                max="10"
                step="0.5"
                value={sleepGoal}
                aria-label="Sleep goal"
                aria-valuetext={`${sleepGoal.toFixed(1)} hours each night`}
                onChange={(event) => onSleepGoalChange(Number(event.target.value))}
              />
              <small>Hours each night</small>
            </label>
            <label className="sd-onboarding-wellness-target">
              <span>Movement</span>
              <output>{movementGoal} days</output>
              <input
                type="range"
                min="1"
                max="7"
                step="1"
                value={movementGoal}
                aria-label="Movement goal"
                aria-valuetext={`${movementGoal} days each week`}
                onChange={(event) => onMovementGoalChange(Number(event.target.value))}
              />
              <small>Days each week</small>
            </label>
          </section>
        ) : null}
        {feedback ? (
          <p role="status" className="sd-onboarding-feedback">
            {feedback}
          </p>
        ) : null}
      </div>
      <footer className="sd-onboarding-footer">
        <button
          type="button"
          aria-label="Select study schedule"
          onClick={onContinue}
          disabled={!selected || pending}
          aria-busy={pending}
          className="sd-onboarding-primary"
          data-landing-node="schedule.cta"
          data-landing-movable="true"
        >
          {pending ? "SAVING CHOICES" : content.cta}
        </button>
      </footer>
    </OnboardingSurface>
  );
}

function handleRadioKey<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  options: readonly { readonly id: T }[],
  currentIndex: number,
  onSelect: (value: T) => void,
) {
  const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
  const backward = event.key === "ArrowUp" || event.key === "ArrowLeft";
  const first = event.key === "Home";
  const last = event.key === "End";
  if (!forward && !backward && !first && !last) return;

  event.preventDefault();
  const nextIndex = first
    ? 0
    : last
      ? options.length - 1
      : forward
        ? (currentIndex + 1) % options.length
        : (currentIndex - 1 + options.length) % options.length;
  const next = options[nextIndex];
  if (!next) return;

  onSelect(next.id);
  const group = event.currentTarget.closest('[role="radiogroup"]');
  window.requestAnimationFrame(() => {
    const nextControl = group?.querySelector<HTMLButtonElement>(
      `[data-option-id="${next.id}"]`,
    );
    nextControl?.focus();
  });
}
