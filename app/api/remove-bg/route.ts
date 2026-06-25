import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "REMOVEBG_API_KEY not configured" }, { status: 503 });
  }

  const form = await req.formData();
  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const blob = await res.blob();
  return new Response(blob, {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}
