import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext } from "@playwright/test";
import type { Database } from "@/lib/supabase/types";

const SCENARIO_ID = "onboarding-quiz-challenge:valid-selection";
const PRIMARY_EMAIL =
  process.env.QA_SCREEN_DESIGN_PRIMARY_EMAIL ??
  process.env.QA_GRAYSON_TEST_EMAIL ??
  "grayson-qa-student@local.test";
const SECONDARY_EMAIL =
  process.env.QA_SCREEN_DESIGN_SECONDARY_EMAIL ??
  "diana-screendesign-secondary@local.test";
const QA_PASSWORD =
  process.env.QA_TEST_PASSWORD ?? "Diana-QA-Visual-Gate-2026!";

const PROFILE_FIELDS = [
  "user_id",
  "diagnoses",
  "accommodations",
  "school_year",
  "class_count_hint",
  "interests",
  "extra_time_pct",
  "dyslexia_font",
  "reduced_motion",
  "high_contrast",
  "tts_enabled",
  "font_size",
  "line_spacing",
  "reading_font",
  "timezone",
  "consent_ai",
  "learning_hurdle",
  "study_schedule_preference",
  "onboarded_at",
] as const;

const LEGACY_FIELDS = PROFILE_FIELDS.filter(
  (field) =>
    field !== "learning_hurdle" &&
    field !== "study_schedule_preference" &&
    field !== "onboarded_at",
);

type ProfileSnapshot = Record<(typeof PROFILE_FIELDS)[number], unknown>;
type OwnerSession = Readonly<{
  client: SupabaseClient<Database>;
  userId: string;
}>;

function requireSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "ScreenDesign persistence QA requires the linked preview Supabase environment.",
    );
  }
  return { url, publishableKey };
}

async function bootstrapOwner(
  context: BrowserContext,
  owner: "primary" | "secondary",
) {
  const params = new URLSearchParams({ scenario: SCENARIO_ID });
  if (owner === "secondary") params.set("owner", "secondary");
  const response = await context.request.get(
    `/api/qa/anonymous-session?${params.toString()}`,
  );
  expect(response.ok(), await response.text()).toBe(true);
  expect(await response.json()).toMatchObject({
    ok: true,
    scenarioId: SCENARIO_ID,
    ownerAlias: owner === "secondary" ? "qa-secondary" : "qa-primary",
  });
}

async function createOwnerSession(email: string): Promise<OwnerSession> {
  const { url, publishableKey } = requireSupabaseEnvironment();
  const client = createClient<Database>(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: QA_PASSWORD,
  });
  expect(error).toBeNull();
  expect(data.user).not.toBeNull();
  return { client, userId: data.user!.id };
}

async function loadOwnProfile(owner: OwnerSession): Promise<ProfileSnapshot> {
  const { data, error } = await owner.client
    .from("profiles")
    .select(PROFILE_FIELDS.join(","))
    .eq("user_id", owner.userId)
    .single();
  expect(error).toBeNull();
  expect(data).not.toBeNull();
  return data as unknown as ProfileSnapshot;
}

function legacySnapshot(profile: ProfileSnapshot) {
  return Object.fromEntries(LEGACY_FIELDS.map((field) => [field, profile[field]]));
}

async function resetOwner(
  context: BrowserContext,
  owner: "primary" | "secondary",
) {
  const params = new URLSearchParams({
    scenario: SCENARIO_ID,
    operation: "reset",
  });
  if (owner === "secondary") params.set("owner", "secondary");
  await context.request.get(`/api/qa/anonymous-session?${params.toString()}`);
}

test("persists valid onboarding answers for only the authenticated owner", async ({
  browser,
}) => {
  const primaryContext = await browser.newContext();
  const secondaryContext = await browser.newContext();
  let primary: OwnerSession | null = null;
  let secondary: OwnerSession | null = null;

  try {
    await bootstrapOwner(primaryContext, "primary");
    await bootstrapOwner(secondaryContext, "secondary");
    primary = await createOwnerSession(PRIMARY_EMAIL);
    secondary = await createOwnerSession(SECONDARY_EMAIL);

    const primaryBefore = await loadOwnProfile(primary);
    const secondaryBefore = await loadOwnProfile(secondary);
    expect(primaryBefore.onboarded_at).toBeNull();
    expect(secondaryBefore.onboarded_at).toBeNull();

    const validResponse = await primaryContext.request.post(
      "/api/qa/onboarding-persistence",
      {
        data: {
          learningHurdle: "time_management",
          studySchedulePreference: "after_practice",
        },
      },
    );
    expect(validResponse.ok(), await validResponse.text()).toBe(true);
    expect(await validResponse.json()).toEqual({ ok: true });

    const primaryAfter = await loadOwnProfile(primary);
    expect(primaryAfter.learning_hurdle).toBe("time_management");
    expect(primaryAfter.study_schedule_preference).toBe("after_practice");
    expect(primaryAfter.onboarded_at).toEqual(expect.any(String));
    expect(legacySnapshot(primaryAfter)).toEqual(legacySnapshot(primaryBefore));

    const invalidResponse = await secondaryContext.request.post(
      "/api/qa/onboarding-persistence",
      {
        data: {
          learningHurdle: "getting_started",
          studySchedulePreference: "after_school",
        },
      },
    );
    expect(invalidResponse.ok(), await invalidResponse.text()).toBe(true);
    expect(await invalidResponse.json()).toMatchObject({
      ok: false,
      reason: "validation",
    });
    expect(await loadOwnProfile(secondary)).toEqual(secondaryBefore);

    const { data: crossOwnerRead, error: crossOwnerReadError } =
      await secondary.client
        .from("profiles")
        .select("user_id,learning_hurdle,study_schedule_preference")
        .eq("user_id", primary.userId);
    expect(crossOwnerReadError).toBeNull();
    expect(crossOwnerRead).toEqual([]);

    const { data: crossOwnerWrite, error: crossOwnerWriteError } =
      await secondary.client
        .from("profiles")
        .update({ learning_hurdle: "exam_stress" })
        .eq("user_id", primary.userId)
        .select("user_id");
    expect(crossOwnerWriteError).toBeNull();
    expect(crossOwnerWrite).toEqual([]);

    const primaryAfterCrossOwnerAttempt = await loadOwnProfile(primary);
    expect(primaryAfterCrossOwnerAttempt.learning_hurdle).toBe("time_management");
    expect(primaryAfterCrossOwnerAttempt.study_schedule_preference).toBe(
      "after_practice",
    );
  } finally {
    await Promise.allSettled([
      resetOwner(primaryContext, "primary"),
      resetOwner(secondaryContext, "secondary"),
      primary?.client.auth.signOut(),
      secondary?.client.auth.signOut(),
    ]);
    await primaryContext.close();
    await secondaryContext.close();
  }
});
