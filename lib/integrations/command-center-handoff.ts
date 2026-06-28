import {
  createGstackEngineeringRequest,
  type ArtifactRef,
  type WorkRequest,
} from "./command-center-contract";

export type IntegrationPhase = {
  id: string;
  title: string;
  owner: "diana" | "paperclip" | "openjarvis" | "gstack";
  outcome: string;
  exitCriteria: readonly string[];
};

export const COMMAND_CENTER_ROADMAP: readonly IntegrationPhase[] = [
  {
    id: "phase-1-contracts",
    title: "Contracts and boundaries",
    owner: "diana",
    outcome: "Diana defines the shared work request, result, artifact, and student-runtime guard model.",
    exitCriteria: [
      "Typed work request and result contract exists.",
      "Student-runtime boundary checks are tested.",
      "Architecture docs describe Paperclip, OpenJarvis, gstack, and Diana ownership.",
    ],
  },
  {
    id: "phase-2-paperclip-gstack",
    title: "Paperclip to gstack engineering handoff",
    owner: "paperclip",
    outcome: "Paperclip can create a read-only gstack work request for Diana QA or review.",
    exitCriteria: [
      "A repeatable handoff generator emits JSON.",
      "The request is engineering-mode and read-only by default.",
      "The request forbids Diana student data.",
    ],
  },
  {
    id: "phase-3-openjarvis-readonly",
    title: "OpenJarvis read-only Diana sidecar",
    owner: "openjarvis",
    outcome: "A student can type or speak locally while Diana remains the academic policy gate.",
    exitCriteria: [
      "OpenJarvis uses only approved Diana tools.",
      "No direct Supabase access exists in the sidecar.",
      "Diana receives transcripts and tool calls for logging.",
    ],
  },
  {
    id: "phase-4-openjarvis-safe-writes",
    title: "OpenJarvis narrow write tools",
    owner: "diana",
    outcome: "The sidecar can save notes or reminders through Diana APIs after explicit user action.",
    exitCriteria: [
      "Write tools are limited to create_reminder and save_student_note.",
      "Diana validates auth, policy, and data shape.",
      "All sidecar writes produce Diana-side audit records.",
    ],
  },
  {
    id: "phase-5-operations",
    title: "Operational agent governance",
    owner: "paperclip",
    outcome: "Paperclip tracks recurring QA, canary, research, and support workflows without entering student runtime.",
    exitCriteria: [
      "Paperclip stores run status, cost, logs, and artifacts.",
      "gstack remains the engineering/browser worker.",
      "OpenJarvis remains optional for local/private execution.",
    ],
  },
] as const;

export function currentIntegrationPhase(): IntegrationPhase {
  return COMMAND_CENTER_ROADMAP[1];
}

export function dianaDashboardQaArtifacts(): readonly ArtifactRef[] {
  return [
    {
      kind: "url",
      uri: "diana://route/dashboard",
      title: "Diana dashboard route",
      sensitivity: "internal",
    },
    {
      kind: "document",
      uri: "repo://docs/architecture/command-center-integration.md",
      title: "Command center integration boundary",
      sensitivity: "internal",
    },
    {
      kind: "document",
      uri: "repo://LOGIC_MANIFEST.md",
      title: "Diana protected logic manifest",
      sensitivity: "internal",
    },
  ];
}

export function createPaperclipGstackDashboardQaRequest(input: {
  id: string;
  goalId: string;
  readOnly?: boolean;
}): WorkRequest {
  return createGstackEngineeringRequest({
    id: input.id,
    goalId: input.goalId,
    title: "Run Diana dashboard QA through gstack",
    task: [
      "Use gstack engineering and browser automation to review the Diana dashboard.",
      "Check calm-tone copy, responsive layout, obvious console/runtime errors, and command-center boundary drift.",
      "Return a report with screenshots or logs as artifacts when available.",
      "Do not access or mutate Diana student records.",
    ].join(" "),
    inputs: dianaDashboardQaArtifacts(),
    readOnly: input.readOnly ?? true,
    maxBudgetCents: 250,
  });
}

export function formatWorkRequestForPaperclip(request: WorkRequest): string {
  return `${JSON.stringify(request, null, 2)}\n`;
}
