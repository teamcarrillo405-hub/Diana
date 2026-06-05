import { NextResponse } from "next/server";
import { z } from "zod";
import { checkLanguageToolText } from "@/lib/language-tool/client";

const Input = z.object({
  text: z.string().trim().min(2).max(6000),
  language: z.string().trim().min(2).max(16).default("en-US"),
});

export async function POST(request: Request) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Add a draft sentence to check first." }, { status: 400 });
  }

  const baseUrl = process.env.LANGUAGETOOL_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "Writing mechanics check needs LANGUAGETOOL_URL to point at a local LanguageTool server." },
      { status: 503 },
    );
  }

  const result = await checkLanguageToolText({
    text: parsed.data.text,
    language: parsed.data.language,
    endpoint: `${baseUrl}/v2/check`,
  });
  const status = result.ok ? 200 : 503;
  return NextResponse.json(result, { status });
}
