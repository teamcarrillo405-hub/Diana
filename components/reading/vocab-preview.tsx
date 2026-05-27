"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

type VocabWord = { word: string; definition: string }

export function VocabPreview({
  readingId,
  readingTitle,
  classId,
  initialWords,
}: {
  readingId: string
  readingTitle: string
  classId: string
  initialWords: VocabWord[] | null
}) {
  const [words, setWords] = useState<VocabWord[] | null>(initialWords)
  const [loading, setLoading] = useState(initialWords === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialWords !== null) return
    let cancelled = false

    async function loadVocab() {
      try {
        const res = await fetch("/api/reading/vocab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ readingId }),
        })
        if (!res.ok) {
          if (!cancelled) setError("Couldn't prepare vocabulary. Try again.")
          return
        }
        const data = (await res.json()) as { words: VocabWord[] }
        if (!cancelled) setWords(data.words)
      } catch {
        if (!cancelled) setError("Couldn't prepare vocabulary. Try again.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadVocab()
    return () => {
      cancelled = true
    }
  }, [initialWords, readingId])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-400 font-semibold">
          Before you read
        </p>
        <h1 className="text-xl font-bold text-stone-900 mt-1">{readingTitle}</h1>
      </div>

      {loading && (
        <p className="text-sm text-stone-500 italic">
          Diana is preparing your vocabulary...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </p>
      )}

      {words && words.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {words.map((w) => (
            <div
              key={w.word}
              className="rounded-lg border border-stone-200 px-4 py-3"
            >
              <p className="text-sm font-bold text-stone-900">{w.word}</p>
              <p className="text-sm text-stone-500 mt-1">{w.definition}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <Link
          href={`/classes/${classId}/read/${readingId}`}
          className={buttonVariants({ variant: "default" })}
        >
          Start reading →
        </Link>
      </div>
    </div>
  )
}
