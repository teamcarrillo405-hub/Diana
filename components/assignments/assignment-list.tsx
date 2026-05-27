"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  captured: { label: "Captured", color: "secondary" },
  planned: { label: "Planned", color: "outline" },
  in_progress: { label: "In progress", color: "default" },
  done: { label: "Done", color: "secondary" },
  submitted: { label: "Submitted", color: "outline" },
  graded: { label: "Graded", color: "outline" },
}

const STATE_TRANSITIONS: Record<string, string> = {
  captured: "planned",
  planned: "in_progress",
  in_progress: "done",
  done: "submitted",
}

interface Assignment {
  id: string
  title: string
  state: string
  due_at: string | null
  estimated_minutes: number | null
  assignment_type: string | null
  submission_url: string | null
}

export function AssignmentList({ assignments, classId }: { assignments: Assignment[]; classId: string }) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function advanceState(assignment: Assignment) {
    const next = STATE_TRANSITIONS[assignment.state]
    if (!next) return

    setLoading(assignment.id)
    const update: Record<string, unknown> = { state: next }
    if (next === "submitted") update.submitted_at = new Date().toISOString()
    if (next === "done") update.updated_at = new Date().toISOString()

    await supabase.from("assignments").update(update).eq("id", assignment.id)
    router.refresh()
    setLoading(null)
  }

  if (assignments.length === 0) {
    return <p className="text-stone-400 text-sm">No assignments yet.</p>
  }

  return (
    <div className="space-y-2">
      {assignments.map(a => {
        const stateInfo = STATE_LABELS[a.state] ?? { label: a.state, color: "secondary" }
        const nextLabel = STATE_TRANSITIONS[a.state]
        const isDone = a.state === "done"

        return (
          <div
            key={a.id}
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-100"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-stone-800">{a.title}</p>
              <div className="flex items-center gap-2">
                <Badge variant={stateInfo.color as "default" | "secondary" | "outline" | "destructive"}>
                  {stateInfo.label}
                </Badge>
                {a.due_at && (
                  <span className="text-xs text-stone-400">
                    Due {new Date(a.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                {a.estimated_minutes && (
                  <span className="text-xs text-stone-400">{a.estimated_minutes}m</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isDone && a.submission_url && (
                <a
                  href={a.submission_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline"
                >
                  Open LMS
                </a>
              )}
              {nextLabel && (
                <Button
                  size="sm"
                  variant={isDone ? "default" : "outline"}
                  onClick={() => advanceState(a)}
                  disabled={loading === a.id}
                >
                  {loading === a.id
                    ? "..."
                    : isDone
                    ? "Mark submitted"
                    : `Mark ${nextLabel.replace("_", " ")}`}
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
