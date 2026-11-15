import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("assignment Edge Function ownership contracts", () => {
  it("derives assignment review ownership from the verified bearer token", () => {
    const source = read("../supabase/functions/assignment-review/index.ts");
    expect(source).toContain("authClient.auth.getUser()");
    expect(source).toContain("const ownerId = authData.user.id");
    expect(source).not.toContain("const ownerId = typeof body.ownerId");
    expect(source).toContain('.eq("owner_id", ownerId)');
    expect(source).toContain('runOpenAIHomeworkAdapter({');
    expect(source).toContain('task: "assignment_review"');
    expect(source).toContain("buildServerReviewMethodologyContext");
    expect(source).toContain("Shared Diana homework method");
    expect(source).toContain("server_assignment_understanding");
    expect(source).not.toContain("body.methodologyContext");
    expect(source).not.toContain('if (effectiveMode !== "green")');
    expect(source).not.toContain('if (body.aiMode === "red"');
  });

  it("keeps direct-to-student homework functions behind the shared Edge homework adapter", () => {
    const migratedFunctions = [
      "ap-scaffold",
      "arts-scaffold",
      "assignment-review",
      "citation-gen",
      "cs-scaffold",
      "health-scaffold",
      "history-scaffold",
      "language-scaffold",
      "math-example",
      "math-scaffold",
      "math-step",
      "note-synthesis",
      "note-tags",
      "reading-level",
      "reading-scaffold",
      "science-scaffold",
      "study-artifacts",
      "task-breakdown",
      "visual-tools",
      "vocab-hover",
      "writing-aid",
      "writing-cowrite",
    ];

    for (const functionName of migratedFunctions) {
      const source = read(`../supabase/functions/${functionName}/index.ts`);
      expect(source, functionName).toContain('runOpenAIHomeworkAdapter({');
      expect(source, functionName).not.toMatch(/aiMode\s*===\s*"red"/u);
      expect(source, functionName).not.toMatch(/aiMode\s*===\s*"yellow"/u);
      expect(source, functionName).not.toContain("AI not available for this class");
    }

    const adapter = read("../supabase/functions/_shared/homework-adapter.ts");
    expect(adapter).toContain('DIANA_HOMEWORK_PRODUCT_TIER');
    expect(adapter).toContain('callSafeStudentTextModel({');
    expect(adapter).toContain('homeworkQualityForTask');
  });

  it("server actions pass shared homework context while the Edge Function verifies execution", () => {
    const source = read("../app/(app)/assignments/[id]/ai-tools-actions.ts");
    const reviewStart = source.indexOf("export async function requestAssignmentReview");
    const reviewEnd = source.indexOf("export async function acceptWritingSuggestion");
    const reviewSource = source.slice(reviewStart, reviewEnd);

    expect(source).toContain("function directHomeworkAiMode(): DianaHomeworkAiMode");
    expect(source).toContain("return resolveDianaHomeworkTrust().aiMode");
    expect(source).not.toContain("assignmentAiModeOverride: aiMode");
    expect(source).toContain("function loadHomeworkActionContext");
    expect(source).toContain("formatHomeworkKernelForTutor(kernel");
    expect(source).toContain('eventSource: "ai_tools_context"');
    expect(source).not.toContain("effectiveAiMode");
    expect(source).not.toContain("classes(ai_mode)");
    expect(reviewSource).toContain("await loadAssignmentHomeworkKernel({");
    expect(reviewSource).toContain("formatHomeworkKernelForTutor(kernel");
    expect(reviewSource).toContain("loadCanonicalSpecialistContextsForAssignment({");
    expect(reviewSource).toContain('consumer: "review"');
    expect(reviewSource).toContain("formatCanonicalSpecialistContextsForPrompt(");
    expect(source).toContain("Canonical specialist artifact contexts:");
    expect(reviewSource).toContain("sourceAnchorsForKernel(kernel)");
    expect(reviewSource).toContain("runLocalAssignmentReview({");
    expect(source).toContain('task: "assignment_review"');
    expect(reviewSource).toContain("homeworkContext");
    expect(reviewSource).toContain("createLinearEquationReview(parsed.data.fields");
    expect(reviewSource).not.toContain('supabase.functions.invoke("assignment-review"');
    expect(reviewSource).not.toContain("aiMode: parsed.data.aiMode");
    expect(reviewSource).not.toContain(": parsed.data.aiMode;");

    const edgeSource = read("../supabase/functions/assignment-review/index.ts");
    expect(edgeSource).toContain("const ownerId = authData.user.id");
    expect(edgeSource).toContain('.eq("owner_id", ownerId)');
    expect(edgeSource).toContain("const homeworkContext = typeof body.homeworkContext");
  });
  it("routes note document extraction through the shared homework adapter", () => {
    const source = read("../supabase/functions/extract-note-doc/index.ts");
    expect(source).toContain('runOpenAIHomeworkAdapter({');
    expect(source).toContain('const sourcePart: StudentModelPart');
    expect(source).not.toContain('https://api.openai.com/v1/chat/completions');
    expect(source).not.toContain('runSafeBudgetedAiCall({');
  });
  it("loads extraction storage keys from the owner-scoped source row", () => {
    const source = read("../supabase/functions/extract-assignment-source/index.ts");
    expect(source).toContain('withStudentSecurity("extract-assignment-source"');
    expect(source).toMatch(/authClient\.auth\s*\.getUser\(\)/u);
    expect(source).toContain('.eq("owner_id", authData.user.id)');
    expect(source).toContain('download(source.storage_key)');
    expect(source).not.toContain("body.storageKey");
    expect(source).toContain('source.storage_key.startsWith(`${source.owner_id}/`)');
    expect(source).toContain("const MAX_PDF_BYTES = 8 * 1024 * 1024");
    expect(source).toContain("const MAX_IMAGE_BYTES = 10 * 1024 * 1024");
    expect(source).toContain('runOpenAIHomeworkAdapter({');
    expect(source).toContain('const sourcePart: StudentModelPart');
    expect(source).not.toContain('https://api.openai.com/v1/chat/completions');
    expect(source).not.toContain('runSafeBudgetedAiCall({');
    expect(source).toContain("blob.size > maxSourceBytes");
    expect(source).toContain("requireOwnedStorageObject(");
    expect(source).toContain('import_status: "failed"');
    expect(source).toContain("}, 422)");
  });


  it("keeps direct student routes off dormant school AI gates", () => {
    const assignmentPage = read("../app/(app)/assignments/[id]/page.tsx");
    const notesActions = read("../app/(app)/notes/[id]/actions.ts");
    const studentState = read("../lib/student-state/server.ts");
    const readingActions = read("../components/reading-support-actions.ts");

    for (const source of [assignmentPage, notesActions, studentState, readingActions]) {
      expect(source).not.toContain("classes(ai_mode)");
      expect(source).not.toContain("effectiveAiMode");
    }
    expect(assignmentPage).toContain("resolveDianaHomeworkTrust().aiMode");
    expect(notesActions).toContain("resolveDianaHomeworkTrust().aiMode");
    expect(studentState).toContain("resolveDianaHomeworkTrust().aiMode");
    expect(readingActions).toContain("resolveDianaHomeworkTrust().aiMode");
  });
  it("keeps atomic workspace patch functions in the migration contract", () => {
    const migration = read("../supabase/migrations/20260729110000_assignment_workspace_reliability.sql");
    expect(migration).toContain("merge_assignment_saved_work");
    expect(migration).toContain("merge_assignment_problem_work");
    expect(migration).toContain("owner_id = auth.uid()");
    expect(migration).toContain("assignment_time_log_one_open_idx");
  });

  it("builds submission specialist context from authoritative assignment metadata", () => {
    const source = read("assignment-submission-server.ts");
    expect(source).toContain("description, rubric_text, assignment_profile, source_import_status");
    expect(source).toContain("loadAssignmentHomeworkKernel({");
    expect(source).toContain("submissionSpecialistContextFromKernel(kernel)");
    expect(source).toContain("academicBand: kernel.understanding.academicBand");
    expect(source).toContain("sourceAnchors,");
    expect(source).toContain("rubricAnchors,");
    expect(source).toContain("specialistContext,");
  });
});
