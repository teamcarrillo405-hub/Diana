// F15 — Canvas REST fetcher.
// Auth: Bearer {personal access token} the student generates in Canvas Account > Settings.
// Pagination: follow Link: rel="next" (Canvas defaults per_page=10 even when we ask for 100 — defensive).

import type { NormalizedAssignment } from "./types";
import type { GradeRecord } from "@/lib/grades/insights";

type CanvasConfig = { base_url: string; token: string };

type CanvasCourse = { id: number; name: string };
type CanvasAssignment = {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  html_url?: string | null;
  rubric?: Array<{ description?: string; long_description?: string; points?: number }>;
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

async function fetchAllPages<T>(initialUrl: string, token: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = initialUrl;
  while (url) {
    const res: Response = await fetch(url, {
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

export async function fetchCanvasAssignments(
  config: CanvasConfig,
): Promise<{ items: NormalizedAssignment[]; skipped: number }> {
  const base = config.base_url.replace(/\/$/, "");

  const courses = await fetchAllPages<CanvasCourse>(
    `${base}/api/v1/courses?enrollment_state=active&per_page=100`,
    config.token,
  );

  let skipped = 0;
  const items: NormalizedAssignment[] = [];

  for (const course of courses) {
    const assignments = await fetchAllPages<CanvasAssignment>(
      `${base}/api/v1/courses/${course.id}/assignments?per_page=100`,
      config.token,
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
  const base = config.base_url.replace(/\/$/, "");
  const courses = await fetchAllPages<CanvasCourseWithScore>(
    `${base}/api/v1/courses?enrollment_state=active&include[]=total_scores&per_page=100`,
    config.token,
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
  const base = config.base_url.replace(/\/$/, "");
  const courses = await fetchAllPages<CanvasCourse>(
    `${base}/api/v1/courses?enrollment_state=active&per_page=100`,
    config.token,
  );

  const records: GradeRecord[] = [];
  for (const course of courses) {
    const submissions = await fetchAllPages<CanvasSubmission>(
      `${base}/api/v1/courses/${course.id}/students/submissions?student_ids[]=self&include[]=assignment&per_page=100`,
      config.token,
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
