"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Props {
  inboxItemId: string
  classId: string | null
  className: string | null
  title: string
  assignmentType: string
  dueDate: string | null
  confidence: number
  rawText: string
  classColor?: string | null
  onDone?: () => void
}

function formatType(type: string) {
  if (!type) return "Other"
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function formatDueDate(due: string | null) {
  if (!due) return "No due date detected"
  const date = new Date(due)
  if (Number.isNaN(date.getTime())) return due
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function ClassificationPreview({
  inboxItemId,
  classId,
  className,
  title,
  assignmentType,
  dueDate,
  confidence,
  rawText,
  classColor,
  onDone,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confidencePct = Math.max(0, Math.min(1, confidence)) * 100

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/inbox/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inboxItemId,
          classId,
          title,
          assignmentType,
          dueDate,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? "Couldn't save. Try again.")
        return
      }
      setSaved(true)
      setTimeout(() => {
        onDone?.()
      }, 800)
    } catch {
      setError("Network error. Try again.")
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-700">Saved!</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-400 mb-1">
          From: &ldquo;{rawText}&rdquo;
        </p>
        <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 text-sm text-stone-700">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: classColor ?? (className ? "#3B82F6" : "#D6D3D1") }}
          />
          <span>{className ?? "Unclassified"}</span>
        </div>
        <Badge variant="secondary">{formatType(assignmentType)}</Badge>
        <span className="text-sm text-stone-500">{formatDueDate(dueDate)}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>Confidence</span>
          <span>{Math.round(confidencePct)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
          <div
            className="h-full bg-stone-700 transition-all"
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save as assignment"}
        </Button>
        <Button variant="outline" onClick={onDone} disabled={saving}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
