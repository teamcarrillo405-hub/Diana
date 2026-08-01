// F15 — Shared types for LMS Calendar Import.
// All three providers normalize through NormalizedAssignment before upsert.

export type LmsProvider = "canvas" | "google_classroom" | "ics" | "clever" | "gitlab";
import type { AssignmentSourceInput } from "@/lib/assignment-sources";


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
  // Raw provider assignment ID for API calls when external_id must include
  // additional namespace, such as a Google Classroom course ID.
  provider_assignment_id?: string | null;
  title: string;
  description: string | null;
  due_at: string | null;        // ISO 8601 when the provider supplied a due date
  external_source: LmsProvider;
  external_url?: string | null;
  rubric_text?: string | null;
  // Source course identity. When present, sync maps the assignment to a real
  // per-course class (e.g. each Canvas course → a Diana class) instead of the
  // flat per-provider shadow class. Omitted by feed-style providers (ICS).
  external_course_id?: string | null;
  external_course_name?: string | null;
  sources?: AssignmentSourceInput[];
};

export type SyncResult = {
  imported: number;
  skipped: number;              // surfaced in UI only if > 0
  source: LmsProvider;
};
