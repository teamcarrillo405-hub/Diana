"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ASSIGNMENT_TYPES = [
  { value: "essay", label: "Essay" },
  { value: "reading", label: "Reading" },
  { value: "problem_set", label: "Problem set" },
  { value: "lab_report", label: "Lab report" },
  { value: "study", label: "Study / exam prep" },
  { value: "other", label: "Other" },
]

export function NewAssignmentForm({ classId }: { classId: string }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState("other")
  const [dueAt, setDueAt] = useState("")
  const [dueTime, setDueTime] = useState("23:59")
  const [estimatedMinutes, setEstimatedMinutes] = useState("")
  const [submissionLink, setSubmissionLink] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Not signed in."); setLoading(false); return }

    const dueAtFull = dueAt ? `${dueAt}T${dueTime}:00` : null

    const { error: insertError } = await supabase.from("assignments").insert({
      user_id: user.id,
      class_id: classId,
      title,
      description: description || null,
      assignment_type: type,
      due_at: dueAtFull,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
      submission_link: submissionLink || null,
      state: "captured",
    })

    if (insertError) {
      setError("Couldn't save. Try again.")
      setLoading(false)
      return
    }

    router.push(`/classes/${classId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="title">Assignment *</Label>
        <Input
          id="title"
          placeholder="DBQ Essay — WWII Causes"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v ?? "other")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNMENT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="due-date">Due date</Label>
          <Input
            id="due-date"
            type="date"
            value={dueAt}
            onChange={e => setDueAt(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="due-time">Due time</Label>
          <Input
            id="due-time"
            type="time"
            value={dueTime}
            onChange={e => setDueTime(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="estimated">Estimated time (minutes)</Label>
        <Input
          id="estimated"
          type="number"
          placeholder="45"
          min={1}
          value={estimatedMinutes}
          onChange={e => setEstimatedMinutes(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="submission-link">Submission link (LMS URL)</Label>
        <Input
          id="submission-link"
          type="url"
          placeholder="https://classroom.google.com/..."
          value={submissionLink}
          onChange={e => setSubmissionLink(e.target.value)}
        />
        <p className="text-xs text-stone-400">Diana will surface this when you mark the assignment done.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Notes (optional)</Label>
        <Textarea
          id="description"
          placeholder="Any notes about this assignment..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || !title}>
          {loading ? "Saving..." : "Add assignment"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
