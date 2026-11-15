"use client"

import { useGSAP } from "@gsap/react"
import dynamic from "next/dynamic"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import styles from "./assignment-world-gate.module.css"

const AssignmentWorld = dynamic(
  () => import("./assignment-world").then((module) => module.AssignmentWorld),
  { ssr: false },
)

gsap.registerPlugin(useGSAP, ScrollTrigger)

const SOURCE_LABELS = ["Classroom", "Canvas", "School Portal", "PDF", "Photo", "Paper"] as const
const STATIC_PAPER_POSITIONS = SOURCE_LABELS.map((_, index) => {
  const offset = index - (SOURCE_LABELS.length - 1) / 2
  return {
    "--paper-index": index,
    "--paper-offset": offset,
    "--paper-distance": Math.abs(offset),
  } as CSSProperties
})

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

function setVideoTime(video: HTMLVideoElement | null, time: number) {
  if (!video || video.readyState < 1 || !Number.isFinite(video.duration)) return
  const target = Math.max(0, Math.min(video.duration - 0.04, time))
  if (Math.abs(video.currentTime - target) < 0.045) return

  try {
    video.currentTime = target
  } catch {
    // The poster remains visible until the browser can seek the source.
  }
}

export function AssignmentWorldGate() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef(0)
  const [active, setActive] = useState(true)
  const desktop = useMediaQuery("(min-width: 1180px)")
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "20% 0px 20%", threshold: 0.01 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!desktop || reducedMotion) progressRef.current = 1
  }, [desktop, reducedMotion])

  useGSAP(
    () => {
      const section = sectionRef.current
      const stage = stageRef.current
      if (!section || !stage || !desktop || reducedMotion) return

      const opening = stage.querySelector<HTMLElement>("[data-assignment-opening]")
      const world = stage.querySelector<HTMLElement>("[data-assignment-world]")
      const copy = stage.querySelector<HTMLElement>("[data-assignment-copy]")
      const sourceLabels = Array.from(stage.querySelectorAll<HTMLElement>("[data-assignment-source]"))
      const outcome = stage.querySelector<HTMLElement>("[data-assignment-outcome]")
      const scrollCue = stage.querySelector<HTMLElement>("[data-assignment-scroll]")
      if (!opening || !world || !copy || !outcome || !scrollCue) return

      progressRef.current = 0
      gsap.set(opening, { autoAlpha: 1, scale: 1 })
      gsap.set(world, { autoAlpha: 0 })
      gsap.set(copy, { autoAlpha: 0, y: 24 })
      gsap.set(sourceLabels, { autoAlpha: 0, y: 12 })
      gsap.set(outcome, { autoAlpha: 0, y: 18 })
      gsap.set(scrollCue, { autoAlpha: 1 })

      const timeline = gsap.timeline({ defaults: { ease: "none" } })
      timeline
        .to(scrollCue, { autoAlpha: 0, y: 10, duration: 0.08 }, 0.08)
        .to(copy, { autoAlpha: 1, y: 0, duration: 0.14, ease: "power3.out" }, 0.12)
        .to(opening, { autoAlpha: 0, scale: 1.025, duration: 0.18, ease: "power2.in" }, 0.2)
        .to(world, { autoAlpha: 1, duration: 0.18, ease: "power2.out" }, 0.2)
        .to(sourceLabels, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.018, ease: "power3.out" }, 0.56)
        .to(copy, { autoAlpha: 0, y: -16, duration: 0.12, ease: "power2.in" }, 0.68)
        .to(outcome, { autoAlpha: 1, y: 0, duration: 0.1, ease: "power3.out" }, 0.74)

      const trigger = ScrollTrigger.create({
        trigger: section,
        animation: timeline,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * 2.55)}`,
        pin: stage,
        pinSpacing: true,
        scrub: 0.9,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const worldProgress = gsap.utils.clamp(0, 1, (self.progress - 0.17) / 0.7)
          progressRef.current = worldProgress

          const video = videoRef.current
          if (video?.duration) {
            const videoProgress = gsap.utils.clamp(0, 1, self.progress / 0.22)
            setVideoTime(video, videoProgress * video.duration)
          }
        },
      })

      const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh())
      return () => {
        window.cancelAnimationFrame(refreshFrame)
        trigger.kill()
        timeline.kill()
        progressRef.current = 0
      }
    },
    { scope: sectionRef, dependencies: [desktop, reducedMotion], revertOnUpdate: true },
  )

  const staticPresentation = !desktop || reducedMotion

  return (
    <main className={styles.page}>
      <section ref={sectionRef} className={styles.story} aria-labelledby="assignment-world-title">
        <div ref={stageRef} className={styles.stage} data-static={staticPresentation ? "" : undefined}>
          {!staticPresentation ? (
            <>
              <div className={styles.opening} data-assignment-opening>
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  preload="auto"
                  poster="/assets/landing-10k/hero/homework-fits-life-opening-poster.webp"
                  aria-hidden="true"
                >
                  <source src="/assets/landing-10k/hero/homework-fits-life-opening-desktop.webm" type="video/webm" />
                  <source src="/assets/landing-10k/hero/homework-fits-life-opening-desktop.mp4" type="video/mp4" />
                </video>
              </div>

              <div className={styles.world} data-assignment-world>
                <AssignmentWorld active={active} progressRef={progressRef} />
              </div>
            </>
          ) : (
            <div className={styles.staticWorld} aria-hidden="true">
              {SOURCE_LABELS.map((source, index) => (
                <span key={source} style={STATIC_PAPER_POSITIONS[index]} />
              ))}
              <strong />
            </div>
          )}

          <div className={styles.copy} data-assignment-copy={!staticPresentation ? "" : undefined}>
            <p>Bring It In</p>
            <h1 id="assignment-world-title">Every source falls into place</h1>
          </div>

          <div className={styles.sources} aria-label="Supported assignment sources">
            {SOURCE_LABELS.map((source) => (
              <span key={source} data-assignment-source={!staticPresentation ? "" : undefined}>{source}</span>
            ))}
          </div>

          <p className={styles.outcome} data-assignment-outcome={!staticPresentation ? "" : undefined}>
            One assignment
          </p>

          {!staticPresentation ? (
            <p className={styles.scrollCue} data-assignment-scroll aria-hidden="true">
              <span />
              Scroll
            </p>
          ) : null}

          <div className={styles.srOnly}>
            Diana brings Classroom, Canvas, school portals, PDFs, photos, and paper into one organized assignment.
          </div>
        </div>
      </section>
    </main>
  )
}
