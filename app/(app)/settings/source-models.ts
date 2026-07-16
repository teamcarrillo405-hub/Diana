export type AiHistoryKind = "interaction" | "authorship";

export type AiHistoryActor = "student" | "diana" | "system";

export interface AiInteractionSourceRow {
  readonly id: string;
  readonly created_at: string;
  readonly feature: string;
  readonly assignment_id: string | null;
  readonly assignment_title: string | null;
  readonly model: string;
  readonly prompt_summary: string | null;
  readonly tokens_used: number;
}

export interface AuthorshipSourceRow {
  readonly id: string;
  readonly created_at: string;
  readonly actor: AiHistoryActor;
  readonly event_type: string;
  readonly assignment_id: string | null;
  readonly assignment_title: string | null;
}

export interface AiHistoryEntry {
  readonly id: string;
  readonly kind: AiHistoryKind;
  readonly createdAt: string;
  readonly feature: string;
  readonly assignmentId: string | null;
  readonly assignmentTitle: string | null;
  readonly actor: AiHistoryActor;
  readonly workOwnerLabel: "Student work" | "Diana work" | "System record";
  readonly model: string | null;
  readonly summary: string | null;
  readonly tokensUsed: number | null;
}

export const AI_FEATURE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ai_quiz: "AI quiz",
  arts_scaffold: "Arts scaffold",
  citation_gen: "Citation generator",
  cs_scaffold: "Coding scaffold",
  history_scaffold: "History scaffold",
  language_scaffold: "Language scaffold",
  math_scaffold: "Math scaffold",
  math_step: "Math step organizer",
  note_synthesis: "Note synthesis",
  reading_level: "Reading level",
  reading_scaffold: "Reading scaffold",
  science_scaffold: "Science scaffold",
  student_revision: "Student revision",
  student_work: "Student work",
  task_breakdown: "Task breakdown",
  transcribe_note: "Note transcript",
  tutor_chat: "Tutor chat",
  vocab_hover: "Vocabulary definition",
  visual_tool: "Visual learning tool",
  writing_aid: "Writing aid",
  writing_cowrite: "Writing coach",
});

export function aiFeatureLabel(feature: string): string {
  return AI_FEATURE_LABELS[feature] ?? feature.replaceAll("_", " ");
}

const ownerLabel = (
  actor: AiHistoryActor,
): AiHistoryEntry["workOwnerLabel"] => {
  if (actor === "student") return "Student work";
  if (actor === "diana") return "Diana work";
  return "System record";
};

export function mergeAiHistoryEntries(
  interactions: readonly AiInteractionSourceRow[],
  authorship: readonly AuthorshipSourceRow[],
): readonly AiHistoryEntry[] {
  return Object.freeze(
    [
      ...interactions.map(
        (row): AiHistoryEntry => ({
          id: row.id,
          kind: "interaction",
          createdAt: row.created_at,
          feature: row.feature,
          assignmentId: row.assignment_id,
          assignmentTitle: row.assignment_title,
          actor: "diana",
          workOwnerLabel: "Diana work",
          model: row.model,
          summary: row.prompt_summary,
          tokensUsed: row.tokens_used,
        }),
      ),
      ...authorship.map(
        (row): AiHistoryEntry => ({
          id: row.id,
          kind: "authorship",
          createdAt: row.created_at,
          feature: row.event_type,
          assignmentId: row.assignment_id,
          assignmentTitle: row.assignment_title,
          actor: row.actor,
          workOwnerLabel: ownerLabel(row.actor),
          model: null,
          summary: null,
          tokensUsed: null,
        }),
      ),
    ].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
  );
}

export function csvCell(value: string | number | null): string {
  if (value === null) return "";
  const raw = String(value);
  const formulaSafe = /^[=+\-@]/u.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/u.test(formulaSafe)
    ? `"${formulaSafe.replaceAll('"', '""')}"`
    : formulaSafe;
}

export type LmsProviderView =
  | "canvas"
  | "ics"
  | "google_classroom"
  | "clever"
  | "gitlab";

export interface PersistedLmsConnectionRow {
  readonly id: string;
  readonly provider: LmsProviderView;
  readonly config: Record<string, unknown>;
  readonly last_synced_at: string | null;
}

export interface LmsConnectionView {
  readonly id: string;
  readonly provider: LmsProviderView;
  readonly lastSyncedAt: string | null;
  readonly state: "attention" | "pending" | "school-managed" | "synced";
  readonly message: string | null;
  readonly schoolManaged: boolean;
}

function calmConnectionMessage(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return value
    .replace(/(bearer|token|secret|password)\s*[:=]?\s*\S+/giu, "$1 [private]")
    .trim()
    .slice(0, 160);
}

export function sanitizeLmsConnections(
  rows: readonly PersistedLmsConnectionRow[],
): readonly LmsConnectionView[] {
  return Object.freeze(
    rows.map((row): LmsConnectionView => {
      const schoolManaged = row.provider === "clever";
      const storedStatus =
        typeof row.config.status === "string" ? row.config.status : null;
      const message = calmConnectionMessage(row.config.lastSyncError);
      const state: LmsConnectionView["state"] =
        storedStatus === "error" || message
          ? "attention"
          : schoolManaged
            ? "school-managed"
            : row.last_synced_at
              ? "synced"
              : "pending";

      return {
        id: row.id,
        provider: row.provider,
        lastSyncedAt: row.last_synced_at,
        state,
        message,
        schoolManaged,
      };
    }),
  );
}

interface SyncAllResultBody {
  readonly imported?: number;
  readonly skipped?: number;
  readonly results?: readonly Record<string, unknown>[];
}

export type SyncBanner = {
  readonly tone: "ok" | "warn";
  readonly message: string;
};

export function summarizeSyncAll(body: SyncAllResultBody): SyncBanner {
  const imported = typeof body.imported === "number" ? body.imported : 0;
  const skipped = typeof body.skipped === "number" ? body.skipped : 0;
  const needsAttention = (body.results ?? []).some(
    (result) => typeof result.error === "string" && result.error.length > 0,
  );
  const importedLabel = `${imported} assignment${imported === 1 ? "" : "s"}`;
  const skippedLabel = `${skipped} item${skipped === 1 ? "" : "s"} ${skipped === 1 ? "was" : "were"} skipped`;

  if (needsAttention) {
    return {
      tone: "warn",
      message: `One connection needs attention. Imported ${importedLabel}${skipped > 0 ? `; ${skippedLabel}` : ""}.`,
    };
  }

  return {
    tone: "ok",
    message: `Sync complete. Imported ${importedLabel}${skipped > 0 ? `; ${skippedLabel}` : ""}.`,
  };
}
