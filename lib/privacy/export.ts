export type DataInventoryInput = {
  classes: number;
  assignments: number;
  notes: number;
  flashcards: number;
  studyArtifacts: number;
  studentStateSnapshots: number;
  authorshipLog: number;
  competitiveBenchmarks: number;
  teenTestObservations: number;
  aiInteractions: number;
  masteryConcepts: number;
  shareLinks: number;
};

export type DataInventoryRow = {
  label: string;
  count: number;
};

export type NotificationPreferences = {
  assignment_reminders: boolean;
  ai_budget: boolean;
  weekly_reflection: boolean;
  parent_summary: boolean;
  quiet_hours: boolean;
};

export type AiVerbosity = "minimal" | "balanced" | "detailed";

export const PRIVACY_DELETE_CATEGORIES = [
  "notes",
  "flashcards",
  "study_artifacts",
  "student_state_snapshots",
  "authorship_log",
  "competitive_benchmarks",
  "teen_test_observations",
  "ai_interactions",
  "mastery_concepts",
  "share_links",
  "session_handoff",
] as const;

export type PrivacyDeleteCategory = typeof PRIVACY_DELETE_CATEGORIES[number];

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  assignment_reminders: true,
  ai_budget: true,
  weekly_reflection: true,
  parent_summary: false,
  quiet_hours: true,
};

export function buildDataInventory(input: DataInventoryInput): DataInventoryRow[] {
  return [
    { label: "Classes", count: input.classes },
    { label: "Assignments", count: input.assignments },
    { label: "Notes", count: input.notes },
    { label: "Flashcards", count: input.flashcards },
    { label: "Study artifacts", count: input.studyArtifacts },
    { label: "Student state snapshots", count: input.studentStateSnapshots },
    { label: "Authorship log", count: input.authorshipLog },
    { label: "Competitive benchmarks", count: input.competitiveBenchmarks },
    { label: "Teen test observations", count: input.teenTestObservations },
    { label: "AI interactions", count: input.aiInteractions },
    { label: "Mastery concepts", count: input.masteryConcepts },
    { label: "Share links", count: input.shareLinks },
  ];
}

export function normalizeNotificationPrefs(input: unknown): NotificationPreferences {
  const raw = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  return {
    assignment_reminders: boolPref(raw.assignment_reminders, DEFAULT_NOTIFICATION_PREFS.assignment_reminders),
    ai_budget: boolPref(raw.ai_budget, DEFAULT_NOTIFICATION_PREFS.ai_budget),
    weekly_reflection: boolPref(raw.weekly_reflection, DEFAULT_NOTIFICATION_PREFS.weekly_reflection),
    parent_summary: boolPref(raw.parent_summary, DEFAULT_NOTIFICATION_PREFS.parent_summary),
    quiet_hours: boolPref(raw.quiet_hours, DEFAULT_NOTIFICATION_PREFS.quiet_hours),
  };
}

export function normalizeVerbosity(value: unknown): AiVerbosity {
  return value === "minimal" || value === "detailed" || value === "balanced" ? value : "balanced";
}

export function applySubjectVerbosity(
  existing: unknown,
  classId: string,
  verbosity: AiVerbosity,
): Record<string, AiVerbosity> {
  const source = typeof existing === "object" && existing !== null ? existing as Record<string, unknown> : {};
  return {
    ...Object.fromEntries(Object.entries(source).map(([key, value]) => [key, normalizeVerbosity(value)])),
    [classId]: verbosity,
  };
}

export function displayVerbosity(raw: unknown, classId: string) {
  const source = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {};
  return normalizeVerbosity(source[classId]);
}

export function displayNotificationPrefs(raw: unknown) {
  return normalizeNotificationPrefs(raw);
}

export function deletionRequestPatch(nowIso: string) {
  return {
    consent_ai: false,
    daily_token_budget: 0,
    tokens_used_today: 0,
    privacy_preferences: {
      deletion_requested_at: nowIso,
      ai_disabled_at: nowIso,
    },
  };
}

export function categoryLabel(category: PrivacyDeleteCategory): string {
  return ({
    notes: "Notes",
    flashcards: "Flashcards",
    study_artifacts: "Study artifacts",
    student_state_snapshots: "Student state snapshots",
    authorship_log: "Authorship log",
    competitive_benchmarks: "Competitive benchmarks",
    teen_test_observations: "Teen test observations",
    ai_interactions: "AI history",
    mastery_concepts: "Mastery data",
    share_links: "Share links",
    session_handoff: "Device handoff",
  } satisfies Record<PrivacyDeleteCategory, string>)[category];
}

export function buildPrivacyExportPdf({
  displayName,
  inventory,
}: {
  displayName: string;
  inventory: DataInventoryRow[];
}): Uint8Array {
  const lines = [
    `Diana data export: ${displayName || "Student"}`,
    "",
    "Data inventory",
    ...inventory.map((row) => `- ${row.label}: ${row.count}`),
  ].slice(0, 32);

  const textOps = lines.map((line, index) => {
    const y = 760 - index * 18;
    return `BT /F1 11 Tf 54 ${y} Td (${escapePdfText(line)}) Tj ET`;
  }).join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    `5 0 obj << /Length ${textOps.length} >> stream\n${textOps}\nendstream endobj\n`,
  ];

  let offset = "%PDF-1.4\n".length;
  const xref = ["0000000000 65535 f \n"];
  for (const obj of objects) {
    xref.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
    offset += obj.length;
  }
  const body = objects.join("");
  const xrefStart = "%PDF-1.4\n".length + body.length;
  return new TextEncoder().encode([
    "%PDF-1.4\n",
    body,
    `xref\n0 ${objects.length + 1}\n`,
    ...xref,
    `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  ].join(""));
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function boolPref(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
