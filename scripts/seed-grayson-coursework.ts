import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  buildArtifactReviewLoop,
  buildFallbackStudyArtifact,
  type StudyArtifactQuizItem,
} from "../lib/study-helper/artifacts";
import type { Database, Json, TablesInsert } from "../lib/supabase/types";

loadEnvConfig(process.cwd());

type AdminClient = SupabaseClient<Database>;
type ProblemSeed = { number: number; text: string };
type AssignmentSeed = {
  slug: string;
  title: string;
  description: string;
  kind: "problem_set" | "essay";
  dueInDays: number;
  estimatedMinutes: number;
  difficulty: number;
  readingLoad: number;
  writingLoad: number;
  rubricText: string;
  workProfile: "math" | "worksheet" | "research";
  assignmentProfile: Json;
  problems?: ProblemSeed[];
};
type ClassSeed = {
  name: string;
  teacher: string;
  color: string;
  notes: string;
  assignment: AssignmentSeed;
  extraAssignments?: AssignmentSeed[];
};

const GRAYSON_EMAIL = process.env.QA_GRAYSON_TEST_EMAIL ?? "grayson-qa-student@local.test";
const SEED_SOURCE = "clever";
const SEED_PREFIX = "grayson-requested-coursework";

const classSeeds: ClassSeed[] = [
  {
    name: "Algebra",
    teacher: "Mr. Chen",
    color: "#F45BA8",
    notes: "Show each algebra step, keep final answers visible, and check solutions by substitution.",
    assignment: {
      slug: "linear-equations-three-questions",
      title: "Linear Equations: Three Questions",
      description: "Solve all three linear equations. Show each inverse operation on its own line, box each solution, and check one answer by substitution.",
      kind: "problem_set",
      dueInDays: 2,
      estimatedMinutes: 30,
      difficulty: 3,
      readingLoad: 1,
      writingLoad: 2,
      rubricText: [
        "Setup - Copies each equation accurately - 20 pts",
        "Work shown - Shows inverse operations in order - 40 pts",
        "Solutions - Gives the correct value for each variable - 25 pts",
        "Check - Verifies one solution by substitution - 15 pts",
      ].join("\n"),
      workProfile: "math",
      assignmentProfile: {
        schemaVersion: 1,
        subjectDomain: "mathematics",
        taskIntents: ["solve", "explain"],
        artifactType: "problem_set",
        capabilities: ["equation_editor", "graphing", "rich_text"],
        safetyClass: "standard",
        standardsAlignment: [],
        legacyMode: "math",
        confidence: 1,
        reasons: ["Seeded as an Algebra problem set."],
      },
      problems: [
        { number: 1, text: "Solve for x: 3x + 5 = 20" },
        { number: 2, text: "Solve for x: 2(x - 4) = 14" },
        { number: 3, text: "Solve for x: 5x - 7 = 3x + 9" },
      ],
    },
    extraAssignments: [
      {
        slug: "function-graph-practice",
        title: "Function Graph Practice",
        description: "Graph three linear functions, label the slope and y-intercept, and use one sentence to explain what changed between the graphs.",
        kind: "problem_set",
        dueInDays: 4,
        estimatedMinutes: 25,
        difficulty: 3,
        readingLoad: 1,
        writingLoad: 2,
        rubricText: [
          "Graph setup - Uses a readable scale and labels both axes - 30 pts",
          "Slope and intercept - Identifies both for each function - 35 pts",
          "Explanation - Uses one clear comparison sentence - 20 pts",
          "Check - Verifies one point on a graph - 15 pts",
        ].join("\n"),
        workProfile: "math",
        assignmentProfile: {
          schemaVersion: 1,
          subjectDomain: "mathematics",
          taskIntents: ["graph", "explain"],
          artifactType: "problem_set",
          capabilities: ["equation_editor", "graphing", "rich_text"],
          safetyClass: "standard",
          standardsAlignment: [],
          legacyMode: "math",
          confidence: 1,
          reasons: ["Seeded as an Algebra graphing practice set."],
        },
        problems: [
          { number: 1, text: "Graph y = 2x + 1 and label the slope and y-intercept." },
          { number: 2, text: "Graph y = -x + 4 and label the slope and y-intercept." },
          { number: 3, text: "Explain one difference between the two graphs." },
        ],
      },
    ],
  },
  {
    name: "History",
    teacher: "Ms. Johnson",
    color: "#5E8CFF",
    notes: "Use credible sources, distinguish fact from interpretation, and keep citations attached to notes.",
    assignment: {
      slug: "president-nixon-three-page-report",
      title: "President Nixon: Three-Page Report",
      description: [
        "Write a three-page report on President Richard Nixon.",
        "Explain his rise in national politics, two major domestic or foreign-policy actions, the Watergate scandal, and how his resignation affected public trust in government.",
        "Use at least three credible sources, include in-text citations, and add a Works Cited page.",
      ].join(" "),
      kind: "essay",
      dueInDays: 5,
      estimatedMinutes: 180,
      difficulty: 4,
      readingLoad: 4,
      writingLoad: 5,
      rubricText: [
        "Historical accuracy - Explains Nixon's presidency with accurate dates and context - 25 pts",
        "Evidence - Uses at least three credible sources with specific supporting details - 25 pts",
        "Analysis - Explains the significance of Watergate and Nixon's resignation - 25 pts",
        "Organization - Uses a clear introduction, body sections, and conclusion across three pages - 15 pts",
        "Citations - Includes in-text citations and a Works Cited page - 10 pts",
      ].join("\n"),
      workProfile: "research",
      assignmentProfile: {
        schemaVersion: 1,
        subjectDomain: "social_studies",
        taskIntents: ["research", "analyze_sources", "write"],
        artifactType: "research_paper",
        capabilities: ["rich_text"],
        safetyClass: "standard",
        standardsAlignment: [],
        legacyMode: "research",
        confidence: 1,
        reasons: ["Seeded as a source-based History report."],
      },
    },
    extraAssignments: [
      {
        slug: "nixon-source-notes",
        title: "Nixon Source Notes",
        description: "Collect three credible source notes for the Nixon report. Each note should include a fact, source name, and how it may support the final report.",
        kind: "essay",
        dueInDays: 2,
        estimatedMinutes: 35,
        difficulty: 3,
        readingLoad: 3,
        writingLoad: 3,
        rubricText: [
          "Source choice - Uses three credible sources - 35 pts",
          "Notes - Records a specific fact from each source - 35 pts",
          "Source connection - Explains how each note supports the report - 30 pts",
        ].join("\n"),
        workProfile: "research",
        assignmentProfile: {
          schemaVersion: 1,
          subjectDomain: "social_studies",
          taskIntents: ["research", "analyze_sources"],
          artifactType: "research_notes",
          capabilities: ["rich_text"],
          safetyClass: "standard",
          standardsAlignment: [],
          legacyMode: "research",
          confidence: 1,
          reasons: ["Seeded as report preparation for the Nixon assignment."],
        },
      },
    ],
  },
  {
    name: "Chemistry",
    teacher: "Dr. Patel",
    color: "#44C7A1",
    notes: "Keep element symbols and subscripts accurate, show coefficients clearly, and verify atom counts on both sides.",
    assignment: {
      slug: "balancing-equations-three-questions",
      title: "Balancing Chemical Equations: Three Questions",
      description: "Balance all three chemical equations using whole-number coefficients. Show the atom count for each element before and after balancing.",
      kind: "problem_set",
      dueInDays: 3,
      estimatedMinutes: 35,
      difficulty: 3,
      readingLoad: 2,
      writingLoad: 2,
      rubricText: [
        "Coefficients - Uses the smallest correct whole-number coefficients - 40 pts",
        "Atom counts - Shows matching atom totals on both sides - 30 pts",
        "Chemical notation - Preserves formulas and subscripts - 20 pts",
        "Presentation - Keeps work readable and labels each question - 10 pts",
      ].join("\n"),
      workProfile: "worksheet",
      assignmentProfile: {
        schemaVersion: 1,
        subjectDomain: "science",
        taskIntents: ["solve", "calculate", "explain"],
        artifactType: "worksheet_response",
        capabilities: ["equation_editor", "rich_text"],
        safetyClass: "standard",
        standardsAlignment: [],
        legacyMode: "worksheet",
        confidence: 1,
        reasons: ["Seeded as a Chemistry question set without a physical lab."],
      },
      problems: [
        { number: 1, text: "Balance: H2 + O2 -> H2O" },
        { number: 2, text: "Balance: N2 + H2 -> NH3" },
        { number: 3, text: "Balance: Al + O2 -> Al2O3" },
      ],
    },
  },
];

const algebraQuiz: StudyArtifactQuizItem[] = [
  { question: "Solve for x: 4x + 7 = 31", choices: ["x = 4", "x = 5", "x = 6", "x = 8"], answer: "x = 6", hint: "Subtract 7 before dividing by 4.", sourceAnchor: "Linear Equations assignment, question 1" },
  { question: "Solve for x: 3(x - 2) = 15", choices: ["x = 3", "x = 5", "x = 7", "x = 9"], answer: "x = 7", hint: "Divide by 3, then add 2.", sourceAnchor: "Linear Equations assignment, question 2" },
  { question: "Which equation is written in slope-intercept form?", choices: ["Ax + By = C", "y = mx + b", "x = y + b", "m = xy"], answer: "y = mx + b", hint: "Look for y isolated on one side.", sourceAnchor: "Algebra class notes" },
  { question: "What is the slope through the points (2, 3) and (6, 11)?", choices: ["1/2", "2", "4", "8"], answer: "2", hint: "Use change in y divided by change in x.", sourceAnchor: "Algebra class notes" },
  { question: "What is the y-intercept of y = -2x + 5?", choices: ["-2", "2", "5", "-5"], answer: "5", hint: "The y-intercept is the constant term in y = mx + b.", sourceAnchor: "Algebra class notes" },
];

function assertNoError(error: { message: string } | null, action: string) {
  if (error) throw new Error(`${action}: ${error.message}`);
}

function dueAt(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(15, 30, 0, 0);
  return date.toISOString();
}

async function findGrayson(admin: AdminClient) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    assertNoError(error, "List QA users");
    const user = data.users.find((item) => item.email?.toLowerCase() === GRAYSON_EMAIL.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) break;
  }
  throw new Error(`Grayson account ${GRAYSON_EMAIL} does not exist.`);
}

async function ensureClass(admin: AdminClient, ownerId: string, seed: ClassSeed) {
  const values: TablesInsert<"classes"> = {
    owner_id: ownerId,
    name: seed.name,
    teacher: seed.teacher,
    color: seed.color,
    notes: seed.notes,
    ai_mode: "green",
    archived_at: null,
  };
  const lookup = await admin.from("classes").select("id").eq("owner_id", ownerId).eq("name", seed.name).limit(1).maybeSingle();
  assertNoError(lookup.error, `Find ${seed.name}`);
  if (lookup.data) {
    const updated = await admin.from("classes").update(values).eq("id", lookup.data.id);
    assertNoError(updated.error, `Update ${seed.name}`);
    return lookup.data.id;
  }
  const created = await admin.from("classes").insert(values).select("id").single();
  assertNoError(created.error, `Create ${seed.name}`);
  if (!created.data) throw new Error(`Create ${seed.name}: no class returned.`);
  return created.data.id;
}

async function replaceProblems(admin: AdminClient, ownerId: string, assignmentId: string, problems: ProblemSeed[]) {
  const reset = await admin.from("assignment_problems").delete().eq("owner_id", ownerId).eq("assignment_id", assignmentId);
  assertNoError(reset.error, "Reset assignment questions");
  if (problems.length === 0) return;
  const inserted = await admin.from("assignment_problems").insert(problems.map((problem) => ({
    owner_id: ownerId,
    assignment_id: assignmentId,
    problem_number: problem.number,
    problem_text: problem.text,
    source: "manual",
    student_work: {},
  })));
  assertNoError(inserted.error, "Create assignment questions");
}

async function ensureAssignment(admin: AdminClient, ownerId: string, classId: string, seed: AssignmentSeed) {
  const externalId = `${SEED_PREFIX}:${seed.slug}`;
  const values: TablesInsert<"assignments"> = {
    owner_id: ownerId,
    class_id: classId,
    title: seed.title,
    description: seed.description,
    kind: seed.kind,
    status: "todo",
    due_at: dueAt(seed.dueInDays),
    estimated_minutes: seed.estimatedMinutes,
    difficulty: seed.difficulty,
    reading_load: seed.readingLoad,
    writing_load: seed.writingLoad,
    rubric_text: seed.rubricText,
    external_source: SEED_SOURCE,
    external_id: externalId,
    last_synced_at: new Date().toISOString(),
    source_import_status: "not_started",
    submission_sync_status: "not_started",
    assignment_profile: seed.assignmentProfile,
    assignment_profile_version: 1,
    work_profile: seed.workProfile,
    work_profile_source: "persisted",
  };
  const lookup = await admin.from("assignments").select("id").eq("owner_id", ownerId).eq("external_source", SEED_SOURCE).eq("external_id", externalId).maybeSingle();
  assertNoError(lookup.error, `Find ${seed.title}`);
  let assignmentId = lookup.data?.id;
  if (assignmentId) {
    const updated = await admin.from("assignments").update(values).eq("id", assignmentId);
    assertNoError(updated.error, `Update ${seed.title}`);
  } else {
    const created = await admin.from("assignments").insert(values).select("id").single();
    assertNoError(created.error, `Create ${seed.title}`);
    assignmentId = created.data?.id;
  }
  if (!assignmentId) throw new Error(`${seed.title}: no assignment returned.`);
  await replaceProblems(admin, ownerId, assignmentId, seed.problems ?? []);
  return assignmentId;
}

async function ensureAlgebraQuiz(admin: AdminClient, ownerId: string, classId: string, assignmentId: string) {
  const base = buildFallbackStudyArtifact({
    type: "practice_test",
    sourceTitle: "Linear Equations: Three Questions",
    sourceType: "assignment",
    mode: "retrieval_quiz",
    sourceText: algebraQuiz.map((item) => `${item.question} ${item.answer}`).join(" "),
  });
  const artifact = {
    ...base,
    title: "Algebra Practice Quiz",
    summary: "Five auto-checked Algebra questions covering equations, slope, and intercepts.",
    quiz: algebraQuiz,
    practiceSettings: { questionCount: algebraQuiz.length, difficulty: "standard" as const, questionTypes: ["multiple_choice" as const] },
    reviewLoop: buildArtifactReviewLoop({
      type: "practice_test",
      sourceTitle: "Linear Equations: Three Questions",
      sourceAnchors: algebraQuiz.map((item) => item.sourceAnchor),
      cardsCreated: 0,
      quizCreated: algebraQuiz.length,
    }),
  };
  const values: TablesInsert<"study_artifacts"> = {
    owner_id: ownerId,
    class_id: classId,
    source_type: "assignment",
    source_id: assignmentId,
    artifact_type: "practice_test",
    study_mode: "retrieval_quiz",
    title: artifact.title,
    payload: artifact as unknown as Json,
    ai_policy: "green",
    source_anchor_count: algebraQuiz.length,
    artifact_edit_state: artifact.editState as unknown as Json,
    practice_settings: artifact.practiceSettings as unknown as Json,
    authorship_receipt: artifact.authorshipReceiptDetail as unknown as Json,
  };
  const lookup = await admin.from("study_artifacts").select("id").eq("owner_id", ownerId).eq("source_type", "assignment").eq("source_id", assignmentId).eq("artifact_type", "practice_test").eq("title", artifact.title).limit(1).maybeSingle();
  assertNoError(lookup.error, "Find Algebra practice quiz");
  if (lookup.data) {
    const updated = await admin.from("study_artifacts").update(values).eq("id", lookup.data.id);
    assertNoError(updated.error, "Update Algebra practice quiz");
    return lookup.data.id;
  }
  const created = await admin.from("study_artifacts").insert(values).select("id").single();
  assertNoError(created.error, "Create Algebra practice quiz");
  if (!created.data) throw new Error("Create Algebra practice quiz: no artifact returned.");
  return created.data.id;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase URL and service role key are required.");
  const admin = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const grayson = await findGrayson(admin);
  const records: Array<{ className: string; classId: string; assignmentId: string }> = [];
  for (const seed of classSeeds) {
    const classId = await ensureClass(admin, grayson.id, seed);
    for (const assignment of [seed.assignment, ...(seed.extraAssignments ?? [])]) {
      const assignmentId = await ensureAssignment(admin, grayson.id, classId, assignment);
      records.push({ className: seed.name, classId, assignmentId });
    }
  }
  const algebra = records.find((record) => record.className === "Algebra");
  if (!algebra) throw new Error("Algebra records were not created.");
  const quizId = await ensureAlgebraQuiz(admin, grayson.id, algebra.classId, algebra.assignmentId);
  console.log(JSON.stringify({ email: GRAYSON_EMAIL, classes: classSeeds.map((seed) => seed.name), assignments: classSeeds.flatMap((seed) => [seed.assignment, ...(seed.extraAssignments ?? [])].map((assignment) => assignment.title)), quizId }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

