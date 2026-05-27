import { createClient } from "@/lib/supabase/server"
import { CaptureForm } from "@/components/inbox/capture-form"

type InboxRow = {
  id: string
  raw_content: string
  ai_suggested_type: string | null
  ai_suggested_due_date: string | null
  ai_confidence: number | null
  classified_at: string | null
  created_at: string
  classes: { name: string; color: string | null } | null
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default async function InboxPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: items } = await supabase
    .from("inbox_items")
    .select(
      "id, raw_content, ai_suggested_type, ai_suggested_due_date, ai_confidence, classified_at, created_at, classes:ai_suggested_class_id(name, color)"
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(20)

  const rows = (items ?? []) as unknown as InboxRow[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Inbox</h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Capture anything. Diana will figure out the class, type, and due date.
        </p>
      </div>

      <CaptureForm />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-700">Recent captures</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-stone-400 border border-dashed border-stone-200 rounded-xl p-6 text-center">
            Nothing captured yet. Try something like &ldquo;Spanish quiz tomorrow.&rdquo;
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((item) => {
              const confidence =
                typeof item.ai_confidence === "number"
                  ? `${Math.round(item.ai_confidence * 100)}%`
                  : null
              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-3 space-y-1"
                >
                  <p className="text-sm text-stone-800">{item.raw_content}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            item.classes?.color ??
                            (item.classes ? "#3B82F6" : "#D6D3D1"),
                        }}
                      />
                      {item.classes?.name ?? "Unclassified"}
                    </span>
                    {item.ai_suggested_type && (
                      <span className="text-stone-400">
                        · {item.ai_suggested_type}
                      </span>
                    )}
                    {item.ai_suggested_due_date && (
                      <span className="text-stone-400">
                        · due{" "}
                        {new Date(
                          item.ai_suggested_due_date
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    {confidence && (
                      <span className="text-stone-400">· {confidence}</span>
                    )}
                    <span className="text-stone-300 ml-auto">
                      {formatTimestamp(item.created_at)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
