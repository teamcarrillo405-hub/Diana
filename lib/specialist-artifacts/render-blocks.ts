import { UNIVERSAL_TYPED_INK_FALLBACK } from "@/lib/assignment-capabilities";
import {
  boundedUntrustedText,
  cleanUntrustedText,
  safeSummary,
  utf8ByteLength,
} from "@/lib/specialist-artifacts/bounds";
import {
  SPECIALIST_ARTIFACT_CONTEXT_CONSUMERS,
  SPECIALIST_ARTIFACT_CONTEXT_SCHEMA_VERSION,
  type SpecialistArtifactBounds,
  type SpecialistActiveRuntimeState,
  type SpecialistArtifactBlockLike,
  type SpecialistArtifactContext,
  type SpecialistArtifactContextConsumer,
  type SpecialistArtifactContextMetadata,
  type SpecialistArtifactKind,
  type SpecialistArtifactPayloadByKind,
  type SpecialistCapabilityByKind,
  type SpecialistRuntimeHealth,
} from "@/lib/specialist-artifacts/contracts";
import {
  UNKNOWN_SPECIALIST_RUNTIME_HEALTH,
  createSpecialistRuntimeHealth,
  isSpecialistRuntimeUsable,
  requiresSpecialistRuntimeFallback,
  runtimeHealthFromActiveState,
} from "@/lib/specialist-artifacts/runtime-health";
import {
  createSpecialistArtifactContextMetadata,
  trySerializeSpecialistArtifactContext,
  type SpecialistArtifactSerializationOptions,
} from "@/lib/specialist-artifacts/serializers";

export const CANONICAL_RENDER_BLOCK_SCHEMA_VERSION = 3 as const;
export const CANONICAL_RENDER_DOCUMENT_SCHEMA_VERSION = 2 as const;
export const CANONICAL_RENDER_TARGETS = Object.freeze([
  "preview",
  "export",
  "lms",
] as const);
export const CANONICAL_RENDER_PLAIN_TEXT_MAX_BYTES = 8_000_000;

export type CanonicalRenderTarget =
  (typeof CANONICAL_RENDER_TARGETS)[number];

export type CanonicalRenderBlock<
  K extends SpecialistArtifactKind = SpecialistArtifactKind,
> = {
  [Kind in K]: SpecialistArtifactContextMetadata & {
    schemaVersion: typeof CANONICAL_RENDER_BLOCK_SCHEMA_VERSION;
    id: string;
    type: Kind;
    capability: SpecialistCapabilityByKind[Kind];
    label: string;
    summary: string;
    accessibilityText: string;
    plainText: string;
    content: SpecialistArtifactPayloadByKind[Kind];
    bounds: SpecialistArtifactBounds;
    runtimeState: SpecialistActiveRuntimeState;
    runtimeHealth: SpecialistRuntimeHealth;
    runtimeDisposition: "specialist" | "universal_fallback";
    targets: typeof CANONICAL_RENDER_TARGETS;
    universalFallback: typeof UNIVERSAL_TYPED_INK_FALLBACK;
    integrity: {
      contextTruncated: boolean;
      plainTextTruncated: boolean;
    };
  }
}[K];

export type CanonicalRenderDocument = {
  schemaVersion: typeof CANONICAL_RENDER_DOCUMENT_SCHEMA_VERSION;
  title: string | null;
  blocks: CanonicalRenderBlock[];
  plainText: string;
  plainTextTruncated: boolean;
  targets: typeof CANONICAL_RENDER_TARGETS;
};

export type CanonicalRenderProjection = {
  schemaVersion: typeof CANONICAL_RENDER_DOCUMENT_SCHEMA_VERSION;
  target: CanonicalRenderTarget;
  title: string | null;
  blocks: readonly CanonicalRenderBlock[];
  fallbackBlocks: readonly CanonicalRenderBlock[];
  contextBlocks: readonly CanonicalRenderBlock[];
  plainText: string;
  plainTextTruncated: boolean;
  fallbackPlainText: string;
  fallbackPlainTextTruncated: boolean;
};

export const CANONICAL_SPECIALIST_ATTACHMENT_FILENAME =
  "diana-canonical-assignment.json" as const;

export type CanonicalSpecialistDeliveryBlock = {
  id: string;
  type: SpecialistArtifactKind;
  label: string;
  sourceAssetHandling: "bounded_machine_readable" | "external_binary_required";
  canonicalPayloadTruncated: boolean;
  externalHandoffReason: string | null;
};

export type CanonicalSpecialistDeliveryManifest = {
  schemaVersion: 1;
  visibleSummaryIncluded: boolean;
  machineReadableArtifact: {
    fileName: typeof CANONICAL_SPECIALIST_ATTACHMENT_FILENAME;
    mediaType: "application/json";
    bounded: true;
  };
  externalHandoffRequired: boolean;
  externalHandoffBlockIds: string[];
  blocks: CanonicalSpecialistDeliveryBlock[];
};

export type SpecialistArtifactConsumerContext<
  K extends SpecialistArtifactKind = SpecialistArtifactKind,
> = {
  [Kind in K]: SpecialistArtifactContextMetadata & {
    consumer: SpecialistArtifactContextConsumer;
    schemaVersion: typeof SPECIALIST_ARTIFACT_CONTEXT_SCHEMA_VERSION;
    kind: Kind;
    capability: SpecialistCapabilityByKind[Kind];
    summary: string;
    plainText: string;
    payload: SpecialistArtifactPayloadByKind[Kind];
    bounds: SpecialistArtifactBounds;
    runtimeState: SpecialistActiveRuntimeState;
    runtimeHealth: SpecialistRuntimeHealth;
    fallbackRequired: boolean;
    universalFallback: typeof UNIVERSAL_TYPED_INK_FALLBACK;
  }
}[K];

export type CanonicalRenderBlockOptions = {
  id?: unknown;
  label?: unknown;
  runtimeHealth?: SpecialistRuntimeHealth;
};

export type CanonicalRenderBlockFromArtifactOptions =
  CanonicalRenderBlockOptions & SpecialistArtifactSerializationOptions;

const DEFAULT_LABELS: Record<SpecialistArtifactKind, string> = {
  equation: "Equation work",
  graph: "Graph",
  ledger: "Accounting ledger",
  spreadsheet: "Spreadsheet",
  map: "Map",
  drawing: "Drawing",
  code_output: "Code and output",
  notation: "Music notation",
  cad: "CAD package",
  media_annotations: "Media annotations",
  lab_data: "Lab data",
  design_notebook: "Design notebook",
  performance_log: "Performance log",
  procedure_checklist: "Approved procedure",
};

function canonicalId(value: unknown, fallback: string): string {
  const cleaned = cleanUntrustedText(value)
    .trim()
    .replaceAll(/[^a-z0-9._:-]+/giu, "-")
    .replaceAll(/^-+|-+$/gu, "");
  return boundedUntrustedText(cleaned || fallback, 128).value || fallback;
}

function canonicalLabel(value: unknown, fallback: string): string {
  return boundedUntrustedText(value, 160).value.trim() || fallback;
}

function rowsText(rows: readonly string[][]): string {
  return rows.map((row) => row.join(" | ")).join("\n");
}

export function specialistArtifactPlainText(
  artifact: SpecialistArtifactContext,
): string {
  switch (artifact.kind) {
    case "equation":
      return [
        artifact.payload.problemText ? `Problem: ${artifact.payload.problemText}` : "",
        artifact.payload.latex ? `Notation: ${artifact.payload.latex}` : "",
        artifact.payload.reasoning ? `Reasoning:\n${artifact.payload.reasoning}` : "",
        artifact.payload.answer ? `Answer:\n${artifact.payload.answer}` : "",
        artifact.payload.explanation ? `Explanation:\n${artifact.payload.explanation}` : "",
        artifact.payload.handwriting ? "Handwritten work is included in the canonical artifact." : "",
        artifact.payload.studentAuthoredText,
      ].filter(Boolean).join("\n\n");
    case "graph":
      return [artifact.summary, artifact.payload.expression ? `y = ${artifact.payload.expression}` : ""]
        .filter(Boolean).join("\n");
    case "ledger":
      return [
        rowsText(artifact.payload.rows.map((row) => [
          row.account,
          `debit ${row.debit}`,
          `credit ${row.credit}`,
        ])),
        `Totals | debit ${artifact.payload.balance.debitTotal} | credit ${artifact.payload.balance.creditTotal}`,
        artifact.payload.balance.balanced ? "Balanced" : `Difference ${artifact.payload.balance.difference}`,
      ].filter(Boolean).join("\n");
    case "spreadsheet":
      return Object.entries(artifact.payload.cells)
        .map(([address, value]) => `${address}: ${value}`).join("\n");
    case "map":
      return [
        artifact.payload.title,
        artifact.payload.legend ? `Legend: ${artifact.payload.legend}` : "",
        artifact.payload.scale ? `Scale: ${artifact.payload.scale}` : "",
        artifact.payload.sourceAttribution
          ? `Sources: ${artifact.payload.sourceAttribution}`
          : "",
        ...artifact.payload.markers.map((marker) =>
          `${marker.label || "Marker"}: ${marker.latitude}, ${marker.longitude}${marker.source ? ` | ${marker.source}` : ""}`
        ),
        artifact.payload.importedMap
          ? `Imported GeoJSON: ${artifact.payload.importedMap.fileName} | ${artifact.payload.importedMap.analysis.featureCount} features | ${artifact.payload.importedMap.analysis.coordinateCount} coordinates`
          : "",
      ].filter(Boolean).join("\n");
    case "drawing":
      return [
        artifact.summary,
        ...artifact.payload.strokes.map((stroke, index) =>
          `Stroke ${index + 1} | ${stroke.color} | width ${stroke.width} | ${stroke.points.length} points`
        ),
      ].filter(Boolean).join("\n");
    case "code_output":
      return [
        `Language: ${artifact.payload.language}`,
        artifact.payload.source,
        artifact.payload.output.length > 0
          ? `Output:\n${artifact.payload.output.join("\n")}`
          : "",
        artifact.payload.execution
          ? `Runtime: ${artifact.payload.execution.runtime} | ${artifact.payload.execution.durationMs} ms`
          : "",
      ].filter(Boolean).join("\n\n");
    case "notation":
      return [
        ...artifact.payload.notes
          .map((note, index) => `${index + 1}. ${note.pitch} | ${note.beats} beat${note.beats === 1 ? "" : "s"}`),
        artifact.payload.musicXml
          ? `Imported MusicXML: ${artifact.payload.musicXml.metadata.title || artifact.payload.musicXml.metadata.fileName} | ${artifact.payload.musicXml.metadata.partCount} parts | ${artifact.payload.musicXml.metadata.measureCount} measures | ${artifact.payload.musicXml.metadata.noteCount} notes`
          : "",
      ].filter(Boolean).join("\n");
    case "cad": {
      const dimensions = [
        artifact.payload.dimensions.width,
        artifact.payload.dimensions.height,
        artifact.payload.dimensions.depth,
      ].filter((value): value is number => value !== null);
      return [
        dimensions.length > 0
          ? `Dimensions: ${dimensions.join(" x ")} ${artifact.payload.units}`
          : "Dimensions not recorded",
        ...artifact.payload.constraints.map((constraint) => `Constraint: ${constraint}`),
        artifact.payload.model.fileName
          ? `Model: ${artifact.payload.model.fileName}${artifact.payload.model.format ? ` (${artifact.payload.model.format})` : ""}`
          : "",
        artifact.payload.design
          ? `Design: ${artifact.payload.design.primitive} | ${Object.entries(artifact.payload.design.dimensions).map(([key, value]) => `${key} ${value}`).join(" | ")}`
          : "",
        artifact.payload.modelStats
          ? `Model statistics: ${artifact.payload.modelStats.byteLength} bytes | ${artifact.payload.modelStats.triangleCount} triangles | ${artifact.payload.modelStats.vertexCount} vertices`
          : "",
      ].filter(Boolean).join("\n");
    }
    case "media_annotations":
      return [
        artifact.payload.media.fileName,
        ...artifact.payload.annotations.map((annotation) =>
          `${annotation.timeSeconds}s | ${annotation.author}: ${annotation.note}`
        ),
      ].filter(Boolean).join("\n");
    case "lab_data":
      return [
        rowsText(artifact.payload.rows.map((row) => [
          row.label,
          row.value,
          row.unit,
          row.uncertainty ? `+/- ${row.uncertainty}` : "",
          row.observation,
        ])),
        artifact.payload.dataset
          ? `Imported dataset: ${artifact.payload.dataset.fileName} | ${artifact.payload.dataset.rows.length} rows | ${artifact.payload.dataset.columns.length} columns`
          : "",
      ].filter(Boolean).join("\n");
    case "design_notebook":
      return [
        artifact.payload.problem ? `Problem: ${artifact.payload.problem}` : "",
        artifact.payload.stakeholders ? `Stakeholders: ${artifact.payload.stakeholders}` : "",
        artifact.payload.criteria.length ? `Criteria: ${artifact.payload.criteria.join("; ")}` : "",
        artifact.payload.constraints.length ? `Constraints: ${artifact.payload.constraints.join("; ")}` : "",
        ...artifact.payload.alternatives.map((item) => `Alternative: ${item.name} | Evidence: ${item.evidence}`),
        artifact.payload.selectedAlternative ? `Selected: ${artifact.payload.selectedAlternative}` : "",
        artifact.payload.selectionReason,
        ...artifact.payload.tests.map((item) => `Test: ${item.method} | Result: ${item.result} | Revision: ${item.revision}`),
      ].filter(Boolean).join("\n");
    case "performance_log":
      return artifact.payload.entries.map((entry) => [
        `${entry.occurredOn} | ${entry.focus}${entry.durationMinutes ? ` | ${entry.durationMinutes} minutes` : ""}`,
        entry.evidence ? `Evidence: ${entry.evidence}` : "",
        entry.reflection ? `Reflection: ${entry.reflection}` : "",
      ].filter(Boolean).join("\n")).join("\n\n");
    case "procedure_checklist":
      return [
        artifact.payload.protocolId ? `Protocol: ${artifact.payload.protocolId}` : "No approved protocol is connected.",
        artifact.payload.protocolVersion !== null ? `Version: ${artifact.payload.protocolVersion}` : "",
        `Completed approved steps: ${artifact.payload.completedIndexes.join(", ") || "none"}`,
        artifact.payload.practicalAvailable ? "Practical controls were available." : "Practical controls were not available.",
      ].filter(Boolean).join("\n");
  }
}

function exactCanonicalText(value: string, label: string): string {
  const byteLength = utf8ByteLength(value);
  if (byteLength > CANONICAL_RENDER_PLAIN_TEXT_MAX_BYTES) {
    throw new RangeError(
      `${label} needs ${byteLength} bytes, above the ${CANONICAL_RENDER_PLAIN_TEXT_MAX_BYTES}-byte canonical payload limit.`,
    );
  }
  return value;
}

export function toCanonicalRenderBlock<K extends SpecialistArtifactKind>(
  artifact: SpecialistArtifactContext<K>,
  options: CanonicalRenderBlockOptions = {},
): CanonicalRenderBlock<K> {
  const rawPlainText = specialistArtifactPlainText(
    artifact as SpecialistArtifactContext,
  );
  const plainText = exactCanonicalText(rawPlainText, "Specialist block text");
  const label = canonicalLabel(options.label, DEFAULT_LABELS[artifact.kind]);
  const authoritativeHealth = options.runtimeHealth
    ? createSpecialistRuntimeHealth(options.runtimeHealth)
    : UNKNOWN_SPECIALIST_RUNTIME_HEALTH;
  const runtimeHealth = runtimeHealthFromActiveState(
    artifact.runtime,
    authoritativeHealth,
  );
  const artifactContext = createSpecialistArtifactContextMetadata(artifact);
  return {
    ...artifactContext,
    schemaVersion: CANONICAL_RENDER_BLOCK_SCHEMA_VERSION,
    id: canonicalId(options.id, artifact.kind),
    type: artifact.kind,
    capability: artifact.capability,
    label,
    summary: safeSummary(artifact.summary),
    accessibilityText: safeSummary(`${label}. ${artifact.summary}`),
    plainText,
    content: artifact.payload,
    bounds: artifact.bounds,
    runtimeState: {
      ...artifact.runtime,
      updatedAt: null,
    },
    runtimeHealth,
    runtimeDisposition: isSpecialistRuntimeUsable(runtimeHealth)
      ? "specialist"
      : "universal_fallback",
    targets: CANONICAL_RENDER_TARGETS,
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    integrity: {
      contextTruncated: artifact.bounds.truncated,
      plainTextTruncated: false,
    },
  } as CanonicalRenderBlock<K>;
}

export const buildCanonicalRenderBlock = toCanonicalRenderBlock;

export function canonicalRenderBlockFromArtifact(
  block: SpecialistArtifactBlockLike,
  options: CanonicalRenderBlockFromArtifactOptions = {},
): CanonicalRenderBlock | null {
  const artifact = trySerializeSpecialistArtifactContext(block, {
    maxBytes: options.maxBytes,
    maxItems: options.maxItems,
    artifactContext: options.artifactContext,
  });
  return artifact
    ? toCanonicalRenderBlock(artifact, {
        id: options.id ?? block.key ?? block.id,
        label: options.label ?? block.label,
        runtimeHealth: options.runtimeHealth,
      })
    : null;
}

export const buildCanonicalRenderBlockFromArtifact =
  canonicalRenderBlockFromArtifact;

function uniqueBlockIds(blocks: readonly CanonicalRenderBlock[]): CanonicalRenderBlock[] {
  const counts = new Map<string, number>();
  return blocks.map((block) => {
    const count = (counts.get(block.id) ?? 0) + 1;
    counts.set(block.id, count);
    return count === 1 ? block : { ...block, id: `${block.id}-${count}` };
  });
}

function canonicalPlainText(
  title: string | null,
  blocks: readonly CanonicalRenderBlock[],
) {
  const rawPlainText = [
    title,
    ...blocks.map((block) => [block.label, block.plainText].filter(Boolean).join("\n")),
  ].filter((value): value is string => Boolean(value)).join("\n\n");
  return exactCanonicalText(rawPlainText, "Canonical render text");
}

export function buildCanonicalRenderDocument(input: {
  title?: unknown;
  blocks: readonly CanonicalRenderBlock[];
}): CanonicalRenderDocument {
  const title = boundedUntrustedText(input.title, 256).value.trim() || null;
  const blocks = uniqueBlockIds(input.blocks);
  const plainText = canonicalPlainText(title, blocks);
  return {
    schemaVersion: CANONICAL_RENDER_DOCUMENT_SCHEMA_VERSION,
    title,
    blocks,
    plainText,
    plainTextTruncated: false,
    targets: CANONICAL_RENDER_TARGETS,
  };
}

export function parseCanonicalRenderTarget(
  value: unknown,
): CanonicalRenderTarget | null {
  return typeof value === "string" &&
    CANONICAL_RENDER_TARGETS.includes(value as CanonicalRenderTarget)
    ? value as CanonicalRenderTarget
    : null;
}

export function canonicalRenderBlocksForTarget(
  document: CanonicalRenderDocument,
  target: CanonicalRenderTarget,
): readonly CanonicalRenderBlock[] {
  if (!parseCanonicalRenderTarget(target)) {
    throw new TypeError(`Unsupported canonical render target: ${String(target)}`);
  }
  const blocks = document.blocks.filter((block) =>
    isSpecialistRuntimeUsable(createSpecialistRuntimeHealth(block.runtimeHealth))
  );
  return blocks.length === document.blocks.length ? document.blocks : blocks;
}

export function canonicalFallbackBlocksForTarget(
  document: CanonicalRenderDocument,
  target: CanonicalRenderTarget,
): readonly CanonicalRenderBlock[] {
  if (!parseCanonicalRenderTarget(target)) {
    throw new TypeError(`Unsupported canonical render target: ${String(target)}`);
  }
  const blocks = document.blocks.filter((block) =>
    requiresSpecialistRuntimeFallback(
      createSpecialistRuntimeHealth(block.runtimeHealth),
    )
  );
  return blocks.length === document.blocks.length ? document.blocks : blocks;
}

export function specialistArtifactContextsForConsumer(
  document: CanonicalRenderDocument,
  consumer: SpecialistArtifactContextConsumer,
): readonly SpecialistArtifactConsumerContext[] {
  if (!SPECIALIST_ARTIFACT_CONTEXT_CONSUMERS.includes(consumer)) {
    throw new TypeError(`Unsupported specialist context consumer: ${String(consumer)}`);
  }
  return document.blocks.map((block) => {
    const runtimeHealth = createSpecialistRuntimeHealth(block.runtimeHealth);
    return {
      ...createSpecialistArtifactContextMetadata(block),
      consumer,
      schemaVersion: SPECIALIST_ARTIFACT_CONTEXT_SCHEMA_VERSION,
      kind: block.type,
      capability: block.capability,
      summary: block.summary,
      plainText: block.plainText,
      payload: block.content,
      bounds: block.bounds,
      runtimeState: block.runtimeState,
      runtimeHealth,
      fallbackRequired: requiresSpecialistRuntimeFallback(runtimeHealth),
      universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    } as SpecialistArtifactConsumerContext;
  });
}

export function projectCanonicalRenderDocument(
  document: CanonicalRenderDocument,
  target: CanonicalRenderTarget,
): CanonicalRenderProjection {
  const blocks = canonicalRenderBlocksForTarget(document, target);
  const fallbackBlocks = canonicalFallbackBlocksForTarget(document, target);
  const plainText = canonicalPlainText(
    blocks.length > 0 ? document.title : null,
    blocks,
  );
  const fallbackPlainText = canonicalPlainText(
    blocks.length === 0 ? document.title : null,
    fallbackBlocks,
  );
  return {
    schemaVersion: document.schemaVersion,
    target,
    title: document.title,
    blocks,
    fallbackBlocks,
    contextBlocks: document.blocks,
    plainText,
    plainTextTruncated: false,
    fallbackPlainText,
    fallbackPlainTextTruncated: false,
  };
}

function externalBinaryHandoffReason(
  block: CanonicalRenderBlock,
): string | null {
  switch (block.type) {
    case "cad":
      return block.content.model.fileName.trim() || block.content.modelStats
        ? "The original CAD model binary is not embedded in the PDF."
        : null;
    case "media_annotations": {
      const media = block.content.media;
      const hasBinaryReference = Boolean(
        media.assetId || media.fileName.trim() || media.mimeType.trim() ||
        media.sizeBytes !== null || media.durationSeconds !== null,
      );
      if (!hasBinaryReference) return null;
      return `The original ${media.kind} binary is not embedded in the PDF.`;
    }
    default:
      return null;
  }
}

export function canonicalSpecialistDeliveryManifest(
  document: CanonicalRenderDocument,
): CanonicalSpecialistDeliveryManifest {
  const blocks = document.blocks.map((block): CanonicalSpecialistDeliveryBlock => {
    const externalHandoffReason = externalBinaryHandoffReason(block);
    return {
      id: block.id,
      type: block.type,
      label: block.label,
      sourceAssetHandling: externalHandoffReason
        ? "external_binary_required"
        : "bounded_machine_readable",
      canonicalPayloadTruncated: block.integrity.contextTruncated,
      externalHandoffReason,
    };
  });
  const externalHandoffBlockIds = blocks.flatMap((block) =>
    block.sourceAssetHandling === "external_binary_required" ? [block.id] : []
  );
  return {
    schemaVersion: 1,
    visibleSummaryIncluded: blocks.length > 0,
    machineReadableArtifact: {
      fileName: CANONICAL_SPECIALIST_ATTACHMENT_FILENAME,
      mediaType: "application/json",
      bounded: true,
    },
    externalHandoffRequired: externalHandoffBlockIds.length > 0,
    externalHandoffBlockIds,
    blocks,
  };
}
