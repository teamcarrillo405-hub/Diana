import { describe, expect, it } from "vitest";
import {
  COMMAND_CENTER_LAYERS,
  STUDENT_RUNTIME_READ_TOOLS,
  createGstackEngineeringRequest,
  createOpenJarvisSidecarRequest,
  isSafeStudentRuntimeRequest,
  requestTouchesStudentData,
  studentRuntimeBoundaryIssues,
  type WorkRequest,
} from "./command-center-contract";

describe("command center integration contract", () => {
  it("keeps Paperclip, OpenJarvis, gstack, and Diana in separate ownership lanes", () => {
    const paperclip = COMMAND_CENTER_LAYERS.find((layer) => layer.system === "paperclip");
    const openjarvis = COMMAND_CENTER_LAYERS.find((layer) => layer.system === "openjarvis");
    const gstack = COMMAND_CENTER_LAYERS.find((layer) => layer.system === "gstack");
    const diana = COMMAND_CENTER_LAYERS.find((layer) => layer.system === "diana");

    expect(paperclip?.owns).toContain("goals");
    expect(paperclip?.doesNotOwn).toContain("Diana student runtime");
    expect(openjarvis?.owns).toContain("local model routing");
    expect(openjarvis?.doesNotOwn).toContain("Diana safety policy");
    expect(gstack?.owns).toContain("browser QA");
    expect(gstack?.doesNotOwn).toContain("student conversations");
    expect(diana?.owns).toContain("AI traffic light policy");
  });

  it("creates a read-only Paperclip to gstack engineering handoff by default", () => {
    const request = createGstackEngineeringRequest({
      id: "req-1",
      goalId: "goal-1",
      title: "Run Diana design QA",
      task: "Use gstack browser QA against the dashboard.",
    });

    expect(request.sourceSystem).toBe("paperclip");
    expect(request.targetSystem).toBe("gstack");
    expect(request.worker).toBe("gstack");
    expect(request.constraints.policyMode).toBe("engineering");
    expect(request.constraints.readOnly).toBe(true);
    expect(request.constraints.approvalRequired).toBe(false);
    expect(request.acceptanceGates.join(" ")).toContain("Do not touch Diana student data");
  });

  it("requires approval when a gstack handoff can edit", () => {
    const request = createGstackEngineeringRequest({
      id: "req-2",
      goalId: "goal-1",
      title: "Implement a reviewed fix",
      task: "Apply a scoped code fix after review.",
      readOnly: false,
    });

    expect(request.constraints.readOnly).toBe(false);
    expect(request.constraints.approvalRequired).toBe(true);
  });

  it("creates an OpenJarvis sidecar request that stays behind Diana", () => {
    const request = createOpenJarvisSidecarRequest({
      id: "req-3",
      goalId: "goal-2",
      title: "Student voice check-in",
      task: "Transcribe the student's question and ask Diana for the next step.",
    });

    expect(request.sourceSystem).toBe("diana");
    expect(request.targetSystem).toBe("openjarvis");
    expect(request.worker).toBe("openjarvis");
    expect(request.constraints.policyMode).toBe("student_runtime");
    expect(request.constraints.privateLocalOnly).toBe(true);
    expect(request.constraints.approvalRequired).toBe(true);
    expect(request.constraints.allowedDianaTools).toEqual(STUDENT_RUNTIME_READ_TOOLS);
    expect(isSafeStudentRuntimeRequest(request)).toBe(true);
  });

  it("flags student data requests that bypass Diana", () => {
    const unsafeRequest: WorkRequest = {
      id: "req-4",
      goalId: "goal-2",
      sourceSystem: "paperclip",
      targetSystem: "openjarvis",
      worker: "openjarvis",
      title: "Ask about homework",
      task: "Use the student's assignment data.",
      inputs: [
        {
          kind: "data",
          uri: "diana://assignments/today",
          sensitivity: "student_education_record",
        },
      ],
      constraints: {
        policyMode: "internal_ops",
        readOnly: true,
      },
      acceptanceGates: [],
    };

    expect(requestTouchesStudentData(unsafeRequest)).toBe(true);
    expect(studentRuntimeBoundaryIssues(unsafeRequest)).toEqual([
      "Student-runtime work must originate from Diana.",
      "Student data requires student_runtime policy mode.",
      "OpenJarvis student work must be privateLocalOnly.",
      "OpenJarvis student work must use explicit Diana tools.",
      "Student-runtime sidecar work requires approval.",
    ]);
    expect(isSafeStudentRuntimeRequest(unsafeRequest)).toBe(false);
  });
});
