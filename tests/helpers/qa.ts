import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

type QaSessionOptions = {
  scenario?: string;
  variant?: "grayson" | "onboarding";
  owner?: "secondary";
  operation?: "reset";
};

const QA_STUDENT_EMAIL = "diana-qa-student@local.test";
const QA_AUTHORITY_EMAIL = "diana-qa-onboarding@local.test";

const RELEASE_FIXTURE = {
  organizationId: "15151515-1515-4515-8515-151515151515",
  membershipId: "25252525-2525-4525-8525-252525252525",
  courseId: "35353535-3535-4535-8535-353535353535",
  enrollmentId: "45454545-4545-4545-8545-454545454545",
  unitId: "55555555-5555-4555-8555-555555555555",
  lessonId: "65656565-6565-4565-8565-656565656565",
  assessmentId: "75757575-7575-4575-8575-757575757575",
  itemId: "85858585-8585-4585-8585-858585858585",
} as const;

export async function openQaSession(
  page: Page,
  options: QaSessionOptions = {},
) {
  const params = new URLSearchParams();
  if (options.scenario) params.set("scenario", options.scenario);
  if (options.variant) params.set("variant", options.variant);
  if (options.owner) params.set("owner", options.owner);
  if (options.operation) params.set("operation", options.operation);
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const response = await page.goto(`/api/qa/anonymous-session${query}`, {
    waitUntil: "networkidle",
  });
  const body = await response?.text();

  expect(
    response?.ok(),
    `QA session bootstrap returned ${response?.status() ?? "no response"}: ${body ?? ""}`,
  ).toBe(true);

  return body ? (JSON.parse(body) as Record<string, unknown>) : {};
}

export type FormalAssessmentFixture = {
  assessmentId: string;
  release(): Promise<void>;
  cleanup(): Promise<void>;
};

export async function seedFormalAssessmentReleaseGate(
  page: Page,
): Promise<FormalAssessmentFixture> {
  await openQaSession(page, { variant: "onboarding" });
  await openQaSession(page);
  const admin = qaAdminClient();
  const student = await findUser(admin, QA_STUDENT_EMAIL);
  if (!student) {
    throw new Error(`QA bootstrap did not provision ${QA_STUDENT_EMAIL}.`);
  }
  const teacher = await findUser(admin, QA_AUTHORITY_EMAIL);
  if (!teacher) {
    throw new Error(`QA bootstrap did not provision ${QA_AUTHORITY_EMAIL}.`);
  }
  const now = new Date().toISOString();

  await insertIfMissing(admin, "school_organizations", RELEASE_FIXTURE.organizationId, {
    id: RELEASE_FIXTURE.organizationId,
    name: "Diana QA Release Gate School",
    organization_type: "school",
    jurisdiction_code: "QA",
    status: "active",
  });

  await insertIfMissing(admin, "course_mode_courses", RELEASE_FIXTURE.courseId, {
    id: RELEASE_FIXTURE.courseId,
    organization_id: RELEASE_FIXTURE.organizationId,
    title: "QA Release Gate Algebra",
    subject_domain: "mathematics",
    grade_band: "9-10",
    course_level: "standard",
    status: "published",
    version: 1,
    created_by: teacher.id,
    published_at: now,
    published_by: teacher.id,
  });

  await upsertOrThrow(
    admin,
    "organization_memberships",
    {
      id: RELEASE_FIXTURE.membershipId,
      organization_id: RELEASE_FIXTURE.organizationId,
      user_id: student.id,
      role: "student",
      verification_status: "verified",
      verified_at: now,
      verified_by: teacher.id,
    },
    "organization_id,user_id",
  );
  await upsertOrThrow(
    admin,
    "course_mode_enrollments",
    {
      id: RELEASE_FIXTURE.enrollmentId,
      course_id: RELEASE_FIXTURE.courseId,
      membership_id: RELEASE_FIXTURE.membershipId,
      enrollment_role: "student",
      status: "active",
    },
    "course_id,membership_id",
  );

  await insertIfMissing(admin, "course_mode_units", RELEASE_FIXTURE.unitId, {
    id: RELEASE_FIXTURE.unitId,
    course_id: RELEASE_FIXTURE.courseId,
    title: "Linear relationships",
    summary: "QA prerequisite unit",
    position: 0,
    status: "published",
    version: 1,
    created_by: teacher.id,
    published_at: now,
    published_by: teacher.id,
  });
  await insertIfMissing(admin, "course_mode_lessons", RELEASE_FIXTURE.lessonId, {
    id: RELEASE_FIXTURE.lessonId,
    unit_id: RELEASE_FIXTURE.unitId,
    title: "Slope from a table",
    summary: "Required before the formal assessment opens.",
    estimated_minutes: 15,
    position: 0,
    status: "published",
    version: 1,
    created_by: teacher.id,
    published_at: now,
    published_by: teacher.id,
  });
  await insertIfMissing(admin, "assessment_blueprints", RELEASE_FIXTURE.assessmentId, {
    id: RELEASE_FIXTURE.assessmentId,
    course_id: RELEASE_FIXTURE.courseId,
    title: "Linear relationships check",
    purpose: "summative",
    instructions: "Complete the prerequisite lesson before starting.",
    max_attempts: 1,
    release_conditions: {
      prerequisiteLessonIds: [RELEASE_FIXTURE.lessonId],
    },
    status: "published",
    version: 1,
    created_by: teacher.id,
    published_at: now,
    published_by: teacher.id,
    time_limit_minutes: 20,
    allow_resume: true,
    feedback_release: "after_confirmation",
  });
  await insertIfMissing(admin, "assessment_items", RELEASE_FIXTURE.itemId, {
    id: RELEASE_FIXTURE.itemId,
    blueprint_id: RELEASE_FIXTURE.assessmentId,
    identifier: "release_gate_q1",
    title: "Identify the slope",
    interaction_type: "choice",
    prompt: "Which value is the slope when y increases by 6 as x increases by 2?",
    body: {
      choices: [
        { identifier: "A", label: "2" },
        { identifier: "B", label: "3" },
      ],
    },
    response_declaration: { correctResponse: ["B"] },
    points_possible: 1,
    position: 0,
  });

  const cleanup = async () => {
    await deleteOrThrow(admin, "assessment_attempts", "blueprint_id", RELEASE_FIXTURE.assessmentId);
    await deleteOrThrow(admin, "course_mode_lesson_progress", "lesson_id", RELEASE_FIXTURE.lessonId);
  };
  await cleanup();

  return {
    assessmentId: RELEASE_FIXTURE.assessmentId,
    async release() {
      await upsertOrThrow(
        admin,
        "course_mode_lesson_progress",
        {
          lesson_id: RELEASE_FIXTURE.lessonId,
          student_id: student.id,
          status: "completed",
          evidence: { source: "playwright-release-gate" },
          started_at: now,
          completed_at: now,
        },
        "lesson_id,student_id",
      );
    },
    cleanup,
  };
}

let adminClient: SupabaseClient | null = null;

function qaAdminClient() {
  if (adminClient) return adminClient;
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Formal assessment browser QA requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

async function findUser(admin: SupabaseClient, email: string): Promise<User | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1_000 });
    if (error) throw new Error(`Could not inspect QA users: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1_000) return null;
  }
  return null;
}

async function insertIfMissing(
  admin: SupabaseClient,
  table: string,
  id: string,
  values: Record<string, unknown>,
) {
  const { data, error } = await admin.from(table).select("id").eq("id", id).maybeSingle();
  if (error) throw new Error(`Formal assessment fixture cannot read ${table}: ${error.message}`);
  if (data) return;
  const { error: insertError } = await admin.from(table).insert(values);
  if (insertError) throw new Error(`Formal assessment fixture cannot seed ${table}: ${insertError.message}`);
}

async function upsertOrThrow(
  admin: SupabaseClient,
  table: string,
  values: Record<string, unknown>,
  onConflict: string,
) {
  const { error } = await admin.from(table).upsert(values, { onConflict });
  if (error) throw new Error(`Formal assessment fixture cannot seed ${table}: ${error.message}`);
}

async function deleteOrThrow(
  admin: SupabaseClient,
  table: string,
  column: string,
  value: string,
) {
  const { error } = await admin.from(table).delete().eq(column, value);
  if (error) throw new Error(`Formal assessment fixture cannot reset ${table}: ${error.message}`);
}
