import { afterAll, describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCanvasAssignments, normalizeCanvasSubmission } from "./canvas";

const originalRegistry = process.env.CANVAS_INSTITUTIONS_JSON;
const originalAllowlist = process.env.CANVAS_ALLOWED_ORIGINS;

afterAll(() => {
  if (originalRegistry === undefined) delete process.env.CANVAS_INSTITUTIONS_JSON;
  else process.env.CANVAS_INSTITUTIONS_JSON = originalRegistry;
  if (originalAllowlist === undefined) delete process.env.CANVAS_ALLOWED_ORIGINS;
  else process.env.CANVAS_ALLOWED_ORIGINS = originalAllowlist;
});

describe("normalizeCanvasSubmission", () => {
  const course = { id: 42, name: "Biology" };

  it("maps a graded submission to a GradeRecord", () => {
    const record = normalizeCanvasSubmission(course, {
      assignment_id: 7,
      score: 18,
      graded_at: "2026-06-01T00:00:00Z",
      workflow_state: "graded",
      missing: false,
      late: true,
      excused: false,
      assignment: { id: 7, name: "Cell lab", points_possible: 20, due_at: "2026-05-30T00:00:00Z" },
    });
    expect(record).toMatchObject({
      externalAssignmentId: "7",
      courseId: "42",
      courseName: "Biology",
      title: "Cell lab",
      score: 18,
      pointsPossible: 20,
      submitted: true,
      notTurnedIn: false,
      late: true,
      excused: false,
    });
  });

  it("flags unsubmitted + missing work", () => {
    const record = normalizeCanvasSubmission(course, {
      assignment_id: 8,
      score: null,
      graded_at: null,
      workflow_state: "unsubmitted",
      missing: true,
      assignment: { id: 8, name: "Essay", points_possible: 50 },
    });
    expect(record).toMatchObject({ submitted: false, notTurnedIn: true, score: null, pointsPossible: 50 });
  });

  it("returns null when the assignment payload is absent", () => {
    expect(normalizeCanvasSubmission(course, { assignment_id: 9, score: 1, graded_at: null })).toBeNull();
  });
});

function mockResponse(body: unknown, linkHeader: string | null = null) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    headers: {
      get: (h: string) => (h.toLowerCase() === "link" ? linkHeader : null),
    },
  } as unknown as Response;
}

describe("fetchCanvasAssignments", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({ test: "https://93.184.216.34" });
    delete process.env.CANVAS_ALLOWED_ORIGINS;
  });

  it("follows Link rel=next pagination on courses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(
        [{ id: 1, name: "Math" }],
        '<https://93.184.216.34/api/v1/courses?page=2>; rel="next"',
      ))
      .mockResolvedValueOnce(mockResponse([{ id: 2, name: "Physics" }]))
      // assignments calls (one per course)
      .mockResolvedValueOnce(mockResponse([]))
      .mockResolvedValueOnce(mockResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchCanvasAssignments({ base_url: "https://93.184.216.34", token: "test-token" });

    // 2 courses pages + 2 assignments pages
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("stops a repeated Canvas pagination URL", async () => {
    const repeated = "https://93.184.216.34/api/v1/courses?page=2";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse([], `<${repeated}>; rel="next"`))
      .mockResolvedValueOnce(mockResponse([], `<${repeated}>; rel="next"`));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCanvasAssignments({ base_url: "https://93.184.216.34", token: "t" }))
      .rejects.toThrow("Canvas pagination repeated a page URL.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caps an excessive Canvas pagination chain", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const current = new URL(String(input));
      const page = Number(current.searchParams.get("page") ?? "1");
      const next = new URL(current);
      next.searchParams.set("page", String(page + 1));
      return mockResponse([], `<${next.toString()}>; rel="next"`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCanvasAssignments({ base_url: "https://93.184.216.34", token: "t" }))
      .rejects.toThrow("Canvas pagination exceeded 100 pages.");
    expect(fetchMock).toHaveBeenCalledTimes(100);
  });

  it("filters out null due_at", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse([{ id: 10, name: "Math" }]))
      .mockResolvedValueOnce(mockResponse([
        { id: 1, name: "A", due_at: "2026-06-01T23:59:00Z" },
        { id: 2, name: "B", due_at: null },
      ]));
    vi.stubGlobal("fetch", fetchMock);

    const r = await fetchCanvasAssignments({ base_url: "https://93.184.216.34", token: "t" });
    expect(r.items).toHaveLength(1);
    expect(r.items[0].external_id).toBe("1");
    expect(r.skipped).toBe(1);
  });

  it("sends Authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    await fetchCanvasAssignments({ base_url: "https://93.184.216.34", token: "test-token" });
    const firstCallInit = fetchMock.mock.calls[0][1];
    expect(firstCallInit.headers.Authorization).toBe("Bearer test-token");
  });

  it("requests per_page=100", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    await fetchCanvasAssignments({ base_url: "https://93.184.216.34", token: "t" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("per_page=100");
  });

  it("returns empty when no courses", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const r = await fetchCanvasAssignments({ base_url: "https://93.184.216.34", token: "t" });
    expect(r.items).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sets external_source=canvas and stringified external_id", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse([{ id: 1, name: "Math" }]))
      .mockResolvedValueOnce(mockResponse([{ id: 42, name: "HW", due_at: "2026-07-01T23:59:00Z" }]));
    vi.stubGlobal("fetch", fetchMock);
    const r = await fetchCanvasAssignments({ base_url: "https://93.184.216.34", token: "t" });
    expect(r.items[0].external_source).toBe("canvas");
    expect(r.items[0].external_id).toBe("42");
  });

  it("normalizes assignment links and rubric text", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse([{ id: 1, name: "Math" }]))
      .mockResolvedValueOnce(mockResponse([{
        id: 42,
        name: "HW",
        due_at: "2026-07-01T23:59:00Z",
        html_url: "https://canvas.test/courses/1/assignments/42",
        rubric: [
          { description: "Reasoning", long_description: "Show each step", points: 4 },
          { description: "Units", points: 2 },
        ],
      }]));
    vi.stubGlobal("fetch", fetchMock);

    const r = await fetchCanvasAssignments({ base_url: "https://93.184.216.34", token: "t" });
    expect(r.items[0].external_url).toBe("https://canvas.test/courses/1/assignments/42");
    expect(r.items[0].rubric_text).toContain("Reasoning - Show each step - 4 pts");
    expect(r.items[0].rubric_text).toContain("Units - 2 pts");
  });
});
