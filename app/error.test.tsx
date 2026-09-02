// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import RootError from "./error";
import { retryErrorBoundary } from "@/lib/error-recovery";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  retryErrorBoundary: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/lib/monitoring/client", () => ({
  reportClientError: vi.fn(),
}));

vi.mock("@/lib/error-recovery", () => ({
  retryErrorBoundary: mocks.retryErrorBoundary,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RootError", () => {
  it("uses full error recovery when Try again is clicked", () => {
    const reset = vi.fn();
    render(<RootError error={new Error("login reload needed")} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(retryErrorBoundary).toHaveBeenCalledWith({
      reset,
      refresh: mocks.refresh,
      reload: expect.any(Function),
    });
  });
});