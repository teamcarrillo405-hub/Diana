import { NextResponse } from "next/server";
import { completeScreenDesignOnboarding } from "@/app/onboarding/actions";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    { error: "QA onboarding persistence is unavailable." },
    { status: 404 },
  );
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.QA_CREATE_USER !== "true") {
    return unavailable();
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { error: "QA onboarding input must be JSON." },
      { status: 400 },
    );
  }

  const result = await completeScreenDesignOnboarding(input);
  return NextResponse.json(result);
}
