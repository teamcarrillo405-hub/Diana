"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

const SPEED_OPTIONS = [
  { value: 0.75, label: "Slow" },
  { value: 1.0, label: "Normal" },
  { value: 1.25, label: "Fast" },
  { value: 1.5, label: "Faster" },
]

export function TtsControls({ text }: { text: string }) {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [rate, setRate] = useState(1.0)

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  function handlePlay() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return

    if (isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsSpeaking(true)
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.onend = () => {
      setIsSpeaking(false)
      setIsPaused(false)
      utteranceRef.current = null
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      setIsPaused(false)
      utteranceRef.current = null
    }
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
    setIsPaused(false)
  }

  function handlePause() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    window.speechSynthesis.pause()
    setIsPaused(true)
    setIsSpeaking(false)
  }

  function handleStop() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsPaused(false)
    utteranceRef.current = null
  }

  function handleRateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = parseFloat(e.target.value)
    setRate(next)
    if (utteranceRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = next
      utterance.onend = () => {
        setIsSpeaking(false)
        setIsPaused(false)
        utteranceRef.current = null
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
        setIsPaused(false)
        utteranceRef.current = null
      }
      utteranceRef.current = utterance
      if (isSpeaking || isPaused) {
        window.speechSynthesis.speak(utterance)
        setIsSpeaking(true)
        setIsPaused(false)
      }
    }
  }

  const playLabel = isPaused ? "Resume" : isSpeaking ? "Speaking..." : "Play"

  return (
    <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-lg border border-stone-100">
      <Button
        type="button"
        size="sm"
        onClick={isSpeaking && !isPaused ? handlePause : handlePlay}
        disabled={!text}
      >
        {isSpeaking && !isPaused ? "Pause" : playLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleStop}
        disabled={!isSpeaking && !isPaused}
      >
        Stop
      </Button>
      <select
        value={rate}
        onChange={handleRateChange}
        className="ml-auto h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {SPEED_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
