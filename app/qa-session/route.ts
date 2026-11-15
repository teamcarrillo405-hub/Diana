import { NextResponse } from "next/server";

import { safeQaRedirect } from "./safe-redirect";
import { createClient } from "@/lib/supabase/server";

const QA_PASSWORD =
  process.env.QA_TEST_PASSWORD ?? "Diana-QA-Visual-Gate-2026!";

const QA_ACCOUNTS = {
  student: process.env.QA_TEST_EMAIL ?? "diana-qa-student@local.test",
  teacher: process.env.QA_GRAYSON_TEST_EMAIL ?? "grayson-qa-student@local.test",
} as const;

export async function GET(request: Request) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.QA_CREATE_USER !== "true"
  ) {
    return NextResponse.json(
      { error: "QA auth bootstrap is disabled." },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const account = url.searchParams.get("account") === "teacher"
    ? "teacher"
    : "student";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: QA_ACCOUNTS[account],
    password: QA_PASSWORD,
  });

  if (error) {
    return NextResponse.json(
      { error: "QA account sign-in could not finish." },
      { status: 403 },
    );
  }

  return NextResponse.redirect(
    new URL(safeQaRedirect(url.searchParams.get("next")), request.url),
  );
}
