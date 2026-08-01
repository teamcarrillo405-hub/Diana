// F15 — Canvas REST fetcher.
// Auth: Bearer {personal access token} the student generates in Canvas Account > Settings.
// Pagination: follow Link: rel="next" (Canvas defaults per_page=10 even when we ask for 100 — defensive).

import type { NormalizedAssignment } from "./types";
import type { GradeRecord } from "@/lib/grades/insights";
import {
  fetchCanvasDestination,
  resolveCanvasConnectionDestination,
  type CanvasInstitution,
} from "@/lib/security/canvas-institutions";

type CanvasConfig = { base_url: string; token: string; institution_id?: string | null };

type CanvasCourse = { id: number; name: string };
type CanvasAttachment = { id: number; filename?: string; url?: string; 'content-type'?: string | null };
const MAX_CANVAS_PAGES = 100;

type CanvasAssignment = {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  html_url?: string | null;
  rubric?: Array<{ description?: string; long_description?: string; points?: number }>;
  attachments?: CanvasAttachment[];
};

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  // Link: <https://...>; rel="next", <https://...>; rel="first"
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

async function fetchAllPages<T>(
  initialUrl: string,
  token: string,
  institution: CanvasInstitution,
): Promise<T[]> {
  const out: T[] = [];
  const visited = new Set<string>();
  let url: string | null = initialUrl;
  let pageCount = 0;
  while (url) {
    if (visited.has(url)) {
      throw new Error("Canvas pagination repeated a page URL.");
    }
    if (pageCount >= MAX_CANVAS_PAGES) {
      throw new Error(`Canvas pagination exceeded ${MAX_CANVAS_PAGES} pages.`);
    }
    visited.add(url);
    pageCount += 1;
    const res = await fetchCanvasDestination(institution, url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Canvas request to ${url} returned ${res.status}`);
    }
    const page = (await res.json()) as T[];
    out.push(...page);
    url = parseNextLink(res.headers.get("Link"));
  }
  return out;
}

// ---------------------------------------------------------------------------
// OAuth token refresh. Personal access tokens (oauth !== true) never expire and
// pass through untouched. OAuth access tokens (~1h) are refreshed via the stored
// refresh_token; the caller persists `refreshed` through the credential vault.
// Canvas's refresh grant returns a new access_token but reuses the refresh_token.
// ---------------------------------------------------------------------------
export type CanvasTokenConfig = {
  base_url: string;
  token: string;
  institution_id?: string | null;
  oauth?: boolean;
  refresh_token?: string | null;
  expires_at?: string | null;
};

export type ValidCanvasToken = {
  token: string;
  refreshed?: { token: string; expires_at: string | null };
};

export async function getValidCanvasToken(config: CanvasTokenConfig): Promise<ValidCanvasToken> {
  // Personal access token (or no refresh available) — use as-is.
  if (!config.oauth || !config.refresh_token) {
    return { token: config.token };
  }
  const now = Date.now();
  const expiresMs = config.expires_at ? Date.parse(config.expires_at) : 0;
  if (config.token && expiresMs - now > 90_000) {
    return { token: config.token };
  }
  const clientId = process.env.CANVAS_CLIENT_ID;
  const clientSecret = process.env.CANVAS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { token: config.token }; // can't refresh; best effort with the stale token
  }
  const institution = await resolveCanvasConnectionDestination(config);
  const tokenUrl = new URL("/login/oauth2/token", institution.origin);
  const res = await fetchCanvasDestination(institution, tokenUrl, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: config.refresh_token,
    }),
  });
  if (!res.ok) return { token: config.token };
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) return { token: config.token };
  const expires_at =
    typeof body.expires_in === "number"
      ? new Date(Date.now() + body.expires_in * 1000).toISOString()
      : null;
  return { token: body.access_token, refreshed: { token: body.access_token, expires_at } };
}

function canvasSources(assignment: CanvasAssignment) {
  const sources = [];
  if (assignment.description?.trim()) {
    sources.push({
      source_type: "instructions" as const,
      title: "Canvas assignment instructions",
      provider: "canvas",
      external_id: `${assignment.id}:instructions`,
      extracted_text: assignment.description,
      import_status: "imported" as const,
    });
  }
  if (assignment.rubric?.length) {
    sources.push({
      source_type: "rubric" as const,
      title: "Canvas rubric",
      provider: "canvas",
      external_id: `${assignment.id}:rubric`,
      extracted_text: formatCanvasRubric(assignment.rubric),
      import_status: "imported" as const,
    });
  }
  for (const attachment of assignment.attachments ?? []) {
    sources.push({
      source_type: "attachment" as const,
      title: attachment.filename?.trim() || "Canvas attachment",
      provider: "canvas",
      external_id: `${assignment.id}:attachment:${attachment.id}`,
      url: attachment.url ?? null,
      mime_type: attachment["content-type"] ?? null,
      import_status: attachment.url ? "ready" as const : "partial" as const,
    });
  }
  return sources;
}
export async function fetchCanvasAssignments(
  config: CanvasConfig,
): Promise<{ items: NormalizedAssignment[]; skipped: number }> {
  const institution = await resolveCanvasConnectionDestination(config);
  const base = institution.origin;

  const courses = await fetchAllPages<CanvasCourse>(
    `${base}/api/v1/courses?enrollment_state=active&per_page=100`,
    config.token,
    institution,
  );

  let skipped = 0;
  const items: NormalizedAssignment[] = [];

  for (const course of courses) {
    const assignments = await fetchAllPages<CanvasAssignment>(
      `${base}/api/v1/courses/${course.id}/assignments?per_page=100`,
      config.token,
      institution,
    );
    for (const a of assignments) {
      if (!a.due_at) {
        skipped += 1;
        continue;
      }
      items.push({
        external_id: String(a.id),
        title: a.name,
        description: a.description ?? null,
        due_at: a.due_at,
        external_source: "canvas",
        external_url: a.html_url ?? null,
        rubric_text: formatCanvasRubric(a.rubric),
        external_course_id: String(course.id),
        external_course_name: course.name,
        sources: canvasSources(a),
      });
    }
  }

  return { items, skipped };
}

// ---------------------------------------------------------------------------
// Grades — read-only pull of the student's own submissions and course scores.
// Diana never writes grades; this exists so grade data can become one clear
// next move for the student (lib/grades/insights.ts).
// ---------------------------------------------------------------------------

type CanvasCourseWithScore = CanvasCourse & {
  enrollments?: Array<{ type?: string; computed_current_score?: number | null }>;
};

type CanvasSubmission = {
  assignment_id: number;
  score: number | null;
  graded_at: string | null;
  workflow_state?: string;
  missing?: boolean;
  late?: boolean;
  excused?: boolean;
  assignment?: {
    id: number;
    name?: string;
    points_possible?: number | null;
    due_at?: string | null;
  };
};

/** Pure mapper, exported for tests. Returns null for rows we can't use. */
export function normalizeCanvasSubmission(
  course: { id: number; name: string },
  submission: CanvasSubmission,
): GradeRecord | null {
  const assignment = submission.assignment;
  if (!assignment?.name) return null;
  return {
    externalAssignmentId: String(submission.assignment_id),
    courseId: String(course.id),
    courseName: course.name,
    title: assignment.name,
    score: typeof submission.score === "number" ? submission.score : null,
    pointsPossible: typeof assignment.points_possible === "number" ? assignment.points_possible : null,
    gradedAt: submission.graded_at ?? null,
    submitted: submission.workflow_state !== "unsubmitted",
    notTurnedIn: submission.missing === true,
    late: submission.late === true,
    excused: submission.excused === true,
    dueAt: assignment.due_at ?? null,
  };
}

/** Provider-computed current score percent per course id. */
export async function fetchCanvasCourseScores(config: CanvasConfig): Promise<Map<string, number | null>> {
  const institution = await resolveCanvasConnectionDestination(config);
  const base = institution.origin;
  const courses = await fetchAllPages<CanvasCourseWithScore>(
    `${base}/api/v1/courses?enrollment_state=active&include[]=total_scores&per_page=100`,
    config.token,
    institution,
  );
  const scores = new Map<string, number | null>();
  for (const course of courses) {
    const enrollment = course.enrollments?.find((e) => typeof e.computed_current_score === "number");
    scores.set(String(course.id), enrollment?.computed_current_score ?? null);
  }
  return scores;
}

/** The student's own graded/open work across active courses. */
export async function fetchCanvasGrades(config: CanvasConfig): Promise<GradeRecord[]> {
  const institution = await resolveCanvasConnectionDestination(config);
  const base = institution.origin;
  const courses = await fetchAllPages<CanvasCourse>(
    `${base}/api/v1/courses?enrollment_state=active&per_page=100`,
    config.token,
    institution,
  );

  const records: GradeRecord[] = [];
  for (const course of courses) {
    const submissions = await fetchAllPages<CanvasSubmission>(
      `${base}/api/v1/courses/${course.id}/students/submissions?student_ids[]=self&include[]=assignment&per_page=100`,
      config.token,
      institution,
    );
    for (const submission of submissions) {
      const normalized = normalizeCanvasSubmission(course, submission);
      if (normalized) records.push(normalized);
    }
  }
  return records;
}

function formatCanvasRubric(rubric: CanvasAssignment["rubric"]): string | null {
  if (!Array.isArray(rubric) || rubric.length === 0) return null;
  return rubric
    .map((item) => [
      item.description?.trim(),
      item.long_description?.trim(),
      typeof item.points === "number" ? `${item.points} pts` : "",
    ].filter(Boolean).join(" - "))
    .filter(Boolean)
    .join("\n");
}
