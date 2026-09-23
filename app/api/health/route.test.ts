import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("health route", () => {
  it("returns a cache-disabled liveness response without dependency details", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(await response.json()).toEqual({
      status: "ok",
      checks: { application: "ok" },
    });
  });
});
