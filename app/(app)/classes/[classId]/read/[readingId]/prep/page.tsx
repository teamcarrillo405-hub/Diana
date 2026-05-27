import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { VocabPreview } from "@/components/reading/vocab-preview"

type VocabWord = { word: string; definition: string }

export default async function ReadingPrepPage({
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
    .select("id, user_id, title, vocab_preview")
    .eq("id", readingId)
    .single()

  if (!reading || reading.user_id !== user.id) notFound()

  const initialWords =
    (reading.vocab_preview as { words?: VocabWord[] } | null)?.words ?? null

  return (
    <VocabPreview
      readingId={reading.id}
      readingTitle={reading.title}
      classId={classId}
      initialWords={initialWords}
    />
  )
}
