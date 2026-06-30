// F15 — Shared types for LMS Calendar Import.
// All three providers normalize through NormalizedAssignment before upsert.

export type LmsProvider = "canvas" | "google_classroom" | "ics" | "clever" | "gitlab";

export type LmsConnection = {
  id: string;
  owner_id: string;
  provider: LmsProvider;
  config: Record<string, unknown>;
  last_synced_at: string | null;
  created_at: string;
};

export type NormalizedAssignment = {
  external_id: string;          // provider-stable ID for dedup
  title: string;
  description: string | null;
  due_at: string;               // ISO 8601 — fetchers MUST filter out null due dates
  external_source: LmsProvider;
  external_url?: string | null;
  rubric_text?: string | null;
  // Source course identity. When present, sync maps the assignment to a real
  // per-course class (e.g. each Canvas course → a Diana class) instead of the
  // flat per-provider shadow class. Omitted by feed-style providers (ICS).
  external_course_id?: string | null;
  external_course_name?: string | null;
};

export type SyncResult = {
  imported: number;
  skipped: number;              // surfaced in UI only if > 0
  source: LmsProvider;
};
