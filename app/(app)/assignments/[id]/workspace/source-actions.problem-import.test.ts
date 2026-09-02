import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/lms/canvas", () => ({ getValidCanvasToken: vi.fn() }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: vi.fn() }));
vi.mock("@/lib/lms/materials", () => ({ materializeAssignmentMaterial: vi.fn() }));
vi.mock("@/lib/lms/credential-policy", () => ({
  hydrateLmsConnectionForRuntime: vi.fn(),
  persistLmsTokenRefreshForRuntime: vi.fn(),
}));

import { addAssignmentSourceText } from "./source-actions";

const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASSIGNMENT_ID = "11111111-1111-4111-8111-111111111111";

describe("assignment source problem import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a problem queue from clear numbered math source text", async () => {
    const harness = createHarness({
      kind: "problem_set",
      title: "Algebra worksheet",
      description: "Solve each equation.",
      work_profile: "math",
    });
    mocks.createClient.mockResolvedValue(harness.client);

    const result = await addAssignmentSourceText({
      assignmentId: ASSIGNMENT_ID,
      title: "Worksheet text",
      text: "1. Solve 3x + 5 = 20\n2. Solve 2x - 4 = 10\n3. Graph y = 2x + 1",
    });

    expect(result).toEqual({ ok: true });
    expect(harness.problems).toEqual([
      expect.objectContaining({ problem_number: 1, problem_text: "Solve 3x + 5 = 20", source: "assignment_source" }),
      expect.objectContaining({ problem_number: 2, problem_text: "Solve 2x - 4 = 10", source: "assignment_source" }),
      expect.objectContaining({ problem_number: 3, problem_text: "Graph y = 2x + 1", source: "assignment_source" }),
    ]);
  });

  it("creates the shared writing work units for non-numbered writing material", async () => {
    const harness = createHarness({
      kind: "essay",
      title: "Rhetorical analysis",
      description: "Write one paragraph about tone.",
      work_profile: "writing",
    });
    mocks.createClient.mockResolvedValue(harness.client);

    const result = await addAssignmentSourceText({
      assignmentId: ASSIGNMENT_ID,
      title: "Directions",
      text: "Write a thesis and one paragraph using evidence from the article.",
    });

    expect(result).toEqual({ ok: true });
    expect(harness.problems).toEqual([
      expect.objectContaining({ problem_number: 1, problem_text: "State the main idea you will support.", source: "assignment_source" }),
      expect.objectContaining({ problem_number: 2, problem_text: "Choose details that support your claim.", source: "assignment_source" }),
      expect.objectContaining({ problem_number: 3, problem_text: "Write your response in your own words.", source: "assignment_source" }),
      expect.objectContaining({ problem_number: 4, problem_text: "Improve clarity and support before turning it in.", source: "assignment_source" }),
    ]);
  });
  it("does not seed a math queue from partial source text before confirmation", async () => {
    const harness = createHarness({
      kind: "problem_set",
      title: "Algebra worksheet",
      description: "Solve each equation.",
      work_profile: "math",
    }, [{
      assignment_id: ASSIGNMENT_ID,
      owner_id: OWNER_ID,
      source_type: "upload",
      title: "Worksheet PDF",
      extracted_text: "1. Solve 3x + 5 = 20\n2. Solve 2x - 4 = 10",
      import_status: "partial",
    }]);
    mocks.createClient.mockResolvedValue(harness.client);

    const result = await addAssignmentSourceText({
      assignmentId: ASSIGNMENT_ID,
      title: "Teacher note",
      text: "Use the attached worksheet.",
    });

    expect(result).toEqual({ ok: true });
    expect(harness.problems).toEqual([]);
  });
});

type AssignmentState = {
  id: string;
  owner_id: string;
  title: string | null;
  description: string | null;
  rubric_text: string | null;
  kind: string | null;
  work_profile: string | null;
  assignment_profile: unknown;
  source_import_status: string;
};

function createHarness(patch: Partial<AssignmentState>, initialSources: Array<Record<string, unknown>> = []) {
  const assignment: AssignmentState = {
    id: ASSIGNMENT_ID,
    owner_id: OWNER_ID,
    title: null,
    description: null,
    rubric_text: null,
    kind: "other",
    work_profile: null,
    assignment_profile: null,
    source_import_status: "not_started",
    ...patch,
  };
  const sources: Array<Record<string, unknown>> = [...initialSources];
  const problems: Array<Record<string, unknown>> = [];
  const from = vi.fn((table: string) => queryFor(table, assignment, sources, problems));
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: OWNER_ID } } }) },
    from,
  };
  return { assignment, sources, problems, client };
}

function queryFor(
  table: string,
  assignment: AssignmentState,
  sources: Array<Record<string, unknown>>,
  problems: Array<Record<string, unknown>>,
) {
  let insertValue: unknown = null;
  let updatePatch: Record<string, unknown> | null = null;
  const filters: Array<[string, unknown]> = [];
  const query: Record<string, any> = {};
  query.select = vi.fn(() => query);
  query.insert = vi.fn((value: unknown) => {
    insertValue = value;
    return query;
  });
  query.update = vi.fn((patch: Record<string, unknown>) => {
    updatePatch = patch;
    return query;
  });
  query.eq = vi.fn((column: string, value: unknown) => {
    filters.push([column, value]);
    return query;
  });
  query.gte = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => {
    if (table === "assignments" && matches(assignment, filters)) return { data: { ...assignment }, error: null };
    return { data: null, error: null };
  });
  query.single = vi.fn(async () => {
    if (table === "assignment_sources" && insertValue && !Array.isArray(insertValue)) {
      const row = { id: "22222222-2222-4222-8222-222222222222", ...(insertValue as Record<string, unknown>) };
      sources.push(row);
      return { data: { id: row.id }, error: null };
    }
    return { data: null, error: { message: "unexpected single" } };
  });
  query.then = vi.fn((resolveResult: (value: unknown) => unknown) => {
    if (updatePatch && table === "assignments" && matches(assignment, filters)) {
      Object.assign(assignment, updatePatch);
      return resolveResult({ error: null });
    }
    if (table === "assignment_sources") {
      return resolveResult({ data: sources.filter((source) => matches(source, filters)), error: null });
    }
    if (table === "assignment_problems" && insertValue) {
      const rows = Array.isArray(insertValue) ? insertValue : [insertValue];
      rows.forEach((row) => problems.push(row as Record<string, unknown>));
      return resolveResult({ data: rows, error: null });
    }
    if (table === "assignment_problems") {
      return resolveResult({ data: problems.filter((problem) => matches(problem, filters)), error: null });
    }
    return resolveResult({ data: [], error: null });
  });
  return query;
}

function matches(value: Record<string, unknown>, filters: Array<[string, unknown]>) {
  return filters.every(([column, expected]) => value[column] === expected);
}
