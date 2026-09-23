"use client";

import {
  ArrowLeft,
  BookOpenText,
  Brain,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  Lightbulb,
  Plus,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  addProblem,
  importProblemsFromAssignmentSources,
  prepareAssignmentReview,
  saveHandInPatch,
  saveProblemScaffold,
  saveProblemWorkPatch,
  selectAssignmentWorkspaceMode,
  startAssignmentWorkspace,
} from "@/app/(app)/assignments/[id]/hm-actions";
import {
  requestMathScaffold,
  requestScienceScaffold,
} from "@/app/(app)/assignments/[id]/ai-tools-actions";
import { AssignmentFocusClock } from "@/components/assignment-focus-clock";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { AssignmentSourceImporter } from "@/components/assignment-source-importer";
import { AssignmentPlanPanel } from "@/components/assignment-plan-panel";
import { AssignmentReviewPanel } from "@/components/assignment-review-panel";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import {
  firstMoveForWorkspace,
  WORKSPACE_MODE_LABEL,
  WORKSPACE_MODES,
  type AssignmentWorkspaceMode,
} from "@/lib/assignment-workspace";
import { capabilityLabels } from "@/lib/assignment-capabilities";
import {
  assignmentProblemArtifactBlock,
  buildAssignmentArtifact,
  legacyArtifactBlocksForPatch,
  type AssignmentArtifactBlockInput,
} from "@/lib/assignment-artifact";
import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import type { AssignmentPracticalGateView } from "@/lib/course-mode/practical-gate";
import type { AssignmentReviewField } from "@/lib/assignment-review";
import type { MathScaffoldResult, MathSubject } from "@/lib/math/scaffold";
import type { ScienceScaffoldResult } from "@/lib/science/scaffold";
import type { BreakdownStep } from "@/lib/task-breakdown/types";
import type { AssignmentKind, AssignmentStatus } from "@/lib/supabase/types";

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
};

type AssignmentWorkspaceProps = {
  assignmentId: string;
  title: string;
  courseLabel: string;
  kind: AssignmentKind;
  status: AssignmentStatus;
  description: string;
  sourcePacket: { directions: string; rubric: string; materialText: string; citations: string[] };
  sources: Array<{ id: string; source_type: string; title: string; url: string | null; extracted_text: string | null; source_location: string | null; import_status: string }>;
  steps: BreakdownStep[];
  aiMode: "red" | "yellow" | "green";
  initialMode: AssignmentWorkspaceMode;
  assignmentProfile: AssignmentWorkProfile;
  initialArtifactBlocks?: AssignmentArtifactBlockInput[];
  practicalGate: AssignmentPracticalGateView;
  initialSavedWork: Record<string, unknown>;
  initialProblems: Problem[];
  externalUrl: string | null;
  externalSource: string | null;
  estimatedMinutes: number | null;
};

function savedText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function reviewFieldsForMode(mode: AssignmentWorkspaceMode, savedWork: Record<string, unknown>): AssignmentReviewField[] {
  const fields: Record<Exclude<AssignmentWorkspaceMode, "math">, [string, string][]> = {
    worksheet: [["Question notes", "worksheetQuestion"], ["Your work", "worksheetWork"], ["Response", "worksheetResponse"]],
    writing: [["Thesis", "writingThesis"], ["Paragraph plan", "writingPlan"], ["Draft", "draft"]],
    research: [["Research question", "researchQuestion"], ["Source notes", "researchSources"], ["Claim", "researchClaim"], ["Draft", "researchDraft"]],
    history: [["Source analysis", "historySource"], ["Evidence", "historyEvidence"], ["Claim", "historyClaim"], ["Response", "historyResponse"]],
    lab: [["Question", "labQuestion"], ["Hypothesis", "labHypothesis"], ["Data and observations", "labData"], ["Analysis", "labAnalysis"], ["Conclusion", "labConclusion"]],
    reading: [["Reading notes", "readingNotes"], ["Evidence", "readingEvidence"], ["Response", "readingResponse"]],
    language: [["Prompt", "languagePrompt"], ["Your attempt", "languageAttempt"], ["Notes", "languageNotes"]],
    coding: [["Task", "codeTask"], ["Plan", "codePlan"], ["Code or pseudocode", "codeWork"], ["Test notes", "codeTests"]],
    art: [["Brief", "artBrief"], ["Concept", "artConcept"], ["Process notes", "artProcess"], ["Artist statement", "artStatement"]],
    project: [["Project goal", "projectGoal"], ["Deliverables", "projectDeliverables"], ["Build plan", "projectPlan"], ["Work notes", "projectNotes"]],
    handoff: [["Response or hand-in notes", "handoffResponse"]],
  };
  if (mode === "math") return [];
  return fields[mode].map(([label, key]) => ({ label, value: savedText(savedWork[key]) }));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mathSubjectForCourse(courseLabel: string): MathSubject {
  const normalized = courseLabel.toLowerCase();
  if (normalized.includes("geometry")) return "geometry";
  if (normalized.includes("precalculus")) return "precalculus";
  if (normalized.includes("calculus")) return "calculus";
  if (normalized.includes("stat")) return "statistics";
  if (normalized.includes("physics")) return "physics";
  if (normalized.includes("chemistry")) return "chemistry";
  return "algebra";
}

function asMathScaffold(value: unknown): MathScaffoldResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<MathScaffoldResult>;
  return typeof candidate.extractedProblem === "string" && Array.isArray(candidate.steps)
    ? candidate as MathScaffoldResult
    : null;
}

function asScienceScaffold(value: unknown): ScienceScaffoldResult | null {
  if (typeof value !== "string") return null;
  try {
    const candidate = JSON.parse(value) as Partial<ScienceScaffoldResult>;
    return typeof candidate.title === "string" && Array.isArray(candidate.cards)
      ? candidate as ScienceScaffoldResult
      : null;
  } catch {
    return null;
  }
}

export function AssignmentWorkspace({
  assignmentId,
  title,
  courseLabel,
  kind,
  status,
  description,
  sourcePacket,
  sources,
  steps,
  aiMode,
  initialMode,
  assignmentProfile,
  initialArtifactBlocks = [],
  practicalGate,
  initialSavedWork,
  initialProblems,
  externalUrl,
  externalSource,
  estimatedMinutes,
}: AssignmentWorkspaceProps) {
  const [mode, setMode] = useState<AssignmentWorkspaceMode>(initialMode);
  const [savedWork, setSavedWork] = useState(initialSavedWork);
  const [workspaceProblems, setWorkspaceProblems] = useState(initialProblems);
  const flushMathWork = useRef<() => Promise<boolean>>(async () => true);
  const registerMathFlush = useCallback((flush: () => Promise<boolean>) => { flushMathWork.current = flush; }, []);
  const [message, setMessage] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const saveQueue = useRef<Record<string, string>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offline = useRef(false);
  const [workspaceSteps, setWorkspaceSteps] = useState<BreakdownStep[]>(steps);
  const activeStep = workspaceSteps.find((step) => !step.done)?.action ?? firstMoveForWorkspace(mode);
  const recoveryKey = useMemo(() => `diana:assignment:${assignmentId}:pending-work`, [assignmentId]);

  const flushSaves = useCallback(async (successMessage = "Saved") => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const patch = saveQueue.current;
    if (Object.keys(patch).length === 0) return true;
    if (offline.current || !window.navigator.onLine) {
      window.localStorage.setItem(recoveryKey, JSON.stringify(patch));
      setMessage("Offline. Work is saved on this device.");
      return false;
    }
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      const sessionExpiredAt = (session?.expires_at ?? 0) * 1_000;
      if (!session || sessionExpiredAt <= Date.now()) {
        window.localStorage.setItem(recoveryKey, JSON.stringify(patch));
        setSessionExpired(true);
        setMessage("Session expired. Work is saved on this device.");
        return false;
      }
    } catch {
      window.localStorage.setItem(recoveryKey, JSON.stringify(patch));
      setMessage("Could not sync yet. Work is saved on this device.");
      return false;
    }
    saveQueue.current = {};
    window.localStorage.setItem(recoveryKey, JSON.stringify(patch));
    setMessage("Saving...");
    let result: Awaited<ReturnType<typeof saveHandInPatch>>;
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;
    try {
      result = await Promise.race([
        saveHandInPatch({ assignmentId, patch }),
        new Promise<never>((_resolve, reject) => {
          syncTimeout = setTimeout(() => reject(new Error("Assignment sync timed out.")), 8_000);
        }),
      ]);
    } catch {
      saveQueue.current = { ...patch, ...saveQueue.current };
      window.localStorage.setItem(recoveryKey, JSON.stringify(saveQueue.current));
      setMessage(
        window.navigator.onLine
          ? "Could not sync yet. Work is saved on this device."
          : "Offline. Work is saved on this device.",
      );
      return false;
    } finally {
      if (syncTimeout) clearTimeout(syncTimeout);
    }
    if (!result.ok) {
      saveQueue.current = { ...patch, ...saveQueue.current };
      window.localStorage.setItem(recoveryKey, JSON.stringify(saveQueue.current));
      const needsSignIn = result.error === "Not signed in.";
      setSessionExpired(needsSignIn);
      setMessage(
        needsSignIn
          ? "Session expired. Work is saved on this device."
          : "Could not sync yet. Work is saved on this device.",
      );
      return false;
    }
    setSessionExpired(false);
    if (Object.keys(saveQueue.current).length === 0) window.localStorage.removeItem(recoveryKey);
    else window.localStorage.setItem(recoveryKey, JSON.stringify(saveQueue.current));
    setMessage(successMessage);
    return true;
  }, [assignmentId, recoveryKey]);

  useEffect(() => {
    offline.current = !window.navigator.onLine;
    void startAssignmentWorkspace({ assignmentId }).catch(() => undefined);
    const rawRecovery = window.localStorage.getItem(recoveryKey);
    if (rawRecovery) {
      try {
        const recovered = JSON.parse(rawRecovery) as Record<string, unknown>;
        const patch = Object.fromEntries(Object.entries(recovered).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
        if (Object.keys(patch).length > 0) {
          setSavedWork((current) => ({ ...current, ...patch }));
          saveQueue.current = { ...saveQueue.current, ...patch };
          setMessage("Recovered unsaved work");
          saveTimer.current = setTimeout(() => void flushSaves("Recovered work saved"), 100);
        }
      } catch {
        window.localStorage.removeItem(recoveryKey);
      }
    }
    const persistPending = () => {
      if (Object.keys(saveQueue.current).length > 0) window.localStorage.setItem(recoveryKey, JSON.stringify(saveQueue.current));
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") void flushSaves();
    };
    const onOnline = () => {
      offline.current = false;
      if (Object.keys(saveQueue.current).length > 0) {
        void flushSaves("Draft saved");
      }
    };
    const onOffline = () => {
      offline.current = true;
      persistPending();
      if (Object.keys(saveQueue.current).length > 0) {
        setMessage("Offline. Work is saved on this device.");
      }
    };
    window.addEventListener("beforeunload", persistPending);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      persistPending();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      window.removeEventListener("beforeunload", persistPending);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [assignmentId, flushSaves, recoveryKey]);

  function saveField(key: string, value: string, successMessage = "Saved") {
    setSavedWork((current) => ({ ...current, [key]: value }));
    saveQueue.current = { ...saveQueue.current, [key]: value };
    window.localStorage.setItem(recoveryKey, JSON.stringify(saveQueue.current));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (offline.current || !window.navigator.onLine) {
      setMessage("Offline. Work is saved on this device.");
      return;
    }
    setMessage("Saving...");
    saveTimer.current = setTimeout(() => void flushSaves(successMessage), 500);
  }

  function reviewSubmission() {
    startTransition(async () => {
      const saved = await flushSaves("Saved");
      if (!saved) return;
      if (mode === "math" && !(await flushMathWork.current())) return;
      const result = await prepareAssignmentReview({ assignmentId });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.push(`/assignments/${assignmentId}/submit`);
    });
  }

  function chooseMode(nextMode: AssignmentWorkspaceMode) {
    setMode(nextMode);
    setSavedWork((current) => ({ ...current, workspaceMode: nextMode }));
    setMessage("Saving work format...");
    startTransition(async () => {
      const result = await selectAssignmentWorkspaceMode({ assignmentId, mode: nextMode });
      setMessage(result.ok ? `${WORKSPACE_MODE_LABEL[nextMode]} selected` : result.error);
    });
  }

  function downloadWork() {
    const stringWork = Object.fromEntries(
      Object.entries(savedWork).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
    const currentLegacyBlocks = mode === "math"
      ? workspaceProblems.map((problem) => assignmentProblemArtifactBlock({
          problemNumber: problem.problemNumber,
          problemText: problem.problemText,
          studentWork: problem.studentWork,
        }))
      : legacyArtifactBlocksForPatch(mode, stringWork);
    const legacyKeys = new Set(currentLegacyBlocks.map((block) => block.key));
    const blocks = [
      ...currentLegacyBlocks,
      ...initialArtifactBlocks.filter((block) => !legacyKeys.has(block.key)),
    ];
    const artifact = buildAssignmentArtifact({
      mode,
      artifactType: assignmentProfile.artifactType,
      title,
      savedWork,
      problems: workspaceProblems,
      blocks,
    });
    if (artifact.isEmpty) {
      setMessage("Add a little of your own work before downloading.");
      return;
    }
    const documentHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><pre style="font:12pt Arial;white-space:pre-wrap">${escapeHtml(artifact.plainText)}</pre></body></html>`;
    const blob = new Blob([documentHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").toLowerCase() || "assignment"}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="sd-capture-work-screen sd-assignment-workspace min-h-dvh bg-[#0f172a] text-slate-50">
      <StudentDesktopNav active="Work" />
      <div className="sd-assignment-workspace-main">
        <Link href="/assignments" className="sd-assignment-workspace-back">
          <ArrowLeft size={16} aria-hidden="true" /> Back to work
        </Link>

        <header className="sd-assignment-workspace-hero">
          <div className="sd-assignment-workspace-heading">
            <p className="sd-assignment-workspace-course">{courseLabel}</p>
            <h1>{title}</h1>
            <p className="sd-assignment-workspace-directions">{sourcePacket.directions || description || "Add the assignment directions before you begin."}</p>
          </div>
          <div className="sd-assignment-workspace-status">
            <div className="sd-assignment-workspace-current">
              <div className="sd-assignment-workspace-current-label">Current move</div>
              <div className="sd-assignment-workspace-current-step">{activeStep}</div>
            </div>
            <div className="sd-assignment-workspace-actions">
              <button type="button" onClick={downloadWork}>
                <Download size={17} aria-hidden="true" /> Download
              </button>
              <button type="button" disabled={pending} onClick={reviewSubmission}>
                Review submission <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
            <span className="sd-assignment-workspace-save-state" role="status" aria-live="polite">
              {pending ? "Saving..." : message}
              {sessionExpired ? (
                <>
                  {" "}
                  <Link href={`/login?next=${encodeURIComponent(`/assignments/${assignmentId}/workspace`)}`}>
                    Sign in again
                  </Link>
                </>
              ) : null}
            </span>
          </div>
        </header>

        <div className="sd-assignment-workspace-body">
        <section className="sd-assignment-workspace-context" aria-label="Assignment context">
          <details className="sd-assignment-workspace-panel">
            <summary>Assignment material</summary>
            {sourcePacket.rubric ? <p className="mb-0 mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200"><strong>Rubric</strong><br />{sourcePacket.rubric}</p> : null}
            {sources.length > 0 ? <ul className="mb-0 mt-3 grid gap-2 p-0 text-sm text-slate-200">{sources.map((source) => <li key={source.id} className="list-none">{source.url ? <a className="text-cyan-300" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : <span>{source.title}</span>}{source.source_location ? <span className="text-slate-400"> | {source.source_location}</span> : null}</li>)}</ul> : <p className="mb-0 mt-3 text-sm text-slate-300">Diana will use the directions already connected to this assignment.</p>}<AssignmentSourceImporter assignmentId={assignmentId} />
          </details>
          <details className="sd-assignment-workspace-panel">
            <summary>Change work format</summary>
            <div className="mt-3 border border-dashed border-white/25 bg-white/5 p-3">
              <p className="m-0 text-xs font-bold uppercase text-cyan-300">Selected automatically</p>
              <p className="mb-0 mt-1 text-sm text-slate-200">
                {assignmentProfile.subjectDomain.replaceAll("_", " ")} / {assignmentProfile.artifactType.replaceAll("_", " ")}
              </p>
              <ul className="mb-0 mt-3 flex list-none flex-wrap gap-2 p-0" aria-label="Assignment tools">
                {capabilityLabels(assignmentProfile.capabilities).map((label) => (
                  <li key={label} className="border border-white/25 bg-white px-2 py-1 text-xs font-bold text-slate-950">{label}</li>
                ))}
              </ul>
            </div>
            <label className="mt-3 block text-sm font-bold text-slate-200">Working format<select value={mode} onChange={(event) => chooseMode(event.target.value as AssignmentWorkspaceMode)} className="mt-2 block min-h-11 w-full border border-white/30 bg-white px-3 text-base font-semibold text-slate-950">{WORKSPACE_MODES.map((candidate) => <option key={candidate} value={candidate}>{WORKSPACE_MODE_LABEL[candidate]}</option>)}</select></label>
          </details>
          <details className="sd-assignment-workspace-panel">
            <summary>Optional plan</summary>
            <AssignmentPlanPanel assignmentId={assignmentId} title={title} description={sourcePacket.directions || description} kind={kind} estimatedMinutes={estimatedMinutes} aiMode={aiMode} initialSteps={workspaceSteps} initiallyOpen={false} onStepsChange={setWorkspaceSteps} />
          </details>
          <div className="sd-assignment-study-actions" aria-label="Study support">
            <p>{kind === "test_prep" ? "Prepare from this quiz material" : "Practice from this assignment"}</p>
            <Link href={`/study-artifacts?source=assignment:${assignmentId}&type=practice_test`}>
              <Brain size={17} aria-hidden="true" />
              Practice test
            </Link>
            <Link href={`/study-artifacts?source=assignment:${assignmentId}&type=study_guide`}>
              <BookOpenText size={17} aria-hidden="true" />
              Study guide
            </Link>
          </div>
        </section>

        <section className="sd-assignment-workspace-editor" aria-live="polite">
          {mode === "math" ? (
            <MathBoard assignmentId={assignmentId} courseLabel={courseLabel} initialProblems={initialProblems} aiMode={aiMode} onMessage={setMessage} onProblemsChange={setWorkspaceProblems} registerFlush={registerMathFlush} />
          ) : null}
          {mode === "worksheet" || mode === "research" || mode === "history" || mode === "language" || mode === "coding" || mode === "art" ? <StructuredBoard mode={mode} savedWork={savedWork} onSave={saveField} /> : null}
          {mode === "writing" ? (
            <WritingDocument
              savedWork={savedWork}
              onSave={saveField}
            />
          ) : null}
          {mode === "lab" ? (
            <LabSheet assignmentId={assignmentId} description={description} savedWork={savedWork} aiMode={aiMode} onSave={saveField} onMessage={setMessage} />
          ) : null}
          {mode === "reading" ? (
            <ReadingBoard savedWork={savedWork} onSave={saveField} />
          ) : null}
          {mode === "project" ? (
            <ProjectBoard savedWork={savedWork} onSave={saveField} />
          ) : null}
          {mode === "handoff" ? (
            <HandInBoard
              initialResponse={savedText(savedWork.handoffResponse)}
              delivery={savedText(savedWork.delivery) || "canvas_text"}
              externalUrl={externalUrl}
              externalSource={externalSource}
              onSave={saveField}
            />
          ) : null}
          <AssignmentNativeTools
            assignmentId={assignmentId}
            assignmentTitle={title}
            profile={assignmentProfile}
            initialBlocks={initialArtifactBlocks}
          />
          <AssignmentCreativeTools
            assignmentId={assignmentId}
            profile={assignmentProfile}
            initialBlocks={initialArtifactBlocks}
          />
          <AssignmentTechnicalTools
            assignmentId={assignmentId}
            profile={assignmentProfile}
            initialBlocks={initialArtifactBlocks}
            practicalGate={practicalGate}
          />
          {mode !== "math" ? <AssignmentReviewPanel assignmentId={assignmentId} template={mode} fields={reviewFieldsForMode(mode, savedWork)} aiMode={aiMode} /> : null}

        </section>
        </div>

        <AssignmentFocusClock
          assignmentId={assignmentId}
          title={title}
          estimatedMinutes={estimatedMinutes}
        />


      </div>
      <StudentBottomNav />
    </div>
  );
}

function MathBoard({ assignmentId, courseLabel, initialProblems, aiMode, onMessage, onProblemsChange, registerFlush }: {
  assignmentId: string;
  courseLabel: string;
  initialProblems: Problem[];
  aiMode: "red" | "yellow" | "green";
  onMessage(message: string): void;
  onProblemsChange(problems: Problem[]): void;
  registerFlush(flush: () => Promise<boolean>): void;
}) {
  const [problems, setProblems] = useState(initialProblems);
  const problemsRef = useRef(initialProblems);
  const [activeIndex, setActiveIndex] = useState(0);
  const [newProblem, setNewProblem] = useState("");
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyWork = useRef<Record<string, Partial<Record<"answer" | "work", string>>>>({});
  const active = problems[activeIndex] ?? null;
  const [answer, setAnswer] = useState(() => savedText(active?.studentWork.answer));
  const [work, setWork] = useState(() => savedText(active?.studentWork.work));
  const [scaffold, setScaffold] = useState<MathScaffoldResult | null>(() => asMathScaffold(active?.scaffold));
  const recoveryKey = useCallback((problemId: string) => `diana:assignment:${assignmentId}:problem:${problemId}`, [assignmentId]);

  const commitProblems = useCallback((update: (current: Problem[]) => Problem[]) => {
    const next = update(problemsRef.current);
    problemsRef.current = next;
    setProblems(next);
    onProblemsChange(next);
  }, [onProblemsChange]);

  const flushProblem = useCallback(async (problemId: string): Promise<boolean> => {
    const patch = dirtyWork.current[problemId];
    if (!patch || Object.keys(patch).length === 0) return true;
    delete dirtyWork.current[problemId];
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    onMessage("Saving...");
    const result = await saveProblemWorkPatch({ problemId, patch });
    if (!result.ok) {
      dirtyWork.current[problemId] = { ...patch, ...dirtyWork.current[problemId] };
      window.localStorage.setItem(recoveryKey(problemId), JSON.stringify(dirtyWork.current[problemId]));
      onMessage(result.error);
      return false;
    }
    if (dirtyWork.current[problemId]) {
      window.localStorage.setItem(recoveryKey(problemId), JSON.stringify(dirtyWork.current[problemId]));
    } else {
      window.localStorage.removeItem(recoveryKey(problemId));
    }
    onMessage("Problem saved");
    return true;
  }, [onMessage, recoveryKey]);

  const flushAllProblems = useCallback(async (): Promise<boolean> => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const problemIds = Object.keys(dirtyWork.current);
    const results = await Promise.all(problemIds.map((problemId) => flushProblem(problemId)));
    return results.every(Boolean);
  }, [flushProblem]);

  useEffect(() => {
    const recovered = initialProblems.map((problem) => {
      const raw = window.localStorage.getItem(recoveryKey(problem.id));
      if (!raw) return problem;
      try {
        const value = JSON.parse(raw) as Record<string, unknown>;
        const patch = Object.fromEntries(Object.entries(value).filter((entry): entry is ["answer" | "work", string] => (entry[0] === "answer" || entry[0] === "work") && typeof entry[1] === "string"));
        if (Object.keys(patch).length === 0) return problem;
        dirtyWork.current[problem.id] = patch as Partial<Record<"answer" | "work", string>>;
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
    setWork(savedText(first?.studentWork.work));
    if (Object.keys(dirtyWork.current).length > 0) {
      onMessage("Recovered unsaved math work");
      saveTimer.current = setTimeout(() => void flushAllProblems(), 100);
    }
  }, [assignmentId, flushAllProblems, initialProblems, onMessage, onProblemsChange, recoveryKey]);

  useEffect(() => {
    registerFlush(flushAllProblems);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") void flushAllProblems();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [flushAllProblems, registerFlush]);

  async function switchProblem(index: number) {
    if (active && !(await flushProblem(active.id))) return;
    setActiveIndex(index);
    const next = problems[index];
    setAnswer(savedText(next?.studentWork.answer));
    setWork(savedText(next?.studentWork.work));
    setScaffold(asMathScaffold(next?.scaffold));
  }

  function queueProblemSave(key: "answer" | "work", value: string) {
    if (!active) return;
    const problemId = active.id;
    const patch = { ...dirtyWork.current[problemId], [key]: value } as Partial<Record<"answer" | "work", string>>;
    dirtyWork.current[problemId] = patch;
    window.localStorage.setItem(recoveryKey(problemId), JSON.stringify(patch));
    commitProblems((current) => current.map((problem) => problem.id === problemId
      ? { ...problem, studentWork: { ...problem.studentWork, [key]: value } }
      : problem));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    onMessage("Saving...");
    saveTimer.current = setTimeout(() => void flushProblem(problemId), 500);
  }

  function askForNextMove() {
    if (!active) return;
    onMessage("Getting a next move...");
    startTransition(async () => {
      const result = await requestMathScaffold({
        assignmentId,
        aiMode: "green",
        subject: mathSubjectForCourse(courseLabel),
        problemText: active.problemText,
      });
      if (!result.ok) return onMessage(result.error);
      setScaffold(result.result);
      commitProblems((current) => current.map((problem) => problem.id === active.id
        ? { ...problem, scaffold: result.result }
        : problem));
      const saved = await saveProblemScaffold({ problemId: active.id, scaffold: result.result });
      onMessage(saved.ok ? "Next move ready" : saved.error);
    });
  }

  function importProblems() {
    onMessage("Importing numbered problems...");
    startTransition(async () => {
      const result = await importProblemsFromAssignmentSources({ assignmentId });
      if (!result.ok) return onMessage(result.error);
      const imported: Problem[] = result.problems.map((problem) => ({ ...problem, studentWork: {} }));
      commitProblems((current) => [...current, ...imported]);
      if (problems.length === 0 && imported.length > 0) {
        setActiveIndex(0);
        setAnswer("");
        setWork("");
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
      const next: Problem = { id: result.id, problemNumber: result.problemNumber, problemText, studentWork: {} };
      commitProblems((current) => [...current, next]);
      setNewProblem("");
      setActiveIndex(problems.length);
      setAnswer("");
      setWork("");
      onMessage("Problem added");
    });
  }

  return (
    <div className="sd-assignment-mode sd-assignment-mode--math">
      <div className="sd-assignment-mode-header">
        <div>
          <p className="sd-assignment-mode-title">Math board</p>
          <p className="sd-assignment-mode-description">Work one problem at a time. Your answer and reasoning save automatically.</p>
        </div>
        <div className="sd-assignment-mode-header-actions">{active ? <span className="sd-assignment-mode-count">Problem {active.problemNumber} of {problems.length}</span> : null}<button type="button" disabled={pending} onClick={importProblems} className="sd-assignment-button sd-assignment-button--secondary">Import problems</button></div>
      </div>

      {problems.length > 0 ? (
        <div className="sd-assignment-math-workspace">
          <nav aria-label="Problems" className="sd-assignment-problem-queue">
            {problems.map((problem, index) => (
              <button key={problem.id} type="button" data-active={index === activeIndex} onClick={() => void switchProblem(index)} className="sd-assignment-problem-tab">
                <span>Problem {problem.problemNumber}</span>
                <small>{problem.problemText}</small>
              </button>
            ))}
          </nav>
          {active ? (
            <div className="sd-assignment-problem-card">
              <p className="sd-assignment-problem-text">{active.problemText}</p>
              <label className="sd-assignment-mode-field">Your answer
                <input value={answer} onChange={(event) => { setAnswer(event.target.value); queueProblemSave("answer", event.target.value); }} placeholder="Write your answer" className="mt-2 block w-full border border-white/25 bg-white px-3 py-3 text-base text-slate-950" />
              </label>
              <label className="sd-assignment-mode-field">Show your work
                <textarea value={work} onChange={(event) => { setWork(event.target.value); queueProblemSave("work", event.target.value); }} placeholder="Use your own steps, numbers, or explanation." rows={7} className="mt-2 block w-full resize-y border border-white/25 bg-white p-3 text-base leading-6 text-slate-950" />
              </label>
              <div className="sd-assignment-mode-actions">
                <button type="button" disabled={pending} onClick={askForNextMove} className="sd-assignment-button sd-assignment-button--secondary"><Lightbulb size={17} /> Get a next move</button>
              </div>
              {scaffold ? (
                <aside className="sd-assignment-scaffold" aria-label="Math next moves">
                  <p className="sd-assignment-scaffold-title">Use these prompts, then write your own work</p>
                  <ol className="mb-0 mt-3 grid gap-3 pl-5">
                    {scaffold.steps.map((step) => <li key={step.id}><strong>{step.label}:</strong> {step.prompt}</li>)}
                  </ol>
                  {scaffold.commonError ? <p className="mb-0 mt-3 text-sm"><strong>Watch for:</strong> {scaffold.commonError}</p> : null}
                </aside>
              ) : null}
              <AssignmentReviewPanel assignmentId={assignmentId} template="math" aiMode={aiMode} fields={[
                { label: "Problem", value: active.problemText },
                { label: "Student answer", value: answer },
                { label: "Student work", value: work },
              ]} />
              <div className="sd-assignment-problem-navigation">
                <button type="button" disabled={activeIndex === 0} onClick={() => void switchProblem(activeIndex - 1)}><ChevronLeft size={16} /> Previous</button>
                <button type="button" disabled={activeIndex >= problems.length - 1} onClick={() => void switchProblem(activeIndex + 1)}>Next <ChevronRight size={16} /></button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="sd-assignment-empty-state">
          <strong>Add the first problem</strong>
          <p className="mt-1 text-sm">Use Import problems after adding assignment text or a worksheet. You can still paste a problem below when the worksheet is not numbered.</p>
        </div>
      )}

      <label className="sd-assignment-mode-field sd-assignment-add-problem">Add another problem
        <textarea value={newProblem} onChange={(event) => setNewProblem(event.target.value)} placeholder="Paste the next problem" rows={3} className="mt-2 block w-full resize-y border border-white/25 bg-white p-3 text-base text-slate-950" />
      </label>
      <button type="button" disabled={pending || !newProblem.trim()} onClick={createProblem} className="sd-assignment-button sd-assignment-button--primary"><Plus size={17} /> Add problem</button>
    </div>
  );
}
function WritingDocument({ savedWork, onSave }: { savedWork: Record<string, unknown>; onSave(key: string, value: string, successMessage?: string): void }) {
  const thesis = savedText(savedWork.writingThesis);
  const plan = savedText(savedWork.writingPlan);
  const draft = savedText(savedWork.draft);
  const words = useMemo(() => draft.trim().split(/\s+/u).filter(Boolean).length, [draft]);
  return (
    <div className="sd-assignment-writing">
      <div className="sd-assignment-editor-heading"><div><p>Writing document</p><p>Your work saves automatically.</p></div><span>{words} words</span></div>
      <div className="sd-assignment-editor-fields">
        <label className="sd-assignment-editor-field">Thesis or main claim<textarea value={thesis} onChange={(event) => onSave("writingThesis", event.target.value, "Thesis saved")} placeholder="State your main claim in your own words." rows={4} className="mt-2 block w-full resize-y border border-white/25 bg-white p-3 text-base font-normal leading-6 text-slate-950" /></label>
        <label className="sd-assignment-editor-field">Paragraph plan<textarea value={plan} onChange={(event) => onSave("writingPlan", event.target.value, "Plan saved")} placeholder="List the point and evidence for each paragraph." rows={4} className="mt-2 block w-full resize-y border border-white/25 bg-white p-3 text-base font-normal leading-6 text-slate-950" /></label>
      </div>
      <label className="sd-assignment-editor-field sd-assignment-editor-draft">Your draft<textarea aria-label="Student draft" value={draft} onChange={(event) => onSave("draft", event.target.value, "Draft saved")} placeholder="Start with your own words..." rows={16} className="mt-2 block w-full resize-y border border-white/25 bg-white p-4 text-base font-normal leading-7 text-slate-950" /></label>
    </div>
  );
}
function LabSheet({ assignmentId, description, savedWork, aiMode, onSave, onMessage }: { assignmentId: string; description: string; savedWork: Record<string, unknown>; aiMode: "red" | "yellow" | "green"; onSave(key: string, value: string, successMessage?: string): void; onMessage(message: string): void }) {
  const [scaffold, setScaffold] = useState<ScienceScaffoldResult | null>(() => asScienceScaffold(savedWork.labScaffold));
  const [pending, startTransition] = useTransition();
  const fields = [
    ["labQuestion", "Question or purpose", "What is this investigation asking?"],
    ["labHypothesis", "Hypothesis", "Write what you think will happen and why."],
    ["labData", "Data and observations", "Record measurements, notes, or observations."],
    ["labAnalysis", "Analysis", "Explain what the data shows."],
    ["labConclusion", "Conclusion", "Answer the question using your evidence."],
  ] as const;

  function askForLabPrompts() {
    const prompt = description || savedText(savedWork.labQuestion) || "Help me organize this lab investigation.";
    onMessage("Getting lab prompts...");
    startTransition(async () => {
      const result = await requestScienceScaffold({ assignmentId, aiMode, mode: "lab_report", prompt });
      if (!result.ok) return onMessage(result.error);
      setScaffold(result.result);
      onSave("labScaffold", JSON.stringify(result.result), "Lab prompts saved");
    });
  }

  return (
    <div className="sd-assignment-mode sd-assignment-mode--lab">
      <div className="sd-assignment-mode-header">
        <div>
          <p className="sd-assignment-mode-title">Lab sheet</p>
          <p className="sd-assignment-mode-description">Keep the question, evidence, analysis, and conclusion in one clear order.</p>
        </div>
        <button type="button" disabled={pending} onClick={askForLabPrompts} className="sd-assignment-button sd-assignment-button--secondary"><Lightbulb size={17} /> Get lab prompts</button>
      </div>
      {scaffold ? (
        <aside className="sd-assignment-scaffold">
          <p className="sd-assignment-scaffold-title">{scaffold.title}</p>
          <div className="sd-assignment-scaffold-cards">
            {scaffold.cards.map((card) => <div key={card.label} className="sd-assignment-scaffold-card"><strong>{card.label}</strong><p>{card.prompt}</p>{card.exampleFrame ? <p><em>{card.exampleFrame}</em></p> : null}</div>)}
          </div>
          <p><strong>Check:</strong> {scaffold.checkPrompt}</p>
        </aside>
      ) : null}
      <div className="sd-assignment-mode-fields">
        {fields.map(([key, label, placeholder]) => <label key={key} data-field={key} className="sd-assignment-mode-field">{label}<textarea value={savedText(savedWork[key])} onChange={(event) => onSave(key, event.target.value, `${label} saved`)} placeholder={placeholder} rows={key === "labData" || key === "labAnalysis" ? 7 : 4} /></label>)}
      </div>
    </div>
  );
}
function HandInBoard({ initialResponse, delivery, externalUrl, externalSource, onSave }: { initialResponse: string; delivery: string; externalUrl: string | null; externalSource: string | null; onSave(key: string, value: string, successMessage?: string): void }) {
  const [response, setResponse] = useState(initialResponse);
  return (
    <div className="sd-assignment-mode sd-assignment-mode--handoff">
      <div className="sd-assignment-mode-header">
        <div>
          <p className="sd-assignment-mode-title">Hand-in</p>
          <p className="sd-assignment-mode-description">Finish the response here, then choose how it reaches your teacher.</p>
        </div>
      </div>
      <div className="sd-assignment-mode-fields">
        <label className="sd-assignment-mode-field">Your response or hand-in notes<textarea value={response} onChange={(event) => { setResponse(event.target.value); onSave("handoffResponse", event.target.value, "Response saved"); }} placeholder="Write your response, what you finished, or what you need to hand in." rows={12} /></label>
        <div className="sd-assignment-delivery-panel">
          <label>How will you turn it in?<select value={delivery} onChange={(event) => onSave("delivery", event.target.value, "Delivery saved")}><option value="canvas_text">Paste into Canvas or Classroom</option><option value="file_upload">Upload a file</option><option value="print">Print or save as PDF</option><option value="physical">Bring it in person</option></select></label>
          {externalUrl ? <a href={externalUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open in {externalSource === "google_classroom" ? "Google Classroom" : "Canvas"}</a> : <p>No school-system link is attached. Save your work here and use the hand-in method you selected.</p>}
        </div>
      </div>
    </div>
  );
}
function ReadingBoard({ savedWork, onSave }: { savedWork: Record<string, unknown>; onSave(key: string, value: string, successMessage?: string): void }) {
  const fields = [
    ["readingNotes", "Reading notes", "Capture the important ideas in your own words."],
    ["readingEvidence", "Evidence or quote", "Add the page, paragraph, or detail you will use."],
    ["readingResponse", "Your response", "Explain what the text means or how you will use the evidence."],
  ] as const;
  return (
    <div className="sd-assignment-mode sd-assignment-mode--reading">
      <div className="sd-assignment-mode-header"><div><p className="sd-assignment-mode-title">Reading response</p><p className="sd-assignment-mode-description">Move from notes to evidence to your own response.</p></div></div>
      <div className="sd-assignment-mode-fields">{fields.map(([key, label, placeholder]) => <label key={key} data-field={key} className="sd-assignment-mode-field">{label}<textarea value={savedText(savedWork[key])} onChange={(event) => onSave(key, event.target.value, `${label} saved`)} placeholder={placeholder} rows={key === "readingResponse" ? 8 : 5} /></label>)}</div>
    </div>
  );
}
function ProjectBoard({ savedWork, onSave }: { savedWork: Record<string, unknown>; onSave(key: string, value: string, successMessage?: string): void }) {
  const fields = [
    ["projectGoal", "Project goal", "What needs to be made or shown?"],
    ["projectDeliverables", "Deliverables", "List the pieces you need to turn in."],
    ["projectPlan", "Build plan", "Write the next small actions in order."],
    ["projectNotes", "Work notes", "Keep links, decisions, and progress notes here."],
  ] as const;
  return (
    <div className="sd-assignment-mode sd-assignment-mode--project">
      <div className="sd-assignment-mode-header"><div><p className="sd-assignment-mode-title">Project board</p><p className="sd-assignment-mode-description">Define the goal, deliverables, plan, and work notes in order.</p></div></div>
      <div className="sd-assignment-mode-fields">{fields.map(([key, label, placeholder]) => <label key={key} data-field={key} className="sd-assignment-mode-field">{label}<textarea value={savedText(savedWork[key])} onChange={(event) => onSave(key, event.target.value, `${label} saved`)} placeholder={placeholder} rows={key === "projectNotes" ? 7 : 4} /></label>)}</div>
    </div>
  );
}
function StructuredBoard({ mode, savedWork, onSave }: { mode: Exclude<AssignmentWorkspaceMode, "math" | "writing" | "lab" | "reading" | "project" | "handoff">; savedWork: Record<string, unknown>; onSave(key: string, value: string, successMessage?: string): void }) {
  const configuration: Record<typeof mode, { title: string; description: string; fields: Array<[string, string, string, number]> }> = {
    worksheet: { title: "Worksheet", description: "Move from the question to your reasoning and final response.", fields: [["worksheetQuestion", "Question", "What is this asking you to do?", 4], ["worksheetWork", "Your reasoning", "Show the steps or evidence you used.", 7], ["worksheetResponse", "Response", "Write your final response in your own words.", 5]] },
    research: { title: "Research organizer", description: "Track the question, sources, claim, and draft in one place.", fields: [["researchQuestion", "Research question", "What are you trying to find out?", 3], ["researchSources", "Source notes and citations", "Record the source, useful fact, and why it matters.", 7], ["researchClaim", "Working claim", "State what your research is starting to show.", 4], ["researchDraft", "Draft", "Write your response in your own words.", 10]] },
    history: { title: "History and DBQ", description: "Analyze the sources before building the historical claim and response.", fields: [["historySource", "Source analysis", "Who made this, when, and what does it say?", 5], ["historyEvidence", "Evidence", "Add details from the documents with source references.", 6], ["historyClaim", "Claim", "State the historical argument you can support.", 4], ["historyResponse", "Response", "Write your answer using the evidence above.", 10]] },
    language: { title: "Language practice", description: "Start with your own attempt, then record what you want to improve.", fields: [["languagePrompt", "Prompt or text", "Paste the sentence, vocabulary, or speaking prompt.", 4], ["languageAttempt", "Your attempt", "Write or transcribe your own first attempt.", 7], ["languageNotes", "What to improve", "Keep grammar, vocabulary, or pronunciation notes here.", 4]] },
    coding: { title: "Code workspace", description: "Define the task, plan a small test, then record the implementation.", fields: [["codeTask", "Task and requirements", "Describe the input, output, and limits.", 4], ["codePlan", "Plan", "List the first small steps before coding.", 5], ["codeWork", "Code or pseudocode", "Write your implementation or pseudocode.", 12], ["codeTests", "Test notes", "Record what you tested and what you observed.", 5]] },
    art: { title: "Art and design board", description: "Connect the brief, concept, process, and artist statement.", fields: [["artBrief", "Brief and requirements", "What does the assignment require you to make or show?", 4], ["artConcept", "Concept", "Describe your idea, choices, and references.", 5], ["artProcess", "Process notes", "Track studies, revisions, materials, or rehearsal decisions.", 7], ["artStatement", "Artist statement", "Explain the final work in your own words.", 7]] },
  };
  const config = configuration[mode];
  return (
    <div className={`sd-assignment-mode sd-assignment-mode--${mode}`}>
      <div className="sd-assignment-mode-header"><div><p className="sd-assignment-mode-title">{config.title}</p><p className="sd-assignment-mode-description">{config.description}</p></div></div>
      <div className="sd-assignment-mode-fields">{config.fields.map(([key, label, placeholder, rows]) => <label key={key} data-field={key} className="sd-assignment-mode-field">{label}<textarea value={savedText(savedWork[key])} onChange={(event) => onSave(key, event.target.value, `${label} saved`)} placeholder={placeholder} rows={rows} /></label>)}</div>
    </div>
  );
}
