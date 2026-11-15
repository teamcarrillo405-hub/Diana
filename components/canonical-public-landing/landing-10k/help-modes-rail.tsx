"use client"

import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react"
import { gsap } from "gsap"
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { helpModes } from "./content"
import type { HelpMode } from "./types"

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [query])

  return matches
}

function EditorialCover() {
  return (
    <span className="dpl-help10-cover" role="img" aria-label="Diana Student Edition 01, Homework That Fits Your Life">
      <span className="dpl-help10-cover__masthead">
        <strong>Diana</strong>
        <small>Student Edition 01</small>
      </span>
      <span className="dpl-help10-cover__cast" aria-hidden="true">
        <img src="/assets/help-fit/decode-the-ask.webp" alt="" />
        <img src="/assets/help-fit/use-your-sources.webp" alt="" />
        <img src="/assets/help-fit/plan-your-time.webp" alt="" />
      </span>
      <span className="dpl-help10-cover__headline">Homework That Fits Your Life</span>
    </span>
  )
}

function PosterSurface({ mode, eager = false }: { mode: HelpMode; eager?: boolean }) {
  if (mode.mediaType === "cover") return <EditorialCover />

  return (
    <img
      src={mode.poster || mode.src}
      alt={mode.alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      style={{ objectPosition: mode.objectPosition }}
    />
  )
}

export function HelpModesRail() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [mediaPaused, setMediaPaused] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  const activeVideoRef = useRef<HTMLVideoElement>(null)
  const railButtonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const mobileTrackRef = useRef<HTMLDivElement>(null)
  const mobileItemRefs = useRef<Array<HTMLElement | null>>([])
  const mobileVideoRefs = useRef<Array<HTMLVideoElement | null>>([])
  const dragStartRef = useRef<number | null>(null)
  const animatingRef = useRef(false)
  const flyersRef = useRef(new Set<HTMLElement>())
  const desktop = useMediaQuery("(min-width: 1180px)")
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const [sectionVisible, setSectionVisible] = useState(false)
  const activeMode = helpModes[activeIndex]

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => setSectionVisible(entry.isIntersecting),
      { rootMargin: "20% 0px", threshold: 0.01 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = activeVideoRef.current
    if (!video) return
    if (sectionVisible && desktop && !reducedMotion && !mediaPaused && activeMode.mediaType === "video") {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [activeMode, desktop, mediaPaused, reducedMotion, sectionVisible])

  useEffect(() => {
    if (desktop) return
    const track = mobileTrackRef.current
    if (!track) return

    const visibility = new Map<number, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute("data-help-mobile-index"))
          visibility.set(index, entry.intersectionRatio)
        })

        let nextIndex = activeIndex
        let bestRatio = 0
        visibility.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            nextIndex = index
          }
        })
        if (bestRatio >= 0.7) setActiveIndex(nextIndex)
      },
      { root: track, threshold: [0, 0.7, 1] },
    )

    mobileItemRefs.current.forEach((item) => item && observer.observe(item))
    return () => observer.disconnect()
  }, [desktop, activeIndex])

  useEffect(() => {
    if (desktop) return
    mobileVideoRefs.current.forEach((video, index) => {
      if (!video) return
      if (index === activeIndex && sectionVisible && !reducedMotion) {
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    })
  }, [activeIndex, desktop, reducedMotion, sectionVisible])

  useEffect(() => () => {
    flyersRef.current.forEach((flyer) => flyer.remove())
    flyersRef.current.clear()
  }, [])

  const updateMode = (nextIndex: number, source?: HTMLElement | null) => {
    const boundedIndex = Math.min(helpModes.length - 1, Math.max(0, nextIndex))
    if (boundedIndex === activeIndex || animatingRef.current) return

    const portal = portalRef.current
    const sourceSurface = source?.querySelector<HTMLElement>("[data-help-rail-surface]")
    if (!desktop || reducedMotion || !portal || !sourceSurface) {
      setActiveIndex(boundedIndex)
      setMediaPaused(false)
      return
    }

    const from = sourceSurface.getBoundingClientRect()
    const to = portal.getBoundingClientRect()
    const flyer = sourceSurface.cloneNode(true) as HTMLElement
    flyer.classList.add("dpl-help10-flight")
    flyer.setAttribute("aria-hidden", "true")
    document.body.appendChild(flyer)
    flyersRef.current.add(flyer)
    animatingRef.current = true

    gsap.set(flyer, {
      position: "fixed",
      left: from.left,
      top: from.top,
      width: from.width,
      height: from.height,
      transformOrigin: "left top",
      zIndex: 80,
      pointerEvents: "none",
    })
    gsap.to(portal, { autoAlpha: 0.12, scale: 0.985, duration: 0.18, ease: "power2.out" })
    setActiveIndex(boundedIndex)
    setMediaPaused(false)

    gsap.to(flyer, {
      x: to.left - from.left,
      y: to.top - from.top,
      scaleX: to.width / from.width,
      scaleY: to.height / from.height,
      duration: 0.68,
      ease: "power3.inOut",
      onComplete: () => {
        flyer.remove()
        flyersRef.current.delete(flyer)
        gsap.fromTo(portal, { autoAlpha: 0.2, scale: 0.992 }, { autoAlpha: 1, scale: 1, duration: 0.28, ease: "power2.out" })
        animatingRef.current = false
      },
    })
  }

  const moveRelative = (offset: number) => {
    const nextIndex = (activeIndex + offset + helpModes.length) % helpModes.length
    updateMode(nextIndex, railButtonRefs.current[nextIndex])
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStartRef.current = event.clientX
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current
    dragStartRef.current = null
    if (start === null) return
    const distance = event.clientX - start
    if (Math.abs(distance) > 64) moveRelative(distance > 0 ? -1 : 1)
  }

  return (
    <section ref={sectionRef} id="help-modes" className="dpl-help10" data-landing-section="help_modes">
      <div className="dpl-shell">
        <header className="dpl-help10__header">
          <p className="dpl-kicker">Help That Fits</p>
          <h2>Choose Your Help Mode</h2>
        </header>

        <div
          className="dpl-help10__desktop"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault()
              moveRelative(-1)
            }
            if (event.key === "ArrowRight") {
              event.preventDefault()
              moveRelative(1)
            }
          }}
        >
          <div className="dpl-help10__copy" aria-live="polite">
            <span className="dpl-help10__eyebrow">Choose what helps now</span>
            <h3>{activeMode.title}</h3>
            <p>{activeMode.outcome}</p>
            <div className="dpl-help10__controls">
              <button type="button" onClick={() => moveRelative(-1)} aria-label="Previous help mode">
                <ArrowLeft size={20} />
              </button>
              <button type="button" onClick={() => moveRelative(1)} aria-label="Next help mode">
                <ArrowRight size={20} />
              </button>
            </div>
          </div>

          <div
            ref={portalRef}
            className="dpl-help10__portal"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          >
            {activeMode.mediaType === "cover" ? (
              <EditorialCover />
            ) : activeMode.mediaType === "video" && !reducedMotion ? (
              <video
                key={activeMode.id}
                ref={activeVideoRef}
                muted
                loop
                playsInline
                preload="metadata"
                poster={activeMode.poster}
                aria-label={activeMode.alt}
                style={{ objectPosition: activeMode.objectPosition }}
              >
                <source src={activeMode.src.replace(/\.mp4$/, ".webm")} type="video/webm" />
                <source src={activeMode.src} type="video/mp4" />
              </video>
            ) : (
              <PosterSurface mode={activeMode} eager />
            )}
            {activeMode.mediaType === "video" && !reducedMotion && (
              <button
                type="button"
                className="dpl-help10__media-toggle"
                onClick={() => setMediaPaused((current) => !current)}
                aria-label={mediaPaused ? "Play help mode video" : "Pause help mode video"}
              >
                {mediaPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
              </button>
            )}
          </div>

          <div className="dpl-help10__rail" role="group" aria-label="All help modes">
            {helpModes.map((mode, index) => (
              <button
                key={mode.id}
                ref={(node) => { railButtonRefs.current[index] = node }}
                type="button"
                className={index === activeIndex ? "is-active" : ""}
                aria-pressed={index === activeIndex}
                aria-label={`Show ${mode.title}: ${mode.outcome}`}
                onClick={(event) => updateMode(index, event.currentTarget)}
              >
                <span className="dpl-help10__rail-surface" data-help-rail-surface>
                  <PosterSurface mode={mode} />
                </span>
                <span>{mode.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div ref={mobileTrackRef} className="dpl-help10__mobile" aria-label="Swipe through homework help modes">
          {helpModes.map((mode, index) => (
            <article
              key={mode.id}
              ref={(node) => { mobileItemRefs.current[index] = node }}
              data-help-mobile-index={index}
            >
              <div className="dpl-help10__mobile-media">
                {mode.mediaType === "cover" ? (
                  <EditorialCover />
                ) : mode.mediaType === "video" && !reducedMotion ? (
                  <video
                    ref={(node) => { mobileVideoRefs.current[index] = node }}
                    muted
                    playsInline
                    preload="metadata"
                    poster={mode.poster}
                    aria-label={mode.alt}
                    style={{ objectPosition: mode.objectPosition }}
                  >
                    <source src={mode.src.replace(/\.mp4$/, ".webm")} type="video/webm" />
                    <source src={mode.src} type="video/mp4" />
                  </video>
                ) : (
                  <PosterSurface mode={mode} eager={index === 0} />
                )}
              </div>
              <div className="dpl-help10__mobile-caption">
                <h3>{mode.title}</h3>
                <p>{mode.outcome}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
