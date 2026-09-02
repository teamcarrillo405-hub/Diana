import { describe, expect, it, vi } from "vitest";

import { retryErrorBoundary } from "./error-recovery";

describe("retryErrorBoundary", () => {
  it("resets the boundary, refreshes route data, and performs the hard reload users were doing manually", () => {
    const reset = vi.fn();
    const refresh = vi.fn();
    const reload = vi.fn();

    retryErrorBoundary({ reset, refresh, reload });

    expect(reset).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});