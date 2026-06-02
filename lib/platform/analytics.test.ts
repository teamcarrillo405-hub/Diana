import { describe, expect, it } from "vitest";
import {
  aiCostByFeature,
  anonymizedDiagnosisTags,
  featureUsageSummary,
  isExperimentSurfaceAllowed,
  taskCompletionRate,
  webVitalStatus,
} from "./analytics";

describe("platform analytics helpers", () => {
  it("groups daily AI token use by feature", () => {
    expect(
      aiCostByFeature(
        [
          { feature: "math_step", tokens_used: 300, created_at: "2026-06-01T01:00:00Z" },
          { feature: "math_step", tokens_used: 200, created_at: "2026-06-01T02:00:00Z" },
          { feature: "writing_aid", tokens_used: 900, created_at: "2026-06-01T03:00:00Z" },
          { feature: "old", tokens_used: 5000, created_at: "2026-05-31T23:00:00Z" },
        ],
        "2026-06-01",
      ),
    ).toEqual([
      { feature: "writing_aid", tokens: 900, interactions: 1 },
      { feature: "math_step", tokens: 500, interactions: 2 },
    ]);
  });

  it("summarizes feature events and route session minutes", () => {
    expect(
      featureUsageSummary([
        { event_name: "page_view", feature: "dashboard", duration_ms: null },
        { event_name: "route_session", feature: "dashboard", duration_ms: 125000 },
        { event_name: "page_view", feature: "notes", duration_ms: null },
      ]),
    ).toEqual([
      { feature: "dashboard", events: 2, sessionMinutes: 2 },
      { feature: "notes", events: 1, sessionMinutes: 0 },
    ]);
  });

  it("computes task completion rate from durable assignment states", () => {
    expect(taskCompletionRate([{ status: "captured" }, { status: "done" }, { status: "graded" }])).toEqual({
      total: 3,
      completed: 2,
      percent: 67,
    });
  });

  it("maps diagnosis values to anonymous categories only", () => {
    expect(anonymizedDiagnosisTags(["adhd", "dyslexia", "custom-private-value"])).toEqual([
      "attention",
      "other",
      "reading",
    ]);
    expect(anonymizedDiagnosisTags([])).toEqual(["not_disclosed"]);
  });

  it("flags web vital budget alerts", () => {
    expect(webVitalStatus("LCP", 2400).status).toBe("ok");
    expect(webVitalStatus("LCP", 2700).status).toBe("over_budget");
    expect(webVitalStatus("custom", 900, 800)).toEqual({
      metricName: "CUSTOM",
      value: 900,
      budget: 800,
      status: "over_budget",
    });
  });

  it("allows UI experiments but blocks protected surfaces", () => {
    expect(isExperimentSurfaceAllowed("dashboard card density")).toBe(true);
    expect(isExperimentSurfaceAllowed("accommodation prompt")).toBe(false);
    expect(isExperimentSurfaceAllowed("AI content style")).toBe(false);
  });
});
