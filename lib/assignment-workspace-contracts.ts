import type { StudyHelperResult } from "@/lib/integrations/diana-study-helper-sidecar";
import type { TutorResponseEvidence } from "@/lib/ai/tutor-response-evidence";
import type { VisibleTutorProviderState } from "@/lib/assignment-help/provider-state";
import type { CanonicalRenderDocument } from "@/lib/specialist-artifacts/render-blocks";

export type ProblemProgressStatus = "not_started" | "in_progress" | "done";

export type ProblemProgressView = "not_started" | "working" | "reviewed" | "done";

export type AssignmentDraftState =
  | "idle"
  | "saving"
  | "synced"
  | "local_only"
  | "retryable_error"
  | "session_expired";

export type WorkspaceFeedbackState = "empty" | "loading" | "ready" | "needs_attention";

export type WorkspaceFeedbackTarget =
  | "problem"
  | "chat"
  | "work"
  | "save"
  | "attachment"
  | "source"
  | "timer"
  | "voice"
  | "submission";

export type WorkspaceFeedback = {
  state: WorkspaceFeedbackState;
  cause: string;
  recoveryLabel: string | null;
  target: WorkspaceFeedbackTarget;
  retryKey: string | null;
  retryHandler: (() => void) | null;
};

export type AssignmentPaperStyle = "blank" | "lined" | "graph";

export type AssignmentWorkspacePreference = {
  problemId: string;
  paperStyle: AssignmentPaperStyle;
  workHeight: number;
};

export type StudyBuddyRouteSuccess = {
  ok: true;
  response: StudyHelperResult;
  evidence: TutorResponseEvidence;
  providerState: VisibleTutorProviderState;
};

export type StudyBuddyRouteFailure = {
  ok: false;
  error: string;
  evidence?: TutorResponseEvidence;
  providerState?: VisibleTutorProviderState;
};

export type StudyBuddyRouteResponse = StudyBuddyRouteSuccess | StudyBuddyRouteFailure;

export type StudyBuddyStreamEvent =
  | { type: "thinking" }
  | { type: "streaming"; delta: string }
  | {
      type: "complete";
      response: StudyHelperResult;
      evidence: TutorResponseEvidence;
      providerState: VisibleTutorProviderState;
    }
  | {
      type: "interrupted";
      error: string;
      evidence?: TutorResponseEvidence;
      providerState?: VisibleTutorProviderState;
    }
  | {
      type: "retryable_error";
      error: string;
      retryAfterMs?: number;
      evidence?: TutorResponseEvidence;
      providerState?: VisibleTutorProviderState;
    };

export type AssignmentRealtimePhase =
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "reconnecting"
  | "stopped"
  | "retry";

export type ChatAttachmentStatus = "uploading" | "ready" | "needs_attention";

export type ChatAttachment = {
  id: string;
  sourceId: string | null;
  name: string;
  mimeType: string;
  previewUrl: string | null;
  status: ChatAttachmentStatus;
  error: string | null;
};

export type AssignmentProblemMessage = {
  id: string;
  problemId: string;
  role: "assistant" | "student";
  content: string;
  attachments: ChatAttachment[];
  visualAid: Record<string, unknown> | null;
  completionState: "streaming" | "complete" | "interrupted";
  clientTurnId: string;
  createdAt: string;
};

export type AssignmentFocusPhase =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "completed"
  | "retryable_error";

export type AssignmentFocusSnapshot = {
  assignmentId: string;
  clientSessionId: string | null;
  serverSessionId: number | null;
  startedAt: string | null;
  targetEndsAt: string | null;
  phase: AssignmentFocusPhase;
};

export type StructuredEquationColumn = "left_term" | "left_constant" | "relation" | "right_term";

export type StructuredEquationCell = {
  column: StructuredEquationColumn;
  value: string;
};

export type StructuredEquationRow = {
  kind: "equation" | "operation" | "divider";
  cells: StructuredEquationCell[];
};

export type AssignmentSubmissionPreview = {
  assignmentId: string;
  assignmentTitle: string;
  payloadDigest: string | null;
  destination: string;
  submissionType: "text" | "file" | "external_handoff";
  fileName: string | null;
  textPayload: string;
  universalTextPayload?: string;
  specialistRenderDocument?: CanonicalRenderDocument;
  problems: Array<{
    id: string;
    number: number;
    prompt: string;
    typedWork: string;
    inkData: string;
    complete: boolean;
  }>;
  incompleteProblemNumbers: number[];
};
