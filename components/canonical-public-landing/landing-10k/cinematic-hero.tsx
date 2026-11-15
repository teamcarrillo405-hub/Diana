"use client"

import { useGSAP } from "@gsap/react"
import dynamic from "next/dynamic"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useEffect, useRef, useState } from "react"
import { landingAnalyticsEvents, trackLandingEvent } from "../analytics"
import { heroBeats, heroProductProof } from "./content"

const AssignmentWorld = dynamic(
  () => import("./assignment-world").then((module) => module.AssignmentWorld),
  { ssr: false },
)

gsap.registerPlugin(useGSAP, ScrollTrigger)

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

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas")
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"))
  } catch {
    return false
  }
}

function setScrubbedTime(video: HTMLVideoElement | null, time: number) {
  if (!video || video.readyState < 1 || !Number.isFinite(video.duration)) return
  const target = Math.max(0, Math.min(video.duration - 0.04, time))
  if (Math.abs(video.currentTime - target) < 0.055) return

  try {
    video.currentTime = target
  } catch {
    // The poster remains the fallback until the browser can seek the media.
  }
}

export function CinematicHero() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const openingVideoRef = useRef<HTMLVideoElement>(null)
  const activityVideoRef = useRef<HTMLVideoElement>(null)
  const mobileVideoRef = useRef<HTMLVideoElement>(null)
  const assignmentProgressRef = useRef(0)
  const engagedRef = useRef(false)
  const completedRef = useRef(false)
  const mobilePlayedRef = useRef(false)
  const desktop = useMediaQuery("(min-width: 1180px)")
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const [stageVisible, setStageVisible] = useState(true)
  const [documentVisible, setDocumentVisible] = useState(true)
  const [webglEligible, setWebglEligible] = useState(false)
  const [mobileBeat, setMobileBeat] = useState(0)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => setStageVisible(entry.isIntersecting),
      { rootMargin: "25% 0px 25%", threshold: 0.01 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const update = () => setDocumentVisible(document.visibilityState === "visible")
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])

  useEffect(() => {
    const cores = navigator.hardwareConcurrency ?? 4
    setWebglEligible(desktop && !reducedMotion && cores >= 4 && supportsWebGL())
  }, [desktop, reducedMotion])

  useEffect(() => {
    const video = mobileVideoRef.current
    const section = sectionRef.current
    if (!video || !section || desktop || reducedMotion) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45 && !mobilePlayedRef.current) {
          mobilePlayedRef.current = true
          video.play().catch(() => {})
          trackLandingEvent(landingAnalyticsEvents.videoEngaged, {
            action: "play",
            video: "hero_product_walkthrough",
          })
        } else if (!entry.isIntersecting) {
          video.pause()
        }
      },
      { threshold: [0, 0.45, 1] },
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [desktop, reducedMotion])

  useEffect(() => {
    if (!desktop || reducedMotion) return

    let alignFrame = 0
    let alignTimer = 0
    const alignToHash = () => {
      const hash = window.location.hash.slice(1)
      if (!hash || hash === "top") return

      ScrollTrigger.refresh()
      alignFrame = window.requestAnimationFrame(() => {
        document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ block: "start" })
      })
    }

    alignTimer = window.setTimeout(alignToHash, 360)
    window.addEventListener("hashchange", alignToHash)
    return () => {
      window.clearTimeout(alignTimer)
      window.cancelAnimationFrame(alignFrame)
      window.removeEventListener("hashchange", alignToHash)
    }
  }, [desktop, reducedMotion])

  useGSAP(
    () => {
      const section = sectionRef.current
      const stage = stageRef.current
      if (!section || !stage || !desktop || reducedMotion) return

      const opening = stage.querySelector<HTMLElement>("[data-hero-layer='opening']")
      const assignmentWorld = stage.querySelector<HTMLElement>("[data-hero-layer='assignment-world']")
      const product = stage.querySelector<HTMLElement>("[data-hero-layer='product']")
      const activity = stage.querySelector<HTMLElement>("[data-hero-layer='activity']")
      const captions = Array.from(stage.querySelectorAll<HTMLElement>("[data-hero-caption]"))
      if (!opening || !assignmentWorld || !product || !activity) return

      gsap.set(opening, { autoAlpha: 1, scale: 1 })
      gsap.set([assignmentWorld, product, activity], { autoAlpha: 0 })
      gsap.set(product, { scale: 0.9, xPercent: 4, clipPath: "inset(8% 10% 8% 10%)" })
      gsap.set(activity, { scale: 1.035 })
      gsap.set(captions, { autoAlpha: 0, y: 22 })

      const timeline = gsap.timeline({ defaults: { ease: "none" } })
      timeline
        .to(opening, { scale: 1.055, duration: 4.5 }, 0)
        .to(opening, { autoAlpha: 0.16, duration: 0.82 }, 4.02)
        .to(assignmentWorld, { autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 4.1)
        .to(captions[1], { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" }, 4.5)
        .to(captions[1], { autoAlpha: 0, y: -14, duration: 0.45, ease: "power2.in" }, 8.15)
        .to(assignmentWorld, { autoAlpha: 0, scale: 1.06, duration: 0.85, ease: "power2.in" }, 8.2)
        .to(opening, { autoAlpha: 0, duration: 0.4 }, 8.35)
        .to(product, { autoAlpha: 1, scale: 1, xPercent: 0, clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power3.out" }, 8.45)
        .to(captions[2], { autoAlpha: 1, y: 0, duration: 0.58, ease: "power3.out" }, 9)
        .to(product, { scale: 1.018, duration: 4.2 }, 9.1)
        .to(captions[2], { autoAlpha: 0, y: -14, duration: 0.45, ease: "power2.in" }, 12.95)
        .to(product, { autoAlpha: 0, scale: 1.055, duration: 0.75, ease: "power2.in" }, 13.05)
        .to(activity, { autoAlpha: 1, scale: 1, duration: 0.82, ease: "power3.out" }, 13.05)
        .to(captions[3], { autoAlpha: 1, y: 0, duration: 0.62, ease: "power3.out" }, 13.5)
        .to(activity, { scale: 1.025, duration: 4.5 }, 13.5)

      const trigger = ScrollTrigger.create({
        trigger: section,
        animation: timeline,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * 5.2)}`,
        pin: stage,
        pinSpacing: true,
        scrub: 0.92,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const storyTime = self.progress * 18
          assignmentProgressRef.current = gsap.utils.clamp(0, 1, (storyTime - 4.5) / 4.5)
          setScrubbedTime(openingVideoRef.current, (Math.min(storyTime, 4.5) / 4.5) * 6.7)
          setScrubbedTime(activityVideoRef.current, (gsap.utils.clamp(13.5, 18, storyTime) - 13.5) / 4.5 * 3.92)

          if (self.progress > 0.018 && !engagedRef.current) {
            engagedRef.current = true
            trackLandingEvent(landingAnalyticsEvents.videoEngaged, {
              action: "play",
              video: "hero_product_walkthrough",
            })
          }
          if (self.progress > 0.995 && !completedRef.current) {
            completedRef.current = true
            trackLandingEvent(landingAnalyticsEvents.videoEngaged, {
              action: "complete",
              video: "hero_product_walkthrough",
            })
          }
        },
        onLeave: () => {
          openingVideoRef.current?.pause()
          activityVideoRef.current?.pause()
        },
        onLeaveBack: () => {
          openingVideoRef.current?.pause()
          activityVideoRef.current?.pause()
        },
      })

      const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh())
      return () => {
        window.cancelAnimationFrame(refreshFrame)
        trigger.kill()
        timeline.kill()
        assignmentProgressRef.current = 0
      }
    },
    { scope: sectionRef, dependencies: [desktop, reducedMotion], revertOnUpdate: true },
  )

  return (
    <section
      ref={sectionRef}
      id="top"
      className={`dpl-hero dpl-cinematic-hero${reducedMotion ? " is-reduced" : ""}`}
      data-landing-section="hero"
    >
      <div ref={stageRef} className="dpl-cinematic-hero__stage">
        <div className="dpl-cinematic-hero__desktop" aria-hidden={!desktop}>
          <div className="dpl-cinematic-hero__layer dpl-cinematic-hero__opening" data-hero-layer="opening">
            <video
              ref={openingVideoRef}
              muted
              playsInline
              preload="auto"
              poster="/assets/video/diana-first-line-girl-poster-desktop-1600x900.webp"
              aria-hidden="true"
            >
              <source src="/assets/video/diana-first-line-girl-desktop-1920x1080.mp4" type="video/mp4" />
            </video>
          </div>

          <div className="dpl-cinematic-hero__layer dpl-cinematic-hero__world" data-hero-layer="assignment-world">
            <div className="dpl-cinematic-hero__world-wash" />
            {webglEligible ? (
              <AssignmentWorld active={stageVisible && documentVisible} progressRef={assignmentProgressRef} />
            ) : (
              <div className="dpl-cinematic-hero__paper-fallback" aria-hidden="true">
                {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
              </div>
            )}
          </div>

          <div className="dpl-cinematic-hero__layer dpl-cinematic-hero__product" data-hero-layer="product">
            <figure>
              <img
                src={heroProductProof.src}
                width={heroProductProof.width}
                height={heroProductProof.height}
                alt={heroProductProof.alt}
              />
            </figure>
          </div>

          <div className="dpl-cinematic-hero__layer dpl-cinematic-hero__activity" data-hero-layer="activity">
            <video
              ref={activityVideoRef}
              muted
              playsInline
              preload="metadata"
              poster="/assets/help-modes/show-up-for-your-club-poster.webp"
              aria-hidden="true"
            >
              <source src="/assets/help-modes/show-up-for-your-club.webm" type="video/webm" />
              <source src="/assets/help-modes/show-up-for-your-club.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        <div className="dpl-cinematic-hero__mobile" aria-hidden={desktop}>
          <video
            ref={mobileVideoRef}
            muted
            playsInline
            preload="metadata"
            poster="/assets/landing-10k/hero/homework-fits-life-mobile-poster.webp"
            onTimeUpdate={(event) => {
              const nextBeat = Math.min(heroBeats.length - 1, Math.floor(event.currentTarget.currentTime / 4.5))
              setMobileBeat(nextBeat)
            }}
            onEnded={() => {
              setMobileBeat(heroBeats.length - 1)
              trackLandingEvent(landingAnalyticsEvents.videoEngaged, {
                action: "complete",
                video: "hero_product_walkthrough",
              })
            }}
            aria-hidden="true"
          >
            <source media="(min-width: 768px)" src="/assets/landing-10k/hero/homework-fits-life-tablet.webm" type="video/webm" />
            <source media="(min-width: 768px)" src="/assets/landing-10k/hero/homework-fits-life-tablet.mp4" type="video/mp4" />
            <source src="/assets/landing-10k/hero/homework-fits-life-mobile.webm" type="video/webm" />
            <source src="/assets/landing-10k/hero/homework-fits-life-mobile.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="dpl-shell dpl-cinematic-hero__captions" aria-hidden="true">
          {heroBeats.map((beat) => (
            <p key={beat.id} data-hero-caption={beat.id}>{beat.caption}</p>
          ))}
        </div>

        <div className="dpl-shell dpl-cinematic-hero__mobile-captions" aria-hidden="true">
          {heroBeats.slice(1).map((beat, index) => (
            <p key={beat.id} className={mobileBeat === index + 1 ? "is-active" : ""}>{beat.caption}</p>
          ))}
        </div>

      </div>
    </section>
  )
}
