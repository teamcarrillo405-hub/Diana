import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface Assignment {
  id: string
  title: string
  due_at: string | null
  state: string
  estimated_minutes: number | null
  classes: { name: string; color: string } | null
}

function urgencyLabel(dueAt: string | null): { label: string; variant: "default" | "destructive" | "secondary" | "outline" } {
  if (!dueAt) return { label: "No due date", variant: "secondary" }
  const diff = new Date(dueAt).getTime() - Date.now()
  const hours = diff / 3_600_000
  if (hours < 0) return { label: "Overdue", variant: "destructive" }
  if (hours < 24) return { label: "Due today", variant: "default" }
  if (hours < 72) return { label: "Due soon", variant: "outline" }
  return { label: new Date(dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }), variant: "secondary" }
}

export function NextFiveMinutes({ assignments }: { assignments: Assignment[] }) {
  if (assignments.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Your next 5 minutes</h2>
        <p className="text-stone-400 text-sm">Nothing urgent. You&apos;re good.</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Your next 5 minutes</h2>
      <div className="space-y-2">
        {assignments.map(a => {
          const { label, variant } = urgencyLabel(a.due_at)
          return (
            <Link
              key={a.id}
              href={`/classes/${a.classes?.name ?? ""}/assignments/${a.id}`}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-100 hover:border-stone-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: a.classes?.color ?? "#6B7280" }}
                />
                <div>
                  <p className="text-sm font-medium text-stone-800">{a.title}</p>
                  <p className="text-xs text-stone-400">{a.classes?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {a.estimated_minutes && (
                  <span className="text-xs text-stone-400">{a.estimated_minutes}m</span>
                )}
                <Badge variant={variant}>{label}</Badge>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
