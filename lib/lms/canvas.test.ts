import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCanvasAssignments } from "./canvas";

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
  beforeEach(() => { vi.restoreAllMocks(); });

  it("follows Link rel=next pagination on courses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(
        [{ id: 1, name: "Math" }],
        '<https://x.canvas.com/api/v1/courses?page=2>; rel="next"',
      ))
      .mockResolvedValueOnce(mockResponse([{ id: 2, name: "Physics" }]))
      // assignments calls (one per course)
      .mockResolvedValueOnce(mockResponse([]))
      .mockResolvedValueOnce(mockResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchCanvasAssignments({ base_url: "https://x.canvas.com", token: "test-token" });

    // 2 courses pages + 2 assignments pages
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("filters out null due_at", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse([{ id: 10, name: "Math" }]))
      .mockResolvedValueOnce(mockResponse([
        { id: 1, name: "A", due_at: "2026-06-01T23:59:00Z" },
        { id: 2, name: "B", due_at: null },
      ]));
    vi.stubGlobal("fetch", fetchMock);

    const r = await fetchCanvasAssignments({ base_url: "https://x.canvas.com", token: "t" });
    expect(r.items).toHaveLength(1);
    expect(r.items[0].external_id).toBe("1");
    expect(r.skipped).toBe(1);
  });

  it("sends Authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    await fetchCanvasAssignments({ base_url: "https://x.canvas.com", token: "test-token" });
    const firstCallInit = fetchMock.mock.calls[0][1];
    expect(firstCallInit.headers.Authorization).toBe("Bearer test-token");
  });

  it("requests per_page=100", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    await fetchCanvasAssignments({ base_url: "https://x.canvas.com", token: "t" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("per_page=100");
  });

  it("returns empty when no courses", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const r = await fetchCanvasAssignments({ base_url: "https://x.canvas.com", token: "t" });
    expect(r.items).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sets external_source=canvas and stringified external_id", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse([{ id: 1, name: "Math" }]))
      .mockResolvedValueOnce(mockResponse([{ id: 42, name: "HW", due_at: "2026-07-01T23:59:00Z" }]));
    vi.stubGlobal("fetch", fetchMock);
    const r = await fetchCanvasAssignments({ base_url: "https://x.canvas.com", token: "t" });
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

    const r = await fetchCanvasAssignments({ base_url: "https://x.canvas.com", token: "t" });
    expect(r.items[0].external_url).toBe("https://canvas.test/courses/1/assignments/42");
    expect(r.items[0].rubric_text).toContain("Reasoning - Show each step - 4 pts");
    expect(r.items[0].rubric_text).toContain("Units - 2 pts");
  });
});
