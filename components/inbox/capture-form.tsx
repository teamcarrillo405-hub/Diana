"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ClassificationPreview } from "./classification-preview"

type ClassifyResponse = {
  inboxItemId: string
  classId: string | null
  className: string | null
  title: string
  assignmentType: string
  dueDate: string | null
  confidence: number
  rawText: string
}

export function CaptureForm() {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ClassifyResponse | null>(null)

  function reset() {
    setText("")
    setResult(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/inbox/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? "Diana couldn't classify that. Try again.")
        return
      }

      const data = (await res.json()) as ClassifyResponse
      setResult(data)
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <ClassificationPreview
        inboxItemId={result.inboxItemId}
        classId={result.classId}
        className={result.className}
        title={result.title}
        assignmentType={result.assignmentType}
        dueDate={result.dueDate}
        confidence={result.confidence}
        rawText={result.rawText}
        onDone={reset}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="What do you need to do? e.g. 'Spanish quiz tomorrow' or 'read chapter 5 for English by Friday'"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="resize-none"
        disabled={loading}
      />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading || !text.trim()}>
          {loading ? "Diana is thinking..." : "Capture"}
        </Button>
        {loading && (
          <span className="text-xs text-stone-400">
            Reading your classes and figuring out where this belongs.
          </span>
        )}
      </div>
    </form>
  )
}
