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

export const ASSIGNMENT_CAPABILITY_READINESS = [
  "prototype",
  "beta",
  "limited",
  "unavailable",
] as const;

export type AssignmentCapabilityReadiness =
  (typeof ASSIGNMENT_CAPABILITY_READINESS)[number];

export type LegacyAssignmentCapabilityImplementation = "ready" | "limited";

export const UNIVERSAL_TYPED_INK_FALLBACK = Object.freeze({
  typed: Object.freeze({
    capability: "rich_text",
    artifactBlockType: "rich_text",
  }),
  ink: Object.freeze({
    capability: "drawing_canvas",
    artifactBlockType: "drawing",
  }),
} as const);

export type UniversalTypedInkFallback = typeof UNIVERSAL_TYPED_INK_FALLBACK;

export type AssignmentCapabilityDefinition = {
  id: AssignmentCapability;
  label: string;
  description: string;
  readiness: AssignmentCapabilityReadiness;
  /** @deprecated Use readiness. Kept for persisted and in-flight callers. */
  implementation: LegacyAssignmentCapabilityImplementation;
  limitations: readonly string[];
  artifactBlockType: string;
  universalFallback: UniversalTypedInkFallback;
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
    readiness: "beta",
    implementation: "ready",
    limitations: ["Original teacher documents remain references; Diana does not edit them in place."],
    artifactBlockType: "rich_text",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 500_000, maxItems: 200 },
  },
  equation_editor: {
    id: "equation_editor",
    label: "Equations",
    description: "Enter mathematical notation and explain each step.",
    readiness: "prototype",
    implementation: "limited",
    limitations: ["The current editor stores notation text and a plain-text preview; it is not a full symbolic math editor."],
    artifactBlockType: "equation",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 100_000, maxItems: 500 },
  },
  graphing: {
    id: "graphing",
    label: "Graphs",
    description: "Graph one supported y=f(x) expression from x=-10 to x=10.",
    readiness: "prototype",
    implementation: "limited",
    limitations: ["Statistical plots, regressions, multiple series, and interactive geometry are not enabled."],
    artifactBlockType: "graph",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 750_000, maxItems: 20_000 },
  },
  spreadsheet: {
    id: "spreadsheet",
    label: "Spreadsheet",
    description: "Edit core cells or import a bounded CSV or TSV dataset for a local chart.",
    readiness: "beta",
    implementation: "ready",
    limitations: ["Imports are limited to 1 MB, 200 rows, 24 columns, and controlled charts; workbook files, macros, external links, and full spreadsheet parity are not enabled."],
    artifactBlockType: "spreadsheet",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 1_000_000, maxItems: 4_800 },
  },
  accounting_ledger: {
    id: "accounting_ledger",
    label: "Ledger",
    description: "Record debit and credit rows and check whether the totals balance.",
    readiness: "prototype",
    implementation: "limited",
    limitations: ["Posting workflows, adjusting entries, financial statements, and multi-period books remain in the universal work surface."],
    artifactBlockType: "ledger",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 1_000_000, maxItems: 10_000 },
  },
  map_workspace: {
    id: "map_workspace",
    label: "Map",
    description: "Create a source-attributed coordinate map or inspect bounded local GeoJSON with distance and area analysis.",
    readiness: "beta",
    implementation: "ready",
    limitations: ["Imports are limited to 1 MB, 500 features, and 10,000 coordinates; basemap tiles, projections, routes, geocoding, and full GIS parity are not enabled."],
    artifactBlockType: "map",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 1_000_000, maxItems: 10_000 },
  },
  code_runner: {
    id: "code_runner",
    label: "Code runner",
    description: "Edit and run bounded student-owned Python or JavaScript in a fresh browser-only worker.",
    readiness: "limited",
    implementation: "limited",
    limitations: ["Runs stop after 8 seconds and 200 output lines; files, processes, package installation, module imports, network calls, server execution, and full IDE debugging are not enabled."],
    artifactBlockType: "code",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 250_000, maxItems: 250 },
  },
  drawing_canvas: {
    id: "drawing_canvas",
    label: "Drawing",
    description: "Create diagrams, sketches, markups, and storyboards.",
    readiness: "beta",
    implementation: "ready",
    limitations: ["The canvas is a lightweight stroke editor, not a layered professional illustration application."],
    artifactBlockType: "drawing",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 10_000_000, maxItems: 10_000 },
  },
  cad_workspace: {
    id: "cad_workspace",
    label: "CAD",
    description: "Create a controlled JSCAD box or cylinder and inspect validated model files with Three.js.",
    readiness: "limited",
    implementation: "limited",
    limitations: ["Models are limited to 8 MB and bounded geometry; arbitrary JSCAD scripts, external model resources, STEP editing, assemblies, simulation, and full CAD parity are not enabled."],
    artifactBlockType: "cad",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 8_000_000, maxItems: 300_000 },
  },
  music_notation: {
    id: "music_notation",
    label: "Music notation",
    description: "Render and play a bounded note sequence or view uncompressed score-partwise MusicXML.",
    readiness: "limited",
    implementation: "limited",
    limitations: ["MusicXML is view-only and limited to 512 KB; compressed MXL, export, multiple-voice editing, MIDI devices, instrument control, and full notation parity are not enabled."],
    artifactBlockType: "music_notation",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 512_000, maxItems: 2_000 },
  },
  audio_review: {
    id: "audio_review",
    label: "Audio review",
    description: "Record or upload audio with student-controlled annotations.",
    readiness: "beta",
    implementation: "ready",
    limitations: ["Automated performance grading is not implied; Diana reviews only the evidence the student explicitly shares."],
    artifactBlockType: "audio",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: { red: "read_only", yellow: "available", green: "available" },
    resourceLimits: { maxBytes: 100_000_000, maxItems: 500 },
  },
  video_review: {
    id: "video_review",
    label: "Video review",
    description: "Record or upload video with timeline evidence.",
    readiness: "beta",
    implementation: "ready",
    limitations: ["Automated performance grading is not implied; teacher verification remains separate."],
    artifactBlockType: "video",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: { red: "read_only", yellow: "available", green: "available" },
    resourceLimits: { maxBytes: 500_000_000, maxItems: 500 },
  },
  data_lab: {
    id: "data_lab",
    label: "Data lab",
    description: "Capture measurements or import bounded CSV or TSV data for controlled local charts.",
    readiness: "beta",
    implementation: "ready",
    limitations: ["Imports are limited to 1 MB, 200 rows, and 24 columns; external links, instrument control, automatic sensor ingestion, and full statistical tooling are not enabled."],
    artifactBlockType: "data_table",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 1_000_000, maxItems: 4_800 },
  },
  design_notebook: {
    id: "design_notebook",
    label: "Design notebook",
    description: "Track criteria, alternatives, tests, and revisions.",
    readiness: "beta",
    implementation: "ready",
    limitations: ["Simulation and fabrication-machine control are not enabled."],
    artifactBlockType: "design_notebook",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 5_000_000, maxItems: 5_000 },
  },
  performance_log: {
    id: "performance_log",
    label: "Performance log",
    description: "Track practice, evidence, reflection, and verification.",
    readiness: "beta",
    implementation: "ready",
    limitations: ["Student logs never represent teacher verification unless a teacher verifies them separately."],
    artifactBlockType: "performance_log",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    aiPolicy: standardPolicy,
    resourceLimits: { maxBytes: 5_000_000, maxItems: 5_000 },
  },
  procedure_checklist: {
    id: "procedure_checklist",
    label: "Approved procedure",
    description: "Follow a teacher-approved procedure without rewriting hazardous steps.",
    readiness: "beta",
    implementation: "ready",
    limitations: ["Diana does not invent, alter, or authorize hazardous procedures."],
    artifactBlockType: "procedure_checklist",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
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

export function capabilityDisclosure(capability: AssignmentCapability): string {
  const definition = ASSIGNMENT_CAPABILITY_REGISTRY[capability];
  return [definition.description, ...definition.limitations].join(" ");
}

export function parseAssignmentCapabilityReadiness(
  value: unknown,
): AssignmentCapabilityReadiness | null {
  if (value === "ready") return "beta";
  return typeof value === "string" &&
    ASSIGNMENT_CAPABILITY_READINESS.includes(value as AssignmentCapabilityReadiness)
    ? value as AssignmentCapabilityReadiness
    : null;
}

export function legacyImplementationForReadiness(
  readiness: AssignmentCapabilityReadiness,
): LegacyAssignmentCapabilityImplementation {
  return readiness === "beta" ? "ready" : "limited";
}

export function capabilityReadiness(
  capability: AssignmentCapability,
): AssignmentCapabilityReadiness {
  return ASSIGNMENT_CAPABILITY_REGISTRY[capability].readiness;
}

export function capabilityUniversalFallback(
  capability: AssignmentCapability,
): UniversalTypedInkFallback {
  return ASSIGNMENT_CAPABILITY_REGISTRY[capability].universalFallback;
}

export const ASSIGNMENT_INPUT_CHANNELS = {
  typing: {
    availability: "ready",
    description: "Type in the shared student work surface and Diana chat.",
  },
  handwriting: {
    availability: "ready",
    description: "Write or draw with touch, pen, or intentional mouse drag in the same work surface.",
  },
  image_or_pdf: {
    availability: "ready",
    description: "Upload assignment sources or attach images and PDFs to the active Diana conversation.",
  },
  dictation: {
    availability: "conditional",
    description: "Turn speech into composer text when browser microphone and transcription services are available.",
  },
  live_voice: {
    availability: "conditional",
    description: "Use a controlled OpenAI Realtime conversation when microphone permission and provider access are available.",
  },
} as const;
