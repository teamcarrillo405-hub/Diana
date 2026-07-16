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
} from "react";

import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import type {
  LearningHurdle,
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
}

export function ScreenDesignOnboarding({
  initialStep = "welcome",
  initialLearningHurdle = "exam_stress",
  initialStudySchedulePreference = "after_practice",
}: ScreenDesignOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState<ScreenDesignOnboardingStep>(initialStep);
  const [learningHurdle, setLearningHurdle] =
    useState<LearningHurdle | null>(initialLearningHurdle);
  const [studySchedulePreference, setStudySchedulePreference] =
    useState<StudySchedulePreference | null>(initialStudySchedulePreference);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  const goTo = (nextStep: ScreenDesignOnboardingStep) => {
    setFeedback(null);
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
    submittingRef.current = true;
    startTransition(async () => {
      try {
        const result = await completeScreenDesignOnboarding({
          learningHurdle,
          studySchedulePreference,
        });

        if (!result.ok) {
          submittingRef.current = false;
          if (result.reason === "validation") {
            setFeedback(
              result.fieldErrors.studySchedulePreference
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

  return (
    <ScreenDesignViewport
      className="sd-source-onboarding"
      data-onboarding-step={step}
      aria-label="Diana onboarding"
    >
      {step === "welcome" ? (
        <WelcomeScreen onContinue={() => goTo("educational")} />
      ) : null}
      {step === "educational" ? (
        <EducationalScreen
          onBack={() => goTo("welcome")}
          onContinue={() => goTo("challenge")}
        />
      ) : null}
      {step === "challenge" ? (
        <ChallengeScreen
          selected={learningHurdle}
          onSelect={setLearningHurdle}
          onBack={() => goTo("educational")}
          onContinue={() => goTo("schedule")}
        />
      ) : null}
      {step === "schedule" ? (
        <ScheduleScreen
          selected={studySchedulePreference}
          onSelect={setStudySchedulePreference}
          onBack={() => goTo("challenge")}
          onContinue={complete}
          pending={pending}
          feedback={feedback}
        />
      ) : null}
    </ScreenDesignViewport>
  );
}

function DianaLogo({ size }: { readonly size: "hero" | "header" }) {
  return (
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
  );
}

function WelcomeScreen({ onContinue }: { readonly onContinue: () => void }) {
  return (
    <main id="main-content" className="sd-onboarding-state sd-onboarding-welcome">
      <SourceMedia
        assetId="onboarding-welcome-background"
        width={1586}
        height={992}
        decorative
        className="sd-onboarding-welcome-background"
      />
      <header className="sd-onboarding-welcome-header">
        <DianaLogo size="hero" />
      </header>
      <div className="sd-onboarding-welcome-copy">
        <h1>
          DIANA
          <span>AI TUTOR</span>
        </h1>
        <p>
          Your Academic Coach
          <br />
          for the Win.
        </p>
      </div>
      <footer className="sd-onboarding-footer">
        <button type="button" onClick={onContinue} className="sd-onboarding-primary">
          GET STARTED
        </button>
      </footer>
    </main>
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
}: {
  readonly onBack: () => void;
  readonly onContinue: () => void;
}) {
  return (
    <main id="main-content" className="sd-onboarding-state sd-onboarding-educational">
      <header className="sd-onboarding-header sd-onboarding-header-centered">
        <HeaderBack onBack={onBack} />
        <DianaLogo size="header" />
        <span aria-hidden="true" className="sd-onboarding-header-spacer" />
      </header>
      <div className="sd-onboarding-scroll sd-onboarding-education-scroll">
        <div className="sd-onboarding-section-title">
          <span>Stat Report</span>
          <h1>DID YOU KNOW?</h1>
        </div>
        <section className="sd-onboarding-stat-card" aria-labelledby="gpa-stat-heading">
          <TrendingUp aria-hidden="true" className="sd-onboarding-stat-watermark" />
          <SourceMedia
            assetId="onboarding-gpa-progress-chart"
            width={224}
            height={224}
            alt="GPA progress chart"
            className="sd-onboarding-gpa-chart"
          />
          <div className="sd-onboarding-stat-copy">
            <strong>+40%</strong>
            <p id="gpa-stat-heading">
              Athletes who use <span>DIANA</span> see a <b>40% boost in GPA</b> within one
              semester.
            </p>
          </div>
        </section>
        <div className="sd-onboarding-benefits">
          <Benefit icon={Clock3} tone="blue" title="Save 10+ Hours/Week">
            Automate your note-taking and study summaries to focus on your sport.
          </Benefit>
          <Benefit icon={Target} tone="pink" title="Elite Precision">
            Our AI focuses on exactly what you need to ace your next exam.
          </Benefit>
        </div>
      </div>
      <footer className="sd-onboarding-footer">
        <button type="button" onClick={onContinue} className="sd-onboarding-primary">
          CONTINUE
        </button>
      </footer>
    </main>
  );
}

function Benefit({
  icon: Icon,
  tone,
  title,
  children,
}: {
  readonly icon: typeof Clock3;
  readonly tone: "blue" | "pink";
  readonly title: string;
  readonly children: string;
}) {
  return (
    <div className="sd-onboarding-benefit">
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
}: {
  readonly current: 1 | 2;
  readonly title: React.ReactNode;
  readonly onBack: () => void;
}) {
  return (
    <header className="sd-onboarding-quiz-header">
      <div className="sd-onboarding-quiz-nav">
        <HeaderBack onBack={onBack} />
        <DianaLogo size="header" />
        <span>{current}/4</span>
      </div>
      <div className="sd-onboarding-progress" aria-label={`Step ${current} of 4`}>
        <span style={{ width: `${current * 25}%` }} />
      </div>
      <h1>{title}</h1>
    </header>
  );
}

function ChallengeScreen({
  selected,
  onSelect,
  onBack,
  onContinue,
}: {
  readonly selected: LearningHurdle | null;
  readonly onSelect: (value: LearningHurdle) => void;
  readonly onBack: () => void;
  readonly onContinue: () => void;
}) {
  return (
    <main id="main-content" className="sd-onboarding-state sd-onboarding-quiz">
      <QuizHeader current={1} onBack={onBack} title="WHAT'S YOUR BIGGEST HURDLE RIGHT NOW?" />
      <div className="sd-onboarding-scroll sd-onboarding-challenge-scroll">
        <div className="sd-onboarding-challenge-options" role="radiogroup" aria-label="Learning hurdle">
          {HURDLE_OPTIONS.map((option, index) => {
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
                  handleRadioKey(event, HURDLE_OPTIONS, index, onSelect)
                }
                tabIndex={active || (!selected && index === 0) ? 0 : -1}
                data-option-id={option.id}
                className="sd-onboarding-challenge-option"
                data-active={active}
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
        >
          NEXT STEP
        </button>
      </footer>
    </main>
  );
}

function ScheduleScreen({
  selected,
  onSelect,
  onBack,
  onContinue,
  pending,
  feedback,
}: {
  readonly selected: StudySchedulePreference | null;
  readonly onSelect: (value: StudySchedulePreference) => void;
  readonly onBack: () => void;
  readonly onContinue: () => void;
  readonly pending: boolean;
  readonly feedback: string | null;
}) {
  return (
    <main id="main-content" className="sd-onboarding-state sd-onboarding-quiz">
      <QuizHeader
        current={2}
        onBack={onBack}
        title={
          <>
            WHEN ARE YOU MOST
            <br />
            IN THE ZONE?
          </>
        }
      />
      <div className="sd-onboarding-scroll sd-onboarding-schedule-scroll">
        <div className="sd-onboarding-schedule-options" role="radiogroup" aria-label="Study schedule">
          {SCHEDULE_OPTIONS.map((option, index) => {
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
                  handleRadioKey(event, SCHEDULE_OPTIONS, index, onSelect)
                }
                tabIndex={active || (!selected && index === 0) ? 0 : -1}
                data-option-id={option.id}
                className="sd-onboarding-schedule-option"
                data-active={active}
                data-tone={option.tone}
              >
                {option.id === "after_practice" && active ? (
                  <span className="sd-onboarding-choice-badge">Athletes Choice</span>
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
        >
          {pending ? "SAVING CHOICES" : "CONTINUE CHALLENGE"}
        </button>
      </footer>
    </main>
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
