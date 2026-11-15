// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveScreenDesignOnboardingStep } from "@/lib/onboarding/screendesign-step";
import { completeScreenDesignOnboarding } from "./actions";
import { ScreenDesignOnboarding } from "./screendesign-onboarding";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("./actions", () => ({
  completeScreenDesignOnboarding: vi.fn(),
}));

vi.mock("@/app/(app)/settings/player-photo-actions", () => ({
  savePlayerPhoto: vi.fn(),
}));

describe("ScreenDesignOnboarding", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    vi.mocked(completeScreenDesignOnboarding).mockReset();
  });

  afterEach(cleanup);

  it("maps retired account-setup links to the new first screen", () => {
    expect(resolveScreenDesignOnboardingStep("personalize")).toBe("personalize");
    expect(resolveScreenDesignOnboardingStep("personalize=1/2")).toBe("personalize");
    expect(resolveScreenDesignOnboardingStep("challenge=1/4")).toBe("personalize");
    expect(resolveScreenDesignOnboardingStep("schedule=2/4")).toBe("personalize");
    expect(resolveScreenDesignOnboardingStep("connect=2/2")).toBe("connect");
    expect(resolveScreenDesignOnboardingStep("connect=3/4")).toBe("connect");
    expect(resolveScreenDesignOnboardingStep("welcome")).toBe("personalize");
    expect(resolveScreenDesignOnboardingStep(["personalize=1/2"])).toBe("personalize");
  });

  it("shows the first of two Today-style account setup screens", () => {
    render(<ScreenDesignOnboarding />);

    expect(screen.getByRole("heading", { name: "Make it yours" })).toBeInTheDocument();
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a photo" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio", { name: /./u })).toHaveLength(7);
    expect(screen.queryByText("DID YOU KNOW?")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "GET STARTED" })).not.toBeInTheDocument();
  });

  it("supports keyboard selection in both preference groups", async () => {
    render(<ScreenDesignOnboarding />);

    const examStress = screen.getByRole("radio", { name: /Feeling ready for a test/iu });
    examStress.focus();
    fireEvent.keyDown(examStress, { key: "ArrowDown" });
    expect(screen.getByRole("radio", { name: /Working through a hard concept/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await waitFor(() => expect(screen.getByRole("radio", { name: /Working through a hard concept/iu })).toHaveFocus());

    const afterPractice = screen.getByRole("radio", { name: /Afternoon/iu });
    afterPractice.focus();
    fireEvent.keyDown(afterPractice, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /Evening/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await waitFor(() => expect(screen.getByRole("radio", { name: /Evening/iu })).toHaveFocus());
  });

  it("waits for both account preferences before continuing", () => {
    render(
      <ScreenDesignOnboarding
        initialLearningHurdle={null}
        initialStudySchedulePreference={null}
      />,
    );

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Working through a hard concept/iu }));
    expect(continueButton).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Morning/iu }));
    expect(continueButton).toBeEnabled();
  });

  it("saves preferences before offering the second optional school screen", async () => {
    vi.mocked(completeScreenDesignOnboarding).mockResolvedValue({ ok: true });
    render(<ScreenDesignOnboarding />);

    fireEvent.click(screen.getByRole("radio", { name: /Finding time/iu }));
    fireEvent.click(screen.getByRole("radio", { name: /Morning/iu }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(completeScreenDesignOnboarding).toHaveBeenCalledOnce());
    expect(completeScreenDesignOnboarding).toHaveBeenCalledWith({
      learningHurdle: "time_management",
      studySchedulePreference: "morning",
      sleepGoal: 8,
      movementGoal: 4,
    });
    expect(screen.getByRole("heading", { name: "Connect your school" })).toBeInTheDocument();
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect Google Classroom" })).toHaveAttribute(
      "href",
      "/api/lms/google-oauth/start?return_to=/dashboard",
    );
    expect(screen.getByLabelText("Canvas school address")).toBeRequired();
    expect(screen.queryByRole("heading", { name: "Profile photo Optional" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Make it yours" })).toBeInTheDocument();
  });

  it("keeps the first screen in place after a calm persistence error", async () => {
    vi.mocked(completeScreenDesignOnboarding).mockResolvedValue({
      ok: false,
      reason: "persistence",
      error: "Those choices did not save yet. Your other settings are still here.",
    });
    render(<ScreenDesignOnboarding />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText(/other settings are still here/iu)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Make it yours" })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
