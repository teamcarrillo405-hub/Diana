"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Compass,
  Lightbulb,
  ListChecks,
  Moon,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import {
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";

import { AppMark } from "@/components/screen-design/app-mark";
import type {
  LearningHurdle,
  ScreenDesignOnboardingAnswers,
  StudySchedulePreference,
} from "@/lib/onboarding/screendesign";
import type { ScreenDesignOnboardingStep } from "@/lib/onboarding/screendesign-step";

import { completeScreenDesignOnboarding } from "./actions";

type StudentOnboardingView = "support" | "rhythm";

type ChoiceOption<T extends string> = Readonly<{
  id: T;
  label: string;
  description: string;
  icon: LucideIcon;
}>;

const SUPPORT_OPTIONS: readonly ChoiceOption<LearningHurdle>[] = [
  {
    id: "staying_consistent",
    label: "Getting started",
    description: "Begin with one manageable next step.",
    icon: Sparkles,
  },
  {
    id: "complex_concepts",
    label: "Understanding a hard topic",
    description: "Work through an idea one clear move at a time.",
    icon: Lightbulb,
  },
  {
    id: "time_management",
    label: "Getting organized",
    description: "Keep assignments, time, and materials together.",
    icon: ListChecks,
  },
  {
    id: "exam_stress",
    label: "Preparing for a quiz",
    description: "Practice what matters before test day.",
    icon: Compass,
  },
] as const;

const RHYTHM_OPTIONS: readonly ChoiceOption<StudySchedulePreference>[] = [
  {
    id: "morning",
    label: "Morning",
    description: "Before the day gets busy.",
    icon: Sun,
  },
  {
    id: "after_practice",
    label: "After school",
    description: "Once classes are finished.",
    icon: Clock3,
  },
  {
    id: "late_night",
    label: "Evening",
    description: "Later, when things are quieter.",
    icon: Moon,
  },
] as const;

export function resolveStudentOnboardingView(
  initialStep: ScreenDesignOnboardingStep | undefined,
): StudentOnboardingView {
  return initialStep === "schedule" ? "rhythm" : "support";
}

interface StudentOnboardingProps {
  readonly initialStep?: ScreenDesignOnboardingStep;
  readonly initialLearningHurdle?: LearningHurdle | null;
  readonly initialStudySchedulePreference?: StudySchedulePreference | null;
  readonly onComplete?: (answers: ScreenDesignOnboardingAnswers) => void;
  readonly onNavigate?: (path: "/dashboard") => void;
}

export function StudentOnboarding({
  initialStep,
  initialLearningHurdle = null,
  initialStudySchedulePreference = null,
  onComplete,
  onNavigate,
}: StudentOnboardingProps) {
  const [view, setView] = useState<StudentOnboardingView>(() =>
    resolveStudentOnboardingView(initialStep),
  );
  const [learningHurdle, setLearningHurdle] =
    useState<LearningHurdle | null>(initialLearningHurdle);
  const [studySchedulePreference, setStudySchedulePreference] =
    useState<StudySchedulePreference | null>(initialStudySchedulePreference);
  const [sleepGoal, setSleepGoal] = useState(8);
  const [movementGoal, setMovementGoal] = useState(4);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  const selectLearningHurdle = (value: LearningHurdle) => {
    setFeedback(null);
    setLearningHurdle(value);
  };

  const selectStudySchedule = (value: StudySchedulePreference) => {
    setFeedback(null);
    setStudySchedulePreference(value);
  };

  const moveToRhythm = () => {
    if (!learningHurdle) return;
    setFeedback(null);
    setView("rhythm");
  };

  const complete = () => {
    if (
      !learningHurdle
      || !studySchedulePreference
      || pending
      || submittingRef.current
    ) {
      return;
    }

    setFeedback(null);
    if (onComplete) {
      submittingRef.current = true;
      try {
        onComplete({ learningHurdle, studySchedulePreference });
      } catch {
        submittingRef.current = false;
        setFeedback("Your choices are still here. Finish setup again when you are ready.");
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
                ?? "Choose the option that feels closest today.",
            );
            return;
          }
          setFeedback(result.error);
          return;
        }

        // Setup completion changes the route guard itself. A document navigation
        // avoids competing App Router refreshes while the profile update settles.
        if (onNavigate) {
          onNavigate("/dashboard");
        } else {
          window.location.replace("/dashboard");
        }
      } catch {
        submittingRef.current = false;
        setFeedback("Your choices are still here. Finish setup again when you are ready.");
      }
    });
  };

  const isRhythm = view === "rhythm";
  const currentStep = isRhythm ? 2 : 1;

  return (
    <main id="main-content" className="sd-auth-page sd-student-onboarding-page">
      <div className="sd-auth-frame sd-student-onboarding-frame">
        <span className="sd-auth-frame-notch sd-auth-frame-notch--top" aria-hidden="true" />
        <span className="sd-auth-frame-notch sd-auth-frame-notch--bottom" aria-hidden="true" />

        <header className="sd-student-onboarding-header">
          <AppMark href="/" />
          <span className="sd-student-onboarding-step-count">
            Step {currentStep} of 2
          </span>
        </header>

        <div className="sd-student-onboarding-layout">
          <section className="sd-student-onboarding-story" aria-labelledby="student-onboarding-title">
            <p className="sd-student-onboarding-kicker">A focused start</p>
            <h1 id="student-onboarding-title">
              {isRhythm ? "Set a rhythm that fits your day." : "Let’s set up your study space."}
            </h1>
            <p>
              {isRhythm
                ? "These starting preferences help Diana suggest a realistic next move. You can adjust them any time."
                : "Choose the support that would make schoolwork feel more manageable right now. You can change this later."}
            </p>

            <ol className="sd-student-onboarding-steps" aria-label="Setup progress">
              <li aria-current={!isRhythm ? "step" : undefined} data-complete={isRhythm}>
                <span>1</span>
                <div>
                  <strong>Learning support</strong>
                  <small>Pick one helpful starting point.</small>
                </div>
              </li>
              <li aria-current={isRhythm ? "step" : undefined}>
                <span>2</span>
                <div>
                  <strong>Study rhythm</strong>
                  <small>Set a pace that works for you.</small>
                </div>
              </li>
            </ol>
          </section>

          <section
            className="sd-student-onboarding-panel"
            aria-labelledby="student-onboarding-panel-title"
            aria-busy={pending}
            data-onboarding-step={isRhythm ? "rhythm" : "support"}
          >
            <div className="sd-student-onboarding-progress" aria-hidden="true">
              <span style={{ width: `${currentStep * 50}%` }} />
            </div>

            {isRhythm ? (
              <>
                <div className="sd-student-onboarding-panel-head">
                  <p>Study rhythm</p>
                  <h2 id="student-onboarding-panel-title">When does focused work usually fit?</h2>
                  <span>Choose the time that is most realistic for you.</span>
                </div>

                <ChoiceGrid
                  ariaLabel="Study rhythm"
                  options={RHYTHM_OPTIONS}
                  value={studySchedulePreference}
                  onSelect={selectStudySchedule}
                  compact
                />

                <fieldset className="sd-student-onboarding-targets">
                  <legend>Starting targets</legend>
                  <p>These are private starting points, not scores.</p>
                  <div>
                    <label>
                      <span>Sleep each night</span>
                      <select
                        aria-label="Sleep goal"
                        value={sleepGoal}
                        onChange={(event) => {
                          setFeedback(null);
                          setSleepGoal(Number(event.target.value));
                        }}
                      >
                        {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((hours) => (
                          <option key={hours} value={hours}>{hours} hours</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Movement each week</span>
                      <select
                        aria-label="Movement goal"
                        value={movementGoal}
                        onChange={(event) => {
                          setFeedback(null);
                          setMovementGoal(Number(event.target.value));
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                          <option key={days} value={days}>{days} days</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </fieldset>
              </>
            ) : (
              <>
                <div className="sd-student-onboarding-panel-head">
                  <p>Learning support</p>
                  <h2 id="student-onboarding-panel-title">What would help most right now?</h2>
                  <span>Choose one. Diana will use it to make the first step useful.</span>
                </div>

                <ChoiceGrid
                  ariaLabel="Learning support"
                  options={SUPPORT_OPTIONS}
                  value={learningHurdle}
                  onSelect={selectLearningHurdle}
                />
              </>
            )}

            <p className="sd-student-onboarding-feedback" role="status" aria-live="polite">
              {feedback}
            </p>

            <div className="sd-student-onboarding-actions">
              {isRhythm ? (
                <button
                  type="button"
                  className="sd-student-onboarding-back"
                  onClick={() => {
                    setFeedback(null);
                    setView("support");
                  }}
                  disabled={pending}
                >
                  <ArrowLeft aria-hidden="true" />
                  Back
                </button>
              ) : <span aria-hidden="true" />}
              <button
                type="button"
                className="sd-auth-submit sd-student-onboarding-primary"
                onClick={isRhythm ? complete : moveToRhythm}
                disabled={isRhythm ? !studySchedulePreference || pending : !learningHurdle}
              >
                {isRhythm ? (pending ? "Saving setup..." : "Finish setup") : "Continue"}
                {!isRhythm ? <ArrowRight aria-hidden="true" /> : null}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ChoiceGrid<T extends string>({
  ariaLabel,
  options,
  value,
  onSelect,
  compact = false,
}: {
  readonly ariaLabel: string;
  readonly options: readonly ChoiceOption<T>[];
  readonly value: T | null;
  readonly onSelect: (value: T) => void;
  readonly compact?: boolean;
}) {
  return (
    <div
      className="sd-student-onboarding-choice-grid"
      data-compact={compact}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option, index) => {
        const active = option.id === value;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active || (!value && index === 0) ? 0 : -1}
            data-choice-id={option.id}
            data-active={active}
            onClick={() => onSelect(option.id)}
            onKeyDown={(event) => handleChoiceKey(event, options, index, onSelect)}
          >
            <span className="sd-student-onboarding-choice-icon"><Icon aria-hidden="true" /></span>
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
            {active ? <Check className="sd-student-onboarding-choice-check" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function handleChoiceKey<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  options: readonly ChoiceOption<T>[],
  index: number,
  onSelect: (value: T) => void,
) {
  const direction = event.key === "ArrowRight" || event.key === "ArrowDown"
    ? 1
    : event.key === "ArrowLeft" || event.key === "ArrowUp"
      ? -1
      : 0;
  if (!direction) return;

  event.preventDefault();
  const nextIndex = (index + direction + options.length) % options.length;
  const nextOption = options[nextIndex]!;
  onSelect(nextOption.id);
  event.currentTarget
    .closest('[role="radiogroup"]')
    ?.querySelector<HTMLButtonElement>(`[data-choice-id="${nextOption.id}"]`)
    ?.focus();
}
