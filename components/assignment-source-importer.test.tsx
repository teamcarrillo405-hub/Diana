// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const refresh = vi.fn();
  return {
    refresh,
    router: { refresh },
    materializeConnectedAssignmentSources: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/app/(app)/assignments/[id]/workspace/source-actions", () => ({
  addAssignmentSourceFile: vi.fn(),
  addAssignmentSourceText: vi.fn(),
  materializeConnectedAssignmentSources: mocks.materializeConnectedAssignmentSources,
}));

import { AssignmentSourceImporter } from "./assignment-source-importer";

const ASSIGNMENT_ID = "11111111-1111-4111-8111-111111111111";

describe("AssignmentSourceImporter retries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("offers a calm retry after a partial import and clears it after success", async () => {
    mocks.materializeConnectedAssignmentSources
      .mockResolvedValueOnce({ ok: true, imported: 0, partial: 1 })
      .mockResolvedValueOnce({ ok: true, imported: 1, partial: 0 });

    render(<AssignmentSourceImporter assignmentId={ASSIGNMENT_ID} />);

    expect(await screen.findByText("1 assignment file is ready to try again.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try file import again" }));

    await waitFor(() => expect(mocks.materializeConnectedAssignmentSources).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("1 assignment file imported.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try file import again" })).toBeNull();
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
  });
});
