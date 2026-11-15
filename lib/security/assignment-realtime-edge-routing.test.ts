import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("Assignment Realtime provider boundary", () => {
  it("keeps both Work voice routes on authenticated Supabase functions", () => {
    const sessionRoute = source("app/api/diana/assignment-realtime/route.ts");
    const reasoningRoute = source("app/api/diana/assignment-realtime/reason/route.ts");

    expect(sessionRoute).toContain('supabase.functions.invoke("assignment-realtime"');
    expect(reasoningRoute).toContain('supabase.functions.invoke("assignment-realtime-reason"');
    expect(sessionRoute).not.toContain("process.env.OPENAI_API_KEY");
    expect(reasoningRoute).not.toContain("runOpenAIHomeworkText");
  });

  it("keeps the provider key, billing safeguards, and voice session minting in guarded edge functions", () => {
    const sessionEdge = source("supabase/functions/assignment-realtime/index.ts");
    const reasoningEdge = source("supabase/functions/assignment-realtime-reason/index.ts");

    expect(sessionEdge).toContain('Deno.serve(withStudentSecurity("assignment-realtime"');
    expect(sessionEdge).toContain('Deno.env.get("OPENAI_API_KEY")');
    expect(sessionEdge).toContain("runSafeBudgetedAiCall");
    expect(sessionEdge).toContain('fetch("https://api.openai.com/v1/realtime/client_secrets"');
    expect(reasoningEdge).toContain('Deno.serve(withStudentSecurity("assignment-realtime-reason"');
    expect(reasoningEdge).toContain('task: "realtime"');
    expect(reasoningEdge).toContain("runAssignmentScopedHomeworkAdapter");
    expect(reasoningEdge).toContain('from "../_shared/learning/assignment-help-boundary.ts"');
  });
});
