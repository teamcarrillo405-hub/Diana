// F15 — Canvas REST fetcher.
// Auth: Bearer {personal access token} the student generates in Canvas Account > Settings.
// Pagination: follow Link: rel="next" (Canvas defaults per_page=10 even when we ask for 100 — defensive).

import type { NormalizedAssignment } from "./types";

type CanvasConfig = { base_url: string; token: string };

type CanvasCourse = { id: number; name: string };
type CanvasAssignment = {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
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
      });
    }
  }

  return { items, skipped };
}
