// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearDraft: vi.fn(),
  createClient: vi.fn(),
  push: vi.fn(),
  readDraft: vi.fn(),
  refresh: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/onboarding/public-draft", () => ({
  clearPublicOnboardingDraft: mocks.clearDraft,
  readPublicOnboardingDraft: mocks.readDraft,
}));

import SignupPage from "./page";

function dateOfBirthYearsAgo(years: number): string {
  return `${new Date().getFullYear() - years}-01-01`;
}

function dateOfBirthTurningThirteenTomorrow(): string {
  const now = new Date();
  const date = new Date(Date.UTC(
    now.getUTCFullYear() - 13,
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  ));
  return date.toISOString().slice(0, 10);
}

function fillSignup(dob: string) {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "student@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "safe-password" },
  });
  fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: dob } });
}

function submitSignup() {
  const form = screen.getByRole("button", { name: "Create account" }).closest("form");
  if (!form) throw new Error("Signup form missing");
  fireEvent.submit(form);
}

describe("SignupPage teen guardian permission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readDraft.mockReturnValue(null);
    mocks.signUp.mockResolvedValue({ error: null });
    mocks.createClient.mockReturnValue({ auth: { signUp: mocks.signUp } });
  });

  afterEach(cleanup);

  it("requires the attestation for a teen and stores versioned signup metadata", async () => {
    render(<SignupPage />);
    fillSignup(dateOfBirthYearsAgo(15));

    const attestation = screen.getByRole("checkbox", {
      name: /I confirm that my parent or guardian has given me permission/i,
    });
    expect(attestation).toBeRequired();
    expect(screen.getByText(/does not collect identity documents/i)).toBeInTheDocument();

    submitSignup();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Confirm that your parent or guardian has given permission",
    );
    expect(mocks.signUp).not.toHaveBeenCalled();

    fireEvent.click(attestation);
    submitSignup();

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledTimes(1));
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        data: expect.objectContaining({
          teen_guardian_permission_attested: true,
          teen_guardian_permission_policy_version: "teen_openai_beta_v1",
          teen_guardian_permission_source: "signup_attestation",
        }),
      }),
    }));
  });

  it("rejects under-13 signup without offering the teen attestation", async () => {
    render(<SignupPage />);
    fillSignup(dateOfBirthYearsAgo(10));
    expect(screen.queryByText("Parent or guardian permission")).not.toBeInTheDocument();

    submitSignup();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Diana isn't available for users under 13 yet",
    );
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("keeps the exact 13th-birthday boundary closed until the birthday", async () => {
    render(<SignupPage />);
    fillSignup(dateOfBirthTurningThirteenTomorrow());

    submitSignup();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Diana isn't available for users under 13 yet",
    );
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("does not require or store teen permission for an adult", async () => {
    render(<SignupPage />);
    fillSignup(dateOfBirthYearsAgo(30));
    expect(screen.queryByText("Parent or guardian permission")).not.toBeInTheDocument();

    submitSignup();

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledTimes(1));
    const metadata = mocks.signUp.mock.calls[0]?.[0]?.options?.data;
    expect(metadata).not.toHaveProperty("teen_guardian_permission_attested");
    expect(metadata).not.toHaveProperty("teen_guardian_permission_policy_version");
    expect(metadata).not.toHaveProperty("teen_guardian_permission_source");
  });
});
