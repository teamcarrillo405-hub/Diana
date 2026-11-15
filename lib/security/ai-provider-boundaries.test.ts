import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("AI provider and logging boundaries", () => {
  it("durably marks provider start before any guarded provider invocation", () => {
    const safety = source("supabase/functions/_shared/safety.ts");
    const marker = safety.indexOf("const providerStarted = await markBudgetProviderStarted(");
    const invocation = safety.indexOf("value = await invoke({", marker);
    const migration = source("supabase/migrations/20260731170000_ai_token_budget_reservations.sql");

    expect(marker).toBeGreaterThan(-1);
    expect(invocation).toBeGreaterThan(marker);
    expect(migration).toContain("provider_started_at timestamptz");
    expect(migration).toContain("create or replace function public.mark_ai_budget_provider_started");
    expect(migration).toContain("conservatively_settled_at = now()");
    expect(migration).toContain("release_ai_budget_known_not_consumed");
  });

  it("keeps file and image extraction behind the shared homework adapter", () => {
    const featureRoutes = [
      "supabase/functions/extract-note-doc/index.ts",
      "supabase/functions/extract-assignment-source/index.ts",
      "supabase/functions/history-scaffold/index.ts",
      "supabase/functions/math-scaffold/index.ts",
    ];

    for (const path of featureRoutes) {
      const feature = source(path);
      expect(feature).toContain("runOpenAIHomeworkAdapter");
      expect(feature).not.toContain('fetch("https://api.openai.com/v1/responses"');
      expect(feature).not.toContain("runSafeBudgetedAiCall({");
    }

    const adapter = source("supabase/functions/_shared/homework-adapter.ts");
    const studentModel = source("supabase/functions/_shared/student-model.ts");
    expect(adapter).toContain("callSafeStudentTextModel");
    expect(studentModel).toContain('fetch("https://api.openai.com/v1/responses"');
    expect(studentModel).not.toContain("api.anthropic.com/v1/messages");
    expect(studentModel).not.toContain("ANTHROPIC_API_KEY");
    expect(studentModel).toContain('type: "file"');
    expect(studentModel).toContain("file_data");
    expect(studentModel).toContain("markProviderUsage?.();");
  });

  it("keeps provider parse and response failures sanitized in the shared student model", () => {
    const studentModel = source("supabase/functions/_shared/student-model.ts");
    expect(studentModel).not.toMatch(/console\.(?:error|warn)\([^\n]*,\s*(?:err|error|e)\b/u);
    expect(studentModel).toContain("student_model_invalid_response");
    expect(studentModel).toContain("responseBytes: new TextEncoder().encode(providerError).byteLength");
    expect(studentModel).not.toContain("providerError,");
  });

  it("keeps break-down on the shared homework adapter instead of the legacy sidecar", () => {
    const breakDown = source("app/api/diana/break-down/route.ts");

    expect(breakDown).toContain("runOpenAIHomeworkJson");
    expect(breakDown).toContain('task: "break_down"');
    expect(breakDown).toContain("resolveDianaHomeworkTrust");
    expect(breakDown).not.toContain("diana-study-helper-sidecar");
    expect(breakDown).not.toContain("isDianaStudyHelperEnabled");
    expect(breakDown).not.toContain("createDianaBreakDownProviderResult");
  });

  it("keeps assignment source extraction errors sanitized", () => {
    const extraction = source("supabase/functions/extract-assignment-source/index.ts");

    expect(extraction).not.toContain('console.error("extract-assignment-source", error)');
    expect(extraction).toContain("messageBytes: new TextEncoder().encode");
    expect(extraction).toContain('name: error instanceof Error ? error.name : "unknown"');
  });
  it("passes homework understanding into study artifact generation", () => {
    const studyActions = source("app/(app)/study-artifacts/actions.ts");
    const studyArtifacts = source("supabase/functions/study-artifacts/index.ts");

    expect(studyActions).toContain("homework: source.homeworkMetadata ?? null");
    expect(studyActions).toContain("homeworkAuthorshipMetadata(kernel, { route: \"study-artifacts\" })");
    expect(studyArtifacts).toContain("homework?: unknown");
    expect(studyArtifacts).toContain("safeHomeworkContext(body.homework)");
    expect(studyArtifacts).toContain("Diana assignment understanding");
    expect(studyArtifacts).toContain("subjectDomain");
    expect(studyArtifacts).toContain("sourceState");
  });
  it("persists metadata instead of raw study prompts or provider bodies", () => {
    const nextSafety = source("lib/ai/safety.ts");
    const studyBuddy = source("app/api/diana/study-buddy/route.ts");
    const transcribe = source("supabase/functions/transcribe-voice/index.ts");

    expect(nextSafety).toContain("prompt_summary: interactionMetadata(params)");
    expect(nextSafety).not.toContain("params.promptSummary.slice");
    expect(studyBuddy).not.toContain("promptSummary: input.question");
    expect(studyBuddy).toContain("inputBytes:");
    expect(studyBuddy).toContain("outputBytes:");
    expect(transcribe).not.toContain("safeDetail");
    expect(transcribe).not.toContain("provider_error:${");
    expect(transcribe).not.toContain('console.error("transcribe-voice error:", err)');
    expect(transcribe).toContain('throw new Error("openai_whisper_invalid_response")');
  });
});
