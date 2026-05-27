import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

type ConfirmBody = {
  inboxItemId?: string
  classId?: string | null
  title?: string
  assignmentType?: string
  dueDate?: string | null
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ConfirmBody | null
  if (!body?.inboxItemId || !body.title) {
    return NextResponse.json(
      { error: "inboxItemId and title are required." },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const dueAt = body.dueDate ? new Date(body.dueDate).toISOString() : null

  const { data: assignment, error: insertError } = await supabase
    .from("assignments")
    .insert({
      owner_id: user.id,
      class_id: body.classId ?? null,
      title: body.title,
      assignment_type: body.assignmentType ?? "other",
      due_at: dueAt,
      state: "captured",
      status: "captured",
    })
    .select("id")
    .single()

  if (insertError || !assignment) {
    return NextResponse.json(
      { error: "Couldn't save the assignment." },
      { status: 500 }
    )
  }

  const { error: updateError } = await supabase
    .from("inbox_items")
    .update({ classified_at: new Date().toISOString() })
    .eq("id", body.inboxItemId)
    .eq("user_id", user.id)

  if (updateError) {
    return NextResponse.json(
      { error: "Saved the assignment but couldn't update the inbox item." },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, assignmentId: assignment.id })
}
