import { specialistActiveRuntimeStateFromContent } from "@/lib/specialist-artifacts/active-state";
import type { SpecialistActiveRuntimeState } from "@/lib/specialist-artifacts/contracts";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function mergeSpecialistEditorContent(
  persisted: unknown,
  current: Record<string, unknown>,
): Record<string, unknown> {
  return { ...record(persisted), ...current };
}

export function specialistEditorRuntimeState(
  persisted: unknown,
  fallback: SpecialistActiveRuntimeState,
): SpecialistActiveRuntimeState {
  const content = record(persisted);
  const hasPersistedRuntime = content.runtimeState !== undefined ||
    content.runtime !== undefined;
  return hasPersistedRuntime
    ? specialistActiveRuntimeStateFromContent(content)
    : fallback;
}

export type SpecialistCodeExecutionMetadata = {
  runtime: string;
  durationMs: number;
};

export function restoreSpecialistCodeExecution(
  persisted: unknown,
): SpecialistCodeExecutionMetadata | null {
  const execution = record(record(persisted).execution);
  const runtime = text(execution.runtime);
  const durationMs = finiteNumber(execution.durationMs);
  return runtime && durationMs !== null ? { runtime, durationMs } : null;
}

export type SpecialistCadEditorMetadata = {
  fileName: string;
  format: string | null;
  modelStats: {
    byteLength: number;
    triangleCount: number | null;
    vertexCount: number | null;
  } | null;
};

export function restoreSpecialistCadEditorMetadata(
  persisted: unknown,
): SpecialistCadEditorMetadata {
  const content = record(persisted);
  const model = record(content.model);
  const stats = record(content.modelStats);
  const byteLength = finiteNumber(stats.byteLength);
  return {
    fileName: text(content.modelFileName ?? model.fileName),
    format: text(content.modelFormat ?? model.format).toLowerCase() || null,
    modelStats: byteLength === null
      ? null
      : {
          byteLength,
          triangleCount: finiteNumber(stats.triangleCount),
          vertexCount: finiteNumber(stats.vertexCount),
        },
  };
}
