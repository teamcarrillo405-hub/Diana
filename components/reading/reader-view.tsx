"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TtsControls } from "@/components/reading/tts-controls"
import { ComprehensionPrompt } from "@/components/reading/comprehension-prompt"

type ComprehensionQuestion = { q: string; type: string }

type Reading = {
  id: string
  title: string
  full_text: string
  comprehension_questions: ComprehensionQuestion[] | null
}

const CHUNK_WORD_SIZE = 500

function chunkText(text: string, size: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "))
  }
  return chunks
}

export function ReaderView({
  reading,
  sessionId,
  classId,
}: {
  reading: Reading
  sessionId: string
  classId: string
}) {
  const chunks = useMemo(() => chunkText(reading.full_text, CHUNK_WORD_SIZE), [reading.full_text])
  const questions = reading.comprehension_questions ?? []
  const [activeCheckIndex, setActiveCheckIndex] = useState(-1)
  const [completedChecks, setCompletedChecks] = useState<Set<number>>(new Set())

  return (
    <div className="max-w-prose mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-900">{reading.title}</h1>
        <Link
          href={`/classes/${classId}/read`}
          className="text-sm text-stone-500 hover:text-stone-700 whitespace-nowrap"
        >
          Back
        </Link>
      </div>

      <TtsControls text={reading.full_text} />

      <div className="space-y-6">
        {chunks.map((chunk, index) => {
          const isLast = index === chunks.length - 1
          const question = questions[index]
          const hasCheck = !isLast && question && questions.length > 0
          const checkDone = completedChecks.has(index)
          const showPrompt = activeCheckIndex === index

          return (
            <div key={index} className="space-y-4">
              <p className="text-lg leading-relaxed text-stone-800 whitespace-pre-wrap">
                {chunk}
              </p>

              {hasCheck && !checkDone && !showPrompt && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveCheckIndex(index)}
                >
                  Check in after this section
                </Button>
              )}

              {hasCheck && showPrompt && (
                <ComprehensionPrompt
                  question={question.q}
                  readingId={reading.id}
                  sessionId={sessionId}
                  onDone={() => {
                    setCompletedChecks((prev) => {
                      const next = new Set(prev)
                      next.add(index)
                      return next
                    })
                    setActiveCheckIndex(-1)
                  }}
                />
              )}

              {hasCheck && checkDone && (
                <p className="text-xs text-stone-400 italic">Check in done.</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="pt-6 border-t border-stone-100 space-y-3">
        <p className="text-stone-500 italic">You finished this reading.</p>
        <Link
          href={`/classes/${classId}`}
          className="inline-flex items-center justify-center rounded-[min(var(--radius-md),12px)] bg-primary text-primary-foreground px-3 h-8 text-sm font-medium transition-all hover:bg-primary/80"
        >
          Back to class
        </Link>
      </div>
    </div>
  )
}
