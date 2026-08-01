import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCanvasAssignments } from "@/lib/lms/canvas";
import { fetchGitLabAssignments } from "@/lib/lms/gitlab";

const originalRegistry = process.env.CANVAS_INSTITUTIONS_JSON;
const originalAllowlist = process.env.CANVAS_ALLOWED_ORIGINS;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalRegistry === undefined) delete process.env.CANVAS_INSTITUTIONS_JSON;
  else process.env.CANVAS_INSTITUTIONS_JSON = originalRegistry;
  if (originalAllowlist === undefined) delete process.env.CANVAS_ALLOWED_ORIGINS;
  else process.env.CANVAS_ALLOWED_ORIGINS = originalAllowlist;
});

describe("LMS pagination destinations", () => {
  it("does not send a Canvas token to a malicious Link origin", async () => {
    process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({
      school: "https://93.184.216.34",
    });
    delete process.env.CANVAS_ALLOWED_ORIGINS;
    const fetchMock = vi.fn(async () => new Response("[]", {
      status: 200,
      headers: { Link: '<https://attacker.example/api/v1/courses?page=2>; rel="next"' },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCanvasAssignments({
      institution_id: "school",
      base_url: "https://93.184.216.34",
      token: "canvas-secret",
    })).rejects.toThrow("origin is not allowed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not send a GitLab token to a malicious Link origin", async () => {
    const fetchMock = vi.fn(async () => new Response("[]", {
      status: 200,
      headers: { Link: '<https://attacker.example/api/v4/issues?page=2>; rel="next"' },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGitLabAssignments({
      project: "class/project",
      token: "gitlab-secret",
      base_url: "https://93.184.216.34",
    })).rejects.toThrow("origin is not allowed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects alternate-port pagination links", async () => {
    const fetchMock = vi.fn(async () => new Response("[]", {
      status: 200,
      headers: { Link: '<https://93.184.216.34:8443/api/v4/issues?page=2>; rel="next"' },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGitLabAssignments({
      project: "class/project",
      token: "gitlab-secret",
      base_url: "https://93.184.216.34",
    })).rejects.toThrow("default HTTPS port");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
