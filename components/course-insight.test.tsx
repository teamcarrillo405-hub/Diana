// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CourseInsight, type CourseInsightAssignment } from "./course-insight";

const assignment: CourseInsightAssignment = {
  id: "pendulum",
  title: "Pendulum lab report",
  kind: "lab",
  dueAt: "2026-11-18T00:30:00Z",
  status: "drafting",
};

const submitted: CourseInsightAssignment = {
  ...assignment,
  id: "motion",
  title: "Motion worksheet",
  status: "submitted",
};

function renderClass(overrides: Partial<Parameters<typeof CourseInsight>[0]> = {}) {
  return render(
    <CourseInsight
      classId="physics"
      className="Physics"
      teacher="Dr. Rivera"
      assignments={[assignment, submitted]}
      notes={[{ id: "lesson", title: "Period and frequency", updatedAt: "2026-11-14T12:00:00Z" }]}
      materials={[{ id: "guide", title: "Lab instructions", assignmentTitle: assignment.title, href: "/classes/physics/materials/pendulum" }]}
      rubricTitle="Lab rubric"
      rubricForm={<input aria-label="Rubric file" type="file" />}
      syllabusForm={<input aria-label="Syllabus file" type="file" />}
      grade={{ label: "B+", percent: 88, confirmedAt: "2026-11-14T01:00:00Z" }}
      sourceOpen={false}
      timeZone="America/Los_Angeles"
      {...overrides}
    />,
  );
}

afterEach(cleanup);

describe("CourseInsight", () => {
  it("keeps the next assignment, class note and material linked to their real destinations", () => {
    renderClass();
    const overview = within(screen.getByRole("tabpanel", { name: "Overview" }));
    expect(overview.getByRole("link", { name: "Resume Pendulum lab report" })).toHaveAttribute("href", "/assignments/pendulum/workspace");
    expect(overview.getByRole("link", { name: /Period and frequency/ })).toHaveAttribute("href", "/notes/lesson");
    expect(overview.getByRole("link", { name: /Lab instructions/ })).toHaveAttribute("href", "/classes/physics/materials/pendulum");
    expect(screen.getByText("Confirmed Nov 13")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Assignments" }));
    expect(screen.getByRole("link", { name: "View submission Motion worksheet" })).toHaveAttribute("href", "/assignments/motion/submit");
  });

  it("keeps school quizzes and Diana practice separate while preserving class scope", () => {
    renderClass({
      initialSection: "quiz",
      teacherQuizzes: [{ id: "school-quiz", title: "Forces quiz", href: "/course-mode/assessments/school-quiz?classId=physics" }],
      quizzes: [{ id: "practice", title: "Pendulum quiz", updatedAt: "2026-11-14T12:00:00Z" }],
      practiceEnabled: true,
    });
    const panel = screen.getByRole("tabpanel", { name: "Quizzes & Practice" });
    const school = within(within(panel).getByRole("heading", { name: "School quizzes" }).closest("section")!);
    const practice = within(within(panel).getByRole("heading", { name: "Diana practice" }).closest("section")!);
    expect(school.getByRole("link", { name: "Forces quiz" })).toHaveAttribute("href", "/course-mode/assessments/school-quiz?classId=physics");
    expect(school.queryByRole("link", { name: /Pendulum quiz/ })).not.toBeInTheDocument();
    expect(practice.getByRole("link", { name: /Pendulum quiz/ })).toHaveAttribute("href", "/study-artifacts/practice?classId=physics");
    expect(practice.getByRole("link", { name: "Make a practice quiz" })).toHaveAttribute("href", "/study?classId=physics");
    expect(practice.getByRole("link", { name: "Guided practice" })).toHaveAttribute("href", "/classes/physics/practice");
  });

  it("shows supplied teacher feedback and its exact published assessment link", () => {
    const href = "/course-mode/assessments/school-quiz?classId=physics&attemptId=first";
    renderClass({
      feedback: [{
        assignmentId: "first",
        assignmentTitle: "Forces quiz",
        score: 8,
        outOf: 10,
        feedback: "Use units on each answer.",
        gradedAt: "2026-11-14T12:00:00Z",
        href,
      }],
      initialSection: "grades",
    });
    const panel = within(screen.getByRole("tabpanel", { name: "Grades & Feedback" }));
    expect(panel.getByText("8 / 10 points")).toBeInTheDocument();
    expect(panel.getByText("Use units on each answer.")).toBeInTheDocument();
    expect(panel.getByRole("link", { name: "Open graded work Forces quiz" })).toHaveAttribute("href", href);
  });

  it("preserves assignment context for direct class material visits", () => {
    renderClass({ sourceOpen: true, initialSection: "grades", workOrigin: assignment });
    expect(screen.getByRole("heading", { name: "Class materials" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to assignment" })).toHaveAttribute("href", "/assignments/pendulum/workspace");
    const panel = within(screen.getByRole("tabpanel", { name: "Materials" }));
    expect(panel.getByRole("link", { name: /Lab instructions/ })).toBeInTheDocument();
    expect(panel.getByText("Rubric")).toBeInTheDocument();
    expect(panel.getByText("Syllabus")).toBeInTheDocument();
  });
});
