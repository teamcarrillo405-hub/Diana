import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type VocabWord = { word: string; definition: string }
type VocabResult = { words: VocabWord[] }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const readingId = typeof body?.readingId === "string" ? body.readingId : ""
  if (!readingId) {
    return NextResponse.json({ error: "readingId is required." }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const { data: reading, error: readingError } = await supabase
    .from("readings")
    .select("id, user_id, full_text, vocab_preview")
    .eq("id", readingId)
    .single()

  if (readingError || !reading) {
    return NextResponse.json({ error: "Reading not found." }, { status: 404 })
  }

  if (reading.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  if (reading.vocab_preview) {
    const cached = reading.vocab_preview as VocabResult
    return NextResponse.json({ words: cached.words })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key is not configured." },
      { status: 500 }
    )
  }

  let parsed: VocabResult
  try {
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system:
          'Extract 8-12 key vocabulary words from the following text that a high school student might find challenging. Return valid JSON only: {"words":[{"word":string,"definition":string}]}',
        messages: [
          { role: "user", content: reading.full_text.slice(0, 1500) },
        ],
      }),
    })

    if (!aiResponse.ok) {
      const detail = await aiResponse.text().catch(() => "")
      return NextResponse.json(
        { error: "AI vocab generation failed.", detail },
        { status: 502 }
      )
    }

    const aiData = await aiResponse.json()
    const text: string = aiData?.content?.[0]?.text ?? ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Couldn't parse AI response." },
        { status: 502 }
      )
    }
    parsed = JSON.parse(jsonMatch[0]) as VocabResult
    if (!parsed?.words || !Array.isArray(parsed.words)) {
      return NextResponse.json(
        { error: "Invalid vocab response shape." },
        { status: 502 }
      )
    }
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the vocab generator." },
      { status: 502 }
    )
  }

  await supabase
    .from("readings")
    .update({ vocab_preview: parsed })
    .eq("id", readingId)

  return NextResponse.json({ words: parsed.words })
}
