// Google Classroom — hardened token flow + reusable fetcher.
//
// Previously Classroom sync relied on the ephemeral Supabase Google
// `session.provider_token` (≈1h, interactive-only). Now a dedicated OAuth flow
// (app/api/lms/google-oauth/*) stores credentials in the service-only vault,
// and getValidGoogleToken() mints fresh access tokens on demand — so sync works
// from the background cron too, not just while a student is signed in.

import type { NormalizedAssignment } from "./types";
import { LmsReconnectRequiredError } from "./errors";
import { assertLmsProviderFeatureEnabled } from "./provider-features";

export type GoogleClassroomConfig = {
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: string | null;
  oauth?: boolean;
};

export type ValidGoogleToken = {
  token: string;
  // Present when the token was refreshed — caller should persist this back into
  // the service-only credential vault so the next run reuses it.
  refreshed?: { access_token: string; expires_at: string | null };
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_IDENTITY_SCOPES = ["openid", "email"] as const;
export const GOOGLE_CLASSROOM_IMPORT_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
] as const;
export const GOOGLE_CLASSROOM_SUBMISSION_SCOPES = [
  "https://www.googleapis.com/auth/classroom.coursework.me",
  "https://www.googleapis.com/auth/drive.file",
] as const;
export const GOOGLE_CLASSROOM_TEACHER_IMPORT_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
] as const;
export const GOOGLE_CLASSROOM_TEACHER_SUBMISSION_SCOPES = [
  "https://www.googleapis.com/auth/classroom.coursework.students",
  "https://www.googleapis.com/auth/drive.file",
] as const;

// Calendar stays read-only. Diana can place a student's personal schedule next
// to school work, but it never creates, edits, or deletes Google events.
export const GOOGLE_CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

export function googleClassroomOAuthScopes(input: {
  calendarEnabled?: boolean;
  importEnabled: boolean;
  submissionEnabled: boolean;
  teacher: boolean;
}): string[] {
  const importScopes = input.teacher
    ? GOOGLE_CLASSROOM_TEACHER_IMPORT_SCOPES
    : GOOGLE_CLASSROOM_IMPORT_SCOPES;
  const submissionScopes = input.teacher
    ? GOOGLE_CLASSROOM_TEACHER_SUBMISSION_SCOPES
    : GOOGLE_CLASSROOM_SUBMISSION_SCOPES;
  const scopes = new Set<string>(GOOGLE_IDENTITY_SCOPES);
  if (input.importEnabled || input.submissionEnabled) {
    scopes.add("https://www.googleapis.com/auth/classroom.courses.readonly");
  }
  if (input.importEnabled) {
    for (const scope of importScopes) scopes.add(scope);
  }
  if (input.submissionEnabled) {
    const readOnlyCoursework = input.teacher
      ? "https://www.googleapis.com/auth/classroom.coursework.students.readonly"
      : "https://www.googleapis.com/auth/classroom.coursework.me.readonly";
    scopes.delete(readOnlyCoursework);
    for (const scope of submissionScopes) scopes.add(scope);
  }
  if (input.calendarEnabled) scopes.add(GOOGLE_CALENDAR_READONLY_SCOPE);
  return [...scopes];
}

// Full student and teacher contracts remain exported for canaries and grant audits.
export const GOOGLE_CLASSROOM_SCOPES = googleClassroomOAuthScopes({
  importEnabled: true,
  submissionEnabled: true,
  teacher: false,
});

export const GOOGLE_CLASSROOM_TEACHER_SCOPES = googleClassroomOAuthScopes({
  importEnabled: true,
  submissionEnabled: true,
  teacher: true,
});

export function missingGoogleScopes(
  grantedScopes: readonly string[],
  requiredScopes: readonly string[] = GOOGLE_CLASSROOM_SCOPES,
): string[] {
  const granted = new Set(grantedScopes.map((scope) => scope.trim()).filter(Boolean));
  return requiredScopes.filter((scope) => !granted.has(scope));
}

/**
 * Return a usable Google access token for a stored Classroom connection.
 * Refreshes via the stored refresh_token when the access token is missing/expired.
 * A stale or unrefreshable OAuth connection requires an explicit reconnect.
 */
export async function getValidGoogleToken(
  config: GoogleClassroomConfig,
): Promise<ValidGoogleToken> {
  const now = Date.now();
  const expiresMs = config.expires_at ? Date.parse(config.expires_at) : 0;

  // Still valid (90s safety buffer).
  if (config.access_token && config.refresh_token && Number.isFinite(expiresMs) && expiresMs - now > 90_000) {
    return { token: config.access_token };
  }

  if (!config.refresh_token) {
    throw new LmsReconnectRequiredError("google_classroom");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new LmsReconnectRequiredError("google_classroom");
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: config.refresh_token,
      grant_type: "refresh_token",
    }),
  }).catch((error) => {
    throw new LmsReconnectRequiredError("google_classroom", undefined, { cause: error });
  });

  if (!res.ok) throw new LmsReconnectRequiredError("google_classroom");
  let body: { access_token?: string; expires_in?: number };
  try {
    body = (await res.json()) as { access_token?: string; expires_in?: number };
  } catch (error) {
    throw new LmsReconnectRequiredError("google_classroom", undefined, { cause: error });
  }
  if (!body.access_token) {
    throw new LmsReconnectRequiredError("google_classroom");
  }
  const expires_at =
    typeof body.expires_in === "number"
      ? new Date(Date.now() + body.expires_in * 1000).toISOString()
      : null;
  return { token: body.access_token, refreshed: { access_token: body.access_token, expires_at } };
}

// ---------------------------------------------------------------------------
// Reusable Classroom assignment fetcher (assignments only — announcements stay
// in the interactive route so the cron doesn't repeatedly spam the inbox).
// Carries external_course_id/name so each Classroom course maps to a real class.
// ---------------------------------------------------------------------------

type ClassroomDate = { year: number; month: number; day: number };
type ClassroomTime = { hours?: number; minutes?: number };
type Course = { id: string; name: string };
type CourseWork = {
  id: string;
  title: string;
  description?: string;
  dueDate?: ClassroomDate;
  dueTime?: ClassroomTime;
  alternateLink?: string;
  materials?: Array<{
    link?: { url?: string; title?: string };
    driveFile?: { driveFile?: { id?: string; title?: string; alternateLink?: string; thumbnailUrl?: string } };
    youtubeVideo?: { id?: string; title?: string; alternateLink?: string };
    form?: { formUrl?: string; title?: string };
  }>;};

type ClassroomPage<T, K extends string> = {
  nextPageToken?: string;
} & Partial<Record<K, T[]>>;

const CLASSROOM_PAGE_SIZE = 100;
const MAX_CLASSROOM_PAGES = 100;

function classroomSources(work: CourseWork) {
  const sources = [];
  if (work.description?.trim()) {
    sources.push({
      source_type: "instructions" as const,
      title: "Google Classroom instructions",
      provider: "google_classroom",
      external_id: `${work.id}:instructions`,
      extracted_text: work.description,
      import_status: "imported" as const,
    });
  }
  for (const [index, material] of (work.materials ?? []).entries()) {
    const drive = material.driveFile?.driveFile;
    const link = material.link;
    const video = material.youtubeVideo;
    const form = material.form;
    const url = drive?.alternateLink ?? link?.url ?? video?.alternateLink ?? form?.formUrl ?? null;
    const title = drive?.title ?? link?.title ?? video?.title ?? form?.title ?? "Google Classroom material";
    sources.push({
      source_type: drive ? "attachment" as const : "link" as const,
      title,
      provider: "google_classroom",
      external_id: `${work.id}:material:${drive?.id ?? index}`,
      url,
      import_status: drive?.id ? "ready" as const : "partial" as const,
    });
  }
  return sources;
}
function reconstructDueIso(d?: ClassroomDate, t?: ClassroomTime): string | null {
  if (!d) return null;
  return new Date(Date.UTC(d.year, d.month - 1, d.day, t?.hours ?? 23, t?.minutes ?? 59)).toISOString();
}

async function classroomGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Classroom request to ${url} returned ${res.status}`);
  return (await res.json()) as T;
}

async function classroomListAll<T, K extends string>(
  initialUrl: string,
  token: string,
  collection: K,
): Promise<T[]> {
  const items: T[] = [];
  const seenTokens = new Set<string>();
  let pageToken: string | null = null;

  for (let pageCount = 0; pageCount < MAX_CLASSROOM_PAGES; pageCount += 1) {
    const url = new URL(initialUrl);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const page = await classroomGet<ClassroomPage<T, K>>(url.toString(), token);
    items.push(...(page[collection] ?? []));

    const nextPageToken = page.nextPageToken?.trim() || null;
    if (!nextPageToken) return items;
    if (seenTokens.has(nextPageToken)) {
      throw new Error(`Google Classroom pagination repeated page token for ${collection}`);
    }
    seenTokens.add(nextPageToken);
    pageToken = nextPageToken;
  }

  throw new Error(`Google Classroom pagination exceeded ${MAX_CLASSROOM_PAGES} pages for ${collection}`);
}

export function googleClassroomAssignmentKey(courseId: string, courseWorkId: string): string {
  return `${courseId}:${courseWorkId}`;
}

export async function fetchClassroomAssignments(
  token: string,
): Promise<{ items: NormalizedAssignment[]; skipped: number; courses: Course[] }> {
  assertLmsProviderFeatureEnabled("google_import");
  const courses = await classroomListAll<Course, "courses">(
    `https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=${CLASSROOM_PAGE_SIZE}`,
    token,
    "courses",
  );
  const items: NormalizedAssignment[] = [];
  const skipped = 0;

  for (const course of courses) {
    const courseWork = await classroomListAll<CourseWork, "courseWork">(
      `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(course.id)}/courseWork?pageSize=${CLASSROOM_PAGE_SIZE}`,
      token,
      "courseWork",
    );
    for (const work of courseWork) {
      const due = reconstructDueIso(work.dueDate, work.dueTime);
      items.push({
        external_id: googleClassroomAssignmentKey(course.id, work.id),
        provider_assignment_id: work.id,
        title: work.title,
        description: work.description ?? null,
        due_at: due,
        external_source: "google_classroom",
        external_url: work.alternateLink ?? null,
        external_course_id: course.id,
        external_course_name: course.name,
        sources: classroomSources(work),
      });
    }
  }

  return { items, skipped, courses };
}
