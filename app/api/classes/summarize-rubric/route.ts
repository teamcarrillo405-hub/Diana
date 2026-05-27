import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const EDGE_FUNCTION_URL =
  "https://oitipayrriupcitgmzju.supabase.co/functions/v1/ai-summarize-rubric"

type RubricSummary = {
  assignment_types: string[]
  citation_style: string | null
  show_work_required: boolean
  mechanics_weight: string | null
  ai_policy_hint: string | null
  key_rules: string[]
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const classId = typeof body?.classId === "string" ? body.classId : ""
  if (!classId) {
    return NextResponse.json({ error: "classId is required." }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const { data: cls, error: clsError } = await supabase
    .from("classes")
    .select("name")
    .eq("id", classId)
    .eq("owner_id", user.id)
    .single()

  if (clsError || !cls) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 })
  }

  const { data: doc } = await supabase
    .from("class_documents")
    .select("extracted_text, class_id")
    .eq("class_id", classId)
    .limit(1)
    .maybeSingle()

  const text = doc?.extracted_text?.trim() ?? ""
  if (!text) {
    return NextResponse.json({ ok: false, reason: "no_text" })
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anonKey) {
    return NextResponse.json(
      { error: "Supabase key is not configured." },
      { status: 500 }
    )
  }

  let summary: RubricSummary
  try {
    const aiResponse = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, class_name: cls.name }),
    })

    if (!aiResponse.ok) {
      const detail = await aiResponse.text().catch(() => "")
      return NextResponse.json(
        { error: "AI summarization failed.", detail },
        { status: 502 }
      )
    }

    summary = (await aiResponse.json()) as RubricSummary
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the summarizer." },
      { status: 502 }
    )
  }

  const { error: updateError } = await supabase
    .from("classes")
    .update({ rubric_summary: summary })
    .eq("id", classId)
    .eq("owner_id", user.id)

  if (updateError) {
    return NextResponse.json(
      { error: "Couldn't save the summary." },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, summary })
}
