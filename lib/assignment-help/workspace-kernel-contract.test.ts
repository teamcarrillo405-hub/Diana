import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readWorkspaceSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("homework kernel route contracts", () => {
  it("keeps the live assignment workspace on the shared homework kernel", () => {
    const source = readWorkspaceSource("app/(app)/assignments/[id]/workspace/page.tsx");

    expect(source).toContain("loadAssignmentHomeworkKernel({");
    expect(source).toContain('eventSource: "assignment_workspace"');
    expect(source).toContain("homeworkKernel.sourcePacket");
    expect(source).toContain("homeworkKernel.profile");
    expect(source).toContain("homeworkKernel.understanding");
    expect(source).toContain("homeworkKernel.trustDecision.aiMode");
    expect(source).toContain("homeworkKernel.sources");
    expect(source).not.toContain("buildSourcePacket");
    expect(source).not.toContain("buildAssignmentUnderstanding");
    expect(source).not.toContain("resolveDianaHomeworkTrust");
  });

  it("keeps study entry and study-buddy prefill on the same assignment understanding", () => {
    const studyActions = readWorkspaceSource("app/(app)/study/actions.ts");
    const studyBuddyPage = readWorkspaceSource("app/(app)/study-buddy/page.tsx");

    expect(studyActions).toContain("loadAssignmentHomeworkKernel({");
    expect(studyActions).toContain('eventSource: "study_router"');
    expect(studyActions).toContain("kernel.profile");
    expect(studyActions).toContain("kernel.trustDecision.aiMode");
    expect(studyActions).toContain("kernel.understanding.sourceState");
    expect(studyActions).not.toContain("resolveAssignmentProfile");
    expect(studyActions).not.toContain("resolveDianaHomeworkTrust");

    expect(studyBuddyPage).toContain("loadAssignmentHomeworkKernel({");
    expect(studyBuddyPage).toContain("formatHomeworkKernelForTutor(kernel");
    expect(studyBuddyPage).not.toContain("buildSourcePacket");
  });

  it("keeps workspace save and review actions aligned to the shared profile", () => {
    const source = readWorkspaceSource("app/(app)/assignments/[id]/hm-actions.ts");

    expect(source).toContain("loadAssignmentHomeworkKernel({");
    expect(source).toContain('eventSource: "hm_save_patch"');
    expect(source).toContain('eventSource: "hm_prepare_review"');
    expect(source).toContain('eventSource: "hm_problem_work"');
    expect(source).toContain("kernel.profile.artifactType");
    expect(source).not.toContain("resolveAssignmentProfile");
    expect(source).not.toContain("normalizeAssignmentKind");
  });
  it("uses the shared homework kernel for source-driven worksheet problem queues", () => {
    const source = readWorkspaceSource("app/(app)/assignments/[id]/workspace/source-actions.ts");

    expect(source).toContain("loadAssignmentHomeworkKernel({");
    expect(source).toContain('eventSource: "source_problem_queue"');
    expect(source).toContain("subjectPresentationFor(kernel.profile, kernel.sourcePacket)");
    expect(source).toContain("kernel.understanding.needsStudentConfirmation");
    expect(source).not.toContain("resolveAssignmentProfile");
    expect(source).not.toContain("parseWorkspaceMode");
  });
  it("uses the shared homework profile when preparing provider submission text", () => {
    const source = readWorkspaceSource("app/(app)/assignments/[id]/actions.ts");

    expect(source).toContain("loadAssignmentHomeworkKernel({");
    expect(source).toContain('eventSource: "provider_submission_text"');
    expect(source).toContain("kernel.profile");
    expect(source).not.toContain("resolveAssignmentProfile");
  });
});
