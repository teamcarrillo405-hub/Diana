import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  resetScreenDesignOwner,
  seedGraysonFreshmanDemo,
  seedScreenDesignScenario,
} from "@/lib/qa/grayson-demo";
import {
  getScreenDesignFixtureScenario,
  type ScreenDesignOwnerAlias,
} from "@/lib/qa/screendesign-fixtures";
import type { AppProfileInsert } from "@/lib/profile";
import type { TablesInsert } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const timezone = "America/Los_Angeles";
type QaOperation = "seed" | "reset" | "resume";

const qaUser = {
  email: process.env.QA_TEST_EMAIL ?? "diana-qa-student@local.test",
  password: process.env.QA_TEST_PASSWORD ?? "Diana-QA-Visual-Gate-2026!",
  displayName: "Diana QA Student",
  demo: null as "grayson" | null,
  scenarioId: null as string | null,
  ownerAlias: "qa-primary" as ScreenDesignOwnerAlias,
  operation: "seed" as QaOperation,
};

function qaSignupMetadata(activeQaUser: Pick<typeof qaUser, "displayName">) {
  return {
    display_name: activeQaUser.displayName,
    date_of_birth: "2009-09-01",
    timezone,
    // The local QA user goes through the same teen-access gate as a real signup.
    teen_guardian_permission_attested: true,
    teen_guardian_permission_policy_version: "teen_openai_beta_v1",
    teen_guardian_permission_source: "signup_attestation",
  };
}

function resolveQaUser(request: Request) {
  const params = new URL(request.url).searchParams;
  const scenarioId = params.get("scenario");
  if (scenarioId) {
    const scenario = getScreenDesignFixtureScenario(scenarioId);
    if (!scenario) return null;
    const ownerAlias =
      params.get("owner") === "secondary"
        ? "qa-secondary"
        : scenario.ownerAlias;
    const account =
      ownerAlias === "qa-secondary"
        ? {
            email:
              process.env.QA_SCREEN_DESIGN_SECONDARY_EMAIL ??
              "diana-screendesign-secondary@local.test",
            displayName: "Diana QA Student Two",
          }
        : ownerAlias === "qa-public-owner"
          ? {
              email:
                process.env.QA_SCREEN_DESIGN_PUBLIC_EMAIL ??
                "diana-screendesign-share-owner@local.test",
              displayName: "Grayson",
            }
          : {
              email:
                process.env.QA_TEST_EMAIL ??
                process.env.QA_SCREEN_DESIGN_PRIMARY_EMAIL ??
                process.env.QA_GRAYSON_TEST_EMAIL ??
                "grayson-qa-student@local.test",
              displayName: process.env.QA_TEST_EMAIL ? "Diana Beta Student" : "Grayson",
            };

    const requestedOperation = params.get("operation");
    const operation: QaOperation = requestedOperation === "reset"
      ? "reset"
      : requestedOperation === "resume"
        ? "resume"
        : "seed";

    return {
      ...qaUser,
      ...account,
      scenarioId: scenario.id,
      ownerAlias,
      operation,
    };
  }

  const variant = params.get("variant");
  const profile = params.get("profile");
  if (variant === "grayson" || profile === "grayson") {
    return {
      ...qaUser,
      email: process.env.QA_GRAYSON_TEST_EMAIL ?? "grayson-qa-student@local.test",
      displayName: "Grayson",
      demo: "grayson" as const,
      scenarioId: null,
      ownerAlias: "qa-primary" as const,
    };
  }

  if (variant !== "onboarding") return qaUser;

  return {
    ...qaUser,
    email: process.env.QA_ONBOARDING_TEST_EMAIL ?? "diana-qa-onboarding@local.test",
    displayName: "Diana QA Onboarding",
    demo: null,
  };
}

async function findQaUser(email: string) {
  const admin = createServiceClient();
  if (!admin) return null;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { admin, error };

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return { admin, user };
    if (data.users.length < 1000) break;
  }

  return { admin };
}

async function handleQaSession(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.QA_CREATE_USER !== "true") {
    return NextResponse.json({ error: "QA auth bootstrap is disabled." }, { status: 404 });
  }

  const activeQaUser = resolveQaUser(request);
  if (!activeQaUser) {
    return NextResponse.json(
      { error: "Unknown ScreenDesign QA fixture scenario." },
      { status: 400 },
    );
  }
  const supabase = await createClient();
  const found = await findQaUser(activeQaUser.email);
  if (!found?.admin || found.error) {
    return NextResponse.json(
      { error: found?.error?.message ?? "QA service client is unavailable." },
      { status: 503 },
    );
  }

  const admin = found.admin;
  let userId: string;

  if (found.user) {
    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(found.user.id, {
      password: activeQaUser.password,
      email_confirm: true,
      user_metadata: qaSignupMetadata(activeQaUser),
    });
    if (updateError || !updated.user) {
      return NextResponse.json({ error: updateError?.message ?? "QA user update could not finish." }, { status: 500 });
    }
    userId = updated.user.id;
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: activeQaUser.email,
      password: activeQaUser.password,
      email_confirm: true,
      user_metadata: qaSignupMetadata(activeQaUser),
    });
    if (createError || !created.user) {
      return NextResponse.json({ error: createError?.message ?? "QA user creation could not finish." }, { status: 500 });
    }
    userId = created.user.id;
  }

  const { error: signinError } = await supabase.auth.signInWithPassword({
    email: activeQaUser.email,
    password: activeQaUser.password,
  });
  if (signinError) return NextResponse.json({ error: signinError.message }, { status: 403 });

  const qaProfile: AppProfileInsert = {
    user_id: userId,
    display_name: activeQaUser.displayName,
    date_of_birth: "2009-09-01",
    age_bracket: "13_to_17",
    timezone,
    onboarded_at: new Date().toISOString(),
    consent_ai: true,
    teen_guardian_permission_attested_at: new Date().toISOString(),
    teen_guardian_permission_policy_version: "teen_openai_beta_v1",
    teen_guardian_permission_source: "synthetic_qa_fixture",
    teen_guardian_permission_withdrawn_at: null,
  };
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      qaProfile as TablesInsert<"profiles">,
      { onConflict: "user_id" },
    );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (activeQaUser.scenarioId && activeQaUser.operation === "reset") {
    await resetScreenDesignOwner(admin, userId, activeQaUser.ownerAlias);
    return NextResponse.json({
      ok: true,
      reset: true,
      ownerAlias: activeQaUser.ownerAlias,
      scenarioId: activeQaUser.scenarioId,
    });
  }

  // A recovery check must authenticate the same synthetic student without
  // rebuilding its assignment and changing the local draft's problem IDs.
  if (activeQaUser.scenarioId && activeQaUser.operation === "resume") {
    return NextResponse.json({
      ok: true,
      resumed: true,
      ownerAlias: activeQaUser.ownerAlias,
      scenarioId: activeQaUser.scenarioId,
    });
  }

  const seeded = activeQaUser.scenarioId
    ? await seedScreenDesignScenario(
        admin,
        userId,
        activeQaUser.ownerAlias,
        activeQaUser.scenarioId,
      )
    : activeQaUser.demo === "grayson"
      ? await seedGraysonFreshmanDemo(admin, userId)
      : null;

  return NextResponse.json({
    ok: true,
    profile: activeQaUser.demo,
    ownerAlias: activeQaUser.scenarioId ? activeQaUser.ownerAlias : undefined,
    scenarioId: activeQaUser.scenarioId ?? undefined,
    seeded,
  });
}

export async function GET(request: Request) {
  try {
    return await handleQaSession(request);
  } catch (error) {
    return NextResponse.json(
      {
        error: "QA auth bootstrap could not finish.",
        detail: error instanceof Error ? error.message : "Unknown local QA error.",
      },
      { status: 500 },
    );
  }
}
