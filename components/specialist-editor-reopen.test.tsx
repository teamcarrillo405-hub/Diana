// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveBlock: vi.fn(),
}));

vi.mock("@/app/(app)/assignments/[id]/hm-actions", () => ({
  saveAssignmentArtifactBlock: mocks.saveBlock,
}));
vi.mock("@/app/(app)/assignments/[id]/workspace/source-actions", () => ({
  cancelAssignmentMediaUpload: vi.fn(),
  cleanupAssignmentMediaUploads: vi.fn().mockResolvedValue(undefined),
  deleteAssignmentMediaFile: vi.fn(),
  finalizeAssignmentMediaUpload: vi.fn(),
  initiateAssignmentMediaUpload: vi.fn(),
}));
vi.mock("@/app/(app)/assignments/[id]/workspace/safety-actions", () => ({
  acknowledgeAssignmentSafetyProtocol: vi.fn(),
}));
vi.mock("@/components/specialist-code-editor", () => ({
  SpecialistCodeEditor: ({ value, onChange }: { value: string; onChange(value: string): void }) => (
    <textarea aria-label="Python code" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock("@/components/specialist-data-chart", () => ({ SpecialistDataChart: () => null }));
vi.mock("@/components/specialist-map-runtime", () => ({ SpecialistMapRuntime: () => null }));
vi.mock("@/components/specialist-notation-runtime", () => ({ SpecialistNotationRuntime: () => null }));
vi.mock("@/components/cad-model-viewer", () => ({
  CadModelViewer: () => null,
  CadPrimitiveViewer: () => null,
}));

import { AssignmentCreativeTools } from "@/components/assignment-creative-tools";
import { AssignmentNativeTools } from "@/components/assignment-native-tools";
import { AssignmentTechnicalTools } from "@/components/assignment-technical-tools";
import type { AssignmentArtifactBlockInput } from "@/lib/assignment-artifact";
import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import type { AssignmentPracticalGateView } from "@/lib/course-mode/practical-gate";

const assignmentId = "11111111-1111-4111-8111-111111111111";

function profile(
  capability: AssignmentWorkProfile["capabilities"][number],
  overrides: Partial<AssignmentWorkProfile> = {},
): AssignmentWorkProfile {
  return {
    schemaVersion: 1,
    subjectDomain: "general",
    taskIntents: ["build"],
    artifactType: "project_package",
    capabilities: [capability],
    safetyClass: "standard",
    standardsAlignment: [],
    legacyMode: "project",
    confidence: 1,
    reasons: [],
    ...overrides,
  };
}

async function flushAutosave() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(650);
  });
}

describe("specialist editor reopen state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.saveBlock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps code execution metadata and forward-compatible fields on autosave", async () => {
    const initialBlocks: AssignmentArtifactBlockInput[] = [{
      key: "code-runner",
      type: "code",
      capability: "code_runner",
      label: "Python code",
      content: {
        language: "python",
        code: "print('first')",
        output: ["first"],
        execution: { runtime: "pyodide", durationMs: 17.5 },
        runtimeState: { status: "complete", engines: ["Pyodide"], updatedAt: "2026-09-01T12:00:00.000Z", detail: "Done", outputTruncated: false },
        futureMetadata: { retained: true },
      },
    }];

    render(<AssignmentNativeTools
      assignmentId={assignmentId}
      assignmentTitle="Python lab"
      profile={profile("code_runner", {
        subjectDomain: "computer_science",
        artifactType: "source_code",
        taskIntents: ["code"],
        legacyMode: "coding",
      })}
      initialBlocks={initialBlocks}
    />);
    fireEvent.change(screen.getByLabelText("Python code"), {
      target: { value: "print('reopened')" },
    });
    await flushAutosave();

    expect(mocks.saveBlock).toHaveBeenCalledWith(expect.objectContaining({
      block: expect.objectContaining({
        content: expect.objectContaining({
          code: "print('reopened')",
          execution: { runtime: "pyodide", durationMs: 17.5 },
          futureMetadata: { retained: true },
        }),
      }),
    }));
  });

  it("reopens map scale and retains persisted map fields on the next save", async () => {
    const initialBlocks: AssignmentArtifactBlockInput[] = [{
      key: "map-workspace",
      type: "map",
      capability: "map_workspace",
      label: "Map",
      content: {
        title: "Sites",
        legend: "Samples",
        scale: "1:1000",
        sourceAttribution: "Teacher map",
        markers: [],
        futureMetadata: { retained: true },
      },
    }];

    render(<AssignmentCreativeTools
      assignmentId={assignmentId}
      profile={profile("map_workspace", {
        subjectDomain: "geography",
        artifactType: "map",
        taskIntents: ["map"],
        legacyMode: "history",
      })}
      initialBlocks={initialBlocks}
    />);
    const scale = screen.getByLabelText("Map scale") as HTMLInputElement;
    expect(scale.value).toBe("1:1000");
    fireEvent.change(scale, { target: { value: "1:500" } });
    await flushAutosave();

    expect(mocks.saveBlock).toHaveBeenCalledWith(expect.objectContaining({
      block: expect.objectContaining({
        content: expect.objectContaining({
          scale: "1:500",
          futureMetadata: { retained: true },
        }),
      }),
    }));
  });

  it("retains CAD model identity and statistics when the binary cannot reopen", async () => {
    const initialBlocks: AssignmentArtifactBlockInput[] = [{
      key: "cad-workspace",
      type: "cad",
      capability: "cad_workspace",
      label: "CAD package",
      content: {
        units: "mm",
        dimensions: { width: 100, height: 60, depth: 20 },
        constraints: ["Fits enclosure"],
        design: { primitive: "box", dimensions: { width: 100, height: 60, depth: 20 } },
        model: { fileName: "part.stl", format: "stl" },
        modelStats: { byteLength: 8000, triangleCount: 12, vertexCount: 36 },
        futureMetadata: { retained: true },
      },
    }];
    const practicalGate: AssignmentPracticalGateView = {
      connected: false,
      acknowledged: false,
      teacherUnlocked: false,
      supervisionActive: false,
      ageEligible: false,
      protocol: null,
    };

    render(<AssignmentTechnicalTools
      assignmentId={assignmentId}
      profile={profile("cad_workspace", {
        subjectDomain: "cad",
        artifactType: "cad_package",
        taskIntents: ["design"],
      })}
      initialBlocks={initialBlocks}
      practicalGate={practicalGate}
    />);
    fireEvent.change(screen.getByLabelText("Width"), { target: { value: "125" } });
    await flushAutosave();

    expect(mocks.saveBlock).toHaveBeenCalledWith(expect.objectContaining({
      block: expect.objectContaining({
        content: expect.objectContaining({
          dimensions: { width: 125, height: 60, depth: 20 },
          model: { fileName: "part.stl", format: "stl" },
          modelStats: { byteLength: 8000, triangleCount: 12, vertexCount: 36 },
          futureMetadata: { retained: true },
        }),
      }),
    }));
  });
});
