import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UNIVERSAL_TYPED_INK_FALLBACK } from "../assignment-capabilities";
import { SPECIALIST_ARTIFACT_CONTEXT_CONSUMERS } from "./contracts";
import {
  CANONICAL_RENDER_TARGETS,
  buildCanonicalRenderDocument,
  canonicalFallbackBlocksForTarget,
  canonicalRenderBlockFromArtifact,
  canonicalRenderBlocksForTarget,
  projectCanonicalRenderDocument,
  specialistArtifactContextsForConsumer,
  toCanonicalRenderBlock,
} from "./render-blocks";
import {
  createSpecialistRuntimeHealth,
  isSpecialistRuntimeUsable,
  resolveSpecialistRuntimeHealth,
  runtimeHealthFromActiveState,
  SPECIALIST_RUNTIME_HEALTH_TTL_MS,
} from "./runtime-health";
import {
  serializeCodeOutputArtifactContext,
  serializeGraphArtifactContext,
  serializeLedgerArtifactContext,
} from "./serializers";

const NOW = new Date("2026-09-01T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("canonical specialist render blocks", () => {
  it("uses the same immutable contract shape for preview, export, and LMS", () => {
    const runtimeHealth = resolveSpecialistRuntimeHealth({
      readiness: "beta",
      available: true,
      checkedAt: "2026-09-01T12:00:00.000Z",
      evidenceSource: "runtime_probe",
      evidenceId: "probe-1",
      authority: "server",
    });
    const graph = toCanonicalRenderBlock(
      serializeGraphArtifactContext({ expression: "2*x", points: [{ x: 0, y: 0 }, { x: 1, y: 2 }] }),
      {
        id: "student graph",
        runtimeHealth,
      },
    );
    const ledger = toCanonicalRenderBlock(
      serializeLedgerArtifactContext({ rows: [{ account: "Cash", debit: 10, credit: 10 }] }),
      { id: "ledger", runtimeHealth },
    );
    const document = buildCanonicalRenderDocument({
      title: "Assignment package",
      blocks: [graph, ledger],
    });

    expect(document.targets).toBe(CANONICAL_RENDER_TARGETS);
    for (const target of CANONICAL_RENDER_TARGETS) {
      expect(canonicalRenderBlocksForTarget(document, target)).toBe(document.blocks);
      expect(canonicalFallbackBlocksForTarget(document, target)).toEqual([]);
      expect(projectCanonicalRenderDocument(document, target)).toMatchObject({
        target,
        title: "Assignment package",
        blocks: document.blocks,
        fallbackBlocks: [],
        contextBlocks: document.blocks,
        plainText: document.plainText,
      });
    }
    expect(graph).toMatchObject({
      id: "student-graph",
      type: "graph",
      capability: "graphing",
      targets: CANONICAL_RENDER_TARGETS,
      universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
      runtimeDisposition: "specialist",
      runtimeHealth: {
        status: "healthy",
        fallbackRequired: false,
        evidence: {
          source: "runtime_probe",
          observedAt: "2026-09-01T12:00:00.000Z",
          authority: "server",
        },
      },
    });
    expect(document.plainText).toContain("y = 2*x");
    expect(document.plainText).toContain("Totals");
  });

  it("deduplicates block ids without silently truncating canonical plain text", () => {
    const source = Array.from({ length: 250 }, (_, index) =>
      `${index}: ${"student code ".repeat(50)}`
    ).join("\n");
    const first = toCanonicalRenderBlock(
      serializeCodeOutputArtifactContext({ language: "python", code: source, output: [] }),
      { id: "code" },
    );
    const second = toCanonicalRenderBlock(
      serializeCodeOutputArtifactContext({ language: "python", code: "print('done')", output: ["done"] }),
      { id: "code" },
    );
    const document = buildCanonicalRenderDocument({ blocks: [first, second] });

    expect(document.blocks.map((block) => block.id)).toEqual(["code", "code-2"]);
    expect(first.integrity.plainTextTruncated).toBe(false);
    expect(new TextEncoder().encode(first.plainText).byteLength).toBeGreaterThan(50_000);
    expect(new TextEncoder().encode(document.plainText).byteLength).toBeGreaterThan(50_000);
    expect(first.plainText).toContain(source.slice(-1_000));
  });

  it("adapts stored specialist blocks without duplicating target logic", () => {
    const block = canonicalRenderBlockFromArtifact({
      key: "lab-data",
      label: "Experiment data",
      type: "data_table",
      capability: "data_lab",
      content: {
        rows: [{ id: "1", label: "Mass", value: "5", unit: "g", uncertainty: "0.1", observation: "" }],
      },
    });

    expect(block).toMatchObject({
      id: "lab-data",
      label: "Experiment data",
      type: "lab_data",
      capability: "data_lab",
      targets: CANONICAL_RENDER_TARGETS,
    });
  });

  it("keeps unknown and degraded artifacts in universal fallback while preserving consumer context", () => {
    const block = toCanonicalRenderBlock(
      serializeGraphArtifactContext(
        { expression: "x", points: [{ x: 1, y: 1 }] },
        {
          artifactContext: {
            assignmentIdentity: { id: "assignment-1", title: "Graph check" },
            academicBand: "high_foundation",
            rubricAnchors: [{ criterionId: "r1", criterion: "Explain the trend", location: "Row 1" }],
            sourceAnchors: [{ sourceId: "source-1", label: "Lab sheet", location: "p. 2" }],
          },
        },
      ),
      {
        runtimeHealth: resolveSpecialistRuntimeHealth({
          readiness: "beta",
          available: true,
          degraded: true,
          checkedAt: "2026-09-01T12:00:00.000Z",
          evidenceSource: "runtime_probe",
          authority: "server",
        }),
      },
    );
    const document = buildCanonicalRenderDocument({ blocks: [block] });

    for (const target of CANONICAL_RENDER_TARGETS) {
      const projection = projectCanonicalRenderDocument(document, target);
      expect(projection.blocks).toEqual([]);
      expect(projection.fallbackBlocks).toBe(document.blocks);
      expect(projection.fallbackPlainText).toContain("y = x");
    }
    for (const consumer of SPECIALIST_ARTIFACT_CONTEXT_CONSUMERS) {
      expect(specialistArtifactContextsForConsumer(document, consumer)[0]).toMatchObject({
        consumer,
        assignmentIdentity: { id: "assignment-1", title: "Graph check" },
        academicBand: "high_foundation",
        rubricAnchors: [{ criterionId: "r1", criterion: "Explain the trend" }],
        sourceAnchors: [{ sourceId: "source-1", location: "p. 2" }],
        fallbackRequired: true,
      });
    }
  });
});

describe("specialist runtime health", () => {
  it("distinguishes product readiness from live runtime health", () => {
    expect(resolveSpecialistRuntimeHealth({
      readiness: "ready",
      available: true,
    })).toMatchObject({
      status: "unknown",
      fallbackRequired: true,
      evidence: null,
    });
    expect(resolveSpecialistRuntimeHealth({
      readiness: "ready",
      available: true,
      checkedAt: "2026-09-01T12:00:00.000Z",
      evidenceSource: "runtime_probe",
      authority: "server",
    })).toMatchObject({
      status: "healthy",
      retryable: false,
      fallbackRequired: false,
    });
    expect(resolveSpecialistRuntimeHealth({
      readiness: "prototype",
      available: true,
      degraded: true,
      checkedAt: "2026-09-01T12:00:00.000Z",
      evidenceSource: "runtime_probe",
      authority: "server",
    })).toMatchObject({
      status: "degraded",
      retryable: true,
      fallbackRequired: true,
    });
    expect(resolveSpecialistRuntimeHealth({
      readiness: "unavailable",
      available: true,
    })).toMatchObject({
      status: "unavailable",
      retryable: false,
      universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    });
  });

  it("sanitizes runtime detail and keeps typed/ink fallback for every status", () => {
    const health = createSpecialistRuntimeHealth({
      status: "degraded",
      checkedAt: "2026-09-01T12:00:00.000Z",
      detail: "\u001b[31mWorker warming\u001b[0m\u202e",
      evidenceSource: "provider_canary",
      authority: "server",
    });

    expect(health).toEqual({
      status: "degraded",
      checkedAt: "2026-09-01T12:00:00.000Z",
      detail: "Worker warming",
      retryable: true,
      evidence: {
        source: "provider_canary",
        observedAt: "2026-09-01T12:00:00.000Z",
        evidenceId: null,
        authority: "server",
      },
      fallbackRequired: true,
      universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    });
    expect(isSpecialistRuntimeUsable(health)).toBe(false);
    expect(createSpecialistRuntimeHealth({
      status: "healthy",
      checkedAt: "2026-08-30T12:00:00.000Z",
    })).toMatchObject({ status: "unknown", evidence: null });
    expect(isSpecialistRuntimeUsable(createSpecialistRuntimeHealth({ status: "unavailable" }))).toBe(false);
  });

  it("rejects client-claimed, stale, and future runtime evidence", () => {
    const clientClaim = resolveSpecialistRuntimeHealth({
      readiness: "ready",
      available: true,
      checkedAt: NOW.toISOString(),
      evidenceSource: "runtime_probe",
      authority: "client",
    });
    const stale = resolveSpecialistRuntimeHealth({
      readiness: "ready",
      available: true,
      checkedAt: new Date(NOW.getTime() - SPECIALIST_RUNTIME_HEALTH_TTL_MS - 1).toISOString(),
      evidenceSource: "provider_canary",
      authority: "server",
    });
    const future = resolveSpecialistRuntimeHealth({
      readiness: "ready",
      available: true,
      checkedAt: new Date(NOW.getTime() + 1).toISOString(),
      evidenceSource: "provider_canary",
      authority: "server",
    });

    for (const health of [clientClaim, stale, future]) {
      expect(health).toMatchObject({
        status: "unknown",
        evidence: null,
        fallbackRequired: true,
      });
      expect(isSpecialistRuntimeUsable(health)).toBe(false);
    }
    expect(future.checkedAt).toBeNull();
  });

  it("allows client runtime state to lower but never raise server readiness", () => {
    const freshServerHealth = resolveSpecialistRuntimeHealth({
      readiness: "ready",
      available: true,
      checkedAt: NOW.toISOString(),
      evidenceSource: "runtime_probe",
      authority: "server",
    });
    const clientComplete = {
      status: "complete",
      engines: ["browser-runtime"],
      updatedAt: NOW.toISOString(),
      detail: null,
      outputTruncated: false,
    } as const;
    const clientError = { ...clientComplete, status: "error" as const, detail: "Renderer stopped" };

    expect(runtimeHealthFromActiveState(clientComplete)).toMatchObject({
      status: "unknown",
      fallbackRequired: true,
    });
    expect(runtimeHealthFromActiveState(clientComplete, freshServerHealth)).toMatchObject({
      status: "healthy",
      fallbackRequired: false,
    });
    expect(runtimeHealthFromActiveState(clientError, freshServerHealth)).toMatchObject({
      status: "degraded",
      detail: "Renderer stopped",
      fallbackRequired: true,
    });
    expect(isSpecialistRuntimeUsable(freshServerHealth)).toBe(true);
    vi.advanceTimersByTime(SPECIALIST_RUNTIME_HEALTH_TTL_MS + 1);
    expect(isSpecialistRuntimeUsable(freshServerHealth)).toBe(false);
    expect(runtimeHealthFromActiveState(clientError, freshServerHealth)).toMatchObject({
      status: "unknown",
      detail: "Renderer stopped",
      fallbackRequired: true,
    });
  });
});
