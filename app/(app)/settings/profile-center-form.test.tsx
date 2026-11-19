// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProfilePrefs } from "@/lib/profile";
import { saveProfileCenter } from "./actions";
import { ProfileCenterForm } from "./profile-center-form";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("./actions", () => ({ saveProfileCenter: vi.fn() }));

function profile(overrides: Partial<ProfilePrefs> = {}): ProfilePrefs {
  return {
    user_id: "student-1",
    display_name: "Student",
    age_bracket: "13_to_17",
    school_year: 9,
    timezone: "UTC",
    learning_hurdle: null,
    study_schedule_preference: null,
    consent_ai: false,
    teen_guardian_permission_attested_at: null,
    teen_guardian_permission_policy_version: null,
    teen_guardian_permission_source: null,
    teen_guardian_permission_withdrawn_at: null,
    ...overrides,
  } as ProfilePrefs;
}

function submitForm(container: HTMLElement) {
  const form = container.querySelector("form");
  if (!form) throw new Error("Profile form missing");
  fireEvent.submit(form);
}

describe("ProfileCenterForm AI consent controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveProfileCenter).mockResolvedValue({ ok: true, message: "Settings saved." });
  });

  afterEach(cleanup);

  it("allows a teen to enable AI without guardian permission", async () => {
    const { container } = render(<ProfileCenterForm profile={profile()} />);
    const aiConsent = screen.getByRole("checkbox", {
      name: "Allow age-appropriate AI coaching",
    });

    expect(aiConsent).toBeEnabled();
    fireEvent.click(aiConsent);
    submitForm(container);

    await waitFor(() => expect(saveProfileCenter).toHaveBeenCalledTimes(1));
    expect(saveProfileCenter).toHaveBeenCalledWith(expect.objectContaining({
      consent_ai: true,
    }));
  });

  it("leaves adult AI consent independent from age", () => {
    render(<ProfileCenterForm profile={profile({ age_bracket: "adult" })} />);
    expect(screen.queryByText(/13\+ Diana AI beta/i)).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Allow age-appropriate AI coaching" }))
      .toBeEnabled();
  });
});

it("keeps a read-only profile disabled and ignores a forced submit", () => {
  vi.clearAllMocks();
  const { container, unmount } = render(<ProfileCenterForm profile={profile()} readOnly />);
  expect(screen.getByRole("textbox", { name: "Display name" })).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: "Allow age-appropriate AI coaching" })).toBeDisabled();
  submitForm(container);
  expect(saveProfileCenter).not.toHaveBeenCalled();
  expect(mocks.refresh).not.toHaveBeenCalled();
  unmount();
});
