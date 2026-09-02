import type {
  AssignmentCapability,
  UniversalTypedInkFallback,
} from "@/lib/assignment-capabilities";

export const SPECIALIST_ARTIFACT_CONTEXT_SCHEMA_VERSION = 3 as const;

export const SPECIALIST_ARTIFACT_KINDS = [
  "equation",
  "graph",
  "ledger",
  "spreadsheet",
  "map",
  "drawing",
  "code_output",
  "notation",
  "cad",
  "media_annotations",
  "lab_data",
  "design_notebook",
  "performance_log",
  "procedure_checklist",
] as const;

export type SpecialistArtifactKind =
  (typeof SPECIALIST_ARTIFACT_KINDS)[number];

export type SpecialistArtifactLimit = Readonly<{
  maxBytes: number;
  maxItems: number;
}>;

export type SpecialistArtifactTruncationReason =
  | "byte_limit"
  | "field_limit"
  | "invalid_items"
  | "item_limit";

export type SpecialistArtifactBounds = SpecialistArtifactLimit & {
  byteLength: number;
  itemCount: number;
  sourceItemCount: number;
  truncated: boolean;
  reasons: readonly SpecialistArtifactTruncationReason[];
};

export type SpecialistGraphPoint = {
  x: number;
  y: number;
};

export type SpecialistEquationPayload = {
  latex: string;
  explanation: string;
  problemText: string;
  reasoning: string;
  answer: string;
  handwriting: string;
  studentAuthoredText: string;
};

export type SpecialistGraphPayload = {
  expression: string;
  points: SpecialistGraphPoint[];
};

export type SpecialistLedgerRow = {
  account: string;
  debit: number;
  credit: number;
};

export type SpecialistLedgerPayload = {
  rows: SpecialistLedgerRow[];
  balance: {
    debitTotal: number;
    creditTotal: number;
    difference: number;
    balanced: boolean;
  };
};

export type SpecialistSpreadsheetPayload = {
  cells: Record<string, string>;
  dataset: SpecialistImportedDataset | null;
  chartConfig: SpecialistDataChartConfig | null;
};

export type SpecialistImportedDataset = {
  fileName: string;
  columns: string[];
  rows: string[][];
};

export type SpecialistDataChartConfig = {
  type: "bar" | "line" | "scatter";
  xColumn: number;
  yColumn: number;
};

export type SpecialistMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  source: string;
};

export type SpecialistMapPayload = {
  title: string;
  legend: string;
  scale: string;
  sourceAttribution: string;
  markers: SpecialistMapMarker[];
  importedMap: {
    fileName: string;
    data: Record<string, unknown>;
    analysis: {
      featureCount: number;
      coordinateCount: number;
      pointCount: number;
      lineCount: number;
      polygonCount: number;
      areaSquareKilometers: number;
      lineLengthKilometers: number;
      bounds: [number, number, number, number];
    };
  } | null;
};

export type SpecialistDrawingPoint = {
  x: number;
  y: number;
};

export type SpecialistDrawingStroke = {
  id: string;
  color: string;
  width: number;
  points: SpecialistDrawingPoint[];
};

export type SpecialistDrawingPayload = {
  logicalWidth: number;
  logicalHeight: number;
  strokes: SpecialistDrawingStroke[];
};

export type SpecialistCodeOutputPayload = {
  language: "javascript" | "python" | "text";
  source: string;
  output: string[];
  execution: {
    runtime: string;
    durationMs: number;
  } | null;
};

export type SpecialistNotationNote = {
  pitch: string;
  beats: number;
};

export type SpecialistNotationPayload = {
  notes: SpecialistNotationNote[];
  musicXml: {
    xml: string;
    metadata: {
      fileName: string;
      title: string;
      partCount: number;
      measureCount: number;
      noteCount: number;
    };
  } | null;
};

export type SpecialistCadPayload = {
  units: "cm" | "in" | "m" | "mm";
  dimensions: {
    width: number | null;
    height: number | null;
    depth: number | null;
  };
  constraints: string[];
  model: {
    fileName: string;
    format: string | null;
  };
  design: {
    primitive: "box" | "cylinder";
    dimensions: Record<string, number>;
    volume: number | null;
    polygonCount: number | null;
    triangleCount: number | null;
  } | null;
  modelStats: {
    byteLength: number;
    triangleCount: number;
    vertexCount: number;
  } | null;
};

export type SpecialistMediaAnnotation = {
  id: string;
  timeSeconds: number;
  note: string;
  author: "student" | "teacher";
};

export type SpecialistMediaAnnotationsPayload = {
  media: {
    assetId: string | null;
    kind: "audio" | "video";
    fileName: string;
    mimeType: string;
    sizeBytes: number | null;
    durationSeconds: number | null;
  };
  annotations: SpecialistMediaAnnotation[];
};

export type SpecialistLabDataRow = {
  id: string;
  label: string;
  value: string;
  unit: string;
  uncertainty: string;
  observation: string;
};

export type SpecialistLabDataPayload = {
  rows: SpecialistLabDataRow[];
  dataset: SpecialistImportedDataset | null;
  chartConfig: SpecialistDataChartConfig | null;
};

export type SpecialistDesignNotebookPayload = {
  problem: string;
  stakeholders: string;
  criteria: string[];
  constraints: string[];
  alternatives: Array<{ id: string; name: string; evidence: string }>;
  selectedAlternative: string;
  selectionReason: string;
  tests: Array<{ id: string; method: string; result: string; revision: string }>;
};

export type SpecialistPerformanceLogPayload = {
  entries: Array<{
    id: string;
    occurredOn: string;
    focus: string;
    durationMinutes: number | null;
    evidence: string;
    reflection: string;
  }>;
};

export type SpecialistProcedureChecklistPayload = {
  protocolId: string | null;
  protocolVersion: number | null;
  completedIndexes: number[];
  practicalAvailable: boolean;
};

export type SpecialistArtifactPayloadByKind = {
  equation: SpecialistEquationPayload;
  graph: SpecialistGraphPayload;
  ledger: SpecialistLedgerPayload;
  spreadsheet: SpecialistSpreadsheetPayload;
  map: SpecialistMapPayload;
  drawing: SpecialistDrawingPayload;
  code_output: SpecialistCodeOutputPayload;
  notation: SpecialistNotationPayload;
  cad: SpecialistCadPayload;
  media_annotations: SpecialistMediaAnnotationsPayload;
  lab_data: SpecialistLabDataPayload;
  design_notebook: SpecialistDesignNotebookPayload;
  performance_log: SpecialistPerformanceLogPayload;
  procedure_checklist: SpecialistProcedureChecklistPayload;
};

export const SPECIALIST_ACTIVE_RUNTIME_STATUSES = [
  "idle",
  "loading",
  "ready",
  "running",
  "complete",
  "limited",
  "unavailable",
  "error",
] as const;

export type SpecialistActiveRuntimeStatus =
  (typeof SPECIALIST_ACTIVE_RUNTIME_STATUSES)[number];

export type SpecialistActiveRuntimeState = {
  status: SpecialistActiveRuntimeStatus;
  engines: readonly string[];
  updatedAt: string | null;
  detail: string | null;
  outputTruncated: boolean;
};

export type SpecialistCapabilityByKind = {
  equation: "equation_editor";
  graph: "graphing";
  ledger: "accounting_ledger";
  spreadsheet: "spreadsheet";
  map: "map_workspace";
  drawing: "drawing_canvas";
  code_output: "code_runner";
  notation: "music_notation";
  cad: "cad_workspace";
  media_annotations: "audio_review" | "video_review";
  lab_data: "data_lab";
  design_notebook: "design_notebook";
  performance_log: "performance_log";
  procedure_checklist: "procedure_checklist";
};

export const SPECIALIST_ARTIFACT_CONTEXT_CONSUMERS = [
  "ask_diana",
  "review",
  "export",
] as const;

export type SpecialistArtifactContextConsumer =
  (typeof SPECIALIST_ARTIFACT_CONTEXT_CONSUMERS)[number];

export type SpecialistAssignmentIdentity = {
  id: string;
  title: string;
};

export type SpecialistRubricAnchor = {
  criterionId: string | null;
  criterion: string;
  location: string | null;
};

export type SpecialistSourceAnchor = {
  sourceId: string;
  label: string | null;
  location: string | null;
};

export type SpecialistArtifactContextMetadata = {
  assignmentIdentity: SpecialistAssignmentIdentity | null;
  academicBand: string | null;
  rubricAnchors: SpecialistRubricAnchor[];
  sourceAnchors: SpecialistSourceAnchor[];
};

export type SpecialistArtifactContextMetadataInput = {
  assignmentIdentity?: unknown;
  academicBand?: unknown;
  rubricAnchors?: unknown;
  sourceAnchors?: unknown;
};

export type SpecialistArtifactContext<
  K extends SpecialistArtifactKind = SpecialistArtifactKind,
> = {
  [Kind in K]: SpecialistArtifactContextMetadata & {
    schemaVersion: typeof SPECIALIST_ARTIFACT_CONTEXT_SCHEMA_VERSION;
    kind: Kind;
    capability: SpecialistCapabilityByKind[Kind];
    summary: string;
    payload: SpecialistArtifactPayloadByKind[Kind];
    runtime: SpecialistActiveRuntimeState;
    bounds: SpecialistArtifactBounds;
  }
}[K];

export const SPECIALIST_RUNTIME_HEALTH_STATUSES = [
  "healthy",
  "degraded",
  "unavailable",
  "unknown",
] as const;

export type SpecialistRuntimeHealthStatus =
  (typeof SPECIALIST_RUNTIME_HEALTH_STATUSES)[number];

export const SPECIALIST_RUNTIME_HEALTH_EVIDENCE_SOURCES = [
  "active_runtime",
  "runtime_probe",
  "provider_canary",
] as const;

export type SpecialistRuntimeHealthEvidenceSource =
  (typeof SPECIALIST_RUNTIME_HEALTH_EVIDENCE_SOURCES)[number];

export type SpecialistRuntimeHealthEvidence = {
  authority: "server";
  source: SpecialistRuntimeHealthEvidenceSource;
  observedAt: string;
  evidenceId: string | null;
};

export type SpecialistRuntimeHealth = {
  status: SpecialistRuntimeHealthStatus;
  checkedAt: string | null;
  detail: string | null;
  retryable: boolean;
  evidence: SpecialistRuntimeHealthEvidence | null;
  fallbackRequired: boolean;
  universalFallback: UniversalTypedInkFallback;
};

export type SpecialistArtifactBlockLike = {
  id?: unknown;
  key?: unknown;
  label?: unknown;
  type: string;
  capability?: AssignmentCapability | string | null;
  content: unknown;
  artifactContext?: SpecialistArtifactContextMetadataInput | null;
  assignmentIdentity?: unknown;
  academicBand?: unknown;
  rubricAnchors?: unknown;
  sourceAnchors?: unknown;
};
