import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type ComprehensionCheck = {
  question: string
  answer: string
  correct: boolean
  feedback: string
  at: string
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const question = typeof body?.question === "string" ? body.question : ""
  const answer = typeof body?.answer === "string" ? body.answer : ""
  const readingId = typeof body?.readingId === "string" ? body.readingId : ""
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : ""

  if (!question || !answer || !readingId || !sessionId) {
    return NextResponse.json(
      { error: "question, answer, readingId, and sessionId are required." },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const { data: reading, error: readingError } = await supabase
    .from("readings")
    .select("user_id, full_text")
    .eq("id", readingId)
    .single()

  if (readingError || !reading) {
    return NextResponse.json({ error: "Reading not found." }, { status: 404 })
  }

  if (reading.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anonKey) {
    return NextResponse.json(
      { error: "Supabase key is not configured." },
      { status: 500 }
    )
  }

  const aiResponse = await fetch(
    "https://oitipayrriupcitgmzju.supabase.co/functions/v1/ai-comprehension",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "validate",
        question,
        answer,
        context: reading.full_text.slice(0, 2000),
      }),
    }
  )

  if (!aiResponse.ok) {
    return NextResponse.json(
      { error: "Diana couldn't check that answer right now." },
      { status: 502 }
    )
  }

  const aiData = (await aiResponse.json()) as { correct?: boolean; feedback?: string }
  const correct = Boolean(aiData.correct)
  const feedback = typeof aiData.feedback === "string" ? aiData.feedback : ""

  const { data: existingSession } = await supabase
    .from("reading_sessions")
    .select("comprehension_checks")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single()

  const existingChecks =
    (existingSession?.comprehension_checks as ComprehensionCheck[] | null) ?? []

  const nextChecks: ComprehensionCheck[] = [
    ...existingChecks,
    {
      question,
      answer,
      correct,
      feedback,
      at: new Date().toISOString(),
    },
  ]

  await supabase
    .from("reading_sessions")
    .update({ comprehension_checks: nextChecks })
    .eq("id", sessionId)
    .eq("user_id", user.id)

  return NextResponse.json({ correct, feedback })
}
