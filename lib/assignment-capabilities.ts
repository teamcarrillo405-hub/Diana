export const ASSIGNMENT_CAPABILITIES = [
  "rich_text",
  "equation_editor",
  "graphing",
  "spreadsheet",
  "accounting_ledger",
  "map_workspace",
  "code_runner",
  "drawing_canvas",
  "cad_workspace",
  "music_notation",
  "audio_review",
  "video_review",
  "data_lab",
  "design_notebook",
  "performance_log",
  "procedure_checklist",
] as const;

export type AssignmentCapability = (typeof ASSIGNMENT_CAPABILITIES)[number];

export type AssignmentCapabilityDefinition = {
  id: AssignmentCapability;
  label: string;
  description: string;
  artifactBlockType: string;
  aiPolicy: {
    red: "available" | "read_only" | "hidden";
    yellow: "available" | "read_only" | "hidden";
    green: "available" | "read_only" | "hidden";
  };
  resourceLimits: {
    maxBytes: number;
    maxItems: number;
  };
};

const standardPolicy = {
  red: "available",
  yellow: "available",
  green: "available",
} as const;

export const ASSIGNMENT_CAPABILITY_REGISTRY = {
  rich_text: {
    id: "rich_text",
    label: "Document",
    description: "Write, organize, and revise student-owned text.",
    artifactBlockType: "rich_text",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 500_000, maxItems: 200 },
  },
  equation_editor: {
    id: "equation_editor",
    label: "Equations",
    description: "Enter accessible mathematical notation.",
    artifactBlockType: "equation",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 100_000, maxItems: 500 },
  },
  graphing: {
    id: "graphing",
    label: "Graphs",
    description: "Create functions, statistical plots, and economic models.",
    artifactBlockType: "graph",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 750_000, maxItems: 20_000 },
  },
  spreadsheet: {
    id: "spreadsheet",
    label: "Spreadsheet",
    description: "Use tables, formulas, validation, and charts.",
    artifactBlockType: "spreadsheet",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 2_000_000, maxItems: 50_000 },
  },
  accounting_ledger: {
    id: "accounting_ledger",
    label: "Ledger",
    description: "Record journal entries, accounts, and trial balances.",
    artifactBlockType: "ledger",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 1_000_000, maxItems: 10_000 },
  },
  map_workspace: {
    id: "map_workspace",
    label: "Map",
    description: "Build source-attributed maps with layers and annotations.",
    artifactBlockType: "map",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 5_000_000, maxItems: 25_000 },
  },
  code_runner: {
    id: "code_runner",
    label: "Code runner",
    description: "Run student code in a resource-limited sandbox.",
    artifactBlockType: "code",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 250_000, maxItems: 250 },
  },
  drawing_canvas: {
    id: "drawing_canvas",
    label: "Drawing",
    description: "Create diagrams, sketches, markups, and storyboards.",
    artifactBlockType: "drawing",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 10_000_000, maxItems: 10_000 },
  },
  cad_workspace: {
    id: "cad_workspace",
    label: "CAD",
    description: "Create dimensioned sketches and inspect model files.",
    artifactBlockType: "cad",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 50_000_000, maxItems: 25_000 },
  },
  music_notation: {
    id: "music_notation",
    label: "Music notation",
    description: "Create, display, annotate, and play MusicXML notation.",
    artifactBlockType: "music_notation",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 5_000_000, maxItems: 10_000 },
  },
  audio_review: {
    id: "audio_review",
    label: "Audio review",
    description: "Record or upload audio with student-controlled annotations.",
    artifactBlockType: "audio",
    aiPolicy: { red: "read_only", yellow: "available", green: "available" },
    resourceLimits: { maxBytes: 100_000_000, maxItems: 500 },
  },
  video_review: {
    id: "video_review",
    label: "Video review",
    description: "Record or upload video with timeline evidence.",
    artifactBlockType: "video",
    aiPolicy: { red: "read_only", yellow: "available", green: "available" },
    resourceLimits: { maxBytes: 500_000_000, maxItems: 500 },
  },
  data_lab: {
    id: "data_lab",
    label: "Data lab",
    description: "Capture measurements, units, uncertainty, and calculations.",
    artifactBlockType: "data_table",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 2_000_000, maxItems: 50_000 },
  },
  design_notebook: {
    id: "design_notebook",
    label: "Design notebook",
    description: "Track criteria, alternatives, tests, and revisions.",
    artifactBlockType: "design_notebook",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 5_000_000, maxItems: 5_000 },
  },
  performance_log: {
    id: "performance_log",
    label: "Performance log",
    description: "Track practice, evidence, reflection, and verification.",
    artifactBlockType: "performance_log",
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 5_000_000, maxItems: 5_000 },
  },
  procedure_checklist: {
    id: "procedure_checklist",
    label: "Approved procedure",
    description: "Follow a teacher-approved procedure without rewriting hazardous steps.",
    artifactBlockType: "procedure_checklist",
    aiPolicy: { red: "read_only", yellow: "read_only", green: "read_only" },
    resourceLimits: { maxBytes: 1_000_000, maxItems: 5_000 },
  },
} as const satisfies Record<AssignmentCapability, AssignmentCapabilityDefinition>;

export function parseAssignmentCapabilities(value: unknown): AssignmentCapability[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(
    (item): item is AssignmentCapability =>
      typeof item === "string" && ASSIGNMENT_CAPABILITIES.includes(item as AssignmentCapability),
  ))];
}

export function capabilityLabels(capabilities: readonly AssignmentCapability[]): string[] {
  return capabilities.map((capability) => ASSIGNMENT_CAPABILITY_REGISTRY[capability].label);
}
