// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrivacyDashboard } from "./privacy-dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("./actions", () => ({
  deleteDataCategory: vi.fn(),
  exportProfileBackup: vi.fn(),
  exportUserDataJson: vi.fn(),
  exportUserDataPdf: vi.fn(),
  importProfileBackup: vi.fn(),
  requestAccountDeletion: vi.fn(),
  saveNotificationPreferences: vi.fn(),
  saveSubjectVerbosity: vi.fn(),
}));

afterEach(cleanup);

describe("PrivacyDashboard", () => {
  const props = {
    inventory: [{ label: "Notes", count: 2 }],
    classes: [],
    notificationPrefs: {
      assignment_reminders: true,
      ai_budget: true,
      weekly_reflection: true,
      parent_summary: false,
      quiet_hours: true,
    },
    timezone: "America/Los_Angeles",
    handoff: { route: "/dashboard", updated_at: "2026-09-14T16:30:00.000Z" },
    activeShareCount: 0,
    deletionStatus: null,
  } as const;

  it("exposes the real export action with the canonical accessible name", () => {
    render(<PrivacyDashboard {...props} />);

    expect(screen.getByRole("button", { name: "Export my data" })).toBeEnabled();
  });

  it("requires explicit confirmation before an account deletion request", () => {
    render(<PrivacyDashboard {...props} />);

    const request = screen.getByRole("button", { name: "Request account deletion" });
    expect(request).toBeDisabled();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "I understand this turns off AI now and starts the deletion request",
      }),
    );

    expect(request).toBeEnabled();
  });
});
