"use client";

import {
  BookOpen,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Dumbbell,
  Moon,
  School,
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
import { DianaWordmark } from "@/components/screen-design/primitives";
import { CampusWordmark } from "@/components/student-shell/campus-wordmark";
import { SourceMedia } from "@/components/screen-design/source-media";
import { SchoolBrandingForm, type SchoolBrandingFormHandle } from "@/components/school-branding-form";
import { savePlayerPhoto } from "@/app/(app)/settings/player-photo-actions";
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
import connectionStyles from "./onboarding-connection.module.css";
import personalizeStyles from "./onboarding-personalize.module.css";

type PublicHomeOnboardingStep =
  | ScreenDesignOnboardingStep
  | "welcome"
  | "educational"
  | "challenge"
  | "schedule";

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
    description: "A calmer plan for exams.",
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
    description: "Find a routine that fits.",
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
    label: "Morning",
    description: "Before classes & early gym sessions.",
    icon: Sun,
    tone: "morning",
  },
  {
    id: "after_practice",
    label: "Afternoon",
    description: "After classes or activities.",
    icon: Dumbbell,
    tone: "practice",
  },
  {
    id: "late_night",
    label: "Evening",
    description: "Quiet focus when everyone else is asleep.",
    icon: Moon,
    tone: "night",
  },
] as const;

const STUDY_TIME_LABELS: Record<StudySchedulePreference, string> = {
  morning: "Morning",
  after_practice: "Afternoon",
  late_night: "Evening",
};

interface ScreenDesignOnboardingProps {
  readonly initialStep?: ScreenDesignOnboardingStep;
  readonly providerConnections?: { googleClassroom: boolean; canvas: boolean };
  readonly initialLearningHurdle?: LearningHurdle | null;
  readonly initialStudySchedulePreference?: StudySchedulePreference | null;
  readonly onComplete?: (answers: ScreenDesignOnboardingAnswers) => void;
  readonly presentation?: "wizard" | "scroll";
  readonly landingConfig?: LandingPageConfig;
  readonly initialSchoolBranding?: {
    schoolName?: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    logoDataUrl: string | null;
  };
}

export function ScreenDesignOnboarding({
  initialStep = "personalize",
  providerConnections = { googleClassroom: false, canvas: false },
  initialLearningHurdle = "exam_stress",
  initialStudySchedulePreference = "after_practice",
  onComplete,
  presentation = "wizard",
  landingConfig = DEFAULT_LANDING_PAGE_CONFIG,
  initialSchoolBranding = { primaryColor: null, secondaryColor: null, logoDataUrl: null },
}: ScreenDesignOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState<PublicHomeOnboardingStep>(initialStep);
  const [learningHurdle, setLearningHurdle] =
    useState<LearningHurdle | null>(initialLearningHurdle);
  const [studySchedulePreference, setStudySchedulePreference] =
    useState<StudySchedulePreference | null>(initialStudySchedulePreference);
  const [sleepGoal, setSleepGoal] = useState(8);
  const [movementGoal, setMovementGoal] = useState(4);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const schoolBrandingRef = useRef<SchoolBrandingFormHandle>(null);

  const goTo = (nextStep: PublicHomeOnboardingStep) => {
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
        if (schoolBrandingRef.current && !await schoolBrandingRef.current.saveIfChanged()) {
          submittingRef.current = false;
          setFeedback("Check your school look and try continuing again.");
          return;
        }
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

        setStep("connect");
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

  if (step === "connect") {
    return (
      <ConnectSchoolScreen
        providers={providerConnections}
        onBack={() => goTo("personalize")}
        onSkip={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <PersonalizeScreen
      initialSchoolBranding={initialSchoolBranding}
      schoolBrandingRef={schoolBrandingRef}
      learningHurdle={learningHurdle}
      studySchedulePreference={studySchedulePreference}
      onLearningHurdleChange={setLearningHurdle}
      onStudySchedulePreferenceChange={setStudySchedulePreference}
      onContinue={complete}
      pending={pending}
      feedback={feedback}
    />
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
      <DianaWordmark
        tight
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

function PersonalizeScreen({
  initialSchoolBranding,
  schoolBrandingRef,
  learningHurdle,
  studySchedulePreference,
  onLearningHurdleChange,
  onStudySchedulePreferenceChange,
  onContinue,
  pending,
  feedback,
}: {
  readonly initialSchoolBranding: {
    schoolName?: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    logoDataUrl: string | null;
  };
  readonly schoolBrandingRef: React.RefObject<SchoolBrandingFormHandle | null>;
  readonly learningHurdle: LearningHurdle | null;
  readonly studySchedulePreference: StudySchedulePreference | null;
  readonly onLearningHurdleChange: (value: LearningHurdle) => void;
  readonly onStudySchedulePreferenceChange: (value: StudySchedulePreference) => void;
  readonly onContinue: () => void;
  readonly pending: boolean;
  readonly feedback: string | null;
}) {
  return (
    <div className={personalizeStyles.page} data-entry-shell data-campus-family="services">
      <header className={connectionStyles.topbar}>
        <CampusWordmark light />
        <span>Account setup</span>
      </header>

      <main id="main-content" className={personalizeStyles.layout}>
        <section className={personalizeStyles.form} aria-label="Account preferences">
          <header className={personalizeStyles.intro}>
            <div><h1>Make it yours</h1></div>
            <strong>1 of 2</strong>
          </header>

          <section className={personalizeStyles.question} aria-labelledby="learning-hurdle-title">
            <h2 id="learning-hurdle-title">What would help most?</h2>
            <div className={personalizeStyles.choices} role="radiogroup" aria-label="Learning hurdle">
              {HURDLE_OPTIONS.map((option, index) => {
                const active = learningHurdle === option.id;
                return (
                  <button
                    key={option.id}
                    data-option-id={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active || (!learningHurdle && index === 0) ? 0 : -1}
                    className={personalizeStyles.option}
                    data-active={active}
                    onClick={() => onLearningHurdleChange(option.id)}
                    onKeyDown={(event) => handleRadioKey(event, HURDLE_OPTIONS, index, onLearningHurdleChange)}
                  >
                    <span>{option.label}</span>
                    <CheckCircle2 aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className={personalizeStyles.question} aria-labelledby="study-schedule-title">
            <h2 id="study-schedule-title">When do you focus best?</h2>
            <div className={personalizeStyles.times} role="radiogroup" aria-label="Study schedule">
              {SCHEDULE_OPTIONS.map((option, index) => {
                const active = studySchedulePreference === option.id;
                return (
                  <button
                    key={option.id}
                    data-option-id={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active || (!studySchedulePreference && index === 0) ? 0 : -1}
                    className={personalizeStyles.option}
                    data-active={active}
                    onClick={() => onStudySchedulePreferenceChange(option.id)}
                    onKeyDown={(event) => handleRadioKey(event, SCHEDULE_OPTIONS, index, onStudySchedulePreferenceChange)}
                  >
                    <span>{STUDY_TIME_LABELS[option.id]}</span>
                    <CheckCircle2 aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className={personalizeStyles.schoolBranding} aria-label="School look">
            <p className={personalizeStyles.schoolBrandingHint}>Optional. Your choices will be saved when you continue.</p>
            <SchoolBrandingForm ref={schoolBrandingRef} disabled={pending} initialSchoolBranding={initialSchoolBranding} />
          </section>
          <ProfilePhotoOption className={personalizeStyles.photo} />
          <footer className={personalizeStyles.footer}>
            <p>You can change these anytime.</p>
            <button
              type="button"
              className={personalizeStyles.submit}
              disabled={!learningHurdle || !studySchedulePreference || pending}
              aria-busy={pending}
              onClick={onContinue}
            >
              {pending ? "Saving..." : "Continue"}
            </button>
          </footer>
          {feedback ? <p className={connectionStyles.setupFeedback} role="status">{feedback}</p> : null}
        </section>

      </main>
    </div>
  );
}

function ConnectSchoolScreen({
  providers,
  onBack,
  onSkip,
}: {
  readonly providers: { googleClassroom: boolean; canvas: boolean };
  readonly onBack: () => void;
  readonly onSkip: () => void;
}) {
  return (
    <div className={personalizeStyles.page} data-entry-shell data-campus-family="services">
      <header className={connectionStyles.topbar}>
        <CampusWordmark light />
        <span>Account setup</span>
      </header>

      <main id="main-content" className={personalizeStyles.connectionLayout}>
        <header className={personalizeStyles.connectionIntro}>
          <button
            type="button"
            onClick={onBack}
            className={connectionStyles.backButton}
            aria-label="Back"
            title="Back"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <div>
            <p>Optional connection</p>
            <h1>Connect your school</h1>
            <span>Import classes and due dates. You can connect later.</span>
          </div>
          <strong>2 of 2</strong>
        </header>

        <div className={connectionStyles.providerGrid}>
          <section className={connectionStyles.providerCard} aria-labelledby="google-classroom-title">
            <span className={`${connectionStyles.providerIcon} ${connectionStyles.googleIcon}`}>
              <BookOpen aria-hidden="true" />
            </span>
            <div>
              <h2 id="google-classroom-title">Google Classroom</h2>
              <p>Use the Google account you use for school.</p>
            </div>
            {providers.googleClassroom ? <a
              className={`${connectionStyles.primaryAction}`}
              href="/api/lms/google-oauth/start?return_to=/dashboard"
            >
              Connect Google Classroom
            </a> : <p className={connectionStyles.availability}>Google Classroom is not available here yet. You can add your work yourself.</p>}
          </section>

          <section className={connectionStyles.providerCard} aria-labelledby="canvas-title">
            <span className={`${connectionStyles.providerIcon} ${connectionStyles.canvasIcon}`}>
              <School aria-hidden="true" />
            </span>
            <div>
              <h2 id="canvas-title">Canvas</h2>
              <p>Use the Canvas address your school gave you.</p>
            </div>
            {providers.canvas ? <form
              action="/api/lms/canvas-oauth/start"
              method="get"
              className={connectionStyles.canvasForm}
            >
              <label htmlFor="canvas-school-address">Canvas school address</label>
              <div>
                <input
                  id="canvas-school-address"
                  name="base_url"
                  type="url"
                  required
                  placeholder="https://school.instructure.com"
                />
                <input name="return_to" type="hidden" value="/dashboard" />
                <button
                  type="submit"
                  className={`${connectionStyles.primaryAction}`}
                >
                  Connect Canvas
                </button>
              </div>
            </form> : <p className={connectionStyles.availability}>Canvas is not available here yet. You can connect later in Settings.</p>}
          </section>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className={`${connectionStyles.skipAction} ${personalizeStyles.connectionSkip}`}
        >
          Skip for now
        </button>
      </main>
    </div>
  );
}

function ProfilePhotoOption({
  className,
}: {
  readonly className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onPhotoSelected(file: File) {
    setSaving(true);
    setMessage(null);
    try {
      const photoDataUrl = await profilePhotoDataUrl(file);
      const result = await savePlayerPhoto(photoDataUrl);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setPhoto(photoDataUrl);
      setMessage("Profile photo saved.");
    } catch {
      setMessage("Choose a photo in PNG, JPG, or WebP format.");
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={`${connectionStyles.photoOption} ${className ?? ""}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-hidden="true"
        tabIndex={-1}
        className={connectionStyles.photoInput}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onPhotoSelected(file);
        }}
      />
      <button
        type="button"
        className={connectionStyles.photoAction}
        disabled={saving}
        aria-label={photo ? "Replace profile photo" : "Add a photo"}
        onClick={() => inputRef.current?.click()}
      >
        <Camera aria-hidden="true" />
        <span>{saving ? "Saving..." : photo ? "Replace photo" : "Add a photo"}</span>
        {!photo && !saving ? <small aria-hidden="true">Optional</small> : null}
      </button>
      {message ? <span className={connectionStyles.photoMessage} role="status">{message}</span> : null}
    </div>
  );
}

async function profilePhotoDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("invalid-image");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 560 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
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
