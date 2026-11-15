import {
  MIN_SPECIALIST_CONTEXT_BYTES,
  boundedUntrustedText,
  cleanUntrustedText,
  fitItemsToByteLimit,
  jsonByteLength,
  safeIntegerLimit,
  safeSummary,
} from "@/lib/specialist-artifacts/bounds";
import { specialistActiveRuntimeStateFromContent } from "@/lib/specialist-artifacts/active-state";
import {
  normalizeDataChartConfig,
  restoreImportedDataset,
} from "@/lib/native-tools/data-runtime";
import { restoreSchoolGeoJsonImport } from "@/lib/native-tools/map-runtime";
import { restoreMusicXmlImport } from "@/lib/native-tools/music-runtime";
import {
  SPECIALIST_ARTIFACT_KINDS,
  SPECIALIST_ARTIFACT_CONTEXT_SCHEMA_VERSION,
  type SpecialistArtifactBlockLike,
  type SpecialistArtifactBounds,
  type SpecialistArtifactContext,
  type SpecialistArtifactContextMetadata,
  type SpecialistArtifactContextMetadataInput,
  type SpecialistArtifactKind,
  type SpecialistArtifactLimit,
  type SpecialistArtifactPayloadByKind,
  type SpecialistArtifactTruncationReason,
  type SpecialistCadPayload,
  type SpecialistCapabilityByKind,
  type SpecialistCodeOutputPayload,
  type SpecialistDataChartConfig,
  type SpecialistDesignNotebookPayload,
  type SpecialistDrawingStroke,
  type SpecialistGraphPoint,
  type SpecialistImportedDataset,
  type SpecialistLabDataRow,
  type SpecialistLedgerRow,
  type SpecialistMapMarker,
  type SpecialistMediaAnnotation,
  type SpecialistNotationNote,
  type SpecialistPerformanceLogPayload,
} from "@/lib/specialist-artifacts/contracts";

export const SPECIALIST_ARTIFACT_LIMITS = {
  equation: { maxBytes: 100_000, maxItems: 500 },
  graph: { maxBytes: 128_000, maxItems: 2_000 },
  ledger: { maxBytes: 128_000, maxItems: 1_000 },
  spreadsheet: { maxBytes: 1_250_000, maxItems: 10_000 },
  map: { maxBytes: 1_250_000, maxItems: 12_500 },
  drawing: { maxBytes: 1_500_000, maxItems: 25_000 },
  code_output: { maxBytes: 250_000, maxItems: 250 },
  notation: { maxBytes: 700_000, maxItems: 4_000 },
  cad: { maxBytes: 256_000, maxItems: 2_000 },
  media_annotations: { maxBytes: 256_000, maxItems: 500 },
  lab_data: { maxBytes: 1_250_000, maxItems: 10_000 },
  design_notebook: { maxBytes: 512_000, maxItems: 2_000 },
  performance_log: { maxBytes: 512_000, maxItems: 2_000 },
  procedure_checklist: { maxBytes: 128_000, maxItems: 5_000 },
} as const satisfies Record<SpecialistArtifactKind, SpecialistArtifactLimit>;

export type SpecialistArtifactSerializationOptions = {
  maxBytes?: number;
  maxItems?: number;
  artifactContext?: SpecialistArtifactContextMetadataInput;
};

export type MediaAnnotationsSerializationOptions =
  SpecialistArtifactSerializationOptions & {
    mediaKind?: "audio" | "video";
  };

export type SpecialistArtifactContextInput =
  | SpecialistArtifactBlockLike
  | SpecialistArtifactContextMetadataInput & {
      kind: SpecialistArtifactKind;
      content: unknown;
      mediaKind?: "audio" | "video";
      artifactContext?: SpecialistArtifactContextMetadataInput | null;
    };

type SanitizationState = {
  fieldTruncated: boolean;
  invalidItems: number;
};

type BoundedItems<T> = {
  items: T[];
  sourceItemCount: number;
  itemLimited: boolean;
};

type TaggedCodeLine = {
  section: "output" | "source";
  value: string;
};

const BLOCK_KIND = {
  equation: "equation",
  graph: "graph",
  ledger: "ledger",
  spreadsheet: "spreadsheet",
  map: "map",
  drawing: "drawing",
  code: "code_output",
  music_notation: "notation",
  cad: "cad",
  audio: "media_annotations",
  video: "media_annotations",
  data_table: "lab_data",
  design_notebook: "design_notebook",
  performance_log: "performance_log",
  procedure_checklist: "procedure_checklist",
} as const satisfies Record<string, SpecialistArtifactKind>;

const SPECIALIST_CONTEXT_ANCHOR_LIMIT = 12;
const SPECIALIST_CONTEXT_ANCHOR_SCAN_LIMIT = 256;
const SPECIALIST_CONTEXT_ID_MAX_BYTES = 128;
const SPECIALIST_CONTEXT_LABEL_MAX_BYTES = 256;
const SPECIALIST_CONTEXT_TEXT_MAX_BYTES = 2_048;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function optionalBoundedText(value: unknown, maxBytes: number): string | null {
  return boundedUntrustedText(value, maxBytes).value.trim() || null;
}

function contextArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.slice(0, SPECIALIST_CONTEXT_ANCHOR_SCAN_LIMIT);
  return typeof value === "string" && value.trim() ? [value] : [];
}

function uniqueRubricAnchors(
  anchors: SpecialistArtifactContextMetadata["rubricAnchors"],
): SpecialistArtifactContextMetadata["rubricAnchors"] {
  const seen = new Set<string>();
  return anchors.filter((anchor) => {
    const key = JSON.stringify([
      anchor.criterionId?.toLowerCase() ?? null,
      anchor.criterion.toLowerCase(),
      anchor.location?.toLowerCase() ?? null,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, SPECIALIST_CONTEXT_ANCHOR_LIMIT);
}

function uniqueSourceAnchors(
  anchors: SpecialistArtifactContextMetadata["sourceAnchors"],
): SpecialistArtifactContextMetadata["sourceAnchors"] {
  const result: SpecialistArtifactContextMetadata["sourceAnchors"] = [];
  const indexes = new Map<string, number>();
  for (const anchor of anchors) {
    const key = JSON.stringify([
      anchor.sourceId.toLowerCase(),
      anchor.location?.toLowerCase() ?? null,
    ]);
    const existingIndex = indexes.get(key);
    if (existingIndex !== undefined) {
      const existing = result[existingIndex];
      if (!existing.label && anchor.label) {
        result[existingIndex] = { ...existing, label: anchor.label };
      }
      continue;
    }
    indexes.set(key, result.length);
    result.push(anchor);
  }
  return result.slice(0, SPECIALIST_CONTEXT_ANCHOR_LIMIT);
}

export function createSpecialistArtifactContextMetadata(
  input: SpecialistArtifactContextMetadataInput = {},
): SpecialistArtifactContextMetadata {
  const assignment = asRecord(input.assignmentIdentity);
  const assignmentId = optionalBoundedText(
    assignment.id ?? assignment.assignmentId,
    SPECIALIST_CONTEXT_ID_MAX_BYTES,
  );
  const assignmentTitle = optionalBoundedText(
    assignment.title ?? assignment.assignmentTitle,
    SPECIALIST_CONTEXT_LABEL_MAX_BYTES,
  );
  const assignmentIdentity = assignmentId || assignmentTitle
    ? { id: assignmentId ?? "", title: assignmentTitle ?? "" }
    : null;
  const academicBand = optionalBoundedText(
    input.academicBand,
    64,
  )?.replaceAll(/\s+/gu, " ") ?? null;

  const rubricAnchors = uniqueRubricAnchors(contextArray(input.rubricAnchors).flatMap((value) => {
    if (typeof value === "string") {
      const criterion = optionalBoundedText(value, SPECIALIST_CONTEXT_TEXT_MAX_BYTES);
      return criterion ? [{ criterionId: null, criterion, location: null }] : [];
    }
    const anchor = asRecord(value);
    const criterion = optionalBoundedText(
      anchor.criterion ?? anchor.text ?? anchor.label ?? anchor.description,
      SPECIALIST_CONTEXT_TEXT_MAX_BYTES,
    );
    if (!criterion) return [];
    return [{
      criterionId: optionalBoundedText(
        anchor.criterionId ?? anchor.id,
        SPECIALIST_CONTEXT_ID_MAX_BYTES,
      ),
      criterion,
      location: optionalBoundedText(
        anchor.location ?? anchor.page,
        SPECIALIST_CONTEXT_LABEL_MAX_BYTES,
      ),
    }];
  }));

  const sourceAnchors = uniqueSourceAnchors(contextArray(input.sourceAnchors).flatMap((value) => {
    if (typeof value === "string") {
      const sourceId = optionalBoundedText(value, SPECIALIST_CONTEXT_ID_MAX_BYTES);
      return sourceId ? [{ sourceId, label: null, location: null }] : [];
    }
    const anchor = asRecord(value);
    const sourceId = optionalBoundedText(
      anchor.sourceId ?? anchor.source_id ?? anchor.id,
      SPECIALIST_CONTEXT_ID_MAX_BYTES,
    );
    if (!sourceId) return [];
    return [{
      sourceId,
      label: optionalBoundedText(
        anchor.label ?? anchor.title,
        SPECIALIST_CONTEXT_LABEL_MAX_BYTES,
      ),
      location: optionalBoundedText(
        anchor.location ?? anchor.page,
        SPECIALIST_CONTEXT_LABEL_MAX_BYTES,
      ),
    }];
  }));

  return {
    assignmentIdentity,
    academicBand,
    rubricAnchors,
    sourceAnchors,
  };
}

function resolvedLimits(
  kind: SpecialistArtifactKind,
  options: SpecialistArtifactSerializationOptions,
): SpecialistArtifactLimit {
  const hard = SPECIALIST_ARTIFACT_LIMITS[kind];
  return {
    maxBytes: safeIntegerLimit(
      options.maxBytes,
      hard.maxBytes,
      hard.maxBytes,
      MIN_SPECIALIST_CONTEXT_BYTES,
    ),
    maxItems: safeIntegerLimit(options.maxItems, hard.maxItems, hard.maxItems),
  };
}

function fieldByteBudget(
  maxBytes: number,
  fieldCount: number,
  hardMaximum: number,
): number {
  return Math.max(
    8,
    Math.min(hardMaximum, Math.floor(Math.max(64, maxBytes - 128) / fieldCount)),
  );
}

function boundedText(
  value: unknown,
  maxBytes: number,
  state: SanitizationState,
  trim = true,
): string {
  const result = boundedUntrustedText(value, maxBytes);
  if (result.truncated) state.fieldTruncated = true;
  return trim ? result.value.trim() : result.value;
}

function finiteNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  const number = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(number) || number < minimum || number > maximum) return null;
  return number;
}

function rounded(value: number, places = 6): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function collectArrayItems<T>(input: {
  value: unknown;
  maxItems: number;
  state: SanitizationState;
  parse: (value: unknown, index: number) => T | null;
}): BoundedItems<T> {
  const source = Array.isArray(input.value) ? input.value : [];
  if (source.length === 0 || input.maxItems === 0) {
    return {
      items: [],
      sourceItemCount: source.length,
      itemLimited: source.length > 0,
    };
  }

  const items: T[] = [];
  const scanLimit = Math.min(
    source.length,
    Math.max(input.maxItems + 32, input.maxItems * 4),
    20_000,
  );
  let scanned = 0;
  for (; scanned < scanLimit && items.length < input.maxItems; scanned += 1) {
    const item = input.parse(source[scanned], scanned);
    if (item === null) {
      input.state.invalidItems += 1;
    } else {
      items.push(item);
    }
  }
  return {
    items,
    sourceItemCount: source.length,
    itemLimited: scanned < source.length,
  };
}

function truncationReasons(input: {
  byteTruncated: boolean;
  fieldTruncated: boolean;
  invalidItems: number;
  itemLimited: boolean;
}): SpecialistArtifactTruncationReason[] {
  const reasons: SpecialistArtifactTruncationReason[] = [];
  if (input.itemLimited) reasons.push("item_limit");
  if (input.byteTruncated) reasons.push("byte_limit");
  if (input.fieldTruncated) reasons.push("field_limit");
  if (input.invalidItems > 0) reasons.push("invalid_items");
  return reasons;
}

function context<K extends SpecialistArtifactKind>(input: {
  kind: K;
  capability: SpecialistCapabilityByKind[K];
  summary: string;
  payload: SpecialistArtifactPayloadByKind[K];
  runtimeSource: unknown;
  limits: SpecialistArtifactLimit;
  includedItems: number;
  sourceItemCount: number;
  byteLength: number;
  byteTruncated: boolean;
  state: SanitizationState;
  itemLimited: boolean;
  artifactContext?: SpecialistArtifactContextMetadataInput;
}): SpecialistArtifactContext<K> {
  const reasons = truncationReasons({
    byteTruncated: input.byteTruncated,
    fieldTruncated: input.state.fieldTruncated,
    invalidItems: input.state.invalidItems,
    itemLimited: input.itemLimited,
  });
  const bounds: SpecialistArtifactBounds = {
    ...input.limits,
    byteLength: input.byteLength,
    itemCount: input.includedItems,
    sourceItemCount: input.sourceItemCount,
    truncated: reasons.length > 0,
    reasons,
  };
  return {
    ...createSpecialistArtifactContextMetadata(input.artifactContext),
    schemaVersion: SPECIALIST_ARTIFACT_CONTEXT_SCHEMA_VERSION,
    kind: input.kind,
    capability: input.capability,
    summary: safeSummary(input.summary),
    payload: input.payload,
    runtime: specialistActiveRuntimeStateFromContent(input.runtimeSource),
    bounds,
  } as SpecialistArtifactContext<K>;
}

export function serializeEquationArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"equation"> {
  const kind = "equation" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const fieldBytes = fieldByteBudget(limits.maxBytes, 7, 32_000);
  const payload = {
    latex: boundedText(source.latex, fieldBytes, state, false),
    explanation: boundedText(source.explanation, fieldBytes, state, false),
    problemText: boundedText(source.problemText, fieldBytes, state, false),
    reasoning: boundedText(source.reasoning, fieldBytes, state, false),
    answer: boundedText(source.answer, fieldBytes, state, false),
    handwriting: boundedText(source.handwriting, fieldBytes, state, false),
    studentAuthoredText: boundedText(source.studentAuthoredText, fieldBytes, state, false),
  };
  const byteLength = jsonByteLength(payload);
  if (byteLength > limits.maxBytes) {
    throw new RangeError("Equation content exceeds the canonical specialist limit.");
  }
  const itemCount = Object.values(payload).filter(Boolean).length;
  return context({
    kind,
    runtimeSource: content,
    capability: "equation_editor",
    summary: `Equation workspace with ${itemCount} recorded work field${itemCount === 1 ? "" : "s"}.`,
    payload,
    limits,
    includedItems: itemCount,
    sourceItemCount: itemCount,
    byteLength,
    byteTruncated: false,
    state,
    itemLimited: false,
    artifactContext: options.artifactContext,
  });
}

export function serializeGraphArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"graph"> {
  const kind = "graph" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const expression = boundedText(
    source.expression,
    fieldByteBudget(limits.maxBytes, 4, 4_096),
    state,
  );
  const points = collectArrayItems<SpecialistGraphPoint>({
    value: source.points,
    maxItems: limits.maxItems,
    state,
    parse(value) {
      const point = asRecord(value);
      const x = finiteNumber(point.x, -1_000_000_000_000, 1_000_000_000_000);
      const y = finiteNumber(point.y, -1_000_000_000_000, 1_000_000_000_000);
      return x === null || y === null ? null : { x: rounded(x), y: rounded(y) };
    },
  });
  const fitted = fitItemsToByteLimit({
    items: points.items,
    ...limits,
    buildPayload: (items) => ({ expression, points: [...items] }),
  });
  return context({
    kind,
    runtimeSource: content,
    capability: "graphing",
    summary: `Function graph with ${fitted.includedItems} sampled point${fitted.includedItems === 1 ? "" : "s"}.`,
    payload: fitted.payload,
    limits,
    includedItems: fitted.includedItems,
    sourceItemCount: points.sourceItemCount,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: points.itemLimited,
    artifactContext: options.artifactContext,
  });
}

function ledgerPayload(rows: readonly SpecialistLedgerRow[]) {
  const debitTotal = rounded(rows.reduce((sum, row) => sum + row.debit, 0), 2);
  const creditTotal = rounded(rows.reduce((sum, row) => sum + row.credit, 0), 2);
  const difference = rounded(debitTotal - creditTotal, 2);
  return {
    rows: [...rows],
    balance: {
      debitTotal,
      creditTotal,
      difference,
      balanced: Math.abs(difference) < 0.005,
    },
  };
}

export function serializeLedgerArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"ledger"> {
  const kind = "ledger" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const accountBytes = fieldByteBudget(limits.maxBytes, 8, 2_048);
  const rows = collectArrayItems<SpecialistLedgerRow>({
    value: source.rows,
    maxItems: limits.maxItems,
    state,
    parse(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const row = asRecord(value);
      return {
        account: boundedText(row.account, accountBytes, state),
        debit: rounded(finiteNumber(row.debit, -1_000_000_000_000, 1_000_000_000_000) ?? 0, 2),
        credit: rounded(finiteNumber(row.credit, -1_000_000_000_000, 1_000_000_000_000) ?? 0, 2),
      };
    },
  });
  const fitted = fitItemsToByteLimit({
    items: rows.items,
    ...limits,
    buildPayload: ledgerPayload,
  });
  const balance = fitted.payload.balance;
  return context({
    kind,
    runtimeSource: content,
    capability: "accounting_ledger",
    summary: `Ledger with ${fitted.includedItems} row${fitted.includedItems === 1 ? "" : "s"}; debits ${balance.debitTotal}, credits ${balance.creditTotal}; ${balance.balanced ? "balanced" : "not balanced"}.`,
    payload: fitted.payload,
    limits,
    includedItems: fitted.includedItems,
    sourceItemCount: rows.sourceItemCount,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: rows.itemLimited,
    artifactContext: options.artifactContext,
  });
}

export function serializeSpreadsheetArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"spreadsheet"> {
  const kind = "spreadsheet" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const cells = asRecord(source.cells);
  const dataset = canonicalDataset(source.dataset, state);
  const chartConfig = canonicalChartConfig(source.chartConfig, dataset);
  const datasetItems = dataset
    ? dataset.columns.length + dataset.rows.length * dataset.columns.length
    : 0;
  const cellLimit = Math.max(0, limits.maxItems - datasetItems);
  const keys = Object.keys(cells);
  const valueBytes = fieldByteBudget(limits.maxBytes, 4, 8_192);
  const entries: Array<readonly [string, string]> = [];
  const seen = new Set<string>();
  const scanLimit = Math.min(keys.length, Math.max(cellLimit + 32, cellLimit * 4), 20_000);
  let scanned = 0;
  for (; scanned < scanLimit && entries.length < cellLimit; scanned += 1) {
    const address = keys[scanned]!.toUpperCase();
    const rawValue = cells[keys[scanned]!];
    if (!/^[A-Z]{1,3}[1-9]\d{0,5}$/u.test(address) || seen.has(address) ||
      (typeof rawValue !== "string" && typeof rawValue !== "number")) {
      state.invalidItems += 1;
      continue;
    }
    seen.add(address);
    entries.push([address, boundedText(String(rawValue), valueBytes, state, false)]);
  }
  entries.sort(([left], [right]) => left.localeCompare(right, "en"));
  const fitted = fitItemsToByteLimit({
    items: entries,
    maxBytes: limits.maxBytes,
    maxItems: cellLimit,
    buildPayload: (items) => ({
      cells: Object.fromEntries(items),
      dataset,
      chartConfig,
    }),
  });
  const formulaCount = Object.values(fitted.payload.cells)
    .filter((value) => value.trimStart().startsWith("=")).length;
  return context({
    kind,
    runtimeSource: content,
    capability: "spreadsheet",
    summary: `Spreadsheet with ${fitted.includedItems} populated cell${fitted.includedItems === 1 ? "" : "s"} and ${formulaCount} formula${formulaCount === 1 ? "" : "s"}.`,
    payload: fitted.payload,
    limits,
    includedItems: fitted.includedItems + datasetItems,
    sourceItemCount: keys.length + datasetItems,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: scanned < keys.length || datasetItems > limits.maxItems,
    artifactContext: options.artifactContext,
  });
}

function canonicalDataset(
  value: unknown,
  state: SanitizationState,
): SpecialistImportedDataset | null {
  const restored = restoreImportedDataset(value);
  if (value !== undefined && value !== null && !restored) state.invalidItems += 1;
  return restored
    ? {
        fileName: restored.fileName,
        columns: [...restored.columns],
        rows: restored.rows.map((row) => [...row]),
      }
    : null;
}

function canonicalChartConfig(
  value: unknown,
  dataset: SpecialistImportedDataset | null,
): SpecialistDataChartConfig | null {
  return dataset ? normalizeDataChartConfig(value, dataset) : null;
}

export function serializeMapArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"map"> {
  const kind = "map" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const scalarBytes = fieldByteBudget(limits.maxBytes, 8, 4_096);
  const title = boundedText(source.title, scalarBytes, state);
  const legend = boundedText(source.legend, scalarBytes, state);
  const scale = boundedText(source.scale, scalarBytes, state);
  const sourceAttribution = boundedText(source.sourceAttribution, scalarBytes, state);
  const restoredMap = restoreSchoolGeoJsonImport(source.importedMap);
  if (source.importedMap !== undefined && source.importedMap !== null && !restoredMap) {
    state.invalidItems += 1;
  }
  const importedMap = restoredMap
    ? {
        fileName: restoredMap.fileName,
        data: restoredMap.data as unknown as Record<string, unknown>,
        analysis: { ...restoredMap.analysis, bounds: [...restoredMap.analysis.bounds] as [number, number, number, number] },
      }
    : null;
  const importedItems = importedMap
    ? importedMap.analysis.coordinateCount + importedMap.analysis.featureCount
    : 0;
  const markers = collectArrayItems<SpecialistMapMarker>({
    value: source.markers,
    maxItems: Math.max(0, limits.maxItems - importedItems),
    state,
    parse(value, index) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const marker = asRecord(value);
      const latitude = finiteNumber(marker.latitude, -90, 90);
      const longitude = finiteNumber(marker.longitude, -180, 180);
      if (latitude === null || longitude === null) return null;
      return {
        id: boundedText(marker.id, Math.min(128, scalarBytes), state) || `marker-${index + 1}`,
        latitude: rounded(latitude, 2),
        longitude: rounded(longitude, 2),
        label: boundedText(marker.label, scalarBytes, state),
        source: boundedText(marker.source, scalarBytes, state),
      };
    },
  });
  const fitted = fitItemsToByteLimit({
    items: markers.items,
    ...limits,
    buildPayload: (items) => ({
      title,
      legend,
      scale,
      sourceAttribution,
      markers: [...items],
      importedMap,
    }),
  });
  return context({
    kind,
    runtimeSource: content,
    capability: "map_workspace",
    summary: `Map with ${fitted.includedItems} privacy-rounded marker${fitted.includedItems === 1 ? "" : "s"}; source attribution ${sourceAttribution ? "included" : "missing"}.`,
    payload: fitted.payload,
    limits,
    includedItems: fitted.includedItems + importedItems,
    sourceItemCount: markers.sourceItemCount + importedItems,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: markers.itemLimited || importedItems > limits.maxItems,
    artifactContext: options.artifactContext,
  });
}

export function serializeDrawingArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"drawing"> {
  const kind = "drawing" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const rawStrokes = Array.isArray(source.strokes) ? source.strokes : [];
  const logicalWidth = rounded(finiteNumber(source.logicalWidth, 1, 100_000) ?? 800, 3);
  const logicalHeight = rounded(finiteNumber(source.logicalHeight, 1, 100_000) ?? 400, 3);
  const strokes: SpecialistDrawingStroke[] = [];
  let sourcePointCount = 0;
  let includedPointCount = 0;
  const strokeScanLimit = Math.min(rawStrokes.length, 5_000);
  for (let index = 0; index < strokeScanLimit && includedPointCount < limits.maxItems; index += 1) {
    const rawStroke = asRecord(rawStrokes[index]);
    const rawPoints = Array.isArray(rawStroke.points) ? rawStroke.points : [];
    sourcePointCount += rawPoints.length;
    if (rawPoints.length === 0) {
      state.invalidItems += 1;
      continue;
    }
    const points = collectArrayItems<{ x: number; y: number }>({
      value: rawPoints,
      maxItems: limits.maxItems - includedPointCount,
      state,
      parse(value) {
        const point = asRecord(value);
        const x = finiteNumber(point.x, 0, 1);
        const y = finiteNumber(point.y, 0, 1);
        return x === null || y === null ? null : { x: rounded(x), y: rounded(y) };
      },
    });
    if (points.items.length === 0) continue;
    includedPointCount += points.items.length;
    strokes.push({
      id: boundedText(rawStroke.id, 128, state) || `stroke-${index + 1}`,
      color: /^#[0-9a-f]{6}$/iu.test(String(rawStroke.color))
        ? String(rawStroke.color).toLowerCase()
        : "#0f172a",
      width: rounded(finiteNumber(rawStroke.width, 1, 24) ?? 3, 3),
      points: points.items,
    });
  }
  for (let index = strokeScanLimit; index < Math.min(rawStrokes.length, 20_000); index += 1) {
    const rawPoints = asRecord(rawStrokes[index]).points;
    if (Array.isArray(rawPoints)) sourcePointCount += rawPoints.length;
  }
  const fitted = fitItemsToByteLimit({
    items: strokes,
    maxItems: strokes.length,
    maxBytes: limits.maxBytes,
    buildPayload: (items) => ({ logicalWidth, logicalHeight, strokes: [...items] }),
  });
  const fittedPointCount = fitted.payload.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
  return context({
    kind,
    runtimeSource: content,
    capability: "drawing_canvas",
    summary: `Drawing with ${fitted.payload.strokes.length} stroke${fitted.payload.strokes.length === 1 ? "" : "s"} and ${fittedPointCount} point${fittedPointCount === 1 ? "" : "s"}.`,
    payload: fitted.payload,
    limits,
    includedItems: fittedPointCount,
    sourceItemCount: sourcePointCount,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: strokeScanLimit < rawStrokes.length || includedPointCount < sourcePointCount,
    artifactContext: options.artifactContext,
  });
}

function countLines(value: string): number {
  if (!value) return 0;
  let count = 1;
  for (const character of value) {
    if (character === "\n") count += 1;
  }
  return count;
}

function codeLanguage(value: unknown): SpecialistCodeOutputPayload["language"] {
  return value === "python" || value === "javascript" ? value : "text";
}

export function serializeCodeOutputArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"code_output"> {
  const kind = "code_output" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const rawSource = cleanUntrustedText(source.code ?? source.source);
  const rawOutput = Array.isArray(source.output)
    ? source.output
    : typeof source.output === "string"
      ? cleanUntrustedText(source.output).split("\n")
      : [];
  const lineBytes = fieldByteBudget(limits.maxBytes, 8, 8_192);
  const sourceLineCount = countLines(rawSource);
  const sourceLines = rawSource
    ? rawSource.split("\n", Math.min(sourceLineCount, Math.max(32, limits.maxItems * 2)))
        .map((line) => boundedText(line, lineBytes, state, false))
    : [];
  const outputLines: string[] = [];
  const outputScanLimit = Math.min(rawOutput.length, Math.max(32, limits.maxItems * 2), 20_000);
  for (let index = 0; index < outputScanLimit; index += 1) {
    const line = rawOutput[index];
    if (typeof line !== "string" && typeof line !== "number") {
      state.invalidItems += 1;
      continue;
    }
    outputLines.push(boundedText(String(line), lineBytes, state, false));
  }
  const tagged: TaggedCodeLine[] = [];
  const longest = Math.max(sourceLines.length, outputLines.length);
  for (let index = 0; index < longest && tagged.length < limits.maxItems; index += 1) {
    if (index < sourceLines.length) tagged.push({ section: "source", value: sourceLines[index]! });
    if (index < outputLines.length && tagged.length < limits.maxItems) {
      tagged.push({ section: "output", value: outputLines[index]! });
    }
  }
  const language = codeLanguage(source.language);
  const executionSource = asRecord(source.execution);
  const executionRuntime = boundedText(executionSource.runtime, 96, state);
  const executionDuration = finiteNumber(executionSource.durationMs, 0, 86_400_000);
  const execution = executionRuntime && executionDuration !== null
    ? { runtime: executionRuntime, durationMs: rounded(executionDuration, 3) }
    : null;
  const fitted = fitItemsToByteLimit({
    items: tagged,
    ...limits,
    buildPayload(items) {
      return {
        language,
        source: items.filter((item) => item.section === "source").map((item) => item.value).join("\n"),
        output: items.filter((item) => item.section === "output").map((item) => item.value),
        execution,
      };
    },
  });
  const includedSourceLines = fitted.payload.source ? countLines(fitted.payload.source) : 0;
  const includedOutputLines = fitted.payload.output.length;
  const sourceItemCount = sourceLineCount + rawOutput.length;
  return context({
    kind,
    runtimeSource: content,
    capability: "code_runner",
    summary: `${language === "text" ? "Code" : language === "python" ? "Python" : "JavaScript"} context with ${includedSourceLines} source line${includedSourceLines === 1 ? "" : "s"} and ${includedOutputLines} output line${includedOutputLines === 1 ? "" : "s"}.`,
    payload: fitted.payload,
    limits,
    includedItems: fitted.includedItems,
    sourceItemCount,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: sourceLines.length < sourceLineCount || outputScanLimit < rawOutput.length || tagged.length < sourceItemCount,
    artifactContext: options.artifactContext,
  });
}

export function serializeNotationArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"notation"> {
  const kind = "notation" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const restoredMusicXml = restoreMusicXmlImport(source.musicXml);
  if (source.musicXml !== undefined && source.musicXml !== null && !restoredMusicXml) {
    state.invalidItems += 1;
  }
  const musicXml = restoredMusicXml
    ? {
        xml: restoredMusicXml.xml,
        metadata: { ...restoredMusicXml.metadata },
      }
    : null;
  const importedNoteCount = musicXml?.metadata.noteCount ?? 0;
  const notes = collectArrayItems<SpecialistNotationNote>({
    value: source.notes,
    maxItems: Math.max(0, limits.maxItems - importedNoteCount),
    state,
    parse(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const note = asRecord(value);
      const pitch = boundedText(note.pitch, 24, state);
      const beats = finiteNumber(note.beats, 0.03125, 64);
      return /^[A-G](?:#|b)?-?\d{1,2}$/u.test(pitch) && beats !== null
        ? { pitch, beats: rounded(beats, 5) }
        : null;
    },
  });
  const fitted = fitItemsToByteLimit({
    items: notes.items,
    maxBytes: limits.maxBytes,
    maxItems: Math.max(0, limits.maxItems - importedNoteCount),
    buildPayload: (items) => ({ notes: [...items], musicXml }),
  });
  const beats = rounded(fitted.payload.notes.reduce((sum, note) => sum + note.beats, 0), 3);
  return context({
    kind,
    runtimeSource: content,
    capability: "music_notation",
    summary: `Notation with ${fitted.includedItems} typed note${fitted.includedItems === 1 ? "" : "s"} across ${beats} beat${beats === 1 ? "" : "s"}${musicXml ? ` and ${musicXml.metadata.noteCount} imported MusicXML notes` : ""}.`,
    payload: fitted.payload,
    limits,
    includedItems: fitted.includedItems + importedNoteCount,
    sourceItemCount: notes.sourceItemCount + importedNoteCount,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: notes.itemLimited || importedNoteCount > limits.maxItems,
    artifactContext: options.artifactContext,
  });
}

function cadDimension(value: unknown): number | null {
  const number = finiteNumber(value, 0, 1_000_000_000_000);
  return number === null ? null : rounded(number);
}

function safeFileName(
  value: unknown,
  maxBytes: number,
  state: SanitizationState,
): string {
  const cleaned = cleanUntrustedText(value);
  const name = cleaned.split(/[\\/]/u).at(-1) ?? "";
  return boundedText(name, maxBytes, state);
}

export function serializeCadArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"cad"> {
  const kind = "cad" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const dimensions = asRecord(source.dimensions);
  const model = asRecord(source.model);
  const scalarBytes = fieldByteBudget(limits.maxBytes, 8, 4_096);
  const units: SpecialistCadPayload["units"] = source.units === "cm" || source.units === "in" || source.units === "m"
    ? source.units
    : "mm";
  const width = cadDimension(dimensions.width ?? source.width);
  const height = cadDimension(dimensions.height ?? source.height);
  const depth = cadDimension(dimensions.depth ?? source.depth);
  const fileName = safeFileName(model.fileName ?? source.modelFileName, scalarBytes, state);
  const rawFormat = boundedText(model.format ?? source.modelFormat, 24, state).toLowerCase();
  const format = /^[a-z0-9.+-]{1,20}$/u.test(rawFormat) ? rawFormat : null;
  const designSource = asRecord(source.design);
  const primitive = designSource.primitive === "cylinder"
    ? "cylinder" as const
    : designSource.primitive === "box"
      ? "box" as const
      : null;
  const designDimensions = Object.fromEntries(
    Object.entries(asRecord(designSource.dimensions)).slice(0, 12).flatMap(([key, value]) => {
      const safeKey = boundedText(key, 64, state);
      const number = cadDimension(value);
      return safeKey && number !== null ? [[safeKey, number] as const] : [];
    }),
  );
  const design = primitive
    ? {
        primitive,
        dimensions: designDimensions,
        volume: cadDimension(designSource.volume),
        polygonCount: finiteNumber(designSource.polygonCount, 0, 100_000_000),
        triangleCount: finiteNumber(designSource.triangleCount, 0, 100_000_000),
      }
    : null;
  const modelStatsSource = asRecord(source.modelStats);
  const modelByteLength = finiteNumber(modelStatsSource.byteLength, 0, 100_000_000);
  const modelTriangleCount = finiteNumber(modelStatsSource.triangleCount, 0, 100_000_000);
  const modelVertexCount = finiteNumber(modelStatsSource.vertexCount, 0, 100_000_000);
  const modelStats = modelByteLength !== null && modelTriangleCount !== null && modelVertexCount !== null
    ? {
        byteLength: Math.trunc(modelByteLength),
        triangleCount: Math.trunc(modelTriangleCount),
        vertexCount: Math.trunc(modelVertexCount),
      }
    : null;
  const constraints = collectArrayItems<string>({
    value: source.constraints,
    maxItems: limits.maxItems,
    state,
    parse(value) {
      if (typeof value !== "string") return null;
      return boundedText(value, scalarBytes, state);
    },
  });
  const fitted = fitItemsToByteLimit({
    items: constraints.items,
    ...limits,
    buildPayload: (items) => ({
      units,
      dimensions: { width, height, depth },
      constraints: [...items],
      model: { fileName, format },
      design,
      modelStats,
    }),
  });
  const dimensionCount = [width, height, depth].filter((value) => value !== null).length;
  return context({
    kind,
    runtimeSource: content,
    capability: "cad_workspace",
    summary: `CAD package with ${dimensionCount} dimension${dimensionCount === 1 ? "" : "s"}, ${fitted.includedItems} constraint${fitted.includedItems === 1 ? "" : "s"}, and ${format ? `${format.toUpperCase()} model metadata` : "no model metadata"}.`,
    payload: fitted.payload,
    limits,
    includedItems: fitted.includedItems,
    sourceItemCount: constraints.sourceItemCount,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: constraints.itemLimited,
    artifactContext: options.artifactContext,
  });
}

function mediaKind(
  source: Record<string, unknown>,
  preferred: "audio" | "video" | undefined,
): "audio" | "video" {
  const value = source.kind ?? source.media_kind;
  return preferred ?? (value === "video" ? "video" : "audio");
}

export function serializeMediaAnnotationsArtifactContext(
  content: unknown,
  options: MediaAnnotationsSerializationOptions = {},
): SpecialistArtifactContext<"media_annotations"> {
  const kind = "media_annotations" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const media = asRecord(source.media);
  const scalarBytes = fieldByteBudget(limits.maxBytes, 8, 4_096);
  const resolvedMediaKind = mediaKind(media, options.mediaKind);
  const durationSeconds = finiteNumber(
    media.durationSeconds ?? media.duration_seconds,
    0,
    86_400,
  );
  const fileName = safeFileName(media.fileName ?? media.file_name, scalarBytes, state);
  const assetId = optionalBoundedText(media.assetId ?? media.id, 128);
  const mimeType = boundedText(media.mimeType ?? media.mime_type, Math.min(128, scalarBytes), state);
  const size = finiteNumber(media.sizeBytes ?? media.file_size_bytes, 0, Number.MAX_SAFE_INTEGER);
  const annotations = collectArrayItems<SpecialistMediaAnnotation>({
    value: source.annotations,
    maxItems: limits.maxItems,
    state,
    parse(value, index) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const annotation = asRecord(value);
      const note = boundedText(annotation.note, scalarBytes, state);
      if (!note) return null;
      const rawTime = finiteNumber(annotation.timeSeconds ?? annotation.time_seconds, 0, 86_400) ?? 0;
      const timeSeconds = durationSeconds === null
        ? rawTime
        : Math.min(rawTime, durationSeconds);
      return {
        id: boundedText(annotation.id, Math.min(128, scalarBytes), state) || `annotation-${index + 1}`,
        timeSeconds: rounded(timeSeconds, 3),
        note,
        author: annotation.author === "teacher" ? "teacher" : "student",
      };
    },
  });
  annotations.items.sort((left, right) => left.timeSeconds - right.timeSeconds);
  const fitted = fitItemsToByteLimit({
    items: annotations.items,
    ...limits,
    buildPayload: (items) => ({
      media: {
        assetId,
        kind: resolvedMediaKind,
        fileName,
        mimeType,
        sizeBytes: size === null ? null : Math.trunc(size),
        durationSeconds: durationSeconds === null ? null : rounded(durationSeconds, 3),
      },
      annotations: [...items],
    }),
  });
  return context({
    kind,
    runtimeSource: content,
    capability: resolvedMediaKind === "audio" ? "audio_review" : "video_review",
    summary: `${resolvedMediaKind === "audio" ? "Audio" : "Video"} review with ${fitted.includedItems} timestamp annotation${fitted.includedItems === 1 ? "" : "s"}; recording metadata ${fileName || mimeType ? "included" : "missing"}.`,
    payload: fitted.payload,
    limits,
    includedItems: fitted.includedItems,
    sourceItemCount: annotations.sourceItemCount,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: annotations.itemLimited,
    artifactContext: options.artifactContext,
  });
}

export function serializeLabDataArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"lab_data"> {
  const kind = "lab_data" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const dataset = canonicalDataset(source.dataset, state);
  const chartConfig = canonicalChartConfig(source.chartConfig, dataset);
  const datasetItems = dataset
    ? dataset.columns.length + dataset.rows.length * dataset.columns.length
    : 0;
  const scalarBytes = fieldByteBudget(limits.maxBytes, 12, 8_192);
  const rows = collectArrayItems<SpecialistLabDataRow>({
    value: source.rows,
    maxItems: Math.max(0, limits.maxItems - datasetItems),
    state,
    parse(value, index) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const row = asRecord(value);
      return {
        id: boundedText(row.id, Math.min(128, scalarBytes), state) || `row-${index + 1}`,
        label: boundedText(row.label, scalarBytes, state),
        value: boundedText(row.value, scalarBytes, state),
        unit: boundedText(row.unit, scalarBytes, state),
        uncertainty: boundedText(row.uncertainty, scalarBytes, state),
        observation: boundedText(row.observation, scalarBytes, state),
      };
    },
  });
  const fitted = fitItemsToByteLimit({
    items: rows.items,
    maxBytes: limits.maxBytes,
    maxItems: Math.max(0, limits.maxItems - datasetItems),
    buildPayload: (items) => ({ rows: [...items], dataset, chartConfig }),
  });
  const measurementCount = fitted.payload.rows.filter((row) => row.value).length;
  const observationCount = fitted.payload.rows.filter((row) => row.observation).length;
  return context({
    kind,
    runtimeSource: content,
    capability: "data_lab",
    summary: `Lab data with ${fitted.includedItems} row${fitted.includedItems === 1 ? "" : "s"}, ${measurementCount} measurement${measurementCount === 1 ? "" : "s"}, and ${observationCount} observation${observationCount === 1 ? "" : "s"}.`,
    payload: fitted.payload,
    limits,
    includedItems: fitted.includedItems + datasetItems,
    sourceItemCount: rows.sourceItemCount + datasetItems,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: rows.itemLimited || datasetItems > limits.maxItems,
    artifactContext: options.artifactContext,
  });
}

function boundedStringItems(
  value: unknown,
  maxItems: number,
  maxBytes: number,
  state: SanitizationState,
): BoundedItems<string> {
  return collectArrayItems({
    value,
    maxItems,
    state,
    parse(item) {
      return typeof item === "string" ? boundedText(item, maxBytes, state) : null;
    },
  });
}

export function serializeDesignNotebookArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"design_notebook"> {
  const kind = "design_notebook" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const scalarBytes = fieldByteBudget(limits.maxBytes, 20, 8_192);
  const criteria = boundedStringItems(source.criteria, limits.maxItems, scalarBytes, state);
  const constraints = boundedStringItems(
    source.constraints,
    Math.max(0, limits.maxItems - criteria.items.length),
    scalarBytes,
    state,
  );
  const alternatives = collectArrayItems<SpecialistDesignNotebookPayload["alternatives"][number]>({
    value: source.alternatives,
    maxItems: Math.max(0, limits.maxItems - criteria.items.length - constraints.items.length),
    state,
    parse(value, index) {
      const item = asRecord(value);
      const name = boundedText(item.name, scalarBytes, state);
      const evidence = boundedText(item.evidence, scalarBytes, state);
      if (!name && !evidence) return null;
      return {
        id: boundedText(item.id, 128, state) || `alternative-${index + 1}`,
        name,
        evidence,
      };
    },
  });
  const usedItems = criteria.items.length + constraints.items.length + alternatives.items.length;
  const tests = collectArrayItems<SpecialistDesignNotebookPayload["tests"][number]>({
    value: source.tests,
    maxItems: Math.max(0, limits.maxItems - usedItems),
    state,
    parse(value, index) {
      const item = asRecord(value);
      const method = boundedText(item.method, scalarBytes, state);
      const result = boundedText(item.result, scalarBytes, state);
      const revision = boundedText(item.revision, scalarBytes, state);
      if (!method && !result && !revision) return null;
      return {
        id: boundedText(item.id, 128, state) || `test-${index + 1}`,
        method,
        result,
        revision,
      };
    },
  });
  const payload: SpecialistDesignNotebookPayload = {
    problem: boundedText(source.problem, scalarBytes, state),
    stakeholders: boundedText(source.stakeholders, scalarBytes, state),
    criteria: criteria.items,
    constraints: constraints.items,
    alternatives: alternatives.items,
    selectedAlternative: boundedText(source.selectedAlternative, scalarBytes, state),
    selectionReason: boundedText(source.selectionReason, scalarBytes, state),
    tests: tests.items,
  };
  const fitted = fitItemsToByteLimit({
    items: [payload],
    maxItems: 1,
    maxBytes: limits.maxBytes,
    buildPayload: (items) => items[0] ?? {
      problem: "",
      stakeholders: "",
      criteria: [],
      constraints: [],
      alternatives: [],
      selectedAlternative: "",
      selectionReason: "",
      tests: [],
    },
  });
  const itemCount = criteria.items.length + constraints.items.length + alternatives.items.length + tests.items.length;
  return context({
    kind,
    runtimeSource: content,
    capability: "design_notebook",
    summary: `Design notebook with ${alternatives.items.length} alternative${alternatives.items.length === 1 ? "" : "s"} and ${tests.items.length} test record${tests.items.length === 1 ? "" : "s"}.`,
    payload: fitted.payload,
    limits,
    includedItems: fitted.includedItems === 0 ? 0 : itemCount,
    sourceItemCount: criteria.sourceItemCount + constraints.sourceItemCount + alternatives.sourceItemCount + tests.sourceItemCount,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: criteria.itemLimited || constraints.itemLimited || alternatives.itemLimited || tests.itemLimited,
    artifactContext: options.artifactContext,
  });
}

export function serializePerformanceLogArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"performance_log"> {
  const kind = "performance_log" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const scalarBytes = fieldByteBudget(limits.maxBytes, 10, 8_192);
  const entries = collectArrayItems<SpecialistPerformanceLogPayload["entries"][number]>({
    value: asRecord(content).entries,
    maxItems: limits.maxItems,
    state,
    parse(value, index) {
      const item = asRecord(value);
      const focus = boundedText(item.focus, scalarBytes, state);
      const evidence = boundedText(item.evidence, scalarBytes, state);
      const reflection = boundedText(item.reflection, scalarBytes, state);
      if (!focus && !evidence && !reflection) return null;
      const duration = finiteNumber(item.durationMinutes, 1, 86_400);
      return {
        id: boundedText(item.id, 128, state) || `entry-${index + 1}`,
        occurredOn: /^\d{4}-\d{2}-\d{2}$/u.test(String(item.occurredOn)) ? String(item.occurredOn) : "",
        focus,
        durationMinutes: duration === null ? null : Math.trunc(duration),
        evidence,
        reflection,
      };
    },
  });
  const fitted = fitItemsToByteLimit({
    items: entries.items,
    ...limits,
    buildPayload: (items) => ({ entries: [...items] }),
  });
  return context({
    kind,
    runtimeSource: content,
    capability: "performance_log",
    summary: `Performance log with ${fitted.includedItems} student record${fitted.includedItems === 1 ? "" : "s"}; teacher verification remains separate.`,
    payload: fitted.payload,
    limits,
    includedItems: fitted.includedItems,
    sourceItemCount: entries.sourceItemCount,
    byteLength: fitted.byteLength,
    byteTruncated: fitted.byteTruncated,
    state,
    itemLimited: entries.itemLimited,
    artifactContext: options.artifactContext,
  });
}

export function serializeProcedureChecklistArtifactContext(
  content: unknown,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext<"procedure_checklist"> {
  const kind = "procedure_checklist" as const;
  const limits = resolvedLimits(kind, options);
  const state: SanitizationState = { fieldTruncated: false, invalidItems: 0 };
  const source = asRecord(content);
  const completed = collectArrayItems<number>({
    value: source.completedIndexes,
    maxItems: limits.maxItems,
    state,
    parse(value) {
      const index = finiteNumber(value, 0, 100_000);
      return index === null ? null : Math.trunc(index);
    },
  });
  const payload = {
    protocolId: optionalBoundedText(source.protocolId, 128),
    protocolVersion: finiteNumber(source.protocolVersion, 1, 1_000_000),
    completedIndexes: [...new Set(completed.items)].sort((left, right) => left - right),
    practicalAvailable: source.practicalAvailable === true,
  };
  const byteLength = jsonByteLength(payload);
  if (byteLength > limits.maxBytes) {
    throw new RangeError("Procedure checklist exceeds the canonical specialist limit.");
  }
  return context({
    kind,
    runtimeSource: content,
    capability: "procedure_checklist",
    summary: `Approved procedure record with ${payload.completedIndexes.length} completed step${payload.completedIndexes.length === 1 ? "" : "s"}.`,
    payload,
    limits,
    includedItems: payload.completedIndexes.length,
    sourceItemCount: completed.sourceItemCount,
    byteLength,
    byteTruncated: false,
    state,
    itemLimited: completed.itemLimited,
    artifactContext: options.artifactContext,
  });
}

export function specialistArtifactKindForBlockType(
  blockType: unknown,
): SpecialistArtifactKind | null {
  return typeof blockType === "string" && blockType in BLOCK_KIND
    ? BLOCK_KIND[blockType as keyof typeof BLOCK_KIND]
    : null;
}

export function serializeSpecialistArtifactContext(
  input: SpecialistArtifactContextInput,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext {
  const kind = "kind" in input
    ? input.kind
    : specialistArtifactKindForBlockType(input.type);
  if (!kind || !SPECIALIST_ARTIFACT_KINDS.includes(kind as SpecialistArtifactKind)) {
    const unsupportedType = "type" in input ? input.type : input.kind;
    throw new TypeError(`Unsupported specialist artifact type: ${String(unsupportedType)}`);
  }
  const content = input.content;
  const embeddedContext = asRecord(input.artifactContext);
  const artifactContext: SpecialistArtifactContextMetadataInput = {
    assignmentIdentity: options.artifactContext?.assignmentIdentity ??
      embeddedContext.assignmentIdentity ?? input.assignmentIdentity,
    academicBand: options.artifactContext?.academicBand ??
      embeddedContext.academicBand ?? input.academicBand,
    rubricAnchors: options.artifactContext?.rubricAnchors ??
      embeddedContext.rubricAnchors ?? input.rubricAnchors,
    sourceAnchors: options.artifactContext?.sourceAnchors ??
      embeddedContext.sourceAnchors ?? input.sourceAnchors,
  };
  const resolvedOptions = { ...options, artifactContext };
  switch (kind) {
    case "equation": return serializeEquationArtifactContext(content, resolvedOptions);
    case "graph": return serializeGraphArtifactContext(content, resolvedOptions);
    case "ledger": return serializeLedgerArtifactContext(content, resolvedOptions);
    case "spreadsheet": return serializeSpreadsheetArtifactContext(content, resolvedOptions);
    case "map": return serializeMapArtifactContext(content, resolvedOptions);
    case "drawing": return serializeDrawingArtifactContext(content, resolvedOptions);
    case "code_output": return serializeCodeOutputArtifactContext(content, resolvedOptions);
    case "notation": return serializeNotationArtifactContext(content, resolvedOptions);
    case "cad": return serializeCadArtifactContext(content, resolvedOptions);
    case "media_annotations": {
      const mediaKindOption = "mediaKind" in input ? input.mediaKind : undefined;
      const blockKind = "type" in input && input.type === "video" ? "video" : undefined;
      return serializeMediaAnnotationsArtifactContext(content, {
        ...resolvedOptions,
        mediaKind: mediaKindOption ?? blockKind,
      });
    }
    case "lab_data": return serializeLabDataArtifactContext(content, resolvedOptions);
    case "design_notebook": return serializeDesignNotebookArtifactContext(content, resolvedOptions);
    case "performance_log": return serializePerformanceLogArtifactContext(content, resolvedOptions);
    case "procedure_checklist": return serializeProcedureChecklistArtifactContext(content, resolvedOptions);
  }
}

export function trySerializeSpecialistArtifactContext(
  input: SpecialistArtifactContextInput,
  options: SpecialistArtifactSerializationOptions = {},
): SpecialistArtifactContext | null {
  try {
    return serializeSpecialistArtifactContext(input, options);
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}
