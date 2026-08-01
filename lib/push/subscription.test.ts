import { describe, expect, it } from "vitest";

import { isAllowedPushEndpoint, validatePushEndpoint } from "./subscription";

describe("push subscription endpoints", () => {
  it("allows public HTTPS push endpoints", () => {
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
  });

  it("rejects endpoints that could target local services", () => {
    for (const endpoint of [
      "http://push.example.com/sub",
      "https://localhost/sub",
      "https://127.0.0.1/sub",
      "https://10.0.0.2/sub",
      "https://100.64.0.1/sub",
      "https://169.254.169.254/latest/meta-data",
      "https://[::1]/sub",
      "https://[::ffff:127.0.0.1]/sub",
      "https://user:secret@push.example.com/sub",
    ]) {
      expect(isAllowedPushEndpoint(endpoint)).toBe(false);
    }
  });

  it("rejects a hostname that resolves to a non-public address", async () => {
    await expect(validatePushEndpoint("https://push.example.com/sub", {
      resolver: async () => [{ address: "10.0.0.8", family: 4 }],
    })).resolves.toBe(false);
    await expect(validatePushEndpoint("https://push.example.com/sub", {
      resolver: async () => [{ address: "93.184.216.34", family: 4 }],
    })).resolves.toBe(true);
  });
});
