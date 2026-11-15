import { describe, expect, it } from "vitest";
import { publicAppUrl } from "./public-site";

describe("public site URL", () => {
  it("accepts the pasted production setting with a Unicode BOM", () => {
    const normalized = publicAppUrl("\uFEFFhttps://diana-umber.vercel.app\r\n");
    expect(new URL(normalized).origin).toBe("https://diana-umber.vercel.app");
  });

  it("avoids duplicate slashes in public links", () => {
    expect(`${publicAppUrl(" https://diana.example/ ")}/privacy.html`).toBe("https://diana.example/privacy.html");
  });

  it("uses the default for blank settings", () => {
    expect(publicAppUrl(" \uFEFF ")).toBe("https://diana.app");
  });
});
