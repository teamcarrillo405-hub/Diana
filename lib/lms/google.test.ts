import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchClassroomAssignments } from "./google";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function dueDate(day: number) {
  return { year: 2026, month: 8, day };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchClassroomAssignments", () => {
  it("uses course and coursework IDs together while retaining the raw provider ID", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/v1/courses") {
        return jsonResponse({
          courses: [
            { id: "course-a", name: "Algebra" },
            { id: "course-b", name: "Biology" },
          ],
        });
      }
      const courseId = url.pathname.split("/")[3];
      return jsonResponse({
        courseWork: [{
          id: "shared-work-id",
          title: `${courseId} assignment`,
          dueDate: dueDate(10),
        }],
      });
    }));

    const result = await fetchClassroomAssignments("token");

    expect(result.items).toEqual([
      expect.objectContaining({
        external_id: "course-a:shared-work-id",
        provider_assignment_id: "shared-work-id",
        external_course_id: "course-a",
      }),
      expect.objectContaining({
        external_id: "course-b:shared-work-id",
        provider_assignment_id: "shared-work-id",
        external_course_id: "course-b",
      }),
    ]);
    expect(new Set(result.items.map((item) => item.external_id)).size).toBe(2);
  });

  it("paginates both active courses and coursework", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const pageToken = url.searchParams.get("pageToken");

      if (url.pathname === "/v1/courses") {
        return pageToken === "courses-page-2"
          ? jsonResponse({ courses: [{ id: "course-b", name: "Biology" }] })
          : jsonResponse({
              courses: [{ id: "course-a", name: "Algebra" }],
              nextPageToken: "courses-page-2",
            });
      }

      if (url.pathname === "/v1/courses/course-a/courseWork") {
        return pageToken === "work-page-2"
          ? jsonResponse({ courseWork: [{ id: "work-2", title: "Second", dueDate: dueDate(12) }] })
          : jsonResponse({
              courseWork: [{ id: "work-1", title: "First", dueDate: dueDate(11) }],
              nextPageToken: "work-page-2",
            });
      }

      return jsonResponse({ courseWork: [{ id: "work-3", title: "Third", dueDate: dueDate(13) }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchClassroomAssignments("token");

    expect(result.courses.map((course) => course.id)).toEqual(["course-a", "course-b"]);
    expect(result.items.map((item) => item.external_id)).toEqual([
      "course-a:work-1",
      "course-a:work-2",
      "course-b:work-3",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls.map(([input]) => new URL(String(input)).searchParams.get("pageSize")))
      .toEqual(["100", "100", "100", "100", "100"]);
  });

  it("rejects a repeated page token instead of cycling", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      courses: [],
      nextPageToken: "same-token",
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchClassroomAssignments("token"))
      .rejects.toThrow("repeated page token for courses");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retains coursework without a due date", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/v1/courses") {
        return jsonResponse({ courses: [{ id: "course-a", name: "Algebra" }] });
      }
      return jsonResponse({ courseWork: [{ id: "work-1", title: "Read chapter 4" }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchClassroomAssignments("token");

    expect(result.skipped).toBe(0);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      external_id: "course-a:work-1",
      provider_assignment_id: "work-1",
      due_at: null,
    });
  });

  it("fails closed when pagination exceeds the page bound", async () => {
    let page = 0;
    const fetchMock = vi.fn(async () => {
      page += 1;
      return jsonResponse({ courses: [], nextPageToken: `page-${page}` });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchClassroomAssignments("token"))
      .rejects.toThrow("pagination exceeded 100 pages for courses");
    expect(fetchMock).toHaveBeenCalledTimes(100);
  });
});
