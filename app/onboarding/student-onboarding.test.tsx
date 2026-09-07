// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { completeScreenDesignOnboarding } from "./actions";
import {
  resolveStudentOnboardingView,
  StudentOnboarding,
} from "./student-onboarding";

const replace = vi.fn();

vi.mock("./actions", () => ({
  completeScreenDesignOnboarding: vi.fn(),
}));

describe("StudentOnboarding", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(completeScreenDesignOnboarding).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("maps legacy links to one of the two current setup steps", () => {
    expect(resolveStudentOnboardingView("welcome")).toBe("support");
    expect(resolveStudentOnboardingView("educational")).toBe("support");
    expect(resolveStudentOnboardingView("challenge")).toBe("support");
    expect(resolveStudentOnboardingView("schedule")).toBe("rhythm");
  });

  it("uses the current Diana setup language rather than athlete or GPA claims", () => {
    render(<StudentOnboarding />);

    expect(screen.getByRole("heading", { name: /set up your study space/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what would help most/i })).toBeInTheDocument();
    expect(screen.queryByText(/athletes who use/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/gpa/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/practice and study/i)).not.toBeInTheDocument();
  });

  it("requires a learning choice, supports arrow navigation, and keeps it when going back", () => {
    render(<StudentOnboarding />);

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    const gettingStarted = screen.getByRole("radio", { name: /getting started/i });
    gettingStarted.focus();
    fireEvent.keyDown(gettingStarted, { key: "ArrowRight" });

    expect(screen.getByRole("radio", { name: /understanding a hard topic/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(continueButton).toBeEnabled();

    fireEvent.click(continueButton);
    expect(screen.getByRole("heading", { name: /when does focused work/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { name: /understanding a hard topic/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("saves the existing onboarding data contract once and then opens Today", async () => {
    vi.mocked(completeScreenDesignOnboarding).mockResolvedValue({ ok: true });
    render(<StudentOnboarding onNavigate={replace} />);

    fireEvent.click(screen.getByRole("radio", { name: /preparing for a quiz/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("radio", { name: /morning/i }));
    fireEvent.change(screen.getByLabelText("Sleep goal"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Movement goal"), { target: { value: "5" } });
    const finishSetup = screen.getByRole("button", { name: "Finish setup" });
    fireEvent.click(finishSetup);
    fireEvent.click(finishSetup);

    await waitFor(() => expect(completeScreenDesignOnboarding).toHaveBeenCalledOnce());
    expect(completeScreenDesignOnboarding).toHaveBeenCalledWith({
      learningHurdle: "exam_stress",
      studySchedulePreference: "morning",
      sleepGoal: 9,
      movementGoal: 5,
    });
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps choices visible after a persistence issue", async () => {
    vi.mocked(completeScreenDesignOnboarding).mockResolvedValue({
      ok: false,
      reason: "persistence",
      error: "Your choices did not save yet. Your other settings are still here.",
    });
    render(<StudentOnboarding onNavigate={replace} />);

    fireEvent.click(screen.getByRole("radio", { name: /getting organized/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("radio", { name: /after school/i }));
    fireEvent.click(screen.getByRole("button", { name: "Finish setup" }));

    expect(await screen.findByText(/other settings are still here/i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /after school/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
