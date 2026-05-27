import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default async function ReadingHubPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, color")
    .eq("id", classId)
    .eq("owner_id", user.id)
    .single()

  if (!cls) notFound()

  const { data: readings } = await supabase
    .from("readings")
    .select("id, title, created_at")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full mt-0.5" style={{ backgroundColor: cls.color }} />
          <div>
            <h1 className="text-xl font-bold text-stone-900">Readings</h1>
            <p className="text-sm text-stone-400">{cls.name}</p>
          </div>
        </div>
        <Link
          href={`/classes/${classId}/read/new`}
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          Add reading
        </Link>
      </div>

      {readings && readings.length > 0 ? (
        <ul className="space-y-2">
          {readings.map((r) => (
            <li key={r.id}>
              <Link
                href={`/classes/${classId}/read/${r.id}/prep`}
                className="block rounded-lg border border-stone-200 px-4 py-3 hover:border-stone-300 hover:bg-stone-50 transition-colors"
              >
                <p className="text-sm font-medium text-stone-900">{r.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-500 italic">
          No readings yet — add one to get started.
        </p>
      )}
    </div>
  )
}
