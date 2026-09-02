import { describe, expect, it } from "vitest";

import {
  formatHomeworkKernelForTutor,
  homeworkAuthorshipMetadata,
  homeworkModelRouting,
  inferStudyHelperEvent,
  loadAssignmentHomeworkKernel,
} from "./server-understanding";

type TableResult = { data: unknown; error?: unknown };

function makeChain(result: TableResult, inserts: Array<{ table: string; value: Record<string, unknown> }>, table: string) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => result,
    insert: async (value: Record<string, unknown>) => {
      inserts.push({ table, value });
      return { error: null };
    },
    then: (resolve: (value: TableResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function makeClient(results: Record<string, TableResult>) {
  const inserts: Array<{ table: string; value: Record<string, unknown> }> = [];
  return {
    inserts,
    from: (table: string) => makeChain(results[table] ?? { data: null }, inserts, table),
  };
}

describe("server assignment homework kernel", () => {
  it("loads a source-aware assignment understanding and records the live study event", async () => {
    const client = makeClient({
      assignments: {
        data: {
          id: "assignment-1",
          owner_id: "student-1",
          class_id: "class-1",
          title: "Algebra worksheet",
          description: "Solve questions 1-3 and show work.",
          rubric_text: "Use inverse operations and check each answer.",
          kind: "math",
          work_profile: null,
          work_profile_source: null,
          assignment_profile: null,
          source_import_status: "imported",
          classes: { name: "Algebra I" },
        },
      },
      assignment_sources: {
        data: [
          {
            id: "source-1",
            source_type: "upload",
            title: "Worksheet PDF",
            source_location: "page 1",
            extracted_text: "1. Solve 3x + 5 = 20. 2. Solve 2y - 4 = 10.",
            import_status: "partial",
          },
        ],
      },
      student_state_snapshots: {
        data: {
          readiness: { body: "low", focus: "scattered" },
          support_intensity: "guided",
          friction_signals: { incorrectAttempts: 2, stillStuckLast24h: 1 },
        },
      },
      task_signals: {
        data: [
          { kind: "study_helper_event", assignment_id: "assignment-1", value: { event: "still_stuck" } },
        ],
      },
      mastery_concepts: {
        data: [
          { id: "concept-1", name: "inverse operations", mastery_level: 1.25, self_confidence: 1 },
          { id: "concept-2", name: "answer checking", mastery_level: 3.5, self_confidence: 3 },
        ],
      },
      profiles: {
        data: { school_year: 7, tutor_complexity: "balanced" },
      },
    });

    const kernel = await loadAssignmentHomeworkKernel({
      supabase: client,
      ownerId: "student-1",
      assignmentId: "assignment-1",
      currentStudyEvent: "direct_answer_request",
      eventSource: "study_buddy",
      now: new Date("2026-08-07T12:00:00.000Z"),
    });

    expect(kernel).not.toBeNull();
    expect(kernel?.assignment.class_name).toBe("Algebra I");
    expect(kernel?.sources).toHaveLength(1);
    expect(kernel?.profile.subjectDomain).toBe("mathematics");
    expect(kernel?.understanding.sourceState).toBe("source_partial");
    expect(kernel?.understanding.needsStudentConfirmation).toBe(true);
    expect(kernel?.understanding.helpContract.helpLevel).toBeGreaterThanOrEqual(60);
    expect(kernel?.masteryReadiness.bridgeConcepts.map((concept) => concept.name)).toContain("inverse operations");
    expect(kernel?.understanding.learnerContext.prerequisiteBridgeRequired).toBe(true);
    expect(kernel?.understanding.academicBand).toBe("middle_foundation");
    expect(kernel?.contextStatus).toBe("complete");
    expect(homeworkModelRouting(kernel!)).toEqual(expect.objectContaining({
      academicBand: "middle_foundation",
    }));
    expect(client.inserts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: "task_signals",
        value: expect.objectContaining({
          kind: "study_helper_event",
          value: expect.objectContaining({ event: "direct_answer_request", source: "study_buddy" }),
        }),
      }),
    ]));
  });

  it("formats the shared tutor context and authorship metadata for downstream routes", async () => {
    const client = makeClient({
      assignments: {
        data: {
          id: "assignment-2",
          owner_id: "student-1",
          title: "Nixon DBQ report",
          description: "Write a three page report using the attached packet.",
          rubric_text: "Use evidence and cite the packet.",
          kind: "writing",
          class_id: "history-class",
          work_profile: "history_dbq",
          assignment_profile: null,
        },
      },
      assignment_sources: {
        data: [
          {
            id: "source-2",
            source_type: "attachment",
            title: "Nixon source packet",
            source_location: "page 2",
            extracted_text: "Document B explains the resignation timeline.",
            import_status: "imported",
          },
        ],
      },
      student_state_snapshots: { data: null },
      task_signals: { data: [] },
      rubrics: {
        data: [{
          id: "course-rubric-1",
          title: "History essay rubric",
          raw_text: "Evidence: 10 points. Explain each source before concluding.",
          parse_status: "parsed",
        }],
      },
      class_syllabi: {
        data: [{
          id: "course-syllabus-1",
          title: "History 9 syllabus",
          raw_text: "Use Chicago citations for formal reports.",
        }],
      },
    });

    const kernel = await loadAssignmentHomeworkKernel({
      supabase: client,
      ownerId: "student-1",
      assignmentId: "assignment-2",
    });

    expect(kernel).not.toBeNull();
    const context = formatHomeworkKernelForTutor(kernel!, {
      visibleWork: "Thesis draft: Nixon changed public trust in government.",
      maxChars: 20_000,
    });
    expect(context).toContain("Diana universal homework method");
    expect(context).toContain("Subject profile: social studies");
    expect(context).toContain("Nixon source packet, page 2");
    expect(context).toContain("Course rubric: History essay rubric");
    expect(context).toContain("Course syllabus: History 9 syllabus");
    expect(context).toContain("Use Chicago citations for formal reports.");
    expect(context).toContain("Visible workspace work");

    expect(homeworkAuthorshipMetadata(kernel!, { route: "assignment-realtime", visibleWorkChars: 54 })).toEqual(expect.objectContaining({
      route: "assignment-realtime",
      subjectDomain: "social_studies",
      sourceState: "source_ready",
      sourceItemCount: 3,
      visibleWorkChars: 54,
      trustAiMode: "green",
    }));
  });

  it("infers adaptive study events from student phrasing", () => {
    expect(inferStudyHelperEvent("just tell me the answer")).toBe("direct_answer_request");
    expect(inferStudyHelperEvent("I am confused and stuck")).toBe("still_stuck");
    expect(inferStudyHelperEvent("can you check my work")).toBe("escape_valve");
  });

  it("surfaces supporting query failures as degraded context", async () => {
    const client = makeClient({
      assignments: {
        data: {
          id: "assignment-3",
          owner_id: "student-1",
          title: "Chemistry practice",
          description: "Balance the equations.",
          rubric_text: null,
          kind: "science",
          class_id: null,
          work_profile: null,
          assignment_profile: null,
        },
      },
      assignment_sources: {
        data: null,
        error: { message: "policy unavailable" },
      },
      student_state_snapshots: { data: null },
      task_signals: { data: [] },
      profiles: { data: null },
      mastery_concepts: { data: [] },
    });

    const kernel = await loadAssignmentHomeworkKernel({
      supabase: client,
      ownerId: "student-1",
      assignmentId: "assignment-3",
    });

    expect(kernel).not.toBeNull();
    expect(kernel?.contextStatus).toBe("degraded");
    expect(kernel?.contextIssues).toEqual(["assignment sources"]);
    expect(formatHomeworkKernelForTutor(kernel!)).toContain("Do not treat those records as absent");
    expect(homeworkAuthorshipMetadata(kernel!, { route: "study-buddy" })).toEqual(expect.objectContaining({
      contextStatus: "degraded",
      contextIssues: ["assignment sources"],
    }));
    expect(homeworkModelRouting(kernel!)).toEqual(expect.objectContaining({
      signals: expect.stringContaining("Supporting context unavailable: assignment sources"),
    }));
  });

  it("fails closed when the owner-scoped assignment query fails", async () => {
    const client = makeClient({
      assignments: { data: null, error: { message: "database unavailable" } },
    });

    await expect(loadAssignmentHomeworkKernel({
      supabase: client,
      ownerId: "student-1",
      assignmentId: "assignment-4",
    })).rejects.toThrow("homework_context_query_failed:assignment");
  });
});
