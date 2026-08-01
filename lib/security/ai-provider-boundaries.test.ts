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

  it("keeps every direct image provider call inside the guarded invocation", () => {
    const boundaries = [
      {
        path: "supabase/functions/extract-note-doc/index.ts",
        invocation: "invoke: async",
        provider: "fetch(\"https://api.openai.com/v1/chat/completions\"",
      },
      {
        path: "supabase/functions/history-scaffold/index.ts",
        invocation: "runMapAnnotation(image, markProviderUsage)",
        provider: "fetch(\"https://api.openai.com/v1/chat/completions\"",
      },
      {
        path: "supabase/functions/math-scaffold/index.ts",
        invocation: "extractProblemFromPhoto(image, markProviderUsage)",
        provider: "fetch(\"https://api.openai.com/v1/chat/completions\"",
      },
    ];

    for (const boundary of boundaries) {
      const provider = source(boundary.path);
      expect(provider).toContain(boundary.invocation);
      expect(provider).toContain(boundary.provider);
    }
  });

  it("never logs provider or student parse errors in the three direct JSON handlers", () => {
    for (const path of [
      "supabase/functions/extract-note-doc/index.ts",
      "supabase/functions/history-scaffold/index.ts",
      "supabase/functions/math-scaffold/index.ts",
    ]) {
      const provider = source(path);
      expect(provider).not.toMatch(/console\.(?:error|warn)\([^\n]*,\s*(?:err|error|e)\b/u);
      expect(provider).toMatch(/provider_invalid_json|content_invalid_json/u);
    }
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
