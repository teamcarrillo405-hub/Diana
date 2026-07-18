// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApClient } from "./ap-client";

vi.mock("./actions", () => ({
  saveApPlan: vi.fn(),
  saveApPractice: vi.fn(),
}));

afterEach(cleanup);

describe("ScreenDesign AP Command Center", () => {
  it("renders persisted plan and attempt evidence without source-only scores", () => {
    render(
      <ApClient
        defaultExamDate="2027-05-05"
        nowIso="2026-09-14T16:30:00.000Z"
        plans={[
          {
            id: "11111111-1111-4111-8111-111111111111",
            subject: "english_language",
            exam_date: "2027-05-11",
            goal_band: "3-4",
            current_focus: "Evidence commentary",
          },
        ]}
        attempts={[
          {
            id: "22222222-2222-4222-8222-222222222222",
            plan_id: "11111111-1111-4111-8111-111111111111",
            subject: "english_language",
            practice_type: "mcq",
            correct_count: 17,
            total_count: 20,
            score_band: "4-5",
            notes: "Review synthesis evidence.",
            practiced_at: "2026-09-14T16:30:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: /academic path/i })).toBeInTheDocument();
    expect(screen.getByText("Evidence commentary")).toBeInTheDocument();
    expect(screen.getAllByText("85%")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Open AP study plan" })).toHaveAttribute(
      "href",
      "/ap?plan=11111111-1111-4111-8111-111111111111#ap-plan-workbench",
    );
    expect(screen.queryByText("68%")).not.toBeInTheDocument();
    expect(screen.queryByText("82%")).not.toBeInTheDocument();
  });

  it("renders an honest source-shaped setup when no AP records exist", () => {
    render(
      <ApClient
        defaultExamDate="2027-05-05"
        nowIso="2026-09-14T16:30:00.000Z"
        plans={[]}
        attempts={[]}
      />,
    );

    expect(screen.getByText(/no ap plan is saved yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
  });
});
