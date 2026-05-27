import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const EDGE_FUNCTION_URL =
  "https://oitipayrriupcitgmzju.supabase.co/functions/v1/ai-classify-inbox"

type ClassifyResult = {
  classId: string | null
  title: string
  assignmentType: string
  dueDate: string | null
  confidence: number
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const text = typeof body?.text === "string" ? body.text.trim() : ""
  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, subject_category")
    .eq("owner_id", user.id)

  if (classesError) {
    return NextResponse.json(
      { error: "Couldn't load your classes." },
      { status: 500 }
    )
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anonKey) {
    return NextResponse.json(
      { error: "Supabase key is not configured." },
      { status: 500 }
    )
  }

  let classification: ClassifyResult
  try {
    const aiResponse = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, classes: classes ?? [] }),
    })

    if (!aiResponse.ok) {
      const detail = await aiResponse.text().catch(() => "")
      return NextResponse.json(
        { error: "AI classification failed.", detail },
        { status: 502 }
      )
    }

    classification = (await aiResponse.json()) as ClassifyResult
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the classifier." },
      { status: 502 }
    )
  }

  const classifiedAt = new Date().toISOString()
  const { data: inboxItem, error: insertError } = await supabase
    .from("inbox_items")
    .insert({
      user_id: user.id,
      source: "text",
      raw_content: text,
      ai_suggested_class_id: classification.classId,
      ai_suggested_type: classification.assignmentType,
      ai_suggested_due_date: classification.dueDate,
      ai_confidence: classification.confidence,
      classified_at: classifiedAt,
    })
    .select("id")
    .single()

  if (insertError || !inboxItem) {
    return NextResponse.json(
      { error: "Couldn't save the capture." },
      { status: 500 }
    )
  }

  const matchedClass = classification.classId
    ? classes?.find((c) => c.id === classification.classId) ?? null
    : null

  return NextResponse.json({
    inboxItemId: inboxItem.id,
    classId: classification.classId,
    className: matchedClass?.name ?? null,
    title: classification.title,
    assignmentType: classification.assignmentType,
    dueDate: classification.dueDate,
    confidence: classification.confidence,
    rawText: text,
  })
}
