"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function AddReadingForm({ classId }: { classId: string }) {
  const [title, setTitle] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [fullText, setFullText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("Not signed in.")
      setLoading(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from("readings")
      .insert({
        class_id: classId,
        user_id: user.id,
        title,
        source_url: sourceUrl || null,
        full_text: fullText,
      })
      .select()
      .single()

    if (insertError || !data) {
      setError("Couldn't save the reading. Try again.")
      setLoading(false)
      return
    }

    router.push(`/classes/${classId}/read/${data.id}/prep`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="Chapter 4 — The Great Gatsby"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="source_url">Source URL</Label>
        <Input
          id="source_url"
          type="url"
          placeholder="https://..."
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="full_text">Reading text *</Label>
        <Textarea
          id="full_text"
          placeholder="Paste the reading text here..."
          value={fullText}
          onChange={(e) => setFullText(e.target.value)}
          rows={10}
          required
          className="resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading || !title || !fullText}>
          {loading ? "Saving..." : "Save reading"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
