import { describe, expect, it, vi } from "vitest";
import {
  initializeProviderCanaryRuntime,
  resolveProviderCanaryMode,
} from "./provider-canary-cli";

describe("provider canary startup", () => {
  it("starts mock mode without loading local environment files", async () => {
    const loadEnvironment = vi.fn();

    const mode = await initializeProviderCanaryRuntime({
      argv: ["--mode=mock"],
      env: {},
      loadEnvironment,
    });

    expect(mode).toBe("mock");
    expect(loadEnvironment).not.toHaveBeenCalled();
  });

  it("loads environment files only after staging is explicitly selected", async () => {
    const loadEnvironment = vi.fn();

    const mode = await initializeProviderCanaryRuntime({
      argv: ["--mode=staging"],
      env: {},
      loadEnvironment,
    });

    expect(mode).toBe("staging");
    expect(loadEnvironment).toHaveBeenCalledTimes(1);
  });

  it("does not let a malformed mode reach provider startup", () => {
    expect(() => resolveProviderCanaryMode(["--mode=live"], {}))
      .toThrow("Provider canary mode must be mock or staging.");
  });
});
