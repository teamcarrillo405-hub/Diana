export type AiCostRow = {
  feature: string | null;
  tokens_used: number | null;
  created_at: string;
};

export type AiCostSummary = {
  feature: string;
  tokens: number;
  interactions: number;
};

export type AnalyticsEventRow = {
  event_name: string;
  feature: string | null;
  duration_ms: number | null;
};

export type FeatureUsageSummary = {
  feature: string;
  events: number;
  sessionMinutes: number;
};

export type AssignmentStatusRow = {
  status: string | null;
};

export type CompletionRate = {
  total: number;
  completed: number;
  percent: number;
};

export type WebVitalName = "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";

export type WebVitalStatus = {
  metricName: string;
  value: number;
  budget: number;
  status: "ok" | "over_budget";
};

export const WEB_VITAL_BUDGETS: Record<WebVitalName, number> = {
  CLS: 0.1,
  FCP: 1800,
  FID: 100,
  INP: 200,
  LCP: 2500,
  TTFB: 800,
};

const COMPLETED_STATUSES = new Set(["done", "submitted", "graded"]);
const PROTECTED_EXPERIMENT_SURFACE =
  /\b(accommodation|iep|504|content|diagnosis|safety|privacy|ai)\b/i;

export function aiCostByFeature(rows: AiCostRow[], dayIso: string): AiCostSummary[] {
  const groups = new Map<string, AiCostSummary>();
  for (const row of rows) {
    if (!row.created_at.startsWith(dayIso)) continue;
    const feature = row.feature?.trim() || "unknown";
    const current = groups.get(feature) ?? { feature, tokens: 0, interactions: 0 };
    current.tokens += Math.max(0, Number(row.tokens_used ?? 0));
    current.interactions += 1;
    groups.set(feature, current);
  }
  return [...groups.values()].sort((a, b) => b.tokens - a.tokens || a.feature.localeCompare(b.feature));
}

export function featureUsageSummary(rows: AnalyticsEventRow[]): FeatureUsageSummary[] {
  const groups = new Map<string, FeatureUsageSummary>();
  for (const row of rows) {
    const feature = row.feature?.trim() || row.event_name.trim() || "unknown";
    const current = groups.get(feature) ?? { feature, events: 0, sessionMinutes: 0 };
    current.events += 1;
    current.sessionMinutes += Math.max(0, Math.round(Number(row.duration_ms ?? 0) / 60000));
    groups.set(feature, current);
  }
  return [...groups.values()].sort((a, b) => b.events - a.events || a.feature.localeCompare(b.feature));
}

export function taskCompletionRate(rows: AssignmentStatusRow[]): CompletionRate {
  const total = rows.length;
  const completed = rows.filter((row) => COMPLETED_STATUSES.has(String(row.status ?? ""))).length;
  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function anonymizedDiagnosisTags(diagnoses: string[] | null | undefined): string[] {
  if (!diagnoses || diagnoses.length === 0) return ["not_disclosed"];

  const tags = new Set<string>();
  for (const diagnosis of diagnoses) {
    const value = diagnosis.toLowerCase();
    if (value === "none") tags.add("not_disclosed");
    else if (value.includes("adhd") || value.includes("attention")) tags.add("attention");
    else if (value.includes("dyslexia") || value.includes("reading")) tags.add("reading");
    else if (value.includes("dyscalculia") || value.includes("math")) tags.add("math");
    else if (value.includes("dysgraphia") || value.includes("writing")) tags.add("writing");
    else if (value.includes("autism") || value.includes("sensory")) tags.add("sensory");
    else if (value.includes("anxiety") || value.includes("mood") || value.includes("depression")) {
      tags.add("wellbeing");
    } else {
      tags.add("other");
    }
  }

  return [...tags].sort();
}

export function webVitalStatus(
  metricName: string,
  value: number,
  explicitBudget?: number | null,
): WebVitalStatus {
  const normalized = metricName.toUpperCase();
  const budget =
    typeof explicitBudget === "number"
      ? explicitBudget
      : WEB_VITAL_BUDGETS[normalized as WebVitalName] ?? 1000;
  return {
    metricName: normalized,
    value,
    budget,
    status: value <= budget ? "ok" : "over_budget",
  };
}

export function isExperimentSurfaceAllowed(surface: string): boolean {
  const normalized = surface.trim();
  return normalized.length > 0 && !PROTECTED_EXPERIMENT_SURFACE.test(normalized);
}
