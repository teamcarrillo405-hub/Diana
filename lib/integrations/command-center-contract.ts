export type CommandCenterSystem = "diana" | "paperclip" | "openjarvis" | "gstack";

export type WorkerKind =
  | "openjarvis"
  | "gstack"
  | "codex"
  | "claude_code"
  | "cursor"
  | "bash"
  | "http"
  | "openclaw";

export type DianaPolicyMode = "student_runtime" | "internal_ops" | "engineering";

export type ArtifactSensitivity =
  | "public"
  | "internal"
  | "student_private"
  | "student_education_record";

export type ArtifactRef = {
  kind:
    | "data"
    | "diff"
    | "document"
    | "log"
    | "report"
    | "run"
    | "screenshot"
    | "transcript"
    | "url";
  uri: string;
  title?: string;
  sensitivity: ArtifactSensitivity;
};

export type WorkConstraints = {
  policyMode: DianaPolicyMode;
  readOnly: boolean;
  privateLocalOnly?: boolean;
  approvalRequired?: boolean;
  allowedDianaTools?: readonly DianaToolName[];
  maxBudgetCents?: number;
};

export type WorkRequest = {
  id: string;
  goalId: string;
  sourceSystem: CommandCenterSystem;
  targetSystem: CommandCenterSystem;
  worker: WorkerKind;
  title: string;
  task: string;
  inputs: readonly ArtifactRef[];
  constraints: WorkConstraints;
  acceptanceGates: readonly string[];
};

export type WorkResult = {
  requestId: string;
  status: "succeeded" | "blocked" | "needs_approval" | "error";
  summary: string;
  artifacts: readonly ArtifactRef[];
  metrics?: {
    tokens?: number;
    costCents?: number;
    durationMs?: number;
  };
};

export type DianaToolName =
  | "ask_diana_for_hint"
  | "create_reminder"
  | "get_next_assignment"
  | "read_due_today"
  | "save_student_note"
  | "start_focus_session"
  | "transcribe_voice_note";

export type IntegrationLayerDefinition = {
  system: CommandCenterSystem | "integration";
  role: string;
  owns: readonly string[];
  doesNotOwn: readonly string[];
  primaryInterfaces: readonly ("http" | "mcp" | "cli" | "script")[];
};

export const COMMAND_CENTER_LAYERS: readonly IntegrationLayerDefinition[] = [
  {
    system: "paperclip",
    role: "Command center and control plane for agent teams.",
    owns: [
      "goals",
      "agent roles",
      "tickets",
      "approvals",
      "budgets",
      "heartbeats",
      "run records",
      "audit logs",
    ],
    doesNotOwn: [
      "Diana student runtime",
      "Diana product database",
      "OpenJarvis local memory",
      "gstack engineering command behavior",
    ],
    primaryInterfaces: ["http", "mcp"],
  },
  {
    system: "openjarvis",
    role: "Local AI worker layer for private or low-cost personal execution.",
    owns: [
      "local model routing",
      "local chat",
      "local speech workflows",
      "local memory",
      "scheduled local workflows",
    ],
    doesNotOwn: [
      "Diana safety policy",
      "Diana authorship records",
      "Paperclip governance",
      "student data writes without Diana APIs",
    ],
    primaryInterfaces: ["http", "cli"],
  },
  {
    system: "gstack",
    role: "Engineering and browser automation layer for building Diana.",
    owns: [
      "planning review",
      "engineering review",
      "design review",
      "browser QA",
      "release checks",
      "canary checks",
    ],
    doesNotOwn: [
      "business orchestration",
      "student conversations",
      "Diana product data",
      "OpenJarvis local runtime",
    ],
    primaryInterfaces: ["cli", "script"],
  },
  {
    system: "diana",
    role: "Student product runtime and safety gate.",
    owns: [
      "student experience",
      "assignments",
      "classes",
      "AI traffic light policy",
      "authorship logging",
      "minor safety",
      "parent and school privacy boundaries",
    ],
    doesNotOwn: [
      "Paperclip agent org charts",
      "OpenJarvis local model host",
      "gstack software factory workflows",
    ],
    primaryInterfaces: ["http"],
  },
  {
    system: "integration",
    role: "Thin contracts between systems.",
    owns: ["work requests", "work results", "artifact references", "handoff constraints"],
    doesNotOwn: ["agent reasoning", "student policy decisions", "product persistence"],
    primaryInterfaces: ["http", "mcp", "cli", "script"],
  },
] as const;

export const STUDENT_RUNTIME_READ_TOOLS: readonly DianaToolName[] = [
  "ask_diana_for_hint",
  "get_next_assignment",
  "read_due_today",
  "transcribe_voice_note",
] as const;

export const STUDENT_RUNTIME_WRITE_TOOLS: readonly DianaToolName[] = [
  "create_reminder",
  "save_student_note",
  "start_focus_session",
] as const;

export function createGstackEngineeringRequest(input: {
  id: string;
  goalId: string;
  title: string;
  task: string;
  inputs?: readonly ArtifactRef[];
  readOnly?: boolean;
  maxBudgetCents?: number;
}): WorkRequest {
  return {
    id: input.id,
    goalId: input.goalId,
    sourceSystem: "paperclip",
    targetSystem: "gstack",
    worker: "gstack",
    title: input.title,
    task: input.task,
    inputs: input.inputs ?? [],
    constraints: {
      policyMode: "engineering",
      readOnly: input.readOnly ?? true,
      approvalRequired: input.readOnly === false,
      maxBudgetCents: input.maxBudgetCents,
    },
    acceptanceGates: [
      "Report changed files or confirm read-only work.",
      "Return screenshots, logs, or command output as artifacts when available.",
      "Do not touch Diana student data.",
    ],
  };
}

export function createOpenJarvisSidecarRequest(input: {
  id: string;
  goalId: string;
  title: string;
  task: string;
  inputs?: readonly ArtifactRef[];
  allowedDianaTools?: readonly DianaToolName[];
  readOnly?: boolean;
}): WorkRequest {
  const allowedTools = input.allowedDianaTools ?? STUDENT_RUNTIME_READ_TOOLS;
  return {
    id: input.id,
    goalId: input.goalId,
    sourceSystem: "diana",
    targetSystem: "openjarvis",
    worker: "openjarvis",
    title: input.title,
    task: input.task,
    inputs: input.inputs ?? [],
    constraints: {
      policyMode: "student_runtime",
      readOnly: input.readOnly ?? true,
      privateLocalOnly: true,
      approvalRequired: true,
      allowedDianaTools: allowedTools,
    },
    acceptanceGates: [
      "Use Diana APIs for academic context and policy decisions.",
      "Do not access Supabase directly.",
      "Return transcripts or tool calls as artifacts for Diana-side logging.",
    ],
  };
}

export function requestTouchesStudentData(request: Pick<WorkRequest, "inputs" | "constraints">): boolean {
  return (
    request.constraints.policyMode === "student_runtime" ||
    request.inputs.some((artifact) =>
      artifact.sensitivity === "student_private" ||
      artifact.sensitivity === "student_education_record"
    )
  );
}

export function studentRuntimeBoundaryIssues(request: WorkRequest): string[] {
  const issues: string[] = [];
  const touchesStudentData = requestTouchesStudentData(request);

  if (!touchesStudentData) return issues;

  if (request.sourceSystem !== "diana") {
    issues.push("Student-runtime work must originate from Diana.");
  }
  if (request.constraints.policyMode !== "student_runtime") {
    issues.push("Student data requires student_runtime policy mode.");
  }
  if (request.worker === "openjarvis" && request.constraints.privateLocalOnly !== true) {
    issues.push("OpenJarvis student work must be privateLocalOnly.");
  }
  if (request.worker === "openjarvis" && !request.constraints.allowedDianaTools?.length) {
    issues.push("OpenJarvis student work must use explicit Diana tools.");
  }
  if (!request.constraints.approvalRequired) {
    issues.push("Student-runtime sidecar work requires approval.");
  }
  return issues;
}

export function isSafeStudentRuntimeRequest(request: WorkRequest): boolean {
  return studentRuntimeBoundaryIssues(request).length === 0;
}
