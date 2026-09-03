"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Eye,
  PanelLeft,
  PenLine,
  Plus,
  Settings2,
  X,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";

import {
  addProblem,
  confirmProblemQueueFromPreview,
  markProblemDone,
  markProblemReviewed,
  prepareAssignmentReview,
  previewProblemsFromAssignmentSources,
  saveProblemWorkPatch,
} from "@/app/(app)/assignments/[id]/hm-actions";
import { AssignmentFocusClock } from "@/components/assignment-focus-clock";
import { MathWorkSurface } from "@/components/assignment-math-work-surface";
import { AssignmentSourceImporter } from "@/components/assignment-source-importer";
import { AssignmentReviewPanel } from "@/components/assignment-review-panel";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import {
  displayAssignmentWorkspaceTitle,
  type AssignmentWorkspaceMode,
} from "@/lib/assignment-workspace";
import type { AssignmentUnderstanding } from "@/lib/assignment-help/methodology";
import type { AssignmentSourcePacket } from "@/lib/assignment-sources";
import {
  type AssignmentArtifactBlockInput,
} from "@/lib/assignment-artifact";
import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import { subjectPresentationFor } from "@/lib/assignment-subject-presentation";
import type { AssignmentCapability } from "@/lib/assignment-capabilities";
import type { AssignmentPracticalGateView } from "@/lib/course-mode/practical-gate";
import {
  AssignmentDraftCoordinator,
  type AssignmentProblemDraftPatch,
} from "@/lib/assignment-draft-coordinator";
import type {
  AssignmentDraftState,
  AssignmentProblemMessage,
  AssignmentWorkspacePreference,
} from "@/lib/assignment-workspace-contracts";
import type { BreakdownStep } from "@/lib/task-breakdown/types";
import type { AssignmentKind } from "@/lib/supabase/types";
import type { AssignmentFocusServerState } from "@/lib/timer/assignment-focus-actions";

const AssignmentNativeTools = dynamic(
  () => import("@/components/assignment-native-tools").then((module) => module.AssignmentNativeTools),
  { ssr: false },
);
const AssignmentCreativeTools = dynamic(
  () => import("@/components/assignment-creative-tools").then((module) => module.AssignmentCreativeTools),
  { ssr: false },
);
const AssignmentTechnicalTools = dynamic(
  () => import("@/components/assignment-technical-tools").then((module) => module.AssignmentTechnicalTools),
  { ssr: false },
);

type Problem = {
  id: string;
  problemNumber: number;
  problemText: string;
  studentWork: Record<string, unknown>;
  scaffold?: Record<string, unknown> | null;
  progressStatus?: "not_started" | "in_progress" | "done";
  reviewedAt?: string | null;
  completedAt?: string | null;
};

type ProblemPreviewDraft = {
  draftId: string;
  problemNumber: number;
  text: string;
  sourceStatus: "description" | "imported" | "partial";
};
type AssignmentWorkspaceProps = {
  assignmentId: string;
  title: string;
  courseLabel: string;
  kind: AssignmentKind;
  description: string;
  sourcePacket: AssignmentSourcePacket;
  assignmentUnderstanding: AssignmentUnderstanding;
  sources: Array<{ id: string; source_type: string; title: string; url: string | null; extracted_text: string | null; source_location: string | null; import_status: string }>;
  steps: BreakdownStep[];
  aiMode: "red" | "yellow" | "green";
  initialMode: AssignmentWorkspaceMode;
  assignmentProfile: AssignmentWorkProfile;
  initialArtifactBlocks?: AssignmentArtifactBlockInput[];
  practicalGate: AssignmentPracticalGateView;
  initialSavedWork: Record<string, unknown>;
  initialProblems: Problem[];
  initialProblemMessages?: AssignmentProblemMessage[];
  initialWorkspacePreferences?: AssignmentWorkspacePreference[];
  initialFocusServerState?: AssignmentFocusServerState;
  externalUrl: string | null;
  externalSource: string | null;
  estimatedMinutes: number | null;
};

function savedText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function visibleMathWork(studentWork: Record<string, unknown> | undefined): string {
  return savedText(studentWork?.work) || savedText(studentWork?.answer);
}

function starterQuestionForProblem(problemText: string): string {
  const normalized = problemText.toLowerCase();
  if (normalized.includes("=") && /\bx\b/u.test(normalized)) {
    return "What operation would undo the number being added to or subtracted from the x term?";
  }
  if (/graph|coordinate|slope|axis/u.test(normalized)) {
    return "What information can you place on the graph first?";
  }
  if (/triangle|angle|area|perimeter|volume/u.test(normalized)) {
    return "Which measurement or formula does this problem give you a starting point for?";
  }
  return "What is the problem asking you to find first?";
}

export function AssignmentWorkspace({
  assignmentId,
  title,
  courseLabel,
  description,
  sourcePacket,
  assignmentUnderstanding,
  sources,
  aiMode,
  initialMode,
  assignmentProfile,
  initialArtifactBlocks = [],
  practicalGate,
  initialProblems,
  initialProblemMessages = [],
  initialWorkspacePreferences = [],
  initialFocusServerState,
  estimatedMinutes,
}: AssignmentWorkspaceProps) {
  const displayTitle = displayAssignmentWorkspaceTitle(title);
  const mode = initialMode;
  const [, setWorkspaceProblems] = useState(initialProblems);
  const flushMathWork = useRef<() => Promise<boolean>>(async () => true);
  const registerMathFlush = useCallback((flush: () => Promise<boolean>) => { flushMathWork.current = flush; }, []);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const presentation = useMemo(
    () => subjectPresentationFor(assignmentProfile, sourcePacket),
    [assignmentProfile, sourcePacket],
  );
  const needsSourceConfirmation = useMemo(() => (
    assignmentUnderstanding.needsStudentConfirmation
    || sources.some((source) => source.import_status === "partial" || source.import_status === "extracting")
  ), [assignmentUnderstanding.needsStudentConfirmation, sources]);

  function reviewSubmission() {
    startTransition(async () => {
      if (!(await flushMathWork.current())) return;
      const result = await prepareAssignmentReview({ assignmentId });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.push(`/assignments/${assignmentId}/submit`);
    });
  }

  const assignmentDetailsCard = (
    <details className="sd-assignment-math-action-card sd-assignment-details-card" aria-label="Assignment details">
      <summary>
        <span className="sd-assignment-details-label">Assignment details</span>
        <ChevronDown className="sd-assignment-details-chevron" size={16} aria-hidden="true" />
      </summary>
      <div className="sd-assignment-details-card-content">
        {(sourcePacket.directions || description) ? (
          <div className="sd-assignment-details-card-section">
            <strong>Directions</strong>
            <span>{sourcePacket.directions || description}</span>
          </div>
        ) : null}
        {sourcePacket.rubric ? (
          <div className="sd-assignment-details-card-section">
            <strong>Rubric</strong>
            <span>{sourcePacket.rubric}</span>
          </div>
        ) : null}
        {needsSourceConfirmation ? (
          <div className="sd-assignment-source-confirmation" role="status">
            <strong>Confirm source</strong>
            <p>Diana found imported material that still needs a quick check before Diana relies on it.</p>
          </div>
        ) : null}
        {sources.length > 0 ? (
          <ul className="sd-assignment-details-source-list">
            {sources.map((source) => (
              <li key={source.id}>
                {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : <span>{source.title}</span>}
                {source.source_location ? <small>{source.source_location}</small> : null}
                {source.import_status === "partial" || source.import_status === "extracting" ? <em>needs check</em> : null}
              </li>
            ))}
          </ul>
        ) : (
          <small>Diana will use the directions already connected to this assignment.</small>
        )}
        <AssignmentSourceImporter assignmentId={assignmentId} />
      </div>
    </details>
  );
  const focusClock = (
    <AssignmentFocusClock
      assignmentId={assignmentId}
      title={displayTitle}
      estimatedMinutes={estimatedMinutes}
      initialServerState={initialFocusServerState}
    />
  );
  return (
    <div
      className="sd-capture-work-screen sd-assignment-workspace min-h-dvh bg-white text-slate-950"
      data-version="11"
    >
      <nav className="sd-assignment-skip-links" aria-label="Skip to workspace section">
        <a href="#current-problem">Current problem</a>
        <a href="#ask-diana">Ask Diana</a>
        <a href="#assignment-work">Work</a>
      </nav>
      <StudentDesktopNav active="Work" />
      <div className="sd-assignment-workspace-main">
        <div className="sd-assignment-frame-timer" aria-label="Focus timer">
          {focusClock}
        </div>
        <div className="sd-assignment-gamer-shell">
        <span className="sd-assignment-gamer-shell-notch sd-assignment-gamer-shell-notch--top" aria-hidden="true" />
        <span className="sd-assignment-gamer-shell-notch sd-assignment-gamer-shell-notch--bottom" aria-hidden="true" />
        <div className="sd-assignment-workspace-topline">
          <Link href="/assignments" className="sd-assignment-workspace-back" aria-label="Back to work">
            <ArrowLeft size={16} aria-hidden="true" /> <span>Back to work</span>
          </Link>

          <div className="sd-assignment-workspace-top-spacer" aria-hidden="true" />
        </div>

        <div className="sd-assignment-workspace-body" data-work-first>
          <section className="sd-assignment-workspace-editor" aria-live="polite">
            <AssignmentWorkspaceShell
              assignmentId={assignmentId}
              courseLabel={courseLabel}
              title={displayTitle}
              initialProblems={initialProblems}
              initialProblemMessages={initialProblemMessages}
              initialWorkspacePreferences={initialWorkspacePreferences}
              aiMode={aiMode}
              onMessage={setMessage}
              onProblemsChange={setWorkspaceProblems}
              registerFlush={registerMathFlush}
              workspacePending={pending}
              onReviewSubmission={reviewSubmission}
              assignmentDetails={assignmentDetailsCard}
              feedbackMessage={pending ? "Saving..." : message}
              template={mode}
              unitNoun={presentation.unitNoun}
              unitNounPlural={presentation.unitNounPlural}
              primaryTools={presentation.primaryCapability ? (
                <WorkspaceTools assignmentId={assignmentId} title={title} profile={assignmentProfile} initialBlocks={initialArtifactBlocks} practicalGate={practicalGate} capabilities={[presentation.primaryCapability]} />
              ) : null}
              optionalTools={presentation.optionalCapabilities.length > 0 ? (
                <WorkspaceTools assignmentId={assignmentId} title={title} profile={assignmentProfile} initialBlocks={initialArtifactBlocks} practicalGate={practicalGate} capabilities={presentation.optionalCapabilities} />
              ) : null}
            />
          </section>
        </div>
        </div>
      </div>
    </div>
  );
}
function WorkspaceTools({ assignmentId, title, profile, initialBlocks, practicalGate, capabilities }: {
  assignmentId: string;
  title: string;
  profile: AssignmentWorkProfile;
  initialBlocks: AssignmentArtifactBlockInput[];
  practicalGate: AssignmentPracticalGateView;
  capabilities: AssignmentCapability[];
}) {
  const scopedProfile = { ...profile, capabilities };
  return (
    <div className="sd-assignment-subject-tools">
      <AssignmentNativeTools assignmentId={assignmentId} assignmentTitle={title} profile={scopedProfile} initialBlocks={initialBlocks} />
      <AssignmentCreativeTools assignmentId={assignmentId} profile={scopedProfile} initialBlocks={initialBlocks} />
      <AssignmentTechnicalTools assignmentId={assignmentId} profile={scopedProfile} initialBlocks={initialBlocks} practicalGate={practicalGate} />
    </div>
  );
}

function AssignmentWorkspaceShell({ assignmentId, courseLabel, title, initialProblems, initialProblemMessages, initialWorkspacePreferences, aiMode, onMessage, onProblemsChange, registerFlush, workspacePending, onReviewSubmission, assignmentDetails, feedbackMessage, template, unitNoun, unitNounPlural, primaryTools, optionalTools }: {
  assignmentId: string;
  courseLabel: string;
  title: string;
  initialProblems: Problem[];
  initialProblemMessages: AssignmentProblemMessage[];
  initialWorkspacePreferences: AssignmentWorkspacePreference[];
  aiMode: "red" | "yellow" | "green";
  onMessage(message: string): void;
  onProblemsChange(problems: Problem[]): void;
  registerFlush(flush: () => Promise<boolean>): void;
  workspacePending: boolean;
  onReviewSubmission(): void;
  assignmentDetails: ReactNode;
  feedbackMessage: string;
  template: AssignmentWorkspaceMode;
  unitNoun: string;
  unitNounPlural: string;
  primaryTools: ReactNode;
  optionalTools: ReactNode;
}) {
  const normalizedInitialProblems = useMemo<Problem[]>(() => initialProblems.map((problem) => ({
    ...problem,
    progressStatus: problem.progressStatus ?? (visibleMathWork(problem.studentWork) || savedText(problem.studentWork.workInk) ? "in_progress" : "not_started"),
    reviewedAt: problem.reviewedAt ?? null,
    completedAt: problem.completedAt ?? null,
  })), [initialProblems]);
  const [problems, setProblems] = useState(normalizedInitialProblems);
  const problemsRef = useRef(normalizedInitialProblems);
  const [activeIndex, setActiveIndex] = useState(0);
  const [newProblem, setNewProblem] = useState("");
  const [previewDrafts, setPreviewDrafts] = useState<ProblemPreviewDraft[]>([]);
  const [previewRequiresConfirmation, setPreviewRequiresConfirmation] = useState(false);
  const [problemPending, startTransition] = useTransition();
  const draftCoordinator = useMemo(() => new AssignmentDraftCoordinator(), []);
  const [draftState, setDraftState] = useState<AssignmentDraftState>("idle");
  const [draftError, setDraftError] = useState("");
  const [clearUndo, setClearUndo] = useState<{ answer: string; work: string; workInk: string } | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [problemSheetOpen, setProblemSheetOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearUndoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolsToggleRef = useRef<HTMLButtonElement | null>(null);
  const toolsCloseRef = useRef<HTMLButtonElement | null>(null);
  const toolsPanelRef = useRef<HTMLElement | null>(null);
  const addProblemDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const problemToggleRef = useRef<HTMLButtonElement | null>(null);
  const problemPanelRef = useRef<HTMLElement | null>(null);
  const problemButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = problems[activeIndex] ?? null;
  const [answer, setAnswer] = useState(() => savedText(active?.studentWork.answer));
  const [work, setWork] = useState(() => visibleMathWork(active?.studentWork));
  const [workInk, setWorkInk] = useState(() => savedText(active?.studentWork.workInk));
  const [reviewSignal, setReviewSignal] = useState(0);
  const recoveryKey = useCallback((problemId: string) => `diana:assignment:${assignmentId}:problem:${problemId}`, [assignmentId]);
  const preferencesByProblem = useMemo(() => new Map(initialWorkspacePreferences.map((preference) => [preference.problemId, preference])), [initialWorkspacePreferences]);

  useEffect(() => draftCoordinator.subscribe((snapshot) => {
    setDraftState(snapshot.state);
    setDraftError(snapshot.error);
  }), [draftCoordinator]);

  const commitProblems = useCallback((update: (current: Problem[]) => Problem[]) => {
    const next = update(problemsRef.current);
    problemsRef.current = next;
    setProblems(next);
    onProblemsChange(next);
  }, [onProblemsChange]);

  const flushProblem = useCallback(async (problemId: string): Promise<boolean> => {
    const patch = draftCoordinator.take(problemId);
    if (!patch || Object.keys(patch).length === 0) return true;
    if (!window.navigator.onLine) {
      window.localStorage.setItem(recoveryKey(problemId), JSON.stringify(patch));
      draftCoordinator.restore(problemId, patch);
      draftCoordinator.localOnly();
      return true;
    }
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    draftCoordinator.syncing();
    const result = await saveProblemWorkPatch({ problemId, patch });
    if (!result.ok) {
      draftCoordinator.restore(problemId, patch);
      const pending = draftCoordinator.get(problemId) ?? patch;
      window.localStorage.setItem(recoveryKey(problemId), JSON.stringify(pending));
      if (result.error === "Not signed in.") draftCoordinator.sessionExpired();
      else draftCoordinator.retryableError(result.error);
      return false;
    }
    const remaining = draftCoordinator.get(problemId);
    if (remaining) {
      window.localStorage.setItem(recoveryKey(problemId), JSON.stringify(remaining));
    } else {
      window.localStorage.removeItem(recoveryKey(problemId));
    }
    draftCoordinator.synced();
    return true;
  }, [draftCoordinator, recoveryKey]);

  const flushAllProblems = useCallback(async (): Promise<boolean> => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const problemIds = draftCoordinator.problemIds();
    if (problemIds.length > 0 && !window.navigator.onLine) {
      draftCoordinator.localOnly();
      onMessage("Connect to the internet before reviewing the submission.");
      return false;
    }
    for (const problemId of problemIds) {
      if (!(await flushProblem(problemId))) return false;
    }
    return true;
  }, [draftCoordinator, flushProblem, onMessage]);

  const preservePendingDrafts = useCallback(() => {
    for (const problemId of draftCoordinator.problemIds()) {
      const patch = draftCoordinator.get(problemId);
      if (patch && Object.keys(patch).length > 0) {
        window.localStorage.setItem(recoveryKey(problemId), JSON.stringify(patch));
      }
    }
  }, [draftCoordinator, recoveryKey]);

  useEffect(() => {
    const recovered = normalizedInitialProblems.map((problem) => {
      const raw = window.localStorage.getItem(recoveryKey(problem.id));
      if (!raw) return problem;
      try {
        const value = JSON.parse(raw) as Record<string, unknown>;
        const patch = Object.fromEntries(Object.entries(value).filter((entry): entry is ["answer" | "work" | "workInk", string] => (entry[0] === "answer" || entry[0] === "work" || entry[0] === "workInk") && typeof entry[1] === "string"));
        if (Object.keys(patch).length === 0) return problem;
        draftCoordinator.recover(problem.id, patch as AssignmentProblemDraftPatch);
        return { ...problem, studentWork: { ...problem.studentWork, ...patch } };
      } catch {
        window.localStorage.removeItem(recoveryKey(problem.id));
        return problem;
      }
    });
    problemsRef.current = recovered;
    setProblems(recovered);
    onProblemsChange(recovered);
    const first = recovered[0];
    setAnswer(savedText(first?.studentWork.answer));
    setWork(visibleMathWork(first?.studentWork));
    setWorkInk(savedText(first?.studentWork.workInk));
    if (draftCoordinator.hasPending()) {
      onMessage("Recovered unsaved work");
    }
  }, [assignmentId, draftCoordinator, normalizedInitialProblems, onMessage, onProblemsChange, recoveryKey]);

  useEffect(() => {
    registerFlush(flushAllProblems);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (saveTimer.current) {
          clearTimeout(saveTimer.current);
          saveTimer.current = null;
        }
        preservePendingDrafts();
        if (draftCoordinator.hasPending()) draftCoordinator.localOnly();
        return;
      }
      if (window.navigator.onLine && draftCoordinator.hasPending()) void flushAllProblems();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const onPageHide = () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      preservePendingDrafts();
      if (draftCoordinator.hasPending()) draftCoordinator.localOnly();
    };
    const onOnline = () => {
      if (draftCoordinator.hasPending()) void flushAllProblems();
    };
    const onOffline = () => {
      preservePendingDrafts();
      draftCoordinator.localOnly();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (clearUndoTimer.current) clearTimeout(clearUndoTimer.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [draftCoordinator, flushAllProblems, preservePendingDrafts, registerFlush]);

  useEffect(() => {
    if (!toolsOpen) return;
    toolsCloseRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setToolsOpen(false);
        toolsToggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(toolsPanelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], summary, input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toolsOpen]);

  useEffect(() => {
    if (!problemSheetOpen) return;
    problemButtonRefs.current[activeIndex]?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setProblemSheetOpen(false);
        problemToggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(problemPanelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), summary, textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, problemSheetOpen]);

  async function switchProblem(index: number) {
    if (active && !(await flushProblem(active.id))) return;
    setActiveIndex(index);
    const next = problems[index];
    setAnswer(savedText(next?.studentWork.answer));
    setWork(visibleMathWork(next?.studentWork));
    setWorkInk(savedText(next?.studentWork.workInk));
    setClearUndo(null);
    if (clearUndoTimer.current) clearTimeout(clearUndoTimer.current);
  }

  function navigateProblemQueue(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = Math.min(problems.length - 1, index + 1);
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = problems.length - 1;
    if (nextIndex === null || nextIndex === index) return;
    event.preventDefault();
    void switchProblem(nextIndex).then(() => problemButtonRefs.current[nextIndex ?? index]?.focus());
  }

  function queueProblemSave(key: "answer" | "work" | "workInk", value: string) {
    if (!active) return;
    const problemId = active.id;
    const patch = draftCoordinator.queue(problemId, { [key]: value });
    window.localStorage.setItem(recoveryKey(problemId), JSON.stringify(patch));
    commitProblems((current) => current.map((problem) => {
      if (problem.id !== problemId) return problem;
      const studentWork = { ...problem.studentWork, [key]: value };
      const hasWork = Boolean(visibleMathWork(studentWork) || savedText(studentWork.workInk));
      return {
        ...problem,
        studentWork,
        progressStatus: hasWork ? "in_progress" : "not_started",
        reviewedAt: null,
        completedAt: null,
      };
    }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!window.navigator.onLine) {
      draftCoordinator.localOnly();
      return;
    }
    draftCoordinator.syncing();
    saveTimer.current = setTimeout(() => void flushProblem(problemId), 500);
  }

  function previewProblems() {
    onMessage("Reading numbered problems...");
    startTransition(async () => {
      const result = await previewProblemsFromAssignmentSources({ assignmentId });
      if (!result.ok) return onMessage(result.error);
      setPreviewDrafts(result.problems);
      setPreviewRequiresConfirmation(result.requiresConfirmation);
      onMessage(`${result.problems.length} problems ready to confirm`);
    });
  }

  function updatePreviewProblem(draftId: string, text: string) {
    setPreviewDrafts((current) => current.map((problem) => problem.draftId === draftId ? { ...problem, text } : problem));
  }

  function removePreviewProblem(draftId: string) {
    setPreviewDrafts((current) => current.filter((problem) => problem.draftId !== draftId));
  }

  function confirmPreviewProblems() {
    const confirmed = previewDrafts
      .map((problem) => ({ text: problem.text.trim() }))
      .filter((problem) => problem.text.length > 0);
    if (confirmed.length === 0) {
      onMessage("Keep at least one confirmed problem.");
      return;
    }
    onMessage("Creating problem queue...");
    startTransition(async () => {
      const result = await confirmProblemQueueFromPreview({ assignmentId, problems: confirmed });
      if (!result.ok) return onMessage(result.error);
      const imported: Problem[] = result.problems.map((problem) => ({ ...problem, studentWork: {}, progressStatus: "not_started", reviewedAt: null, completedAt: null }));
      commitProblems((current) => [...current, ...imported]);
      setPreviewDrafts([]);
      setPreviewRequiresConfirmation(false);
      if (problems.length === 0 && imported.length > 0) {
        setActiveIndex(0);
        setAnswer("");
        setWork("");
        setWorkInk("");
      }
      onMessage(`${imported.length} problems imported`);
    });
  }

  function createProblem() {
    const problemText = newProblem.trim();
    if (!problemText) return;
    onMessage("Adding problem...");
    startTransition(async () => {
      const result = await addProblem({ assignmentId, problemText });
      if (!result.ok) return onMessage(result.error);
      const next: Problem = { id: result.id, problemNumber: result.problemNumber, problemText, studentWork: {}, progressStatus: "not_started", reviewedAt: null, completedAt: null };
      commitProblems((current) => [...current, next]);
      setNewProblem("");
      setActiveIndex(problems.length);
      setAnswer("");
      setWork("");
      setWorkInk("");
      onMessage("Problem added");
    });
  }

  function clearActiveWork() {
    if (!work && !workInk && !answer) return;
    setClearUndo({ answer, work, workInk });
    if (clearUndoTimer.current) clearTimeout(clearUndoTimer.current);
    clearUndoTimer.current = setTimeout(() => setClearUndo(null), 10_000);
    setAnswer("");
    setWork("");
    setWorkInk("");
    queueProblemSave("answer", "");
    queueProblemSave("work", "");
    queueProblemSave("workInk", "");
  }

  function undoClearActiveWork() {
    if (!clearUndo) return;
    setAnswer(clearUndo.answer);
    setWork(clearUndo.work);
    setWorkInk(clearUndo.workInk);
    queueProblemSave("answer", clearUndo.answer);
    queueProblemSave("work", clearUndo.work);
    queueProblemSave("workInk", clearUndo.workInk);
    setClearUndo(null);
    if (clearUndoTimer.current) clearTimeout(clearUndoTimer.current);
  }

  async function recordProblemReview(reviewedSnapshot: Record<string, unknown>) {
    if (!active || !(await flushProblem(active.id))) return;
    const result = await markProblemReviewed({ problemId: active.id, reviewedSnapshot });
    if (!result.ok) {
      onMessage(result.error);
      return false;
    }
    commitProblems((current) => current.map((problem) => problem.id === active.id
      ? { ...problem, progressStatus: result.progressStatus, reviewedAt: result.reviewedAt, completedAt: result.completedAt }
      : problem));
    return true;
  }

  async function completeActiveProblem() {
    if (!active || !(await flushProblem(active.id))) return;
    const result = await markProblemDone({ problemId: active.id });
    if (!result.ok) {
      onMessage(result.error);
      return;
    }
    commitProblems((current) => current.map((problem) => problem.id === active.id
      ? { ...problem, progressStatus: result.progressStatus, reviewedAt: result.reviewedAt, completedAt: result.completedAt }
      : problem));
    onMessage("Problem marked done");
  }

  const totalProblems = Math.max(problems.length, 1);

  function openAddProblem() {
    setProblemSheetOpen(true);
    window.requestAnimationFrame(() => {
      const details = addProblemDetailsRef.current;
      if (!details) return;
      details.open = true;
      details.querySelector("summary")?.focus();
    });
  }
  const doneCount = problems.filter((problem) => problem.progressStatus === "done").length;
  const activeReviewed = Boolean(active?.reviewedAt);
  const activeDone = active?.progressStatus === "done";
  const incompleteProblemNumbers = problems.filter((problem) => problem.progressStatus !== "done").map((problem) => problem.problemNumber);

  function unitLabel(problem: Problem): string {
    return savedText(problem.scaffold?.unitLabel) || `${unitNoun[0]?.toUpperCase() ?? "W"}${unitNoun.slice(1)} ${problem.problemNumber}`;
  }

  function problemStateLabel(problem: Problem, index: number) {
    if (problem.progressStatus === "done") return "Done";
    if (problem.reviewedAt) return "Reviewed";
    if (index === activeIndex) return "Current";
    if (problem.progressStatus === "in_progress") return "Working";
    return "Not started";
  }

  function problemStateIcon(problem: Problem, index: number) {
    if (problem.progressStatus === "done") return <Check size={14} aria-hidden="true" />;
    if (problem.reviewedAt) return <Eye size={14} aria-hidden="true" />;
    if (index === activeIndex) return <CircleDot size={14} aria-hidden="true" />;
    if (problem.progressStatus === "in_progress") return <PenLine size={14} aria-hidden="true" />;
    return <Circle size={14} aria-hidden="true" />;
  }

  return (
    <div className="sd-assignment-mode sd-assignment-mode--math">
      <div className="sd-assignment-math-room">
        <button
          ref={problemToggleRef}
          type="button"
          className="sd-assignment-problems-toggle"
          aria-expanded={problemSheetOpen}
          aria-controls="assignment-problem-rail"
          onClick={() => setProblemSheetOpen((current) => !current)}
        >
          <PanelLeft size={18} aria-hidden="true" /> {unitNoun[0]?.toUpperCase() ?? "W"}{unitNoun.slice(1)} {active?.problemNumber ?? 0} of {problems.length}
        </button>
        <button
          ref={toolsToggleRef}
          type="button"
          className="sd-assignment-tools-toggle"
          aria-expanded={toolsOpen}
          aria-controls="assignment-utilities"
          onClick={() => setToolsOpen(true)}
        >
          <Settings2 size={18} aria-hidden="true" /> Tools
        </button>
        {problemSheetOpen ? <button type="button" className="sd-assignment-problem-sheet-scrim" aria-label="Close problems" onClick={() => setProblemSheetOpen(false)} /> : null}
        <aside ref={problemPanelRef} id="assignment-problem-rail" className="sd-assignment-math-left" aria-label={`Assignment ${unitNounPlural}`} data-open={problemSheetOpen || undefined}>
          <header className="sd-assignment-mission-heading">
            <p>{courseLabel}</p>
            <h1 title={title}>{title}</h1>
          </header>
          <div className="sd-assignment-math-left-heading">
            <p>{unitNounPlural}</p>
            <span>{doneCount} of {problems.length} done</span>
          </div>
          {problems.length > 0 ? (
            <nav aria-label={unitNounPlural} className="sd-assignment-problem-queue">
              {problems.map((problem, index) => (
                <button ref={(node) => { problemButtonRefs.current[index] = node; }} key={problem.id} type="button" data-active={index === activeIndex} aria-current={index === activeIndex ? "step" : undefined} tabIndex={index === activeIndex ? 0 : -1} onKeyDown={(event) => navigateProblemQueue(event, index)} onClick={() => { setProblemSheetOpen(false); void switchProblem(index); }} className="sd-assignment-problem-tab">
                  <span className="sd-assignment-problem-tab-heading">
                    <span>{unitLabel(problem)}</span>
                    <em data-state={problem.progressStatus === "done" ? "done" : problem.reviewedAt ? "reviewed" : "other"}>
                      {problemStateIcon(problem, index)}
                      {problemStateLabel(problem, index)}
                    </em>
                  </span>
                  <small>{problem.problemText}</small>
                </button>
              ))}
            </nav>
          ) : null}
          {problems.length > 0 && incompleteProblemNumbers.length === 0 ? (
            <button
              type="button"
              className="sd-assignment-problem-submission"
              data-primary="true"
              disabled={workspacePending}
              onClick={onReviewSubmission}
            >
              Review submission <ChevronRight size={17} aria-hidden="true" />
            </button>
          ) : null}
          <details ref={addProblemDetailsRef} className="sd-assignment-add-problem-panel">
            <summary>Add or import</summary>
            <button type="button" disabled={problemPending} onClick={previewProblems} className="sd-assignment-button sd-assignment-button--secondary">Review source {unitNounPlural}</button>
            <label className="sd-assignment-mode-field sd-assignment-add-problem">Add {unitNoun}
              <textarea value={newProblem} onChange={(event) => setNewProblem(event.target.value)} placeholder={`Paste the next ${unitNoun}`} rows={3} className="mt-2 block w-full resize-y border border-white/25 bg-white p-3 text-base text-slate-950" />
            </label>
            <button type="button" disabled={problemPending || !newProblem.trim()} onClick={createProblem} className="sd-assignment-button sd-assignment-button--primary"><Plus size={17} /> Add {unitNoun}</button>
          </details>
          {previewDrafts.length > 0 ? (
            <section className="sd-assignment-problem-preview" aria-label="Confirm imported problems">
              <div>
                <strong>Confirm {unitNounPlural}</strong>
                <p>{previewRequiresConfirmation ? `Check these extracted ${unitNounPlural} before Diana uses them.` : `Review the source ${unitNounPlural} before adding them.`}</p>
              </div>
              {previewDrafts.map((problem, index) => (
                <label key={problem.draftId} className="sd-assignment-preview-problem">
                  <span>{unitNoun[0]?.toUpperCase() ?? "W"}{unitNoun.slice(1)} {index + 1}{problem.sourceStatus === "partial" ? " - needs check" : ""}</span>
                  <textarea value={problem.text} onChange={(event) => updatePreviewProblem(problem.draftId, event.target.value)} rows={3} />
                  <button type="button" onClick={() => removePreviewProblem(problem.draftId)}>Remove</button>
                </label>
              ))}
              <div className="sd-assignment-preview-actions">
                <button type="button" disabled={problemPending} onClick={confirmPreviewProblems}>Add confirmed {unitNounPlural}</button>
                <button type="button" disabled={problemPending} onClick={() => setPreviewDrafts([])}>Cancel</button>
              </div>
            </section>
          ) : null}
        </aside>

        <main className="sd-assignment-math-main">
          {problems.length > 0 && active ? (
            <>
              <section id="current-problem" className="sd-assignment-problem-card" aria-label={`Current ${unitNoun}`} tabIndex={-1}>
                <p className="sd-assignment-mode-title">{unitLabel(active)} of {totalProblems}</p>
                <p className="sd-assignment-problem-text">{active.problemText}</p>
              </section>
              {feedbackMessage ? <p className="sd-assignment-workspace-status-line" role="status" aria-live="polite">{feedbackMessage}</p> : null}
              <AssignmentReviewPanel
                assignmentId={assignmentId}
                problemId={active.id}
                template={template}
                aiMode={aiMode}
                mathReviewSignal={reviewSignal}
                reviewed={activeReviewed}
                done={activeDone}
                hasNextProblem={activeIndex < problems.length - 1}
                reviewSnapshot={active.studentWork}
                onReviewed={recordProblemReview}
                onMarkDone={() => void completeActiveProblem()}
                onNextProblem={() => void switchProblem(activeIndex + 1)}
                onReviewSubmission={onReviewSubmission}
                showSubmissionAction={false}
                starterQuestion={active.progressStatus === "not_started" && !work && !workInk ? (template === "math" ? starterQuestionForProblem(active.problemText) : `What is one small move you can make on this ${unitNoun}?`) : undefined}
                initialMessages={initialProblemMessages}
                fields={[
                { label: "Work unit", value: active.problemText },
                { label: "Student work", value: [work || answer, workInk ? "Handwritten work attached." : ""].filter(Boolean).join("\n") },
              ]}
              />
              <MathWorkSurface
                key={active.id}
                assignmentId={assignmentId}
                problemId={active.id}
                work={work}
                workInk={workInk}
                onWorkChange={(value) => { setWork(value); queueProblemSave("work", value); }}
                onInkChange={(value) => { setWorkInk(value); queueProblemSave("workInk", value); }}
                onClear={clearActiveWork}
                onUndoClear={undoClearActiveWork}
                onReview={() => setReviewSignal((current) => current + 1)}
                reviewed={activeReviewed}
                done={activeDone}
                clearUndoAvailable={Boolean(clearUndo)}
                saveState={draftState}
                saveError={draftError}
                onRetrySave={() => void flushAllProblems()}
                initialPreference={preferencesByProblem.get(active.id)}
              />
              {primaryTools ? <section className="sd-assignment-primary-tool" aria-label={`Primary ${unitNoun} tool`}>{primaryTools}</section> : null}
            </>
          ) : (
            <div className="sd-assignment-empty-state">
              <strong>Add the first {unitNoun}</strong>
              <p className="mt-1 text-sm">Import from the assignment, or paste one {unitNoun}.</p>
              <button type="button" data-primary="true" onClick={openAddProblem}>Add or import {unitNoun}</button>
            </div>
          )}
        </main>

        {toolsOpen ? <button className="sd-assignment-tools-scrim" type="button" aria-label="Close assignment tools" onClick={() => { setToolsOpen(false); toolsToggleRef.current?.focus(); }} /> : null}
        <aside ref={toolsPanelRef} id="assignment-utilities" className="sd-assignment-math-right" aria-label="Assignment actions" data-open={toolsOpen || undefined}>
          <button
            ref={toolsCloseRef}
            type="button"
            className="sd-assignment-tools-close"
            aria-label="Close assignment tools"
            onClick={() => {
              setToolsOpen(false);
              toolsToggleRef.current?.focus();
            }}
          >
            <X size={20} aria-hidden="true" />
          </button>
          {assignmentDetails}
          {optionalTools ? <details className="sd-assignment-math-action-card sd-assignment-tools-card"><summary>Tools <ChevronDown size={16} aria-hidden="true" /></summary><div>{optionalTools}</div></details> : null}
        </aside>
      </div>
    </div>
  );
}
