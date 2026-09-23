import { describe, expect, it, vi } from "vitest";
import { fetchGitLabAssignments } from "./gitlab";

describe("fetchGitLabAssignments", () => {
  it("imports open GitLab issues with due dates as assignments", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([
      {
        id: 10,
        iid: 2,
        project_id: 99,
        title: "Build quiz restart button",
        description: "Student should add a restart control and test score reset.",
        due_date: "2026-09-12",
        web_url: "https://gitlab.com/class/quiz/-/issues/2",
        labels: ["assignment", "javascript"],
        state: "opened",
      },
      {
        id: 11,
        iid: 3,
        project_id: 99,
        title: "Optional refactor",
        description: null,
        due_date: null,
        web_url: "https://gitlab.com/class/quiz/-/issues/3",
        labels: [],
        state: "opened",
      },
    ]), { headers: { "content-type": "application/json" } })));

    const result = await fetchGitLabAssignments({
      project: "class/quiz",
      token: "glpat-test",
      labels: "assignment",
      base_url: "https://93.184.216.34",
    });

    expect(result.skipped).toBe(1);
    expect(result.items).toEqual([
      expect.objectContaining({
        external_id: "99:2",
        title: "Build quiz restart button",
        due_at: "2026-09-12T23:59:00.000Z",
        external_source: "gitlab",
        external_url: "https://gitlab.com/class/quiz/-/issues/2",
        rubric_text: "GitLab labels: assignment, javascript",
      }),
    ]);
    const [requestUrl, requestInit] = vi.mocked(fetch).mock.calls[0];
    expect(String(requestUrl)).toContain("https://93.184.216.34/api/v4/projects/class%2Fquiz/issues?");
    expect(requestInit).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ "PRIVATE-TOKEN": "glpat-test" }),
      redirect: "manual",
    }));
  });

  it("rejects display names that are not GitLab project paths", async () => {
    await expect(fetchGitLabAssignments({
      project: "High School",
      token: "glpat-test",
      base_url: "https://93.184.216.34",
    })).rejects.toThrow("project path");
  });
});
