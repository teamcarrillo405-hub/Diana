"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ComprehensionPrompt({
  question,
  readingId,
  sessionId,
  onDone,
}: {
  question: string
  readingId: string
  sessionId: string
  onDone: () => void
}) {
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    const res = await fetch("/api/reading/comprehension-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, readingId, sessionId }),
    })

    if (!res.ok) {
      setError("Diana couldn't check that one. Try again.")
      setLoading(false)
      return
    }

    const data = (await res.json()) as { correct: boolean; feedback: string }
    setFeedback(data.feedback)
    setLoading(false)
  }

  return (
    <div className="space-y-3 p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
      <p className="text-sm font-medium text-stone-800">{question}</p>

      {!feedback && (
        <>
          <Textarea
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            disabled={loading}
            className="bg-white"
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={loading || answer.trim().length < 1}
            >
              {loading ? "Diana is reading your answer..." : "Submit"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onDone}
              disabled={loading}
            >
              Skip
            </Button>
          </div>
        </>
      )}

      {feedback && (
        <>
          <div className="p-3 bg-stone-100 rounded-md text-sm text-stone-700 leading-relaxed">
            {feedback}
          </div>
          <Button type="button" size="sm" onClick={onDone}>
            Keep reading
          </Button>
        </>
      )}
    </div>
  )
}
