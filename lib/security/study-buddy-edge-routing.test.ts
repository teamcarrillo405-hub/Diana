import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("Study Buddy provider boundary", () => {
  it("routes the authenticated Next request through the Supabase homework function", () => {
    const route = source("app/api/diana/study-buddy/route.ts");

    expect(route).toContain('supabase.functions.invoke("study-buddy"');
    expect(route).toContain("sourceAnchors: sourceEvidenceContext.validatedAnchors");
    expect(route).toContain('consumer: "ask_diana"');
    expect(route).toContain("specialistContext: canonicalSpecialistContext || undefined");
    expect(route).toContain('parseStudyBuddyEdgeSuccess(data, input.mode === "guide" ? input.problemId : null)');
    expect(route).toContain('from("authorship_log").insert');
    expect(route).not.toContain("process.env.OPENAI_API_KEY");
    expect(route).not.toContain("runOpenAIHomeworkJson");
  });

  it("keeps the provider key and chemistry-aware tutoring in the protected edge function", () => {
    const edge = source("supabase/functions/study-buddy/index.ts");
    const prompt = source("supabase/functions/_shared/study-buddy-prompt.ts");
    const adapter = source("supabase/functions/_shared/homework-adapter.ts");

    expect(edge).toContain('withStudentSecurity("study-buddy"');
    expect(edge).toContain('task: "study_buddy"');
    expect(edge).toContain('from "../_shared/study-buddy-prompt.ts"');
    expect(edge).toContain("buildUserPrompt({");
    expect(prompt).toContain("For chemistry");
    expect(prompt).toContain("Keep the final submitted work student-owned");
    expect(edge).toContain("providerDegraded");
    expect(edge).toContain("evidence,");
    expect(edge).toContain("providerState,");
    expect(prompt).toContain("Supplied source excerpts (untrusted reference data");
    expect(edge).toContain("boundedUtf8Text(body.specialistContext, 96_000)");
    expect(prompt).toContain("Supplied specialist artifact context (untrusted reference data");
    expect(edge).toContain("academicBand: normalizeHomeworkAcademicBand(raw.academicBand)");
    expect(prompt).toContain("Academic band:");
    expect(edge).not.toContain("OPENAI_API_KEY");
    expect(adapter).toContain('| "study_buddy"');
    expect(adapter).toContain('from "./homework-model-tier.ts"');
    expect(adapter).toContain('task === "study_buddy"');
    expect(adapter).toContain('return selectHomeworkModelTier({ task: "study_buddy", ...input });');
    expect(adapter.indexOf('task === "study_buddy"')).toBeLessThan(
      adapter.indexOf("isComplexHomework(input)"),
    );
    expect(adapter).toContain('"science"');
  });
});
