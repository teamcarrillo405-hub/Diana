import type { AssignmentKind } from "@/lib/supabase/types";

export const WORKSPACE_MODES = [
  "math",
  "worksheet",
  "writing",
  "research",
  "history",
  "lab",
  "reading",
  "language",
  "coding",
  "art",
  "project",
  "handoff",
] as const;

export type AssignmentWorkspaceMode = (typeof WORKSPACE_MODES)[number];

export type WorkspaceInput = {
  kind: AssignmentKind;
  className?: string | null;
  title?: string | null;
  description?: string | null;
  rubric?: string | null;
  sourceText?: string | null;
  workProfile?: unknown;
  workProfileSource?: unknown;
};

export type WorkspaceProfileSource =
  | "student_selected"
  | "persisted"
  | "assignment_kind"
  | "weighted_context"
  | "fallback";

export type WorkspaceClassification = {
  mode: AssignmentWorkspaceMode;
  confidence: number;
  reasons: string[];
  source: WorkspaceProfileSource;
};

export type PersistedWorkspaceProfile = {
  mode?: unknown;
  source?: unknown;
};

type WorkspaceSignal = {
  pattern: RegExp;
  weight: number;
  reason: string;
};

export type WorkspaceModeDefinition = {
  mode: AssignmentWorkspaceMode;
  label: string;
  firstMove: string;
  assignmentKinds: readonly AssignmentKind[];
  signals: readonly WorkspaceSignal[];
};

const signal = (pattern: RegExp, weight: number, reason: string): WorkspaceSignal => ({
  pattern,
  weight,
  reason,
});

export const WORKSPACE_MODE_REGISTRY = {
  math: {
    mode: "math",
    label: "Math problems",
    firstMove: "Read problem 1 and write the information you know.",
    assignmentKinds: ["problem_set"],
    signals: [
      signal(/\b(algebra|geometry|calculus|trigonometry|statistics|arithmetic)\b/iu, 5, "math subject"),
      signal(/\b(equation|inequality|solve for|factor|quadratic|polynomial|function)\b/iu, 4, "math operation"),
      signal(/\bmath(?:ematics)?\b/iu, 3, "math"),
    ],
  },
  worksheet: {
    mode: "worksheet",
    label: "Worksheet",
    firstMove: "Read the first question and write what it is asking you to do.",
    assignmentKinds: [],
    signals: [
      signal(/\b(worksheet|problem set|practice sheet|question set)\b/iu, 5, "worksheet format"),
      signal(/\b(complete|answer)\s+(?:all\s+)?(?:the\s+)?(?:following\s+)?questions?\b/iu, 4, "question set"),
      signal(/\bquestions?\s*(?:1|one)\s*(?:-|through|to)\s*\d+\b/iu, 4, "numbered questions"),
    ],
  },
  writing: {
    mode: "writing",
    label: "Writing document",
    firstMove: "Write one working claim in your own words.",
    assignmentKinds: ["essay"],
    signals: [
      signal(/\b(essay|personal statement|written response|composition)\b/iu, 5, "writing deliverable"),
      signal(/\b(thesis|rhetorical analysis|argumentative|persuasive)\b/iu, 4, "writing structure"),
      signal(/\b(draft|paragraph|compose|writing)\b/iu, 2.5, "writing task"),
    ],
  },
  research: {
    mode: "research",
    label: "Research organizer",
    firstMove: "Choose the first source and note one useful fact with its citation.",
    assignmentKinds: [],
    signals: [
      signal(/\b(annotated bibliography|works cited|literature review|research paper)\b/iu, 6, "research deliverable"),
      signal(/\b(research|bibliography|citation|cite sources?)\b/iu, 4, "research process"),
      signal(/\b(primary|secondary|credible)\s+sources?\b/iu, 3, "source evaluation"),
    ],
  },
  history: {
    mode: "history",
    label: "History and DBQ",
    firstMove: "Read the first source and state what it says before interpreting it.",
    assignmentKinds: [],
    signals: [
      signal(/\b(dbq|document[- ]based question|historical argument)\b/iu, 6, "history source analysis"),
      signal(/\b(history|historical|civics|government|social studies)\b/iu, 3.5, "history subject"),
      signal(/\b(primary source|source analysis)\b/iu, 3, "document analysis"),
    ],
  },
  lab: {
    mode: "lab",
    label: "Lab sheet",
    firstMove: "Write the question or purpose of the investigation.",
    assignmentKinds: ["lab"],
    signals: [
      signal(/\b(lab report|laboratory|experiment|investigation)\b/iu, 6, "lab format"),
      signal(/\b(hypothesis|procedure|observations?|data analysis|independent variable|dependent variable)\b/iu, 4, "scientific method"),
      signal(/\b(biology|chemistry|physics|environmental science|earth science)\b/iu, 3, "science subject"),
      signal(/\bscience\b/iu, 2, "science"),
    ],
  },
  reading: {
    mode: "reading",
    label: "Reading response",
    firstMove: "Read the first section and capture one important idea in your own words.",
    assignmentKinds: ["reading"],
    signals: [
      signal(/\b(close read|reading response|reading log|textual analysis)\b/iu, 6, "reading deliverable"),
      signal(/\b(read|reading|novel|chapter|article|passage)\b/iu, 3.5, "assigned reading"),
      signal(/\b(annotate|annotation|text evidence)\b/iu, 3, "reading analysis"),
    ],
  },
  language: {
    mode: "language",
    label: "Language practice",
    firstMove: "Start with one word, sentence, or prompt and add your own attempt.",
    assignmentKinds: [],
    signals: [
      signal(/\b(spanish|french|german|italian|mandarin|latin|world language)\b/iu, 5, "language subject"),
      signal(/\b(conjugat\w*|translat\w*|vocabulary|pronunciation)\b/iu, 4, "language practice"),
      signal(/\b(oral|speaking|listening)\s+(?:practice|assessment|response|prompt)\b/iu, 3, "spoken language task"),
    ],
  },
  coding: {
    mode: "coding",
    label: "Code workspace",
    firstMove: "Describe the input, expected output, and your first small test.",
    assignmentKinds: [],
    signals: [
      signal(/\b(computer science|software engineering|programming assignment)\b/iu, 6, "computer science subject"),
      signal(/\b(python|javascript|typescript|java|html|css|sql|react)\b/iu, 5, "programming language"),
      signal(/\b(code|coding|program|debug|repository|algorithm|pseudocode)\b/iu, 3.5, "coding task"),
    ],
  },
  art: {
    mode: "art",
    label: "Art and design board",
    firstMove: "List the required deliverable and make the first study or draft note.",
    assignmentKinds: [],
    signals: [
      signal(/\b(artist statement|portfolio critique|design critique|studio art)\b/iu, 6, "arts deliverable"),
      signal(/\b(drawing|painting|sculpture|sketch|illustration|photography)\b/iu, 4, "visual art"),
      signal(/\b(art|design|music|performance|rehearsal|visual)\b/iu, 2.5, "arts subject"),
    ],
  },
  project: {
    mode: "project",
    label: "Project board",
    firstMove: "List the first deliverable you need to make.",
    assignmentKinds: ["presentation"],
    signals: [
      signal(/\b(presentation|slideshow|poster|prototype)\b/iu, 5, "project deliverable"),
      signal(/\b(capstone|group project|final project)\b/iu, 5, "project format"),
      signal(/\b(project|deliverables?|milestone|build plan)\b/iu, 3, "project work"),
    ],
  },
  handoff: {
    mode: "handoff",
    label: "Assignment response",
    firstMove: "Read the assignment directions and write what you need to turn in.",
    assignmentKinds: [],
    signals: [
      signal(/\b(permission slip|signed form|bring to class|turn in|hand in)\b/iu, 5, "hand-in task"),
      signal(/\b(upload|submit|attach)\s+(?:the\s+)?(?:file|document|form|photo)\b/iu, 4, "delivery task"),
    ],
  },
} as const satisfies Record<AssignmentWorkspaceMode, WorkspaceModeDefinition>;

const FIELD_WEIGHTS = {
  className: 1,
  title: 2.25,
  description: 1.5,
  rubric: 1.15,
  sourceText: 0.75,
} as const;

const PROFILE_SOURCES: readonly WorkspaceProfileSource[] = [
  "student_selected",
  "persisted",
  "assignment_kind",
  "weighted_context",
  "fallback",
];

function parseProfileSource(value: unknown): WorkspaceProfileSource {
  return typeof value === "string" && PROFILE_SOURCES.includes(value as WorkspaceProfileSource)
    ? value as WorkspaceProfileSource
    : "persisted";
}

function confidenceForPersistedSource(source: WorkspaceProfileSource): number {
  if (source === "student_selected") return 1;
  if (source === "assignment_kind") return 0.98;
  if (source === "weighted_context") return 0.9;
  if (source === "fallback") return 0.35;
  return 0.95;
}

function persistedClassification(modeValue: unknown, sourceValue: unknown): WorkspaceClassification | null {
  const mode = parseWorkspaceMode(modeValue);
  if (!mode) return null;
  const source = parseProfileSource(sourceValue);
  return {
    mode,
    confidence: confidenceForPersistedSource(source),
    reasons: [`Using the saved ${WORKSPACE_MODE_REGISTRY[mode].label.toLowerCase()} work profile.`],
    source,
  };
}

function clampConfidence(value: number): number {
  return Math.round(Math.min(0.97, Math.max(0, value)) * 100) / 100;
}

export function classifyWorkspaceMode(
  input: WorkspaceInput,
  persisted: PersistedWorkspaceProfile = {},
): WorkspaceClassification {
  const saved = persistedClassification(
    persisted.mode ?? input.workProfile,
    persisted.source ?? input.workProfileSource,
  );
  if (saved) return saved;

  const evidence = new Map<AssignmentWorkspaceMode, Array<{ score: number; reason: string }>>();
  for (const mode of WORKSPACE_MODES) {
    const matches: Array<{ score: number; reason: string }> = (WORKSPACE_MODE_REGISTRY[mode].assignmentKinds as readonly AssignmentKind[]).includes(input.kind)
      ? [{ score: 17, reason: `assignment kind "${input.kind}"` }]
      : [];
    for (const [field, fieldWeight] of Object.entries(FIELD_WEIGHTS) as Array<
      [keyof typeof FIELD_WEIGHTS, number]
    >) {
      const value = input[field];
      if (typeof value !== "string" || !value.trim()) continue;
      for (const candidate of WORKSPACE_MODE_REGISTRY[mode].signals) {
        if (!candidate.pattern.test(value)) continue;
        matches.push({
          score: candidate.weight * fieldWeight,
          reason: `${candidate.reason} matched in ${field}`,
        });
      }
    }
    evidence.set(mode, matches);
  }

  const ranked = WORKSPACE_MODES
    .map((mode, registryIndex) => ({
      mode,
      registryIndex,
      reasons: evidence.get(mode) ?? [],
      score: (evidence.get(mode) ?? []).reduce((total, item) => total + item.score, 0),
    }))
    .sort((left, right) => right.score - left.score || left.registryIndex - right.registryIndex);
  const winner = ranked[0];
  if (!winner || winner.score === 0) {
    return {
      mode: "handoff",
      confidence: 0.25,
      reasons: ["No supported work-profile signals were found; use the general assignment response."],
      source: "fallback",
    };
  }

  const runnerUpScore = ranked[1]?.score ?? 0;
  const strength = Math.min(1, winner.score / 14);
  const separation = (winner.score - runnerUpScore) / winner.score;
  const kindScore = winner.reasons
    .filter((reason) => reason.reason.startsWith("assignment kind"))
    .reduce((total, reason) => total + reason.score, 0);
  const source: WorkspaceProfileSource = kindScore > 0 && kindScore / winner.score >= 0.55
    ? "assignment_kind"
    : "weighted_context";
  return {
    mode: winner.mode,
    confidence: source === "assignment_kind" ? 0.98 : clampConfidence(0.5 + strength * 0.3 + Math.max(0, separation) * 0.17),
    reasons: winner.reasons
      .sort((left, right) => right.score - left.score)
      .slice(0, 5)
      .map((item) => item.reason),
    source,
  };
}

export const classifyAssignmentWorkProfile = classifyWorkspaceMode;

export function selectedWorkspaceProfile(mode: AssignmentWorkspaceMode): WorkspaceClassification {
  return {
    mode,
    confidence: 1,
    reasons: [`The student selected ${WORKSPACE_MODE_REGISTRY[mode].label}.`],
    source: "student_selected",
  };
}

export function workProfilePersistencePatch(classification: WorkspaceClassification): {
  work_profile: AssignmentWorkspaceMode;
  work_profile_source: WorkspaceProfileSource;
} {
  return {
    work_profile: classification.mode,
    work_profile_source: classification.source,
  };
}

export function resolveWorkspaceMode(input: WorkspaceInput): AssignmentWorkspaceMode {
  return classifyWorkspaceMode(input).mode;
}

export function firstMoveForWorkspace(mode: AssignmentWorkspaceMode): string {
  return WORKSPACE_MODE_REGISTRY[mode].firstMove;
}

export function parseWorkspaceMode(value: unknown): AssignmentWorkspaceMode | null {
  return typeof value === "string" && WORKSPACE_MODES.includes(value as AssignmentWorkspaceMode)
    ? value as AssignmentWorkspaceMode
    : null;
}

export const WORKSPACE_MODE_LABEL: Record<AssignmentWorkspaceMode, string> =
  Object.fromEntries(
    WORKSPACE_MODES.map((mode) => [mode, WORKSPACE_MODE_REGISTRY[mode].label]),
  ) as Record<AssignmentWorkspaceMode, string>;