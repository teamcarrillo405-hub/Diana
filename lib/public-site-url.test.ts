import { describe, expect, it } from "vitest";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

describe("resolvePublicSiteUrl", () => {
  it("uses a configured HTTP(S) origin without retaining an accidental path", () => {
    expect(resolvePublicSiteUrl({ NEXT_PUBLIC_APP_URL: "https://diana.example/preview" })).toBe(
      "https://diana.example",
    );
  });

  it("uses the Vercel deployment URL when the configured public URL is malformed", () => {
    expect(
      resolvePublicSiteUrl({
        NEXT_PUBLIC_APP_URL: "not-a-url",
        VERCEL_URL: "diana-preview.vercel.app",
      }),
    ).toBe("https://diana-preview.vercel.app");
  });

  it("uses the canonical alias when no deploy URL is available", () => {
    expect(resolvePublicSiteUrl({ NEXT_PUBLIC_APP_URL: "ftp://diana.example" })).toBe(
      "https://diana-umber.vercel.app",
    );
  });

  it("ignores a malformed Vercel deployment URL", () => {
    expect(
      resolvePublicSiteUrl({
        NEXT_PUBLIC_APP_URL: "not-a-url",
        VERCEL_URL: "not a hostname",
      }),
    ).toBe("https://diana-umber.vercel.app");
  });
});
