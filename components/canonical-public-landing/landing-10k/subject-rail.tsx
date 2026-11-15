"use client"

import { Pause, Play } from "lucide-react"
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react"

const subjectCovers = [
  { label: "Math", task: "Start the first step", accent: "#dfff4a", image: "/assets/landing-10k/subjects/math.webp" },
  { label: "English", task: "Find your evidence", accent: "#e8defe", image: "/assets/landing-10k/subjects/english.webp" },
  { label: "Biology", task: "Organize the lab", accent: "#75f0a2", image: "/assets/landing-10k/subjects/biology.webp" },
  { label: "Chemistry", task: "Check your reasoning", accent: "#8fe7ff", image: "/assets/landing-10k/subjects/chemistry.webp" },
  { label: "Physics", task: "Work through the problem", accent: "#a78bfa", image: "/assets/landing-10k/subjects/physics.webp" },
  { label: "History", task: "Compare sources", accent: "#e4b36b", image: "/assets/landing-10k/subjects/history.webp" },
  { label: "Languages", task: "Practice a response", accent: "#ffb5d0", image: "/assets/landing-10k/subjects/languages.webp" },
  { label: "Computer Science", task: "Build the program", accent: "#67e8f9", image: "/assets/landing-10k/subjects/computer-science.webp" },
  { label: "Art", task: "Develop the concept", accent: "#f8d94a", image: "/assets/landing-10k/subjects/art.webp" },
  { label: "Music", task: "Practice the passage", accent: "#c6f6d5", image: "/assets/landing-10k/subjects/music.webp" },
  { label: "Economics", task: "Read the trend", accent: "#dfff4a", image: "/assets/landing-10k/subjects/economics.webp" },
  { label: "AP", task: "Plan the response", accent: "#fef08a", image: "/assets/landing-10k/subjects/ap.webp" },
] as const

function CoverSet({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="dpl-subjects10__set" aria-hidden={duplicate || undefined}>
      {subjectCovers.map((subject) => (
        <article
          key={`${duplicate ? "duplicate-" : ""}${subject.label}`}
          className="dpl-subjects10__cover"
          style={{ "--dpl-cover-accent": subject.accent } as CSSProperties}
        >
          <img
            src={subject.image}
            alt={duplicate ? "" : `${subject.label} homework support`}
            loading="lazy"
            decoding="async"
          />
          <div>
            <h4>{subject.label}</h4>
            <p>{subject.task}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

export function SubjectRail() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const dragOriginRef = useRef({ pointerX: 0, scrollLeft: 0 })
  const interactingRef = useRef(false)
  const visibleRef = useRef(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting },
      { rootMargin: "20% 0px", threshold: 0.01 },
    )
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let frame = 0
    let previousTime = performance.now()

    const tick = (time: number) => {
      const elapsed = Math.min(40, time - previousTime)
      previousTime = time
      const loopWidth = viewport.scrollWidth / 2

      if (!paused && !reducedMotion && visibleRef.current && !interactingRef.current && loopWidth > 0) {
        viewport.scrollLeft += elapsed * 0.014
        if (viewport.scrollLeft >= loopWidth) viewport.scrollLeft -= loopWidth
      }
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [paused])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current
    if (!viewport) return
    draggingRef.current = true
    interactingRef.current = true
    dragOriginRef.current = { pointerX: event.clientX, scrollLeft: viewport.scrollLeft }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current
    if (!viewport || !draggingRef.current) return
    viewport.scrollLeft = dragOriginRef.current.scrollLeft - (event.clientX - dragOriginRef.current.pointerX)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <section id="subjects" className="dpl-subjects10" aria-labelledby="dpl-subjects10-title">
      <header className="dpl-subjects10__header">
        <div>
          <p className="dpl-kicker">One Familiar Flow</p>
          <h3 id="dpl-subjects10-title">Every Subject, Same Flow</h3>
        </div>
        <button
          type="button"
          className="dpl-subjects10__toggle"
          onClick={() => setPaused((current) => !current)}
          aria-label={paused ? "Play subject carousel" : "Pause subject carousel"}
        >
          {paused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
        </button>
      </header>
      <div
        ref={viewportRef}
        className="dpl-subjects10__viewport"
        role="region"
        aria-label="Draggable subject cover carousel"
        tabIndex={0}
        onPointerEnter={() => { interactingRef.current = true }}
        onPointerLeave={() => { interactingRef.current = false; draggingRef.current = false }}
        onFocus={() => { interactingRef.current = true }}
        onBlur={() => { interactingRef.current = false }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
          event.preventDefault()
          viewportRef.current?.scrollBy({ left: event.key === "ArrowRight" ? 236 : -236, behavior: "smooth" })
        }}
      >
        <div className="dpl-subjects10__track">
          <CoverSet />
          <CoverSet duplicate />
        </div>
      </div>
      <p className="sr-only">Use the left and right arrow keys to explore all subject covers.</p>
    </section>
  )
}
