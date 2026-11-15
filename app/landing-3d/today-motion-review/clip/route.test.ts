import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile }));
const url = "http://localhost/landing-3d/today-motion-review/clip";

beforeEach(() => { vi.stubEnv("NODE_ENV", "development"); readFile.mockResolvedValue(Buffer.from("0123456789")); });
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("local character review media", () => {
  it("is unavailable in production without reading private artifacts", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await GET(new Request(url))).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });
  it("serves only the fixed WebM with no-store and noindex", async () => {
    const response = await GET(new Request(url + "?file=other.mp4"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("video/webm");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(readFile.mock.calls[0][0]).toMatch(/today-diana-integration[\\/]diana-idle-loop\.webm$/);
  });
  it.each([["bytes=2-4", "234"], ["bytes=7-", "789"], ["bytes=-3", "789"], ["bytes=8-50", "89"]])("supports playback range %s", async (range, expected) => {
    const response = await GET(new Request(url, { headers: { range } }));
    expect(response.status).toBe(206);
    expect(await response.text()).toBe(expected);
    expect(response.headers.get("content-length")).toBe(String(expected.length));
  });
  it.each(["bytes=99-", "bytes=-0", "bytes=5-2", "bytes=-", "bytes=1-2,4-5"])("rejects malformed range %s", async range => {
    const response = await GET(new Request(url, { headers: { range } }));
    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */10");
  });
  it("returns a clear 404 if the local artifact is absent", async () => {
    readFile.mockRejectedValueOnce(new Error("ENOENT"));
    expect((await GET(new Request(url))).status).toBe(404);
  });
});
