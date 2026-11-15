"use client"

import { useGSAP } from "@gsap/react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ArrowDown, ArrowUpRight } from "lucide-react"
import { useRef, useState } from "react"
import { landingAnalyticsEvents, trackLandingEvent } from "../analytics"
import styles from "./homework-story.module.css"

gsap.registerPlugin(useGSAP, ScrollTrigger)

const assets = "/assets/landing-10k/hero/story-preview"
const chapters = ["Homework That Fits Your Life", "Homework, Organized", "Ready For The Test"]

// Finish each decode before seeking again; always use the latest scroll target.
function createVideoScrubber(video: HTMLVideoElement) {
  let desired = 0
  let disposed = false
  const seek = () => {
    if (disposed || video.seeking || video.readyState < 1 || !Number.isFinite(video.duration)) return
    const target = Math.min(Math.max(0, desired), Math.max(0, video.duration - 0.06))
    if (Math.abs(video.currentTime - target) < 0.035) return
    try { video.currentTime = target } catch { /* Keep the poster while media loads. */ }
  }
  video.addEventListener("seeked", seek)
  video.addEventListener("loadedmetadata", seek)
  return {
    update(time: number) { desired = time; seek() },
    dispose() {
      disposed = true
      video.pause()
      video.removeEventListener("seeked", seek)
      video.removeEventListener("loadedmetadata", seek)
    },
  }
}

export function HomeworkStory() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const triggerRef = useRef<ScrollTrigger | null>(null)
  const engagedRef = useRef(false)
  const completedRef = useRef(false)
  const [activeBeat, setActiveBeat] = useState(0)
  const [animated, setAnimated] = useState(false)

  useGSAP(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    const video = videoRef.current
    if (!section || !stage || !video) return
    const media = gsap.matchMedia()
    media.add({ motion: "(prefers-reduced-motion: no-preference)", mobile: "(max-width: 767px)" }, (context) => {
      if (!context.conditions?.motion) { setAnimated(false); return }
      const mobile = Boolean(context.conditions.mobile)
      const scenes = Array.from(stage.querySelectorAll<HTMLElement>("[data-story-scene]"))
      const copy = Array.from(stage.querySelectorAll<HTMLElement>("[data-story-copy]"))
      const work = stage.querySelector<HTMLElement>("[data-story-screen='work']")
      const practice = stage.querySelector<HTMLElement>("[data-story-screen='practice']")
      const fills = Array.from(stage.querySelectorAll<HTMLElement>("[data-story-progress]"))
      if (!work || !practice) return
      const source = `${assets}/opening-${mobile ? "mobile" : "desktop"}.mp4`
      if (video.getAttribute("src") !== source) { video.src = source; video.load() }
      const scrubber = createVideoScrubber(video)
      const film = { time: 0 }
      setAnimated(true)
      gsap.set(scenes, { autoAlpha: 0 })
      gsap.set(scenes[0], { autoAlpha: 1 })
      gsap.set(copy, { autoAlpha: 0, y: 22 })
      gsap.set(copy[0], { autoAlpha: 1, y: 0 })
      gsap.set(fills, { scaleX: 0 })
      let lastBeat = -1
      const timeline = gsap.timeline({ defaults: { ease: "none" }, onUpdate: () => {
        const time = timeline.time()
        const beat = time < 4.65 ? 0 : time < 9.65 ? 1 : 2
        if (beat !== lastBeat) { lastBeat = beat; setActiveBeat(beat) }
        scrubber.update(film.time)
        if (time > 0.2 && !engagedRef.current) {
          engagedRef.current = true
          trackLandingEvent(landingAnalyticsEvents.videoEngaged, { action: "play", video: "hero_product_walkthrough" })
        }
        if (time > 14.8 && !completedRef.current) {
          completedRef.current = true
          trackLandingEvent(landingAnalyticsEvents.videoEngaged, { action: "complete", video: "hero_product_walkthrough" })
        }
      } })
      timeline
        .to(film, { time: 4.7, duration: 4.6 }, 0)
        .to(scenes[0], { scale: 1.13, transformOrigin: "76% 60%", duration: 1.3, ease: "power2.inOut" }, 3.35)
        .to(copy[0], { autoAlpha: 0, y: -20, duration: 0.6 }, 3.7)
        .fromTo(scenes[1], { autoAlpha: 1, clipPath: "inset(0% 0% 0% 100%)" }, { autoAlpha: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 1.15, ease: "power2.inOut", immediateRender: false }, 4)
        .set(scenes[0], { autoAlpha: 0 }, 5.15)
        .fromTo(work, { scale: 1.12, yPercent: 8 }, { scale: 1, yPercent: 0, duration: 1.4, ease: "power2.out" }, 4.25)
        .to(copy[1], { autoAlpha: 1, y: 0, duration: 0.65, ease: "power2.out" }, 4.8)
        .to(work, { scale: 1.035, duration: 2.4 }, 6)
        .to(copy[1], { autoAlpha: 0, y: -18, duration: 0.55 }, 8.6)
        .to(work, { scale: 1.12, yPercent: -3, duration: 1.05, ease: "power2.inOut" }, 8.6)
        .fromTo(scenes[2], { autoAlpha: 1, clipPath: "inset(100% 0% 0% 0%)" }, { autoAlpha: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 1.15, ease: "power2.inOut", immediateRender: false }, 9)
        .set(scenes[1], { autoAlpha: 0 }, 10.15)
        .fromTo(practice, { scale: 1.1, yPercent: 6 }, { scale: 1, yPercent: 0, duration: 1.4, ease: "power2.out" }, 9.25)
        .to(copy[2], { autoAlpha: 1, y: 0, duration: 0.65, ease: "power2.out" }, 9.8)
        .to(practice, { scale: 1.02, duration: 2.5 }, 11)
        .to(practice, { scale: 0.98, yPercent: -1, duration: 1.5, ease: "power1.inOut" }, 13.5)
      fills.forEach((fill, index) => timeline.to(fill, { scaleX: 1, duration: 5 }, index * 5))
      const trigger = ScrollTrigger.create({
        trigger: section, animation: timeline,
        start: () => `top top+=${mobile ? 64 : 76}`,
        end: () => `+=${Math.round(window.innerHeight * (mobile ? 3.2 : 3.6))}`,
        pin: stage, scrub: 0.45, anticipatePin: 1, invalidateOnRefresh: true,
      })
      triggerRef.current = trigger
      const frame = requestAnimationFrame(() => ScrollTrigger.refresh())
      return () => {
        cancelAnimationFrame(frame)
        scrubber.dispose()
        triggerRef.current = null
        setAnimated(false)
      }
    })
    return () => media.revert()
  }, { scope: sectionRef })

  function goToBeat(index: number) {
    const trigger = triggerRef.current
    if (!trigger) return
    const fraction = index === 0 ? 0 : (index * 5 + 1.4) / 15
    window.scrollTo({ top: trigger.start + (trigger.end - trigger.start) * fraction, behavior: "instant" })
  }

  return <section ref={sectionRef} id="top" className={styles.hero} data-landing-section="hero" aria-label="Homework with Diana">
    <div ref={stageRef} className={styles.stage} data-story-active={activeBeat} data-story-animated={animated}>
      <article className={`${styles.scene} ${styles.life}`} data-story-scene="life" aria-hidden={animated && activeBeat !== 0}>
        <picture className={styles.openingPoster}>
          <source media="(max-width: 767px)" srcSet="/assets/video/diana-first-line-girl-poster-mobile-720x720.webp" />
          <img src="/assets/video/diana-first-line-girl-poster-desktop-1600x900.webp" width="1600" height="900" alt="A student at her laptop with her schoolwork in front of her" fetchPriority="high" />
        </picture>
        <video ref={videoRef} className={styles.video} muted playsInline preload="metadata" aria-hidden="true" />
        <div className={styles.openingCopy} data-story-copy><h1>Homework<br />That Fits<br />Your Life</h1></div>
      </article>
      <article className={`${styles.scene} ${styles.work}`} data-story-scene="work" aria-hidden={animated && activeBeat !== 1}>
        <div className={styles.productCopy} data-story-copy><h2>{chapters[1]}</h2></div>
        <picture className={styles.productScreen} data-story-screen="work">
          <source media="(max-width: 767px)" srcSet={`${assets}/work-mobile.png`} width="362" height="625" />
          <img src={`${assets}/work-desktop.png`} width="1425" height="800" alt="Diana Work: English 9 first, with algebra, biology quiz practice, and history organized below" />
        </picture>
      </article>
      <article className={`${styles.scene} ${styles.practice}`} data-story-scene="practice" aria-hidden={animated && activeBeat !== 2}>
        <div className={styles.productCopy} data-story-copy><h2>{chapters[2]}</h2></div>
        <picture className={styles.productScreen} data-story-screen="practice">
          <source media="(max-width: 767px)" srcSet={`${assets}/practice-mobile.png`} width="338" height="656" />
          <img src={`${assets}/practice-desktop.png`} width="1425" height="740" alt="Diana practice: a cell biology question, answer choices, and optional hints before test day" />
        </picture>
      </article>
      <div className={styles.storyFooter}>
        <nav className={styles.beatNav} aria-label="Hero chapters">
          {chapters.map((caption, index) => <button key={caption} type="button" onClick={() => goToBeat(index)} aria-label={caption} aria-current={activeBeat === index ? "step" : undefined} title={caption}>
            <span className={styles.progressTrack}><span data-story-progress /></span>
          </button>)}
        </nav>
        <a className={styles.explore} href="#how-it-works">
          {activeBeat === 2 || !animated ? <>Explore Diana <ArrowUpRight size={19} aria-hidden="true" /></> : <><ArrowDown size={22} aria-hidden="true" /><span className="sr-only">Explore Diana</span></>}
        </a>
      </div>
    </div>
  </section>
}
