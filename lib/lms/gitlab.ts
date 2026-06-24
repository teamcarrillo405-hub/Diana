import type { NormalizedAssignment } from "./types";

export type GitLabConfig = {
  project: string;
  token: string;
  base_url?: string;
  labels?: string;
};

type GitLabIssue = {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  web_url: string;
  labels: string[];
  state: string;
};

const DEFAULT_BASE_URL = "https://gitlab.com";

export async function fetchGitLabAssignments(
  config: GitLabConfig,
): Promise<{ items: NormalizedAssignment[]; skipped: number }> {
  const baseUrl = normalizeBaseUrl(config.base_url);
  const projectInput = config.project.trim();
  const project = encodeURIComponent(projectInput);
  if (!project || !config.token.trim()) throw new Error("GitLab connection is missing project or token");
  if (!isGitLabProjectId(projectInput)) {
    throw new Error("Use a GitLab project path like group/project-name, or paste the numeric project ID.");
  }

  const params = new URLSearchParams({
    state: "opened",
    scope: "all",
    per_page: "100",
    order_by: "due_date",
    sort: "asc",
  });
  if (config.labels?.trim()) params.set("labels", config.labels.trim());

  const issues = await fetchAllPages<GitLabIssue>(
    `${baseUrl}/api/v4/projects/${project}/issues?${params.toString()}`,
    config.token,
  );

  let skipped = 0;
  const items: NormalizedAssignment[] = [];
  for (const issue of issues) {
    if (!issue.due_date) {
      skipped += 1;
      continue;
    }
    items.push({
      external_id: `${issue.project_id}:${issue.iid}`,
      title: issue.title,
      description: formatGitLabDescription(issue),
      due_at: new Date(`${issue.due_date}T23:59:00.000Z`).toISOString(),
      external_source: "gitlab",
      external_url: issue.web_url,
      rubric_text: issue.labels.length > 0 ? `GitLab labels: ${issue.labels.join(", ")}` : null,
    });
  }

  return { items, skipped };
}

async function fetchAllPages<T>(firstUrl: string, token: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = firstUrl;
  for (let page = 0; next && page < 10; page += 1) {
    const res = await fetch(next, {
      headers: {
        "PRIVATE-TOKEN": token,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error("GitLab token does not have access to this project.");
      }
      if (res.status === 404) {
        throw new Error("GitLab project was not found. Use the full project path like group/project-name, or the numeric project ID.");
      }
      throw new Error(`GitLab request returned ${res.status}`);
    }
    out.push(...((await res.json()) as T[]));
    next = parseNextLink(res.headers.get("link"));
  }
  return out;
}

function isGitLabProjectId(value: string): boolean {
  return /^\d+$/.test(value) || /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+$/.test(value);
}

function parseNextLink(link: string | null): string | null {
  if (!link) return null;
  const part = link.split(",").find((segment) => segment.includes('rel="next"'));
  const match = part?.match(/<([^>]+)>/);
  return match?.[1] ?? null;
}

function normalizeBaseUrl(value?: string): string {
  const raw = value?.trim() || DEFAULT_BASE_URL;
  const url = new URL(raw);
  return `${url.protocol}//${url.host}`;
}

function formatGitLabDescription(issue: GitLabIssue): string | null {
  const parts = [
    issue.description?.trim() ?? "",
    issue.labels.length > 0 ? `Labels: ${issue.labels.join(", ")}` : "",
    `GitLab issue #${issue.iid}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}
