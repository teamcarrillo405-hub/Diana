"use client";

import katex from "katex";
import { Check, FileText, Image as ImageIcon, Plus, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";

import { requestAssignmentReview } from "@/app/(app)/assignments/[id]/ai-tools-actions";
import { addAssignmentSourceFile, removeAssignmentSourceFile, retryAssignmentSourceExtraction } from "@/app/(app)/assignments/[id]/workspace/source-actions";
import { upsertAssignmentProblemMessage } from "@/app/(app)/assignments/[id]/workspace-state-actions";
import { AssignmentRealtimeTutor } from "@/components/assignment-realtime-tutor";
import { VoiceTextarea } from "@/components/voice-textarea";
import {
  parseTutorResponseEvidence,
  tutorResponseEvidenceLabel,
  type TutorResponseEvidence,
} from "@/lib/ai/tutor-response-evidence";
import {
  parseVisibleTutorProviderState,
  resolveVisibleTutorProviderState,
  type VisibleTutorProviderState,
} from "@/lib/assignment-help/provider-state";
import type { AssignmentReviewField, AssignmentReviewResult, AssignmentReviewTemplate, AssignmentVisualAid } from "@/lib/assignment-review";
import type { AssignmentProblemMessage, ChatAttachment, StructuredEquationRow, StudyBuddyStreamEvent } from "@/lib/assignment-workspace-contracts";
import type { StudyHelperResult } from "@/lib/integrations/diana-study-helper-sidecar";

type Props = {
  assignmentId: string;
  problemId?: string;
  template: AssignmentReviewTemplate;
  fields: AssignmentReviewField[];
  aiMode?: "red" | "yellow" | "green";
  mathReviewSignal?: number;
  reviewed?: boolean;
  done?: boolean;
  hasNextProblem?: boolean;
  reviewSnapshot?: Record<string, unknown>;
  onReviewed?: (reviewedSnapshot: Record<string, unknown>) => boolean | void | Promise<boolean | void>;
  onMarkDone?: () => void;
  onNextProblem?: () => void;
  onReviewSubmission?: () => void;
  showSubmissionAction?: boolean;
  starterQuestion?: string;
  initialMessages?: AssignmentProblemMessage[];
};

type ChatMessage = {
  id: string;
  role: "assistant" | "student";
  text: string;
  result?: AssignmentReviewResult;
  visualAid?: AssignmentVisualAid;
  attachments?: ComposerAttachment[];
  clientTurnId?: string;
  completionState?: "streaming" | "complete" | "interrupted";
  evidence?: TutorResponseEvidence;
  providerState?: VisibleTutorProviderState;
};

type ChatPhase = "idle" | "thinking" | "streaming" | "complete" | "interrupted" | "retryable_error";

type ComposerAttachment = ChatAttachment & {
  needsConfirmation?: boolean;
};

type QueuedProblemMessagePayload = {
  assignmentId: string;
  problemId: string;
  role: "assistant" | "student";
  content: string;
  attachments: ChatAttachment[];
  visualAid: Record<string, unknown> | null;
  completionState: "streaming" | "complete" | "interrupted";
  clientTurnId: string;
};

type QueuedProblemMessage = {
  queueId: string;
  revision: string;
  localId: string;
  queuedAt: number;
  payload: QueuedProblemMessagePayload;
};

const PARTIAL_EXTRACTION_MESSAGE = "Diana found part of this file. Check it, then confirm it for this message.";
const OFFLINE_CHAT_MESSAGE = "Messages are saved on this device and will sync when you're back online.";
const INTERRUPTED_CHAT_MESSAGE = "Diana was interrupted before the reply finished. Your message is still here.";

function problemMessageQueueKey(assignmentId: string) {
  return `diana:assignment:${assignmentId}:problem-chat-queue:v1`;
}

function localId(prefix: string) {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isChatAttachment(value: unknown): value is ChatAttachment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const attachment = value as Partial<ChatAttachment>;
  return typeof attachment.id === "string"
    && (typeof attachment.sourceId === "string" || attachment.sourceId === null)
    && typeof attachment.name === "string"
    && typeof attachment.mimeType === "string"
    && (attachment.status === "uploading" || attachment.status === "ready" || attachment.status === "needs_attention");
}

function queuedProblemMessage(value: unknown, assignmentId: string): QueuedProblemMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<QueuedProblemMessage>;
  const payload = candidate.payload as Partial<QueuedProblemMessagePayload> | undefined;
  if (!payload
    || payload.assignmentId !== assignmentId
    || typeof payload.problemId !== "string"
    || (payload.role !== "assistant" && payload.role !== "student")
    || typeof payload.content !== "string"
    || typeof payload.clientTurnId !== "string"
    || (payload.completionState !== "streaming" && payload.completionState !== "complete" && payload.completionState !== "interrupted")
    || typeof candidate.queueId !== "string"
    || typeof candidate.revision !== "string"
    || typeof candidate.localId !== "string") return null;
  return {
    queueId: candidate.queueId,
    revision: candidate.revision,
    localId: candidate.localId,
    queuedAt: typeof candidate.queuedAt === "number" ? candidate.queuedAt : 0,
    payload: {
      assignmentId,
      problemId: payload.problemId,
      role: payload.role,
      content: payload.content,
      attachments: Array.isArray(payload.attachments) ? payload.attachments.filter(isChatAttachment).map((attachment) => ({ ...attachment, previewUrl: null })) : [],
      visualAid: payload.visualAid && typeof payload.visualAid === "object" && !Array.isArray(payload.visualAid)
        ? payload.visualAid as Record<string, unknown>
        : null,
      completionState: payload.completionState,
      clientTurnId: payload.clientTurnId,
    },
  };
}

function readProblemMessageQueue(assignmentId: string): QueuedProblemMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(problemMessageQueueKey(assignmentId));
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed)
      ? parsed.flatMap((value) => {
        const queued = queuedProblemMessage(value, assignmentId);
        return queued ? [queued] : [];
      })
      : [];
  } catch {
    return [];
  }
}

function writeProblemMessageQueue(assignmentId: string, queue: QueuedProblemMessage[]) {
  if (typeof window === "undefined") return false;
  try {
    if (queue.length === 0) window.localStorage.removeItem(problemMessageQueueKey(assignmentId));
    else window.localStorage.setItem(problemMessageQueueKey(assignmentId), JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

function enqueueProblemMessage(assignmentId: string, problemId: string, message: ChatMessage) {
  const clientTurnId = message.clientTurnId ?? message.id;
  const payload: QueuedProblemMessagePayload = {
    assignmentId,
    problemId,
    role: message.role,
    content: message.text,
    attachments: (message.attachments ?? []).map((attachment) => ({ ...attachment, previewUrl: null })),
    visualAid: message.visualAid ? message.visualAid as unknown as Record<string, unknown> : null,
    completionState: message.completionState ?? "complete",
    clientTurnId,
  };
  const queueId = `${problemId}:${message.role}:${clientTurnId}`;
  const queue = readProblemMessageQueue(assignmentId);
  const next: QueuedProblemMessage = {
    queueId,
    revision: localId("revision"),
    localId: message.id,
    queuedAt: Date.now(),
    payload,
  };
  const existingIndex = queue.findIndex((candidate) => candidate.queueId === queueId);
  if (existingIndex >= 0) queue[existingIndex] = next;
  else queue.push(next);
  return writeProblemMessageQueue(assignmentId, queue);
}

function removeQueuedProblemMessage(assignmentId: string, completed: QueuedProblemMessage) {
  const queue = readProblemMessageQueue(assignmentId);
  writeProblemMessageQueue(assignmentId, queue.filter((candidate) => (
    candidate.queueId !== completed.queueId || candidate.revision !== completed.revision
  )));
}

function mergeChatMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  const index = messages.findIndex((candidate) => candidate.role === message.role && candidate.clientTurnId === message.clientTurnId);
  if (index < 0) return [...messages, message];
  const next = [...messages];
  next[index] = message;
  return next;
}

function storedVisualAid(value: Record<string, unknown> | null): AssignmentVisualAid | undefined {
  if (!value || typeof value.kind !== "string" || typeof value.description !== "string" || !Array.isArray(value.steps)) return undefined;
  return value as unknown as AssignmentVisualAid;
}

function hydrateMathThreads(messages: AssignmentProblemMessage[]): Record<string, ChatMessage[]> {
  return messages.reduce<Record<string, ChatMessage[]>>((threads, message) => {
    const current = threads[message.problemId] ?? [];
    threads[message.problemId] = mergeChatMessage(current, {
      id: message.id,
      role: message.role,
      text: message.content,
      attachments: message.attachments.length > 0 ? message.attachments : undefined,
      visualAid: storedVisualAid(message.visualAid),
      clientTurnId: message.clientTurnId,
      completionState: message.completionState,
    });
    return threads;
  }, {});
}

function restoredStreamState(messages: AssignmentProblemMessage[]) {
  return messages.reduce<{ phases: Record<string, ChatPhase>; errors: Record<string, string> }>((state, message) => {
    if (message.role !== "assistant") return state;
    if (message.completionState === "complete") {
      state.phases[message.problemId] = "complete";
      delete state.errors[message.problemId];
    } else {
      state.phases[message.problemId] = "interrupted";
      state.errors[message.problemId] = INTERRUPTED_CHAT_MESSAGE;
    }
    return state;
  }, { phases: {}, errors: {} });
}

function queuedChatMessage(message: QueuedProblemMessage): ChatMessage {
  return {
    id: message.localId,
    role: message.payload.role,
    text: message.payload.content,
    attachments: message.payload.attachments.length > 0 ? message.payload.attachments : undefined,
    visualAid: storedVisualAid(message.payload.visualAid),
    clientTurnId: message.payload.clientTurnId,
    completionState: message.payload.completionState,
  };
}

const actions: Record<AssignmentReviewTemplate, { label: string; focus: string }[]> = {
  writing: [
    { label: "Check thesis", focus: "Check the thesis against the assignment prompt." },
    { label: "Review plan", focus: "Review the paragraph plan for a clear order and evidence." },
    { label: "Check draft", focus: "Review the current draft for a focused next improvement." },
  ],
  math: [{ label: "Review", focus: "Review the current answer and work. Ask one helpful question and give one next operation or check, not the final answer. If a diagram would help, return a visualAid that fits the actual problem." }],
  worksheet: [{ label: "Check response", focus: "Check the question, reasoning, and response connection." }],
  research: [{ label: "Review evidence", focus: "Check whether the source notes support the research claim." }],
  history: [{ label: "Check DBQ", focus: "Check source analysis, evidence, and historical claim." }],
  lab: [
    { label: "Review hypothesis", focus: "Review the hypothesis and whether it is testable." },
    { label: "Check analysis", focus: "Review the data, analysis, and conclusion connection." },
  ],
  reading: [{ label: "Check response", focus: "Review the notes, evidence, and response connection." }],
  language: [{ label: "Review attempt", focus: "Review the student attempt and name one way to improve it." }],
  coding: [{ label: "Review plan", focus: "Review the task, plan, and test notes without writing the finished solution." }],
  art: [{ label: "Review concept", focus: "Review the brief, concept, process notes, and artist statement connection." }],
  project: [{ label: "Review plan", focus: "Review the project goal, deliverables, and build plan." }],
  handoff: [{ label: "Check response", focus: "Review the response or hand-in notes for what needs to happen next." }],
};

function mathAssistantText(result: AssignmentReviewResult): string {
  return [result.nextMove, result.question].filter(Boolean).join("\n\n");
}

function studyBuddyText(response: StudyHelperResult): string {
  if (response.visualAid?.kind === "equation_steps") return response.main;
  return [
    response.main,
    Array.isArray(response.steps) && response.steps.length > 0 ? `Next move: ${response.steps[0]}` : "",
  ].filter(Boolean).join("\n\n");
}

function fallbackEquationRows(visualAid: AssignmentVisualAid): StructuredEquationRow[] {
  const equation = visualAid.steps[0]?.trim() ?? "";
  const simplified = visualAid.steps[2]?.trim() ?? "";
  const equationMatch = equation.match(/^(.+?x)\s*([+-]\s*\d+(?:\.\d+)?)\s*=\s*(.+)$/iu);
  const simplifiedMatch = simplified.match(/^(.+?)\s*=\s*(.+)$/u);
  if (!equationMatch) return [];
  const constant = equationMatch[2].replace(/\s+/gu, "");
  const inverse = constant.startsWith("+") ? `-${constant.slice(1)}` : `+${constant.slice(1)}`;
  return [
    {
      kind: "equation",
      cells: [
        { column: "left_term", value: equationMatch[1].trim() },
        { column: "left_constant", value: constant },
        { column: "relation", value: "=" },
        { column: "right_term", value: equationMatch[3].trim() },
      ],
    },
    {
      kind: "operation",
      cells: [
        { column: "left_constant", value: inverse },
        { column: "right_term", value: inverse },
      ],
    },
    { kind: "divider", cells: [] },
    ...(simplifiedMatch ? [{
      kind: "equation" as const,
      cells: [
        { column: "left_term" as const, value: simplifiedMatch[1].trim() },
        { column: "relation" as const, value: "=" },
        { column: "right_term" as const, value: simplifiedMatch[2].trim() },
      ],
    }] : []),
  ];
}

function MathToken({ value }: { value: string }) {
  let markup = "";
  try {
    markup = katex.renderToString(value.replace(/−/gu, "-").replace(/×/gu, "\\times ").replace(/÷/gu, "\\div "), {
      throwOnError: false,
      strict: "ignore",
      trust: false,
      output: "htmlAndMathml",
    });
  } catch {
    return <span>{value}</span>;
  }
  return <span dangerouslySetInnerHTML={{ __html: markup }} />;
}

function EquationRows({ visualAid }: { visualAid: AssignmentVisualAid }) {
  const rows = visualAid.equationRows?.length ? visualAid.equationRows : fallbackEquationRows(visualAid);
  if (rows.length === 0) return null;
  return (
    <div className="sd-equation-rows" aria-label="Diana math steps">
      {rows.map((row, rowIndex) => row.kind === "divider" ? (
        <span key={`divider-${rowIndex}`} className="sd-equation-divider" aria-hidden="true" />
      ) : (
        <div key={`${row.kind}-${rowIndex}`} className="sd-equation-row" data-kind={row.kind}>
          {(["left_term", "left_constant", "relation", "right_term"] as const).map((column) => {
            const cell = row.cells.find((candidate) => candidate.column === column);
            return <span key={column} data-column={column}>{cell ? <MathToken value={cell.value} /> : null}</span>;
          })}
        </div>
      ))}
    </div>
  );
}

function MathCoachVisual({ visualAid }: { visualAid: AssignmentVisualAid }) {
  if (visualAid.kind === "none") return null;
  if (visualAid.kind === "equation_steps") {
    const turn = visualAid.steps[3]?.trim();
    return (
      <div className="sd-assignment-diana-equation-card">
        <EquationRows visualAid={visualAid} />
        {turn ? <p>{turn}</p> : null}
      </div>
    );
  }

  return (
    <div className="sd-assignment-diana-visual" aria-label="Diana visual helper" data-kind={visualAid.kind}>
      <div><Sparkles size={14} aria-hidden="true" /><strong>{visualAid.title || "Visual helper"}</strong></div>
      <svg viewBox="0 0 320 132" role="img" aria-label={visualAid.title || "Diana visual helper"}>
        <VisualAidSvg visualAid={visualAid} />
      </svg>
      <p>{visualAid.description}</p>
      {visualAid.steps.length > 0 ? <ol>{visualAid.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
    </div>
  );
}

function VisualAidSvg({ visualAid }: { visualAid: AssignmentVisualAid }) {
  if (visualAid.kind === "balance") return <><line x1="160" y1="24" x2="160" y2="102" /><line x1="72" y1="62" x2="248" y2="62" /><path d="M88 62 L58 104 H118 Z" /><path d="M232 62 L202 104 H262 Z" /><text x="88" y="118" textAnchor="middle">side A</text><text x="232" y="118" textAnchor="middle">side B</text></>;
  if (visualAid.kind === "coordinate_plane") return <><line x1="48" y1="66" x2="286" y2="66" /><line x1="160" y1="18" x2="160" y2="114" /><path d="M82 96 C124 74 178 52 240 34" /><circle cx="124" cy="74" r="5" /><circle cx="204" cy="48" r="5" /></>;
  if (visualAid.kind === "fraction_bar") return <><rect x="54" y="42" width="212" height="26" rx="4" /><rect x="54" y="76" width="212" height="26" rx="4" /><line x1="107" y1="42" x2="107" y2="102" /><line x1="160" y1="42" x2="160" y2="102" /><line x1="213" y1="42" x2="213" y2="102" /></>;
  if (visualAid.kind === "geometry") return <><path d="M76 102 L152 30 L244 102 Z" /><path d="M152 30 L152 102" /><text x="152" y="120" textAnchor="middle">compare sides and angles</text></>;
  if (visualAid.kind === "table") return <><rect x="62" y="28" width="196" height="76" rx="4" /><line x1="62" y1="54" x2="258" y2="54" /><line x1="62" y1="80" x2="258" y2="80" /><line x1="128" y1="28" x2="128" y2="104" /><line x1="194" y1="28" x2="194" y2="104" /></>;
  if (visualAid.kind === "process") return <><rect x="42" y="46" width="70" height="38" rx="8" /><rect x="126" y="46" width="70" height="38" rx="8" /><rect x="210" y="46" width="70" height="38" rx="8" /><line x1="112" y1="65" x2="126" y2="65" /><line x1="196" y1="65" x2="210" y2="65" /></>;
  return <><line x1="34" y1="72" x2="286" y2="72" />{[0, 1, 2, 3, 4, 5].map((tick) => <line key={tick} x1={52 + tick * 44} y1="62" x2={52 + tick * 44} y2="82" />)}<path d="M90 52 C126 24 194 24 230 52" /><circle cx="96" cy="72" r="7" /><circle cx="224" cy="72" r="7" /></>;
}

type AttachmentSourceResult = Awaited<ReturnType<typeof addAssignmentSourceFile>> | Awaited<ReturnType<typeof retryAssignmentSourceExtraction>>;

function attachmentAfterSourceResult(attachment: ComposerAttachment, result: AttachmentSourceResult): ComposerAttachment {
  const sourceId = "source" in result ? result.source.id : attachment.sourceId;
  if (!result.ok) {
    return { ...attachment, sourceId, status: "needs_attention", error: result.error, needsConfirmation: false };
  }
  if (result.extractionStatus === "partial") {
    return { ...attachment, sourceId, status: "needs_attention", error: PARTIAL_EXTRACTION_MESSAGE, needsConfirmation: true };
  }
  return { ...attachment, sourceId, status: "ready", error: null, needsConfirmation: false };
}

function AttachmentCard({ attachment, removable, onRemove, onRetry, onConfirm }: { attachment: ComposerAttachment; removable?: boolean; onRemove?: () => void; onRetry?: () => void; onConfirm?: () => void }) {
  const isImage = attachment.mimeType.startsWith("image/") && attachment.previewUrl;
  return (
    <div className="sd-assignment-chat-attachment" data-status={attachment.status}>
      {isImage ? <img src={attachment.previewUrl ?? ""} alt="" /> : <span className="sd-assignment-chat-attachment-icon">{attachment.mimeType === "application/pdf" ? <FileText size={20} aria-hidden="true" /> : <ImageIcon size={20} aria-hidden="true" />}</span>}
      <span><strong>{attachment.name}</strong><small>{attachment.status === "uploading" ? "Uploading" : attachment.status === "needs_attention" ? attachment.error || "Upload needs attention" : "Ready"}</small></span>
      {attachment.status === "needs_attention" && onRetry ? <button type="button" onClick={onRetry} aria-label={`Retry ${attachment.name}`}><RotateCcw size={17} aria-hidden="true" /></button> : null}
      {attachment.status === "needs_attention" && attachment.needsConfirmation && onConfirm ? <button type="button" onClick={onConfirm} aria-label={`Confirm ${attachment.name}`}><Check size={17} aria-hidden="true" /></button> : null}
      {removable && onRemove ? <button type="button" onClick={onRemove} aria-label={`Remove ${attachment.name}`}><X size={17} aria-hidden="true" /></button> : null}
    </div>
  );
}

function parseStudyBuddyStreamEvent(value: unknown): StudyBuddyStreamEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === "thinking") return { type: "thinking" };
  if (candidate.type === "streaming" && typeof candidate.delta === "string") {
    return { type: "streaming", delta: candidate.delta };
  }
  if (candidate.type === "complete" && candidate.response && typeof candidate.response === "object") {
    const evidence = parseTutorResponseEvidence(candidate.evidence);
    const providerState = parseVisibleTutorProviderState(candidate.providerState);
    if (!evidence || !providerState) return null;
    return {
      type: "complete",
      response: candidate.response as StudyHelperResult,
      evidence,
      providerState,
    };
  }
  if (
    (candidate.type === "interrupted" || candidate.type === "retryable_error") &&
    typeof candidate.error === "string"
  ) {
    const evidence = parseTutorResponseEvidence(candidate.evidence) ?? undefined;
    const providerState = parseVisibleTutorProviderState(candidate.providerState) ?? undefined;
    return candidate.type === "retryable_error"
      ? {
          type: "retryable_error",
          error: candidate.error,
          retryAfterMs: typeof candidate.retryAfterMs === "number" ? candidate.retryAfterMs : undefined,
          evidence,
          providerState,
        }
      : { type: "interrupted", error: candidate.error, evidence, providerState };
  }
  return null;
}

async function readStudyStream(response: Response, onEvent: (event: StudyBuddyStreamEvent) => void) {
  if (!response.ok || !response.body) throw new Error("study_stream_unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let terminalEventReceived = false;

  const emit = (event: StudyBuddyStreamEvent) => {
    if (terminalEventReceived) return;
    onEvent(event);
    if (event.type === "complete" || event.type === "interrupted" || event.type === "retryable_error") {
      terminalEventReceived = true;
    }
  };

  const processBlock = (block: string) => {
    if (!block.trim() || terminalEventReceived) return;
    const data = block
      .split("\n")
      .flatMap((line) => {
        const match = line.match(/^data:\s?(.*)$/u);
        return match ? [match[1]] : [];
      })
      .join("\n");
    if (!data) return;
    try {
      const parsed = parseStudyBuddyStreamEvent(JSON.parse(data));
      emit(parsed ?? {
        type: "retryable_error",
        error: "Diana could not verify the tutor response envelope. Your message is still here.",
      });
    } catch {
      emit({ type: "interrupted", error: "Diana received an unreadable reply. Your message is still here." });
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    if (done) buffer += decoder.decode();
    buffer = buffer.replace(/\r\n/gu, "\n");
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    blocks.forEach(processBlock);
    if (done) {
      processBlock(buffer);
      break;
    }
  }
  if (!terminalEventReceived) emit({ type: "interrupted", error: INTERRUPTED_CHAT_MESSAGE });
}

export function AssignmentReviewPanel({ assignmentId, problemId, template, fields, mathReviewSignal = 0, reviewed = false, done = false, hasNextProblem = false, reviewSnapshot, onReviewed, onMarkDone, onNextProblem, onReviewSubmission, showSubmissionAction = true, starterQuestion, initialMessages = [] }: Props) {
  // A persisted work-unit gets the full Diana conversation regardless of
  // subject.  `template` still tells the review service which subject contract
  // to apply, but it no longer decides whether the student sees the modern chat.
  const isUnitReview = template === "math" || Boolean(problemId);
  const threadKey = problemId ?? assignmentId;
  const [mathThreads, setMathThreads] = useState<Record<string, ChatMessage[]>>(() => hydrateMathThreads(initialMessages));
  const [mathDrafts, setMathDrafts] = useState<Record<string, string>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ id: "welcome", role: "assistant", text: "I can see the work on this page. Ask me one question or use a quick check when you want feedback.", clientTurnId: "welcome", completionState: "complete" }]);
  const [question, setQuestion] = useState("");
  const [sourceAnchors, setSourceAnchors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [streamPhases, setStreamPhases] = useState<Record<string, ChatPhase>>(() => restoredStreamState(initialMessages).phases);
  const [streamErrors, setStreamErrors] = useState<Record<string, string>>(() => restoredStreamState(initialMessages).errors);
  const [streamEvidence, setStreamEvidence] = useState<Record<string, TutorResponseEvidence | undefined>>({});
  const [streamProviderStates, setStreamProviderStates] = useState<Record<string, VisibleTutorProviderState | undefined>>({});
  const [attachments, setAttachments] = useState<Record<string, ComposerAttachment[]>>({});
  const [reviewPending, startReviewTransition] = useTransition();
  const lastMathReviewSignal = useRef(mathReviewSignal);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const streamControllers = useRef<Record<string, AbortController>>({});
  const attachmentFiles = useRef<Record<string, File>>({});
  const previewUrls = useRef<Set<string>>(new Set());
  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const queueFlushInFlight = useRef<Promise<void> | null>(null);
  const queueFlushRequested = useRef(false);
  const syncNotice = useRef("");
  const mathMessages = mathThreads[threadKey] ?? [];
  const mathQuestion = mathDrafts[threadKey] ?? "";
  const activeAttachments = attachments[threadKey] ?? [];
  const streamPhase = streamPhases[threadKey] ?? "idle";
  const streamError = streamErrors[threadKey] ?? "";
  const currentStreamEvidence = streamEvidence[threadKey];
  const currentProviderState = streamProviderStates[threadKey];
  const hasProblemContext = fields.some((field) => field.value.trim().length > 0);
  const hasWork = fields.some((field) => (!isUnitReview || (field.label !== "Problem" && field.label !== "Work unit")) && field.value.trim().length > 0);
  const busy = reviewPending || streamPhase === "thinking" || streamPhase === "streaming";
  const displayMathMessages = mathMessages.length === 0 && starterQuestion
    ? [{ id: `starter-${threadKey}`, role: "assistant" as const, text: starterQuestion, clientTurnId: `starter-${threadKey}`, completionState: "complete" as const }]
    : mathMessages;

  const updateMathThread = useCallback((key: string, update: (messages: ChatMessage[]) => ChatMessage[]) => {
    setMathThreads((current) => ({ ...current, [key]: update(current[key] ?? []) }));
  }, []);

  const flushProblemMessageQueue = useCallback((): Promise<void> => {
    if (typeof window === "undefined" || !window.navigator.onLine) return Promise.resolve();
    if (queueFlushInFlight.current) {
      queueFlushRequested.current = true;
      return queueFlushInFlight.current;
    }

    const task = (async () => {
      while (window.navigator.onLine) {
        const next = readProblemMessageQueue(assignmentId)[0];
        if (!next) break;
        let result: Awaited<ReturnType<typeof upsertAssignmentProblemMessage>>;
        try {
          result = await upsertAssignmentProblemMessage(next.payload);
        } catch {
          const notice = "That message is still visible here, but it has not synced yet.";
          syncNotice.current = notice;
          setMessage(notice);
          break;
        }
        if (!result.ok) {
          syncNotice.current = result.error;
          setMessage(result.error);
          break;
        }
        removeQueuedProblemMessage(assignmentId, next);
      }

      if (readProblemMessageQueue(assignmentId).length === 0 && syncNotice.current) {
        const completedNotice = syncNotice.current;
        syncNotice.current = "";
        setMessage((current) => current === completedNotice ? "" : current);
      }
    })();
    queueFlushInFlight.current = task;
    void task.finally(() => {
      if (queueFlushInFlight.current === task) queueFlushInFlight.current = null;
      const flushAgain = queueFlushRequested.current;
      queueFlushRequested.current = false;
      if (flushAgain && typeof window !== "undefined" && window.navigator.onLine && readProblemMessageQueue(assignmentId).length > 0) {
        void flushProblemMessageQueue();
      }
    });
    return task;
  }, [assignmentId]);

  const persistMathMessage = useCallback((problemKey: string, messageToSave: ChatMessage) => {
    if (!problemId) return;
    const queued = enqueueProblemMessage(assignmentId, problemKey, messageToSave);
    if (!window.navigator.onLine) {
      if (queued) {
        syncNotice.current = OFFLINE_CHAT_MESSAGE;
        setMessage(OFFLINE_CHAT_MESSAGE);
      }
      return;
    }
    void flushProblemMessageQueue();
  }, [assignmentId, flushProblemMessageQueue, problemId]);

  function setMathQuestion(value: string) {
    setMathDrafts((current) => ({ ...current, [threadKey]: value }));
  }

  function growComposer(event: FormEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 76), 220)}px`;
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  async function uploadAttachment(key: string, attachment: ComposerAttachment, file: File) {
    const formData = new FormData();
    formData.set("assignmentId", assignmentId);
    formData.set("file", file);
    const result = await addAssignmentSourceFile(formData);
    setAttachments((current) => {
      const existing = current[key] ?? [];
      if (!existing.some((candidate) => candidate.id === attachment.id)) return current;
      return {
        ...current,
        [key]: existing.map((candidate) => candidate.id === attachment.id
          ? attachmentAfterSourceResult(candidate, result)
          : candidate),
      };
    });
  }

  function attachPhoto(file: File) {
    const key = threadKey;
    if ((attachments[key] ?? []).length >= 4) {
      setMessage("You can attach up to four images or PDFs in one message.");
      return;
    }
    const id = crypto.randomUUID();
    const previewUrl = file.type.startsWith("image/") && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null;
    if (previewUrl) previewUrls.current.add(previewUrl);
    const attachment: ComposerAttachment = { id, sourceId: null, name: file.name, mimeType: file.type || "application/octet-stream", previewUrl, status: "uploading", error: null };
    attachmentFiles.current[id] = file;
    setAttachments((current) => ({ ...current, [key]: [...(current[key] ?? []), attachment] }));
    void uploadAttachment(key, attachment, file);
  }

  async function retryAttachment(attachment: ComposerAttachment) {
    const retry = { ...attachment, status: "uploading" as const, error: null };
    setAttachments((current) => ({ ...current, [threadKey]: (current[threadKey] ?? []).map((candidate) => candidate.id === attachment.id ? retry : candidate) }));
    if (attachment.sourceId) {
      const result = await retryAssignmentSourceExtraction({ assignmentId, sourceId: attachment.sourceId });
      setAttachments((current) => ({
        ...current,
        [threadKey]: (current[threadKey] ?? []).map((candidate) => candidate.id === attachment.id
          ? attachmentAfterSourceResult(candidate, result)
          : candidate),
      }));
      return;
    }
    const file = attachmentFiles.current[attachment.id];
    if (file) await uploadAttachment(threadKey, retry, file);
  }

  function confirmAttachment(attachment: ComposerAttachment) {
    setAttachments((current) => ({
      ...current,
      [threadKey]: (current[threadKey] ?? []).map((candidate) => candidate.id === attachment.id
        ? { ...candidate, status: "ready", error: null, needsConfirmation: false }
        : candidate),
    }));
  }

  async function removeAttachment(attachment: ComposerAttachment) {
    setAttachments((current) => ({ ...current, [threadKey]: (current[threadKey] ?? []).filter((candidate) => candidate.id !== attachment.id) }));
    if (attachment.previewUrl) {
      URL.revokeObjectURL?.(attachment.previewUrl);
      previewUrls.current.delete(attachment.previewUrl);
    }
    delete attachmentFiles.current[attachment.id];
    if (attachment.sourceId) {
      const result = await removeAssignmentSourceFile({ assignmentId, sourceId: attachment.sourceId });
      if (!result.ok) setMessage(result.error);
    }
  }

  const review = useCallback((focus: string, visibleQuestion = isUnitReview ? mathQuestion.trim() : question.trim()) => {
    const key = threadKey;
    const reviewedSnapshot = reviewSnapshot ? { ...reviewSnapshot } : {};
    if (!hasWork) {
      const text = "Add a little of your own work first, then Diana can review it.";
      setMessage(text);
      if (isUnitReview) {
        const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text, clientTurnId: crypto.randomUUID(), completionState: "complete" };
        updateMathThread(key, (current) => [...current, assistantMessage]);
        persistMathMessage(key, assistantMessage);
      }
      else setChatMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text }]);
      return;
    }
    if (visibleQuestion) {
      const turn = { id: crypto.randomUUID(), role: "student" as const, text: visibleQuestion, clientTurnId: crypto.randomUUID(), completionState: "complete" as const };
      if (isUnitReview) {
        updateMathThread(key, (current) => [...current, turn]);
        persistMathMessage(key, turn);
      }
      else setChatMessages((current) => [...current, turn]);
    }
    setMessage("Diana is reviewing your current work.");
    startReviewTransition(async () => {
      const response = await requestAssignmentReview({ assignmentId, template, focus, question: visibleQuestion, fields });
      if (!response.ok) {
        setMessage(response.error);
        if (isUnitReview) {
          const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: response.error, clientTurnId: crypto.randomUUID(), completionState: "complete" };
          updateMathThread(key, (current) => [...current, assistantMessage]);
          persistMathMessage(key, assistantMessage);
        }
        else setChatMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: response.error }]);
        return;
      }
      setSourceAnchors(response.sourceAnchors);
      if (isUnitReview) {
        setMathDrafts((current) => ({ ...current, [key]: "" }));
        const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: mathAssistantText(response.result), result: response.result, visualAid: response.result.visualAid, clientTurnId: crypto.randomUUID(), completionState: "complete" };
        updateMathThread(key, (current) => [...current, assistantMessage]);
        persistMathMessage(key, assistantMessage);
        const recorded = await onReviewed?.(reviewedSnapshot);
        if (recorded === false) {
          setMessage("Your work changed while Diana was reviewing. Review the latest version when you're ready.");
          return;
        }
      } else {
        setQuestion("");
        setChatMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: [response.result.nextMove, response.result.question].filter(Boolean).join("\n\n") || "Try one small next move, then send it back to me.", result: response.result }]);
      }
      setMessage("Review ready");
    });
  }, [assignmentId, fields, hasWork, isUnitReview, mathQuestion, onReviewed, persistMathMessage, question, reviewSnapshot, startReviewTransition, template, threadKey, updateMathThread]);

  async function requestMathStream(key: string, studentMessage: ChatMessage, conversationMessages: ChatMessage[]) {
    streamControllers.current[key]?.abort();
    const controller = new AbortController();
    streamControllers.current[key] = controller;
    const assistantId = `${studentMessage.id}-assistant`;
    const clientTurnId = studentMessage.clientTurnId ?? studentMessage.id;
    setStreamPhases((current) => ({ ...current, [key]: "thinking" }));
    setStreamErrors((current) => ({ ...current, [key]: "" }));
    setStreamEvidence((current) => ({ ...current, [key]: undefined }));
    setStreamProviderStates((current) => ({ ...current, [key]: undefined }));
    updateMathThread(key, (current) => current.filter((turn) => turn.id !== assistantId && !(turn.role === "assistant" && turn.clientTurnId === clientTurnId)));
    let streamedText = "";
    const keepInterruptedReply = () => {
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: streamedText || "The reply paused before it finished.",
        clientTurnId,
        completionState: "interrupted",
      };
      updateMathThread(key, (current) => {
        const without = current.filter((turn) => turn.id !== assistantId && !(turn.role === "assistant" && turn.clientTurnId === clientTurnId));
        return [...without, assistantMessage];
      });
      persistMathMessage(key, assistantMessage);
    };

    try {
      const source = fields.filter((field) => field.value.trim().length > 0).map((field) => `${field.label}: ${field.value}`).join("\n\n");
      const conversation = conversationMessages.slice(-10).map((turn) => ({ role: turn.role, text: turn.text }));
      const response = await fetch("/api/diana/study-buddy/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-idempotency-key": clientTurnId },
        signal: controller.signal,
        body: JSON.stringify({ assignmentId, mode: "guide", question: studentMessage.text, source, conversation }),
      });

      await readStudyStream(response, (event) => {
        if (event.type === "thinking") {
          setStreamPhases((current) => ({ ...current, [key]: "thinking" }));
          return;
        }
        if (event.type === "streaming") {
          streamedText += event.delta;
          setStreamPhases((current) => ({ ...current, [key]: "streaming" }));
          updateMathThread(key, (current) => {
            const without = current.filter((turn) => turn.id !== assistantId && !(turn.role === "assistant" && turn.clientTurnId === clientTurnId));
            return [...without, { id: assistantId, role: "assistant", text: streamedText, clientTurnId, completionState: "streaming" }];
          });
          return;
        }
        if (event.type === "complete") {
          const finalText = studyBuddyText(event.response) || streamedText || "Try the next small step, then tell me what you got.";
          const assistantMessage: ChatMessage = {
            id: assistantId,
            role: "assistant",
            text: finalText,
            visualAid: event.response.visualAid,
            clientTurnId,
            completionState: "complete",
            evidence: event.evidence,
            providerState: event.providerState,
          };
          updateMathThread(key, (current) => {
            const without = current.filter((turn) => turn.id !== assistantId && !(turn.role === "assistant" && turn.clientTurnId === clientTurnId));
            return [...without, assistantMessage];
          });
          persistMathMessage(key, assistantMessage);
          setStreamPhases((current) => ({ ...current, [key]: "complete" }));
          setStreamEvidence((current) => ({ ...current, [key]: event.evidence }));
          setStreamProviderStates((current) => ({ ...current, [key]: event.providerState }));
          return;
        }
        setStreamPhases((current) => ({ ...current, [key]: event.type }));
        setStreamErrors((current) => ({ ...current, [key]: event.error }));
        setStreamEvidence((current) => ({ ...current, [key]: event.evidence }));
        setStreamProviderStates((current) => ({ ...current, [key]: event.providerState }));
        keepInterruptedReply();
      });
    } catch (error) {
      const interrupted = error instanceof DOMException && error.name === "AbortError";
      setStreamPhases((current) => ({ ...current, [key]: interrupted ? "interrupted" : "retryable_error" }));
      setStreamErrors((current) => ({ ...current, [key]: interrupted ? "The reply stopped when you changed problems. Your message is still here." : "Diana was interrupted before the reply finished. Your message is still here." }));
      setStreamProviderStates((current) => ({
        ...current,
        [key]: resolveVisibleTutorProviderState({
          availability: "unavailable",
          reasonCode: interrupted ? "unknown" : "network",
          retryable: true,
        }),
      }));
      keepInterruptedReply();
    } finally {
      if (streamControllers.current[key] === controller) delete streamControllers.current[key];
    }
  }

  function submitMathQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const visibleQuestion = mathQuestion.trim();
    const readyAttachments = activeAttachments.filter((attachment) => attachment.status === "ready");
    if (!visibleQuestion && readyAttachments.length === 0) return;
    if (!hasProblemContext) {
      const text = "Add the problem first, then I can work it with you.";
      const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text, clientTurnId: crypto.randomUUID(), completionState: "complete" };
      updateMathThread(threadKey, (current) => [...current, assistantMessage]);
      persistMathMessage(threadKey, assistantMessage);
      return;
    }
    const clientTurnId = crypto.randomUUID();
    const studentMessage: ChatMessage = {
      id: clientTurnId,
      role: "student",
      text: visibleQuestion || "Use these attachments with the current problem.",
      attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
      clientTurnId,
      completionState: "complete",
    };
    const conversation = [...mathMessages, studentMessage];
    updateMathThread(threadKey, (current) => [...current, studentMessage]);
    persistMathMessage(threadKey, studentMessage);
    setMathDrafts((current) => ({ ...current, [threadKey]: "" }));
    setAttachments((current) => ({ ...current, [threadKey]: [] }));
    void requestMathStream(threadKey, studentMessage, conversation);
  }

  function retryLastReply() {
    const studentMessage = [...mathMessages].reverse().find((turn) => turn.role === "student");
    if (!studentMessage) return;
    const clientTurnId = studentMessage.clientTurnId ?? studentMessage.id;
    const conversation = mathMessages.filter((turn) => !(turn.role === "assistant" && turn.clientTurnId === clientTurnId));
    void requestMathStream(threadKey, studentMessage, conversation);
  }

  useEffect(() => {
    if (!isUnitReview) {
      lastMathReviewSignal.current = mathReviewSignal;
      return;
    }
    if (mathReviewSignal > 0 && mathReviewSignal !== lastMathReviewSignal.current) {
      lastMathReviewSignal.current = mathReviewSignal;
      review(actions.math[0]?.focus ?? "Review the current answer and work, then give one helpful next move.", "");
    }
  }, [isUnitReview, mathReviewSignal, review]);

  useEffect(() => {
    if (!isUnitReview) return;
    const queued = readProblemMessageQueue(assignmentId);
    if (queued.length > 0) {
      setMathThreads((current) => {
        const next = { ...current };
        for (const queuedMessage of queued) {
          const key = queuedMessage.payload.problemId;
          next[key] = mergeChatMessage(next[key] ?? [], queuedChatMessage(queuedMessage));
        }
        return next;
      });
      setStreamPhases((current) => {
        const next = { ...current };
        for (const queuedMessage of queued) {
          if (queuedMessage.payload.role !== "assistant") continue;
          next[queuedMessage.payload.problemId] = queuedMessage.payload.completionState === "complete" ? "complete" : "interrupted";
        }
        return next;
      });
      setStreamErrors((current) => {
        const next = { ...current };
        for (const queuedMessage of queued) {
          if (queuedMessage.payload.role !== "assistant") continue;
          if (queuedMessage.payload.completionState === "complete") delete next[queuedMessage.payload.problemId];
          else next[queuedMessage.payload.problemId] = INTERRUPTED_CHAT_MESSAGE;
        }
        return next;
      });
      if (!window.navigator.onLine) {
        syncNotice.current = OFFLINE_CHAT_MESSAGE;
        setMessage(OFFLINE_CHAT_MESSAGE);
      }
    }
    if (window.navigator.onLine) void flushProblemMessageQueue();
    const onOnline = () => void flushProblemMessageQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [assignmentId, flushProblemMessageQueue, isUnitReview]);

  useEffect(() => {
    if (typeof feedEndRef.current?.scrollIntoView === "function") {
      feedEndRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [mathMessages.length, streamPhase, chatMessages.length]);

  useEffect(() => () => {
    streamControllers.current[threadKey]?.abort();
  }, [threadKey]);

  useEffect(() => () => {
    for (const url of previewUrls.current) URL.revokeObjectURL?.(url);
  }, []);

  if (isUnitReview) {
    return (
      <aside id="ask-diana" className="sd-assignment-diana-chat" aria-label="Ask Diana">
        <div className="sd-assignment-diana-chat-feed" role="region" aria-label="Diana conversation" aria-live="polite" tabIndex={0}>
          {displayMathMessages.length === 0 ? (
            <p className="sd-assignment-diana-empty">Ask Diana when you want a hint.</p>
          ) : null}
          {displayMathMessages.map((chatMessage) => (
            <article key={chatMessage.id} className="sd-assignment-diana-message" data-role={chatMessage.role}>
              {chatMessage.providerState?.visible ? (
                <div className="sd-assignment-diana-status" role="status" data-provider-availability={chatMessage.providerState.availability}>
                  <strong>{chatMessage.providerState.title}</strong>
                  <span>{chatMessage.providerState.message}</span>
                </div>
              ) : null}
              <p>{chatMessage.text}</p>
              {chatMessage.attachments?.map((attachment) => <AttachmentCard key={attachment.id} attachment={attachment} />)}
              {chatMessage.result ? <MathCoachVisual visualAid={chatMessage.result.visualAid} /> : chatMessage.visualAid ? <MathCoachVisual visualAid={chatMessage.visualAid} /> : null}
              {chatMessage.evidence ? (
                <small data-verification-level={chatMessage.evidence.verificationLevel}>
                  {tutorResponseEvidenceLabel(chatMessage.evidence)}
                </small>
              ) : null}
            </article>
          ))}
          {streamPhase === "thinking" || reviewPending ? <article className="sd-assignment-diana-message sd-assignment-diana-thinking" data-role="assistant"><span /><span /><span /><p className="sr-only">Diana is thinking</p></article> : null}
          <div ref={feedEndRef} />
        </div>
        {(streamPhase === "interrupted" || streamPhase === "retryable_error") ? (
          <div className="sd-assignment-chat-retry" role="status" data-provider-availability={currentProviderState?.availability}>
            {currentProviderState?.visible ? <strong>{currentProviderState.title}</strong> : null}
            <span>{currentProviderState?.visible ? currentProviderState.message : streamError}</span>
            {currentStreamEvidence ? (
              <small data-verification-level={currentStreamEvidence.verificationLevel}>
                {tutorResponseEvidenceLabel(currentStreamEvidence)}
              </small>
            ) : null}
            <button type="button" onClick={retryLastReply}><RotateCcw size={17} aria-hidden="true" /> Retry reply</button>
          </div>
        ) : null}
        {reviewed ? (
          <div className="sd-assignment-review-transition" aria-label="Problem review actions">
            {done ? (
              hasNextProblem ? <button type="button" data-primary="true" onClick={onNextProblem}>Next problem</button> : showSubmissionAction ? <button type="button" data-primary="true" onClick={onReviewSubmission}>Review submission</button> : null
            ) : (
              <><button type="button" onClick={() => document.getElementById("assignment-work-entry")?.focus()}>Keep working</button><button type="button" data-primary="true" onClick={onMarkDone}>Mark problem done</button></>
            )}
          </div>
        ) : null}
        {message && !busy && message !== "Review ready" ? <p className="sd-assignment-diana-status" role="status">{message}</p> : null}
        {activeAttachments.length > 0 ? <div className="sd-assignment-composer-attachments">{activeAttachments.map((attachment) => <AttachmentCard key={attachment.id} attachment={attachment} removable onRemove={() => void removeAttachment(attachment)} onRetry={() => void retryAttachment(attachment)} onConfirm={() => confirmAttachment(attachment)} />)}</div> : null}
        <form className="sd-assignment-diana-chat-input" onSubmit={submitMathQuestion}>
          <VoiceTextarea
            value={mathQuestion}
            onChange={(event) => setMathQuestion(event.target.value)}
            onInput={growComposer}
            onKeyDown={handleComposerKeyDown}
            onTranscript={(transcript) => setMathQuestion([mathQuestion, transcript].filter(Boolean).join(" ").trim())}
            provider="openai"
            dictationLabel="Dictate message"
            placeholder="Message Diana"
            aria-label="Message Diana"
            rows={2}
          />
          <input ref={photoInputRef} type="file" accept="image/*,.pdf" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => { const remaining = Math.max(0, 4 - activeAttachments.length); Array.from(event.target.files ?? []).slice(0, remaining).forEach(attachPhoto); event.currentTarget.value = ""; }} />
          <button type="button" className="sd-assignment-diana-upload" disabled={busy || activeAttachments.length >= 4} onClick={() => photoInputRef.current?.click()} aria-label="Upload images or PDFs" title="Upload images or PDFs"><Plus size={21} aria-hidden="true" /></button>
          <AssignmentRealtimeTutor assignmentId={assignmentId} fields={fields} sessionKey={threadKey} compact />
          <button type="submit" className="sd-assignment-diana-send" disabled={busy || activeAttachments.some((attachment) => attachment.status === "uploading") || (!mathQuestion.trim() && !activeAttachments.some((attachment) => attachment.status === "ready"))} aria-label="Send message" title="Send message"><Send size={21} aria-hidden="true" /></button>
        </form>
      </aside>
    );
  }

  return (
    <aside id="ask-diana" className="sd-assignment-diana-chat sd-assignment-diana-chat--rail" aria-label="Ask Diana" aria-live="polite">
      <div className="sd-assignment-diana-chat-feed" role="region" aria-label="Diana conversation" tabIndex={0}>
        {chatMessages.map((chatMessage) => <article key={chatMessage.id} className="sd-assignment-diana-message" data-role={chatMessage.role}><p>{chatMessage.text}</p>{chatMessage.result ? <MathCoachVisual visualAid={chatMessage.result.visualAid} /> : null}</article>)}
      </div>
      {message && !reviewPending ? <p className="sd-assignment-diana-status">{message}</p> : null}
      <div className="sd-assignment-diana-quick-actions">{actions[template].map((action) => <button key={action.label} type="button" disabled={reviewPending} onClick={() => review(action.focus)}>{action.label}</button>)}</div>
      <form className="sd-assignment-diana-chat-input" onSubmit={(event) => { event.preventDefault(); review(question.trim() || "Answer the student's question using their current work."); }}>
        <VoiceTextarea value={question} onChange={(event) => setQuestion(event.target.value)} onInput={growComposer} onKeyDown={handleComposerKeyDown} onTranscript={(transcript) => setQuestion((current) => [current, transcript].filter(Boolean).join(" ").trim())} provider="openai" dictationLabel="Dictate message" placeholder="Message Diana" aria-label="Message Diana" rows={2} />
        <button type="submit" className="sd-assignment-diana-send" disabled={reviewPending || !question.trim()} aria-label="Send message" title="Send message"><Send size={21} aria-hidden="true" /></button>
      </form>
      {sourceAnchors.length > 0 ? <p className="sd-assignment-diana-source-line">Sources checked: {sourceAnchors.join("; ")}</p> : null}
    </aside>
  );
}
