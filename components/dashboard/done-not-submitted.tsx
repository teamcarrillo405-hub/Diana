"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface Assignment {
  id: string
  title: string
  submission_link: string | null
  classes: { name: string; color: string } | null
}

export function DoneNotSubmitted({ assignments }: { assignments: Assignment[] }) {
  const [submitting, setSubmitting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function markSubmitted(id: string) {
    setSubmitting(id)
    await supabase
      .from("assignments")
      .update({ state: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", id)
    router.refresh()
    setSubmitting(null)
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wide">
          Finished but not turned in
        </h2>
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
          {assignments.length}
        </span>
      </div>
      <div className="space-y-2">
        {assignments.map(a => (
          <div
            key={a.id}
            className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: a.classes?.color ?? "#6B7280" }}
              />
              <div>
                <p className="text-sm font-medium text-stone-800">{a.title}</p>
                <p className="text-xs text-stone-500">{a.classes?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {a.submission_link && (
                <a
                  href={a.submission_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline"
                >
                  Open LMS
                </a>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => markSubmitted(a.id)}
                disabled={submitting === a.id}
              >
                {submitting === a.id ? "Saving..." : "Mark submitted"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
