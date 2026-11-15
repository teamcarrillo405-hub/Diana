import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_CAPABILITY_READINESS,
  ASSIGNMENT_CAPABILITY_REGISTRY,
  UNIVERSAL_TYPED_INK_FALLBACK,
  capabilityReadiness,
  capabilityUniversalFallback,
  legacyImplementationForReadiness,
  parseAssignmentCapabilityReadiness,
} from "./assignment-capabilities";

describe("assignment capability beta readiness", () => {
  it("publishes canonical readiness while retaining legacy implementation values", () => {
    for (const definition of Object.values(ASSIGNMENT_CAPABILITY_REGISTRY)) {
      expect(ASSIGNMENT_CAPABILITY_READINESS).toContain(definition.readiness);
      expect(["ready", "limited"]).toContain(definition.implementation);
      expect(legacyImplementationForReadiness(definition.readiness)).toBe(definition.implementation);
      expect(definition.universalFallback).toBe(UNIVERSAL_TYPED_INK_FALLBACK);
      expect(capabilityReadiness(definition.id)).toBe(definition.readiness);
      expect(capabilityUniversalFallback(definition.id)).toBe(UNIVERSAL_TYPED_INK_FALLBACK);
    }
  });

  it("normalizes persisted ready values without accepting unknown readiness", () => {
    expect(parseAssignmentCapabilityReadiness("ready")).toBe("beta");
    expect(parseAssignmentCapabilityReadiness("prototype")).toBe("prototype");
    expect(parseAssignmentCapabilityReadiness("beta")).toBe("beta");
    expect(parseAssignmentCapabilityReadiness("limited")).toBe("limited");
    expect(parseAssignmentCapabilityReadiness("unavailable")).toBe("unavailable");
    expect(parseAssignmentCapabilityReadiness("complete")).toBeNull();
    expect(parseAssignmentCapabilityReadiness(null)).toBeNull();
  });

  it("keeps the legacy readiness projection deterministic", () => {
    expect(legacyImplementationForReadiness("beta")).toBe("ready");
    expect(legacyImplementationForReadiness("prototype")).toBe("limited");
    expect(legacyImplementationForReadiness("limited")).toBe("limited");
    expect(legacyImplementationForReadiness("unavailable")).toBe("limited");
  });

  it("always offers universal typed and ink artifact fallbacks", () => {
    expect(UNIVERSAL_TYPED_INK_FALLBACK).toEqual({
      typed: { capability: "rich_text", artifactBlockType: "rich_text" },
      ink: { capability: "drawing_canvas", artifactBlockType: "drawing" },
    });
  });
});
