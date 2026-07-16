// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("ScreenDesignOnboarding", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    vi.mocked(completeScreenDesignOnboarding).mockReset();
  });

  afterEach(cleanup);

  it("renders the local welcome source and advances to the educational source", () => {
    render(<ScreenDesignOnboarding />);

    expect(screen.getByRole("heading", { name: /diana\s*ai tutor/iu })).toBeInTheDocument();
    expect(
      decodeURIComponent(screen.getByAltText("DIANA logo").getAttribute("src") ?? ""),
    ).toContain("/screendesign/brand/diana-logo.png");
    expect(document.querySelector('[src*="media.screensdesign.com"]')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "GET STARTED" }));

    expect(screen.getByRole("heading", { name: "DID YOU KNOW?" })).toBeInTheDocument();
    expect(
      decodeURIComponent(screen.getByAltText("GPA progress chart").getAttribute("src") ?? ""),
    ).toContain("/screendesign/onboarding/gpa-progress-chart.png");
  });

  it("moves back and forward without completing onboarding early", () => {
    render(<ScreenDesignOnboarding initialStep="educational" />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "GET STARTED" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "GET STARTED" }));
    fireEvent.click(screen.getByRole("button", { name: "CONTINUE" }));

    expect(screen.getByRole("heading", { name: /biggest hurdle/iu })).toBeInTheDocument();
    expect(completeScreenDesignOnboarding).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps one hurdle and one schedule choice selected across back navigation", () => {
    render(<ScreenDesignOnboarding initialStep="challenge" />);

    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.getAllByRole("radio", { name: /./u })).toHaveLength(4);
    expect(screen.getByRole("radio", { name: /Exam Stress/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: /Time Management/iu }));
    fireEvent.click(screen.getByRole("button", { name: "Select learning hurdle" }));

    expect(screen.getByText("2/4")).toBeInTheDocument();
    expect(screen.getAllByRole("radio", { name: /./u })).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /After-Practice Grind/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { name: /Time Management/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("disables continuation until the current screen has a valid choice", () => {
    const { rerender } = render(
      <ScreenDesignOnboarding
        initialStep="challenge"
        initialLearningHurdle={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Select learning hurdle" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Complex Concepts/iu }));
    expect(screen.getByRole("button", { name: "Select learning hurdle" })).toBeEnabled();

    rerender(
      <ScreenDesignOnboarding
        key="schedule"
        initialStep="schedule"
        initialStudySchedulePreference={null}
      />,
    );
    expect(screen.getByRole("button", { name: "Select study schedule" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Morning Hustle/iu }));
    expect(screen.getByRole("button", { name: "Select study schedule" })).toBeEnabled();
  });

  it("supports arrow-key selection within both card groups", () => {
    const { rerender } = render(<ScreenDesignOnboarding initialStep="challenge" />);
    const examStress = screen.getByRole("radio", { name: /Exam Stress/iu });
    examStress.focus();
    fireEvent.keyDown(examStress, { key: "ArrowDown" });
    expect(screen.getByRole("radio", { name: /Complex Concepts/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    rerender(<ScreenDesignOnboarding key="schedule" initialStep="schedule" />);
    const afterPractice = screen.getByRole("radio", { name: /After-Practice Grind/iu });
    afterPractice.focus();
    fireEvent.keyDown(afterPractice, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /Late Night Sessions/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("submits both selected ids once and redirects only after success", async () => {
    vi.mocked(completeScreenDesignOnboarding).mockResolvedValue({ ok: true });
    render(<ScreenDesignOnboarding initialStep="schedule" />);

    fireEvent.click(screen.getByRole("radio", { name: /Morning Hustle/iu }));
    fireEvent.click(screen.getByRole("button", { name: "Select study schedule" }));
    fireEvent.click(screen.getByRole("button", { name: "Select study schedule" }));

    await waitFor(() => expect(completeScreenDesignOnboarding).toHaveBeenCalledOnce());
    expect(completeScreenDesignOnboarding).toHaveBeenCalledWith({
      learningHurdle: "exam_stress",
      studySchedulePreference: "morning",
    });
    expect(push).toHaveBeenCalledWith("/dashboard");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps the schedule choice and route in place after a calm persistence error", async () => {
    vi.mocked(completeScreenDesignOnboarding).mockResolvedValue({
      ok: false,
      reason: "persistence",
      error: "Those choices did not save yet. Your other settings are still here.",
    });
    render(<ScreenDesignOnboarding initialStep="schedule" />);

    fireEvent.click(screen.getByRole("radio", { name: /Late Night Sessions/iu }));
    fireEvent.click(screen.getByRole("button", { name: "Select study schedule" }));

    expect(await screen.findByRole("status")).toHaveTextContent("other settings are still here");
    expect(screen.getByRole("radio", { name: /Late Night Sessions/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
