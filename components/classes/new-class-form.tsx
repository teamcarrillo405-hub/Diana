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

const CLASS_COLORS = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EF4444", label: "Red" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
  { value: "#6B7280", label: "Gray" },
]

const AI_POLICY_OPTIONS = [
  {
    value: "yellow",
    label: "Step guidance (recommended)",
    description: "Diana helps you check steps, citations, and grammar — no full prose.",
  },
  {
    value: "red",
    label: "Socratic only",
    description: "Diana only asks questions. No suggestions, no answers. For strict classes.",
  },
  {
    value: "green",
    label: "Full assist",
    description: "Brainstorming, outlines, grammar feedback all allowed.",
  },
]

export function NewClassForm() {
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [teacher, setTeacher] = useState("")
  const [schedule, setSchedule] = useState("")
  const [color, setColor] = useState("#3B82F6")
  const [aiPolicy, setAiPolicy] = useState("yellow")
  const [rubricText, setRubricText] = useState("")
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

    const { data: cls, error: insertError } = await supabase
      .from("classes")
      .insert({
        owner_id: user.id,
        name,
        subject_category: subject,
        teacher,
        schedule_text: schedule,
        color,
        ai_policy: aiPolicy,
      })
      .select()
      .single()

    if (insertError) {
      setError("Couldn't save the class. Try again.")
      setLoading(false)
      return
    }

    // Store rubric as a pasted-text document
    if (rubricText.trim()) {
      await supabase.from("class_documents").insert({
        class_id: cls.id,
        kind: "rubric",
        title: "Rubric (pasted)",
        extracted_text: rubricText.trim(),
      })

      // Fire-and-forget rubric summarization
      fetch('/api/classes/summarize-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: cls.id }),
      }).catch(() => {})
    }

    router.push(`/classes/${cls.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <Label htmlFor="name">Class name *</Label>
        <Input
          id="name"
          placeholder="AP US History, Period 3"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Subject</Label>
          <Select value={subject} onValueChange={(v) => setSubject(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {["English", "Math", "Science", "History", "Foreign Language", "Other"].map(s => (
                <SelectItem key={s} value={s.toLowerCase().replace(" ", "_")}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Color</Label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {CLASS_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c.value ? "border-stone-900 scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="teacher">Teacher name</Label>
          <Input
            id="teacher"
            placeholder="Mr. Chen"
            value={teacher}
            onChange={e => setTeacher(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="schedule">Schedule</Label>
          <Input
            id="schedule"
            placeholder="Mon/Wed/Fri, 9am"
            value={schedule}
            onChange={e => setSchedule(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>AI policy for this class</Label>
        <div className="space-y-2">
          {AI_POLICY_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                aiPolicy === opt.value
                  ? "border-stone-900 bg-stone-50"
                  : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <input
                type="radio"
                name="ai_policy"
                value={opt.value}
                checked={aiPolicy === opt.value}
                onChange={() => setAiPolicy(opt.value)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-stone-800">{opt.label}</p>
                <p className="text-xs text-stone-500">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="rubric">Paste your rubric or syllabus (optional)</Label>
        <Textarea
          id="rubric"
          placeholder="Paste your teacher's rubric, grading criteria, or class rules here. Diana will use this to ground every AI response for this class."
          value={rubricText}
          onChange={e => setRubricText(e.target.value)}
          rows={5}
          className="resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || !name}>
          {loading ? "Saving..." : "Add class"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
