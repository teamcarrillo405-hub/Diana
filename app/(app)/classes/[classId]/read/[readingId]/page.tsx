import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ReaderView } from "@/components/reading/reader-view"

type ComprehensionQuestion = { q: string; type: string }

export default async function ReadingPage({
  params,
}: {
  params: Promise<{ classId: string; readingId: string }>
}) {
  const { classId, readingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: reading } = await supabase
    .from("readings")
    .select("id, title, full_text, comprehension_questions, user_id")
    .eq("id", readingId)
    .eq("user_id", user.id)
    .single()

  if (!reading) notFound()

  const { data: session } = await supabase
    .from("reading_sessions")
    .insert({ reading_id: readingId, user_id: user.id })
    .select("id")
    .single()

  if (!session) notFound()

  const questions =
    (reading.comprehension_questions as ComprehensionQuestion[] | null) ?? null

  return (
    <ReaderView
      reading={{
        id: reading.id,
        title: reading.title,
        full_text: reading.full_text,
        comprehension_questions: questions,
      }}
      sessionId={session.id}
      classId={classId}
    />
  )
}
