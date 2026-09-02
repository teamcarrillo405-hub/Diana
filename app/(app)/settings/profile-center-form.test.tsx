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

describe("ProfileCenterForm teen permission controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveProfileCenter).mockResolvedValue({ ok: true, message: "Settings saved." });
  });

  afterEach(cleanup);

  it("prompts an existing teen without permission before AI can be enabled", async () => {
    const { container } = render(<ProfileCenterForm profile={profile()} />);
    const permission = screen.getByRole("checkbox", {
      name: /I confirm that my parent or guardian has given permission/i,
    });
    const aiConsent = screen.getByRole("checkbox", {
      name: "Allow age-appropriate AI coaching",
    });

    expect(permission).not.toBeChecked();
    expect(aiConsent).toBeDisabled();
    expect(screen.getByText(/not identity verification or verified COPPA consent/i))
      .toBeInTheDocument();

    fireEvent.click(permission);
    expect(aiConsent).toBeEnabled();
    fireEvent.click(aiConsent);
    submitForm(container);

    await waitFor(() => expect(saveProfileCenter).toHaveBeenCalledTimes(1));
    expect(saveProfileCenter).toHaveBeenCalledWith(expect.objectContaining({
      teen_guardian_permission_attested: true,
      consent_ai: true,
    }));
  });

  it("turns off AI in the submitted state when current permission is withdrawn", async () => {
    const { container } = render(<ProfileCenterForm profile={profile({
      consent_ai: true,
      teen_guardian_permission_attested_at: "2020-01-01T00:00:00.000Z",
      teen_guardian_permission_policy_version: "teen_openai_beta_v1",
      teen_guardian_permission_source: "profile_center_attestation",
    })} />);
    const permission = screen.getByRole("checkbox", {
      name: /I confirm that my parent or guardian has given permission/i,
    });
    const aiConsent = screen.getByRole("checkbox", {
      name: "Allow age-appropriate AI coaching",
    });

    expect(permission).toBeChecked();
    expect(aiConsent).toBeChecked();
    fireEvent.click(permission);
    expect(aiConsent).not.toBeChecked();
    expect(aiConsent).toBeDisabled();
    submitForm(container);

    await waitFor(() => expect(saveProfileCenter).toHaveBeenCalledWith(
      expect.objectContaining({
        teen_guardian_permission_attested: false,
        consent_ai: false,
      }),
    ));
  });

  it("leaves adult AI consent independent from teen permission", () => {
    render(<ProfileCenterForm profile={profile({ age_bracket: "adult" })} />);
    expect(screen.queryByText(/13\+ Diana AI beta/i)).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Allow age-appropriate AI coaching" }))
      .toBeEnabled();
  });
});
