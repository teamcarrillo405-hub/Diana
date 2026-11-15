export const SUPPORT_SEARCH_KINDS = [
  "all",
  "classes",
  "work",
  "notes",
  "concepts",
  "artifacts",
] as const;

export type SupportSearchKind = (typeof SUPPORT_SEARCH_KINDS)[number];

export type SupportSearchEntity =
  | Readonly<{ type: "class"; id: string; title: string; detail: string }>
  | Readonly<{ type: "assignment"; id: string; title: string; detail: string }>
  | Readonly<{ type: "note"; id: string; title: string; detail: string }>
  | Readonly<{ type: "concept"; id: string; title: string; detail: string }>
  | Readonly<{ type: "artifact"; id: string; title: string; detail: string }>;

export type SupportSearchResult = Readonly<{
  key: string;
  title: string;
  detail: string;
  href: string;
  kind: "Class" | "Work" | "Note" | "Concept" | "Artifact";
}>;

export function parseSupportSearchKind(
  value: string | string[] | undefined,
): SupportSearchKind {
  const candidate = Array.isArray(value) ? value[0] : value;
  return SUPPORT_SEARCH_KINDS.includes(candidate as SupportSearchKind)
    ? (candidate as SupportSearchKind)
    : "all";
}

export function normalizeSupportSearchQuery(value: string): Readonly<{
  query: string;
  pattern: string | null;
}> {
  const query = value.trim().replace(/\s+/gu, " ").slice(0, 80);
  if (!query) return Object.freeze({ query: "", pattern: null });
  const escaped = query.replace(/[\\%_]/gu, "\\$&");
  return Object.freeze({ query, pattern: `%${escaped}%` });
}

export function buildSupportSearchResult(
  entity: SupportSearchEntity,
): SupportSearchResult {
  const id = encodeURIComponent(entity.id);
  const route = {
    assignment: `/assignments/${id}`,
    note: `/notes/${id}`,
    class: `/classes/${id}`,
    concept: `/concepts/${id}`,
    artifact: `/study-artifacts/${id}`,
  }[entity.type];
  const kind = {
    assignment: "Work",
    note: "Note",
    class: "Class",
    concept: "Concept",
    artifact: "Artifact",
  }[entity.type] as SupportSearchResult["kind"];

  return Object.freeze({
    key: `${entity.type}-${entity.id}`,
    title: entity.title,
    detail: entity.detail,
    href: route,
    kind,
  });
}

export function notificationDueLabel(
  dueAt: string | null,
  now: Date = new Date(),
): Readonly<{ label: string; tone: "amber" | "pink" | "blue" }> {
  if (!dueAt) return Object.freeze({ label: "No due time", tone: "blue" });
  const dueTime = new Date(dueAt).getTime();
  if (!Number.isFinite(dueTime)) {
    return Object.freeze({ label: "Due date available", tone: "blue" });
  }
  const hours = Math.ceil((dueTime - now.getTime()) / 3_600_000);
  if (hours <= 0) return Object.freeze({ label: "Due earlier", tone: "amber" });
  if (hours <= 24) {
    return Object.freeze({ label: "Due within 24 hours", tone: "pink" });
  }
  if (hours <= 72) {
    return Object.freeze({ label: `Due within ${hours} hours`, tone: "pink" });
  }
  return Object.freeze({ label: "On deck", tone: "blue" });
}

export function wellnessRecoveryCopy(
  mood: "good" | "meh" | "rough",
  sleepQuality: "rested" | "ok" | "rough",
): Readonly<{ title: string; body: string }> {
  if (mood === "rough" || sleepQuality === "rough") {
    return Object.freeze({
      title: "Smaller first move",
      body: "Your check-in supports one shorter task and a clear stopping point.",
    });
  }
  if (mood === "meh" || sleepQuality === "ok") {
    return Object.freeze({
      title: "Flexible focus window",
      body: "Keep the next choice small and adjust the task mix when you need to.",
    });
  }
  return Object.freeze({
    title: "Steady focus window",
    body: "Your check-in supports the usual task mix. You can adjust it at any time.",
  });
}
