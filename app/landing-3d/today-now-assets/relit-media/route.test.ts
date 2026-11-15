import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, HEAD } from "./route";

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile }));
const url = "http://127.0.0.1:3016/landing-3d/today-now-assets/relit-media";
const request = (query = "?asset=motion", headers: Record<string, string> = {}) => new Request(url + query, { headers: { host: "127.0.0.1:3016", ...headers } });

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("DIANA_NOW_LOCAL_QA", "");
  vi.stubEnv("NEXT_DIST_DIR", "");
  vi.stubEnv("VERCEL", "");
  readFile.mockResolvedValue(Buffer.from("0123456789"));
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe("local relit candidate media boundary", () => {
  it.each([GET, HEAD])("rejects ordinary production before filesystem access", async handler => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await handler(request())).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each([".next-now-qa", ".next-now-finish", ".next-now-relit"])("permits only flagged local QA in %s", async directory => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_DIST_DIR", directory);
    expect((await GET(request())).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
    vi.stubEnv("DIANA_NOW_LOCAL_QA", "1");
    expect((await GET(request())).status).toBe(200);
  });

  it.each([".next", ".next-now-relit-other"])("rejects other output directories: %s", async directory => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DIANA_NOW_LOCAL_QA", "1");
    vi.stubEnv("NEXT_DIST_DIR", directory);
    expect((await GET(request())).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each(["development", "production"] as const)("never exposes candidate artifacts on Vercel: %s", async mode => {
    vi.stubEnv("NODE_ENV", mode);
    vi.stubEnv("DIANA_NOW_LOCAL_QA", "1");
    vi.stubEnv("NEXT_DIST_DIR", ".next-now-relit");
    vi.stubEnv("VERCEL", "1");
    expect((await GET(request())).status).toBe(404);
    expect((await HEAD(request())).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each(["", "example.com:3016", "localhost.example:3016", "192.168.1.2:3016", "0.0.0.0:3016"])("rejects non-loopback hosts before reads: %s", async host => {
    expect((await GET(request("?asset=motion", { host }))).status).toBe(404);
    expect((await HEAD(request("?asset=poster", { host }))).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });

  it("requires a host header", async () => {
    expect((await GET(new Request(url + "?asset=motion"))).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each(["localhost:3016", "127.0.0.1:3016", "[::1]:3016"])("accepts loopback host %s", async host => {
    expect((await GET(request("?asset=poster", { host }))).status).toBe(200);
  });

  it.each(["", "?asset=", "?asset=other", "?asset=../../.env", "?asset=__proto__", "?asset=motion&asset=poster", "?asset=motion&asset=motion", "?asset=motion&file=../../.env", "?path=relit-motion-browser.webm"])("rejects every non-whitelisted asset query: %s", async query => {
    expect((await GET(request(query))).status).toBe(404);
    expect((await HEAD(request(query))).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each([
    ["motion", "relit-motion-browser.webm", "video/webm"],
    ["poster", "relit-motion-browser-poster.webp", "image/webp"],
  ])("serves only the fixed %s derivative without caching or indexing", async (asset, filename, type) => {
    const response = await GET(request(`?asset=${asset}`));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("0123456789");
    expect(readFile).toHaveBeenCalledExactlyOnceWith(path.join(process.cwd(), "artifacts", "today-graphics-fidelity", filename));
    expect(response.headers.get("content-type")).toBe(type);
    expect(response.headers.get("content-length")).toBe("10");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("returns no path details when either candidate file is absent", async () => {
    readFile.mockRejectedValue(new Error("ENOENT private path"));
    for (const handler of [GET, HEAD]) {
      const response = await handler(request("?asset=poster"));
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("");
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });
});

describe("relit playback GET and HEAD", () => {
  it.each([
    ["bytes=2-4", "234", "bytes 2-4/10"],
    ["bytes=7-", "789", "bytes 7-9/10"],
    ["bytes=-3", "789", "bytes 7-9/10"],
    ["bytes=-50", "0123456789", "bytes 0-9/10"],
    ["bytes=8-50", "89", "bytes 8-9/10"],
    ["bytes=0-0", "0", "bytes 0-0/10"],
  ])("supports a single byte range %s", async (range, body, contentRange) => {
    const response = await GET(request("?asset=motion", { range }));
    expect(response.status).toBe(206);
    expect(await response.text()).toBe(body);
    expect(response.headers.get("content-length")).toBe(String(body.length));
    expect(response.headers.get("content-range")).toBe(contentRange);
  });

  it.each(["bytes=99-", "bytes=-0", "bytes=5-2", "bytes=-", "bytes=1-2,4-5", "bytes=abc", "items=1-2", "", "bytes=9007199254740992-", "bytes=0-9007199254740992", "bytes=-9007199254740992"])("rejects malformed or unsafe range %s", async range => {
    const response = await GET(request("?asset=motion", { range }));
    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */10");
    expect(await response.text()).toBe("");
  });

  it.each(["motion", "poster"])("HEAD returns %s metadata without a response body", async asset => {
    const response = await HEAD(request(`?asset=${asset}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe("10");
    expect(await response.text()).toBe("");
  });

  it("ignores Range on HEAD and describes the full resource", async () => {
    const response = await HEAD(request("?asset=motion", { range: "bytes=2-4" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe("10");
    expect(response.headers.get("content-range")).toBeNull();
    expect(await response.text()).toBe("");
  });

  it("returns 416 for a range against an empty artifact", async () => {
    readFile.mockResolvedValue(Buffer.alloc(0));
    const response = await GET(request("?asset=motion", { range: "bytes=0-" }));
    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */0");
  });
});
