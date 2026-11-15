"use client";

import {
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronLeft,
  School,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";

import { savePlayerPhoto } from "@/app/(app)/settings/player-photo-actions";
import { DianaWordmark } from "@/components/screen-design/primitives";
import type {
  LearningHurdle,
  ScreenDesignOnboardingAnswers,
  StudySchedulePreference,
} from "@/lib/onboarding/screendesign";
import type { ScreenDesignOnboardingStep } from "@/lib/onboarding/screendesign-step";

import { completeScreenDesignOnboarding } from "./actions";
import connectionStyles from "./onboarding-connection.module.css";
import personalizeStyles from "./onboarding-personalize.module.css";

const HURDLE_OPTIONS = [
  { id: "time_management", label: "Finding time" },
  { id: "exam_stress", label: "Feeling ready for a test" },
  { id: "complex_concepts", label: "Working through a hard concept" },
  { id: "staying_consistent", label: "Keeping track of work" },
] as const satisfies readonly {
  readonly id: LearningHurdle;
  readonly label: string;
}[];

const SCHEDULE_OPTIONS = [
  { id: "morning" },
  { id: "after_practice" },
  { id: "late_night" },
] as const satisfies readonly { readonly id: StudySchedulePreference }[];

const STUDY_TIME_LABELS: Record<StudySchedulePreference, string> = {
  morning: "Morning",
  after_practice: "Afternoon",
  late_night: "Evening",
};

interface ScreenDesignOnboardingProps {
  readonly initialStep?: ScreenDesignOnboardingStep;
  readonly initialLearningHurdle?: LearningHurdle | null;
  readonly initialStudySchedulePreference?: StudySchedulePreference | null;
  readonly onComplete?: (answers: ScreenDesignOnboardingAnswers) => void;
}

export function ScreenDesignOnboarding({
  initialStep = "personalize",
  initialLearningHurdle = "exam_stress",
  initialStudySchedulePreference = "after_practice",
  onComplete,
}: ScreenDesignOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState<ScreenDesignOnboardingStep>(initialStep);
  const [learningHurdle, setLearningHurdle] =
    useState<LearningHurdle | null>(initialLearningHurdle);
  const [studySchedulePreference, setStudySchedulePreference] =
    useState<StudySchedulePreference | null>(initialStudySchedulePreference);
  const sleepGoal = 8;
  const movementGoal = 4;
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  const complete = () => {
    if (
      !learningHurdle ||
      !studySchedulePreference ||
      pending ||
      submittingRef.current
    ) {
      return;
    }

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
              result.fieldErrors.wellnessGoals ??
                result.fieldErrors.studySchedulePreference ??
                result.fieldErrors.learningHurdle ??
                "Choose the options that feel closest today.",
            );
            return;
          }
          setFeedback(result.error);
          return;
        }

        setStep("connect");
      } catch {
        submittingRef.current = false;
        setFeedback(
          "Those choices are still selected. Try saving again when you are ready.",
        );
      }
    });
  };

  if (step === "connect") {
    return (
      <ConnectSchoolScreen
        onBack={() => setStep("personalize")}
        onSkip={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <PersonalizeScreen
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

function PersonalizeScreen({
  learningHurdle,
  studySchedulePreference,
  onLearningHurdleChange,
  onStudySchedulePreferenceChange,
  onContinue,
  pending,
  feedback,
}: {
  readonly learningHurdle: LearningHurdle | null;
  readonly studySchedulePreference: StudySchedulePreference | null;
  readonly onLearningHurdleChange: (value: LearningHurdle) => void;
  readonly onStudySchedulePreferenceChange: (
    value: StudySchedulePreference,
  ) => void;
  readonly onContinue: () => void;
  readonly pending: boolean;
  readonly feedback: string | null;
}) {
  return (
    <div className={personalizeStyles.page}>
      <header className={connectionStyles.topbar}>
        <DianaWordmark tight tone="dark" alt="DIANA logo" />
        <span>Account setup</span>
      </header>

      <main id="main-content" className={personalizeStyles.layout}>
        <section
          className={personalizeStyles.form}
          aria-label="Account preferences"
        >
          <header className={personalizeStyles.intro}>
            <div>
              <h1>Make it yours</h1>
            </div>
            <strong>1 of 2</strong>
          </header>

          <section
            className={personalizeStyles.question}
            aria-labelledby="learning-hurdle-title"
          >
            <h2 id="learning-hurdle-title">What would help most?</h2>
            <div
              className={personalizeStyles.choices}
              role="radiogroup"
              aria-label="Learning hurdle"
            >
              {HURDLE_OPTIONS.map((option, index) => {
                const active = learningHurdle === option.id;
                return (
                  <button
                    key={option.id}
                    data-option-id={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={
                      active || (!learningHurdle && index === 0) ? 0 : -1
                    }
                    className={personalizeStyles.option}
                    data-active={active}
                    onClick={() => onLearningHurdleChange(option.id)}
                    onKeyDown={(event) =>
                      handleRadioKey(
                        event,
                        HURDLE_OPTIONS,
                        index,
                        onLearningHurdleChange,
                      )
                    }
                  >
                    <span>{option.label}</span>
                    <CheckCircle2 aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>

          <section
            className={personalizeStyles.question}
            aria-labelledby="study-schedule-title"
          >
            <h2 id="study-schedule-title">When do you focus best?</h2>
            <div
              className={personalizeStyles.times}
              role="radiogroup"
              aria-label="Study schedule"
            >
              {SCHEDULE_OPTIONS.map((option, index) => {
                const active = studySchedulePreference === option.id;
                return (
                  <button
                    key={option.id}
                    data-option-id={option.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={
                      active || (!studySchedulePreference && index === 0)
                        ? 0
                        : -1
                    }
                    className={personalizeStyles.option}
                    data-active={active}
                    onClick={() => onStudySchedulePreferenceChange(option.id)}
                    onKeyDown={(event) =>
                      handleRadioKey(
                        event,
                        SCHEDULE_OPTIONS,
                        index,
                        onStudySchedulePreferenceChange,
                      )
                    }
                  >
                    <span>{STUDY_TIME_LABELS[option.id]}</span>
                    <CheckCircle2 aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>

          <ProfilePhotoOption className={personalizeStyles.photo} />
          <footer className={personalizeStyles.footer}>
            <p>You can change these anytime.</p>
            <button
              type="button"
              className={personalizeStyles.submit}
              disabled={
                !learningHurdle || !studySchedulePreference || pending
              }
              aria-busy={pending}
              onClick={onContinue}
            >
              {pending ? "Saving..." : "Continue"}
            </button>
          </footer>
          {feedback ? (
            <p className={connectionStyles.setupFeedback} role="status">
              {feedback}
            </p>
          ) : null}
        </section>

        <figure className={personalizeStyles.image}>
          <img
            src="/images/onboarding-study-sunlight.png"
            alt=""
            fetchPriority="high"
            width={1024}
            height={1536}
          />
        </figure>
      </main>
    </div>
  );
}

function ConnectSchoolScreen({
  onBack,
  onSkip,
}: {
  readonly onBack: () => void;
  readonly onSkip: () => void;
}) {
  return (
    <div className={personalizeStyles.page}>
      <header className={connectionStyles.topbar}>
        <DianaWordmark tight tone="dark" alt="DIANA logo" />
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
            <span>
              Bring in the classes and due dates you already use. You can also
              connect later.
            </span>
          </div>
          <strong>2 of 2</strong>
        </header>

        <div className={connectionStyles.providerGrid}>
          <section
            className={connectionStyles.providerCard}
            aria-labelledby="google-classroom-title"
          >
            <span
              className={`${connectionStyles.providerIcon} ${connectionStyles.googleIcon}`}
            >
              <BookOpen aria-hidden="true" />
            </span>
            <div>
              <h2 id="google-classroom-title">Google Classroom</h2>
              <p>Use the Google account you use for school.</p>
            </div>
            <a
              className={`${connectionStyles.primaryAction} ${personalizeStyles.connectionPrimaryAction}`}
              href="/api/lms/google-oauth/start?return_to=/dashboard"
            >
              Connect Google Classroom
            </a>
          </section>

          <section
            className={connectionStyles.providerCard}
            aria-labelledby="canvas-title"
          >
            <span
              className={`${connectionStyles.providerIcon} ${connectionStyles.canvasIcon}`}
            >
              <School aria-hidden="true" />
            </span>
            <div>
              <h2 id="canvas-title">Canvas</h2>
              <p>Use the Canvas address your school gave you.</p>
            </div>
            <form
              action="/api/lms/canvas-oauth/start"
              method="get"
              className={connectionStyles.canvasForm}
            >
              <label htmlFor="canvas-school-address">
                Canvas school address
              </label>
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
                  className={`${connectionStyles.primaryAction} ${personalizeStyles.connectionPrimaryAction}`}
                >
                  Connect Canvas
                </button>
              </div>
            </form>
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
      {message ? (
        <span className={connectionStyles.photoMessage} role="status">
          {message}
        </span>
      ) : null}
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
  return webp.startsWith("data:image/webp")
    ? webp
    : canvas.toDataURL("image/png");
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
