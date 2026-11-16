// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveScreenDesignOnboardingStep } from "@/lib/onboarding/screendesign-step";
import { completeScreenDesignOnboarding } from "./actions";
import { saveSchoolBranding } from "@/app/(app)/settings/school-branding-actions";
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

vi.mock("@/app/(app)/settings/school-branding-actions", () => ({
  saveSchoolBranding: vi.fn(),
}));

describe("ScreenDesignOnboarding", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    vi.mocked(completeScreenDesignOnboarding).mockReset();
    vi.mocked(saveSchoolBranding).mockReset();
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

  it("offers the school look with the student's previously saved choices", () => {
    render(<ScreenDesignOnboarding initialSchoolBranding={{ primaryColor: "#112233", secondaryColor: "#abcdef", logoDataUrl: "data:image/webp;base64,AA==" }} />);

    expect(screen.getByRole("region", { name: "School look" })).toBeInTheDocument();
    expect(screen.getByLabelText("First school color")).toHaveValue("#112233");
    expect(screen.getByLabelText("Second school color")).toHaveValue("#abcdef");
    expect(screen.getByAltText("Selected school logo")).toHaveAttribute("src", "data:image/webp;base64,AA==");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("saves school colors and logo when continuing without a separate save", async () => {
    vi.mocked(saveSchoolBranding).mockResolvedValue({ ok: true });
    vi.mocked(completeScreenDesignOnboarding).mockResolvedValue({ ok: true });
    render(<ScreenDesignOnboarding />);

    fireEvent.change(screen.getByLabelText("First school color"), { target: { value: "#123456" } });
    fireEvent.change(screen.getByLabelText("Second school color"), { target: { value: "#abcdef" } });
    fireEvent.change(screen.getByLabelText("School logo"), { target: { files: [new File(["logo"], "school.png", { type: "image/png" })] } });
    await screen.findByAltText("Selected school logo");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(saveSchoolBranding).toHaveBeenCalledWith({ primaryColor: "#123456", secondaryColor: "#abcdef", logoDataUrl: expect.stringMatching(/^data:image\/png;base64,/) }));
    expect(await screen.findByRole("heading", { name: "Connect your school" })).toBeInTheDocument();
  });

  it("keeps onboarding open when the school look cannot be saved", async () => {
    vi.mocked(saveSchoolBranding).mockResolvedValue({ ok: false, error: "Please try saving the school look again." });
    render(<ScreenDesignOnboarding />);
    fireEvent.change(screen.getByLabelText("First school color"), { target: { value: "#123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Please try saving the school look again.")).toBeInTheDocument();
    expect(completeScreenDesignOnboarding).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Make it yours" })).toBeInTheDocument();
  });

  it("lets a student clear an unsupported logo and continue without branding", async () => {
    vi.mocked(completeScreenDesignOnboarding).mockResolvedValue({ ok: true });
    render(<ScreenDesignOnboarding />);
    fireEvent.change(screen.getByLabelText("School logo"), { target: { files: [new File(["bad"], "school.svg", { type: "image/svg+xml" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText(/Choose a PNG, JPG, or WebP image/)).toBeInTheDocument();
    expect(completeScreenDesignOnboarding).not.toHaveBeenCalled();
    const clearLogoSelection = await screen.findByRole("button", { name: "Clear logo selection" });
    await waitFor(() => expect(clearLogoSelection).toBeEnabled());
    fireEvent.click(clearLogoSelection);
    const continueButton = await screen.findByRole("button", { name: "Continue" });
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    expect(await screen.findByRole("heading", { name: "Connect your school" })).toBeInTheDocument();
    expect(saveSchoolBranding).not.toHaveBeenCalled();
  });

  it("supports keyboard selection in both preference groups", async () => {
    render(<ScreenDesignOnboarding />);

    const examStress = screen.getByRole("radio", { name: /Exam Stress/iu });
    examStress.focus();
    fireEvent.keyDown(examStress, { key: "ArrowDown" });
    expect(screen.getByRole("radio", { name: /Complex Concepts/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await waitFor(() => expect(screen.getByRole("radio", { name: /Complex Concepts/iu })).toHaveFocus());

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
    fireEvent.click(screen.getByRole("radio", { name: /Complex Concepts/iu }));
    expect(continueButton).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Morning/iu }));
    expect(continueButton).toBeEnabled();
  });

  it("saves preferences before offering the second optional school screen", async () => {
    vi.mocked(completeScreenDesignOnboarding).mockResolvedValue({ ok: true });
    render(<ScreenDesignOnboarding />);

    fireEvent.click(screen.getByRole("radio", { name: /Time Management/iu }));
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
