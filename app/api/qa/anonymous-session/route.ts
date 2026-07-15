import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { seedGraysonFreshmanDemo } from "@/lib/qa/grayson-demo";

export const dynamic = "force-dynamic";

const timezone = "America/Los_Angeles";
const qaUser = {
  email: process.env.QA_TEST_EMAIL ?? "diana-qa-student@local.test",
  password: process.env.QA_TEST_PASSWORD ?? "Diana-QA-Visual-Gate-2026!",
  displayName: "Diana QA Student",
  demo: null as "grayson" | null,
};

function resolveQaUser(request: Request) {
  const params = new URL(request.url).searchParams;
  const variant = params.get("variant");
  const profile = params.get("profile");
  if (variant === "grayson" || profile === "grayson") {
    return {
      ...qaUser,
      email: process.env.QA_GRAYSON_TEST_EMAIL ?? "grayson-qa-student@local.test",
      displayName: "Grayson",
      demo: "grayson" as const,
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
      user_metadata: {
        display_name: activeQaUser.displayName,
        date_of_birth: "2009-09-01",
        timezone,
      },
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
      user_metadata: {
        display_name: activeQaUser.displayName,
        date_of_birth: "2009-09-01",
        timezone,
      },
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

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        display_name: activeQaUser.displayName,
        date_of_birth: "2009-09-01",
        age_bracket: "13_to_17",
        timezone,
        onboarded_at: new Date().toISOString(),
        consent_ai: true,
      },
      { onConflict: "user_id" },
    );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const seeded =
    activeQaUser.demo === "grayson"
      ? await seedGraysonFreshmanDemo(admin, userId)
      : null;

  return NextResponse.json({ ok: true, profile: activeQaUser.demo, seeded });
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
