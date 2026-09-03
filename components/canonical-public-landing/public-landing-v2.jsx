"use client"

import { useEffect, useRef, useState } from "react"
import { useGSAP } from "@gsap/react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  ArrowRight,
  Check,
  Menu,
  Pause,
  Play,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  landingAnalyticsEvents,
  trackLandingEvent,
} from "./analytics"
import { siteConfig } from "./config/site"

gsap.registerPlugin(useGSAP, ScrollTrigger)

const navItems = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#why-diana", label: "Why Diana" },
  { href: "#help-modes", label: "Help Modes" },
  { href: "#your-control", label: "Your Control" },
]

const helpModes = [
  {
    id: "directions",
    title: "Turn Directions Into Steps",
    outcome: "Find the first step",
    mediaType: "image",
    src: "/assets/help-fit/decode-the-ask.webp",
    poster: "/assets/help-fit/decode-the-ask.webp",
    objectPosition: "center center",
    alt: "Student highlighting assignment directions and organizing the first steps",
  },
  {
    id: "notes",
    title: "Use Your Class Notes",
    outcome: "Use evidence you already have",
    mediaType: "image",
    src: "/assets/help-fit/use-your-sources.webp",
    poster: "/assets/help-fit/use-your-sources.webp",
    objectPosition: "center center",
    alt: "Student comparing class notes with source material at a study table",
  },
  {
    id: "practice",
    title: "Study Lab",
    outcome: "Practice before the real problem",
    mediaType: "image",
    src: "/assets/help-fit/practice-safely.webp",
    poster: "/assets/help-fit/practice-safely.webp",
    objectPosition: "center center",
    alt: "Student practicing a problem with a tablet in a modern study space",
  },
  {
    id: "rubric",
    title: "Check Against the Rubric",
    outcome: "Know what to improve",
    mediaType: "image",
    src: "/assets/help-fit/check-against-rubric.webp",
    poster: "/assets/help-fit/check-against-rubric.webp",
    objectPosition: "center center",
    alt: "Student checking written work against a rubric beside a laptop",
  },
  {
    id: "tonight",
    title: "Plan Tonight",
    outcome: "Make a plan that fits today",
    mediaType: "image",
    src: "/assets/help-fit/plan-your-time.webp",
    poster: "/assets/help-fit/plan-your-time.webp",
    objectPosition: "center center",
    alt: "Student planning homework tasks in a paper planner beside a tablet",
  },
  {
    id: "game",
    title: "Make the Game",
    outcome: "Finish homework and make tipoff",
    mediaType: "video",
    src: "/assets/help-modes/make-the-game.mp4",
    poster: "/assets/help-modes/make-the-game-poster.webp",
    objectPosition: "center center",
    alt: "High school student practicing basketball on an outdoor court",
  },
  {
    id: "club",
    title: "Show Up for Your Club",
    outcome: "Get unstuck and make rehearsal",
    mediaType: "video",
    src: "/assets/help-modes/show-up-for-your-club.mp4",
    poster: "/assets/help-modes/show-up-for-your-club-poster.webp",
    objectPosition: "center center",
    alt: "Student singer rehearsing with a school music group",
  },
  {
    id: "student-edition",
    title: "Diana Student Edition 01",
    outcome: "Homework that fits your life",
    mediaType: "cover",
    src: "",
    poster: "",
    objectPosition: "center center",
    alt: "Diana Student Edition 01 magazine cover featuring students and the headline Homework That Fits Your Life",
  },
]

const helpModeSceneTimes = [2.48, 3.45, 4.45, 5.45, 6.45, 7.45, 8.45, 9.45]

const subjects = [
  { label: "Math", task: "Start the first step", accent: "#dfff4a", image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=640&q=82" },
  { label: "English", task: "Find your evidence", accent: "#e8defe", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=640&q=82" },
  { label: "Biology", task: "Organize the lab", accent: "#75f0a2", image: "https://images.pexels.com/photos/16328884/pexels-photo-16328884.jpeg?auto=compress&cs=tinysrgb&w=640" },
  { label: "Chemistry", task: "Check your reasoning", accent: "#8fe7ff", image: "https://images.pexels.com/photos/8325948/pexels-photo-8325948.jpeg?auto=compress&cs=tinysrgb&w=640" },
  { label: "Physics", task: "Work through the problem", accent: "#a78bfa", image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=640&q=82" },
  { label: "History", task: "Compare sources", accent: "#e4b36b", image: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=640&q=82" },
  { label: "Languages", task: "Practice a response", accent: "#ffb5d0", image: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=640&q=82" },
  { label: "Computer Science", task: "Build the program", accent: "#67e8f9", image: "https://images.unsplash.com/photo-1742811631376-6e6a72f29181?auto=format&fit=crop&w=640&q=82" },
  { label: "Art", task: "Develop the concept", accent: "#f8d94a", image: "https://images.pexels.com/photos/5907793/pexels-photo-5907793.jpeg?auto=compress&cs=tinysrgb&w=640" },
  { label: "Music", task: "Practice the passage", accent: "#c6f6d5", image: "https://images.unsplash.com/photo-1511132081771-2a63dab7b512?auto=format&fit=crop&w=640&q=82" },
  { label: "Economics", task: "Read the trend", accent: "#dfff4a", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=640&q=82" },
  { label: "AP", task: "Plan the response", accent: "#fef08a", image: "https://images.unsplash.com/photo-1769794371055-54436b54577e?auto=format&fit=crop&w=640&q=82" },
]

const subjectCarousel = [...subjects, ...subjects]

const ownershipScenes = [
  {
    title: "Diana Guides",
    body: "Get a clear next step, based on the assignment in front of you.",
    image: "https://images.pexels.com/photos/5311450/pexels-photo-5311450.jpeg?auto=compress&cs=tinysrgb&w=1800",
    alt: "A tutor points to a student's homework while they study together.",
    position: "center 52%",
  },
  {
    title: "You Write",
    body: "Your notes, ideas, and revisions become the response.",
    image: "https://images.pexels.com/photos/6929269/pexels-photo-6929269.jpeg?auto=compress&cs=tinysrgb&w=1800",
    alt: "Close-up of a student writing notes by hand in a notebook.",
    position: "center 38%",
  },
  {
    title: "You Decide",
    body: "Review or turn in only when it is ready.",
    image: "/assets/homework/diana-ownership-decide-latina-student.png",
    alt: "Smiling Latina college-age student reviewing her work at a laptop.",
    position: "center center",
  },
]

const workspaceSteps = [
  ["Bring in the assignment", "Connect school accounts or upload a PDF, photo, or paper assignment."],
  ["See the next move", "Keep the class context, directions, and first useful action in the same place."],
  ["Work with help in view", "Use notes, practice, and rubric checks without losing your draft or your place."],
  ["Choose when to turn in", "Guidance stays separate from your writing. You decide when the work is ready."],
]

const coachHotspots = [
  {
    id: "assignment",
    label: "Your first move",
    body: "See what to start with now, with the assignment already in view.",
    x: "20.8%",
    y: "40.5%",
  },
  {
    id: "checkin",
    label: "Check in before work",
    body: "Let your plan account for energy and sleep today.",
    x: "20.5%",
    y: "60%",
  },
  {
    id: "live-help",
    label: "Live help",
    body: "Talk through the work when you are stuck.",
    x: "55%",
    y: "45%",
  },
  {
    id: "week",
    label: "Needs attention",
    body: "Keep important work from getting lost.",
    x: "80%",
    y: "27%",
  },
  {
    id: "progress",
    label: "This week",
    body: "See progress before deadlines pile up.",
    x: "58.4%",
    y: "70.5%",
  },
]

function scrollToWaitlist(location) {
  trackLandingEvent(landingAnalyticsEvents.ctaClicked, { location })
  const target = document.getElementById("early-access")
  target?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  })
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  return reducedMotion
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const update = () => setMatches(mediaQuery.matches)
    update()
    mediaQuery.addEventListener("change", update)
    return () => mediaQuery.removeEventListener("change", update)
  }, [query])

  return matches
}

function useSectionAnalytics() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll("[data-landing-section]"))
    const seen = new Set()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const section = entry.target.getAttribute("data-landing-section")
          if (!entry.isIntersecting || !section || seen.has(section)) return
          seen.add(section)
          trackLandingEvent(landingAnalyticsEvents.sectionReached, { section })
        })
      },
      { threshold: 0.35 },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])
}

function useHeaderAfterHero() {
  const [headerHidden, setHeaderHidden] = useState(false)

  useEffect(() => {
    const hero = document.getElementById("top")
    if (!hero) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => setHeaderHidden(!entry.isIntersecting),
      { threshold: 0 },
    )

    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  return headerHidden
}

function HeroFilm() {
  const [playing, setPlaying] = useState(true)
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!video) return undefined

    const syncMotionPreference = () => {
      if (motionQuery.matches) {
        video.pause()
        setPlaying(false)
      } else if (!video.ended) {
        video.play().catch(() => setPlaying(false))
      }
    }

    syncMotionPreference()
    motionQuery.addEventListener("change", syncMotionPreference)
    return () => motionQuery.removeEventListener("change", syncMotionPreference)
  }, [])

  const togglePlayback = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      if (video.ended) video.currentTime = 0
      video.play().catch(() => setPlaying(false))
    } else {
      video.pause()
    }
  }

  return (
    <div className="dpl-hero-film">
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        poster="/assets/hero/diana-hero-film-poster.webp"
        aria-hidden="true"
        onPlay={() => {
          setPlaying(true)
          trackLandingEvent(landingAnalyticsEvents.videoEngaged, { action: "play", video: "hero_film" })
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          trackLandingEvent(landingAnalyticsEvents.videoEngaged, { action: "complete", video: "hero_film" })
        }}
      >
        <source src="/assets/hero/diana-hero-film.webm" type="video/webm" />
        <source src="/assets/hero/diana-hero-film.mp4" type="video/mp4" />
      </video>
      <button
        className="dpl-hero-video-toggle"
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? "Pause hero film" : "Replay hero film"}
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
    </div>
  )
}

function OwnershipFilm() {
  const [activeScene, setActiveScene] = useState(0)

  const selectScene = (index) => {
    setActiveScene(index)
  }

  const revealSceneOnPointer = (event, index) => {
    if (event.pointerType === "mouse") {
      setActiveScene(index)
    }
  }

  return (
    <section
      id="your-control"
      className="dpl-ownership"
      data-landing-section="control"
    >
      <div className="dpl-shell dpl-ownership-intro">
        <div className="dpl-ownership-heading">
          <h2>Your Work Stays Yours</h2>
        </div>
      </div>
      <div className="dpl-shell">
        <div className="dpl-ownership-list">
          {ownershipScenes.map((scene, index) => {
            const isActive = activeScene === index
            const panelId = `ownership-scene-${index}`

            return (
              <article
                key={scene.title}
                className={`dpl-ownership-row${isActive ? " is-active" : ""}`}
                onPointerEnter={(event) => revealSceneOnPointer(event, index)}
              >
                <button
                  type="button"
                  className="dpl-ownership-row-trigger"
                  aria-controls={panelId}
                  aria-expanded={isActive}
                  aria-label={`${scene.title}. ${scene.body} Show image`}
                  onClick={() => selectScene(index)}
                  onFocus={() => setActiveScene(index)}
                >
                  <span className="dpl-ownership-row-description" aria-hidden="true">{scene.body}</span>
                  <span className="dpl-ownership-row-title" aria-hidden="true">
                    {scene.title.split(" ").map((word) => <span key={word}>{word}</span>)}
                  </span>
                </button>
                <div id={panelId} className="dpl-ownership-media" aria-label={`${scene.title} student story`}>
                  <div className="dpl-ownership-media-inner">
                    <figure className="dpl-ownership-image">
                      <img
                        src={scene.image}
                        alt={scene.alt}
                        loading={index === 0 ? "eager" : "lazy"}
                        style={{ objectPosition: scene.position }}
                      />
                    </figure>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function EarlyAccessForm() {
  const [email, setEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [status, setStatus] = useState("idle")
  const [message, setMessage] = useState("")

  const submit = async (event) => {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus("error")
      setMessage("Enter a valid email address to join early access.")
      return
    }

    setStatus("loading")
    setMessage("")
    trackLandingEvent(landingAnalyticsEvents.waitlistStarted, { location: "final" })

    try {
      const supabase = createClient()
      const { error } = await supabase.functions.invoke("early-access-signup", {
        body: { email: email.trim(), website, source: "public_landing" },
      })
      if (error) throw error
      setStatus("success")
      setMessage("You’re on the early-access list. Watch your inbox for the invitation.")
      trackLandingEvent(landingAnalyticsEvents.waitlistSubmitted, { location: "final" })
    } catch {
      setStatus("error")
      setMessage("We could not save your place yet. Please try again in a moment.")
    }
  }

  return (
    <form className="dpl-waitlist-form" onSubmit={submit} noValidate>
      <label htmlFor="early-access-email">Email address</label>
      <div className="dpl-waitlist-row">
        <input
          id="early-access-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-describedby="early-access-message"
          disabled={status === "loading" || status === "success"}
          required
        />
        <button type="submit" disabled={status === "loading" || status === "success"}>
          {status === "loading" ? "Joining..." : status === "success" ? "You’re In" : "Get the First Invite"}
          {status !== "success" && <ArrowRight size={17} strokeWidth={2.25} />}
        </button>
      </div>
      <label className="dpl-honeypot" htmlFor="early-access-website" aria-hidden="true">
        Website
        <input id="early-access-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </label>
      <p id="early-access-message" className={`dpl-form-message dpl-form-message-${status}`} aria-live="polite">
        {message || "One email. Your invite arrives when early access opens."}
      </p>
    </form>
  )
}

function HelpModesPreview() {
  const [activeModeId, setActiveModeId] = useState(helpModes[0].id)
  const [sectionVisible, setSectionVisible] = useState(false)
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const mediaTrackRef = useRef(null)
  const mediaItemRefs = useRef([])
  const videoRefs = useRef([])
  const mobileVisibilityRef = useRef(new Map())
  const scrollCueRef = useRef(null)
  const helpScrollTriggerRef = useRef(null)
  const helpTimelineRef = useRef(null)
  const exploredRef = useRef(false)
  const reducedMotion = useReducedMotion()
  const desktopStory = useMediaQuery("(min-width: 1180px)")
  const activeIndex = Math.max(0, helpModes.findIndex((mode) => mode.id === activeModeId))

  useEffect(() => {
    if (desktopStory && !reducedMotion) setActiveModeId(helpModes[0].id)
  }, [desktopStory, reducedMotion])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => setSectionVisible(entry.isIntersecting),
      { threshold: 0.35 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (desktopStory && !reducedMotion) return

    videoRefs.current.forEach((video, index) => {
      if (!video) return
      if (sectionVisible && !reducedMotion && index === activeIndex) video.play().catch(() => {})
      else video.pause()
    })
  }, [activeIndex, desktopStory, reducedMotion, sectionVisible])

  useEffect(() => {
    const track = mediaTrackRef.current
    if (!track || desktopStory) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute("data-help-mode-index"))
          mobileVisibilityRef.current.set(index, entry.intersectionRatio)
        })

        let bestIndex = 0
        let bestRatio = 0
        mobileVisibilityRef.current.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestIndex = index
          }
        })
        if (bestRatio >= 0.7) setActiveModeId(helpModes[bestIndex].id)
      },
      { root: track, threshold: [0, 0.7, 1] },
    )

    mediaItemRefs.current.forEach((item) => item && observer.observe(item))
    return () => {
      observer.disconnect()
      mobileVisibilityRef.current.clear()
    }
  }, [desktopStory])

  useGSAP(
    () => {
      const stage = stageRef.current
      const track = mediaTrackRef.current
      if (!stage || !track || !desktopStory || reducedMotion) return

      const items = Array.from(track.querySelectorAll("[data-help-mode-index]"))
      const captions = items.map((item) => item.querySelector(".dpl-help-media-caption"))
      const posters = items.map((item) => item.querySelector(".dpl-help-video-poster"))
      const details = Array.from(stage.querySelectorAll("[data-help-mode-detail]"))
      const giantTitle = stage.querySelector(".dpl-help-giant-title")
      const giantKicker = stage.querySelector(".dpl-help-giant-title > span")
      const giantWords = stage.querySelector(".dpl-help-giant-words")
      const giantLetters = Array.from(stage.querySelectorAll(".dpl-help-giant-words strong"))
      const giantLastLine = stage.querySelector(".dpl-help-giant-words strong:last-child")
      const portalTicks = stage.querySelector(".dpl-help-portal-ticks")
      if (
        items.length !== helpModes.length
        || details.length !== helpModes.length
        || captions.some((caption) => !caption)
        || !giantTitle
        || !giantKicker
        || !giantWords
        || giantLetters.length !== 2
        || !giantLastLine
        || !portalTicks
      ) return

      const railOffset = (distance) => 376 + (distance - 1) * 174
      const scenePositions = (sceneIndex) => items.map((_, index) => {
        const distance = Math.abs(index - sceneIndex)
        const isPortal = distance === 0
        const isPast = index < sceneIndex
        return {
          x: isPortal ? 0 : Math.sign(index - sceneIndex) * railOffset(distance),
          y: isPortal ? 0 : isPast ? 354 : 188,
          scale: isPortal ? 1 : isPast ? 0.3 : 0.36,
          opacity: isPortal ? 1 : isPast ? 0.5 : 0.68,
        }
      })

      const initialPositions = scenePositions(0)
      items.forEach((item, index) => {
        gsap.set(item, {
          xPercent: -50,
          ...initialPositions[index],
          transformOrigin: "center top",
          zIndex: index === 0 ? 4 : 1,
        })
        gsap.set(captions[index], { autoAlpha: 0 })
        gsap.set(details[index], { autoAlpha: 0, y: 12 })
        if (posters[index]) gsap.set(posters[index], { autoAlpha: 1 })
      })
      gsap.set(items, { autoAlpha: 0 })
      gsap.set(items[0], { autoAlpha: 0, scale: 0.82, y: 42, clipPath: "inset(0 50% 0 50% round 4px)" })
      gsap.set(giantTitle, { autoAlpha: 1, y: 0 })
      gsap.set(giantKicker, { autoAlpha: 1, scale: 1, transformOrigin: "left top" })
      gsap.set(giantWords, { autoAlpha: 0, x: 180, y: 34, scale: 1, transformOrigin: "left top" })
      gsap.set(giantLetters, { color: "#141835", textShadow: "0 0 0 rgb(196 92 255 / 0)" })
      gsap.set(giantLastLine, { x: 220 })
      gsap.set(portalTicks, { autoAlpha: 0, scale: 0.94 })
      gsap.set(scrollCueRef.current, { autoAlpha: exploredRef.current ? 0 : 1, y: exploredRef.current ? 8 : 0 })

      const setAccessibleMode = (index) => {
        items.forEach((item, itemIndex) => {
          const current = itemIndex === index
          const mode = helpModes[itemIndex]
          if (current) item.setAttribute("aria-current", "true")
          else item.removeAttribute("aria-current")
          item.setAttribute("aria-label", current ? `${mode.title}. ${mode.outcome}` : `Show ${mode.title}`)
        })
      }

      let accessibleIndex = 0
      let playbackKey = ""
      const syncStoryVideo = (index, shouldPlay) => {
        const nextKey = `${index}:${shouldPlay}`
        if (playbackKey === nextKey) return
        playbackKey = nextKey
        videoRefs.current.forEach((video, videoIndex) => {
          if (!video) return
          if (shouldPlay && videoIndex === index) video.play().catch(() => {})
          else video.pause()
        })
      }

      const timeline = gsap.timeline({ defaults: { ease: "none" } })
      const introEnd = 2.48

      timeline
        .to(giantKicker, { letterSpacing: ".13em", duration: 0.24, ease: "power1.out" }, 0.08)
        .to(giantWords, { autoAlpha: 1, x: 0, y: 0, duration: 0.48, ease: "power3.out" }, 0.36)
        .to(giantLetters, {
          color: "#c45cff",
          textShadow: "0 0 10px rgb(255 238 255 / .98), 0 0 34px rgb(196 92 255 / .94), 0 0 64px rgb(159 66 255 / .48)",
          duration: 0.16,
          ease: "power1.out",
        }, 0.86)
        .to(giantWords, { scale: 1.018, duration: 0.16, ease: "power1.out" }, 0.86)
        .to(giantLetters, {
          color: "#141835",
          textShadow: "0 0 0 rgb(196 92 255 / 0)",
          duration: 0.2,
          ease: "power1.inOut",
        }, 1.46)
        .to(giantWords, { scale: 1, duration: 0.2, ease: "power1.inOut" }, 1.46)
        .to(giantTitle, { y: () => -(stage.clientHeight * 0.5 - 102), duration: 0.62, ease: "power3.inOut" }, 1.74)
        .to(giantKicker, { scale: 0.66, letterSpacing: ".09em", duration: 0.62, ease: "power3.inOut" }, 1.74)
        .to(giantWords, { scale: 0.34, duration: 0.62, ease: "power3.inOut" }, 1.74)
        .to(giantLastLine, { x: 0, duration: 0.62, ease: "power3.inOut" }, 1.74)
        .to(portalTicks, { autoAlpha: 1, scale: 1, duration: 0.3 }, 2.18)
        .to(items[0], { autoAlpha: 1, scale: 1, y: 0, clipPath: "inset(0 0 0 0 round 4px)", duration: 0.42, ease: "power2.out" }, 2.12)
        .to(items.slice(1), { autoAlpha: 0.68, duration: 0.32 }, 2.22)
        .to(details[0], { autoAlpha: 1, y: 0, duration: 0.24 }, 2.4)

      if (posters[0]) timeline.to(posters[0], { autoAlpha: 0, duration: 0.12 }, 2.48)

      for (let sceneIndex = 0; sceneIndex < items.length - 1; sceneIndex += 1) {
        const nextIndex = sceneIndex + 1
        const transitionStart = 2.86 + sceneIndex
        const nextPositions = scenePositions(nextIndex)

        timeline.set(items[nextIndex], { zIndex: 6 }, transitionStart)
        timeline.to(items[nextIndex], {
          y: nextPositions[nextIndex].y - 18,
          scale: 0.4,
          opacity: 0.9,
          duration: 0.12,
          ease: "power1.out",
        }, transitionStart)
        timeline.to(details[sceneIndex], { autoAlpha: 0, y: -10, duration: 0.14 }, transitionStart + 0.04)

        items.forEach((item, itemIndex) => {
          const target = {
            x: nextPositions[itemIndex].x,
            y: nextPositions[itemIndex].y,
            scale: nextPositions[itemIndex].scale,
            opacity: nextPositions[itemIndex].opacity,
            duration: 0.48,
            ease: "power2.inOut",
          }
          timeline.to(item, target, transitionStart + 0.12)
        })

        timeline
          .to(items[nextIndex], { scale: 1.018, duration: 0.08, ease: "power1.out" }, transitionStart + 0.57)
          .to(items[nextIndex], { scale: 1, duration: 0.12, ease: "power1.out" }, transitionStart + 0.65)
          .to(details[nextIndex], { autoAlpha: 1, y: 0, duration: 0.2 }, transitionStart + 0.54)

        if (posters[sceneIndex]) timeline.to(posters[sceneIndex], { autoAlpha: 1, duration: 0.1 }, transitionStart + 0.28)
        if (posters[nextIndex]) timeline.to(posters[nextIndex], { autoAlpha: 0, duration: 0.12 }, transitionStart + 0.54)

        timeline.set(items[sceneIndex], { zIndex: 2 }, transitionStart + 0.72)
        timeline.set(items[nextIndex], { zIndex: 4 }, transitionStart + 0.72)
      }

      const finalStart = 9.92
      timeline
        .to(details[helpModes.length - 1], { autoAlpha: 0, y: -10, duration: 0.16 }, finalStart)
        .to(items.filter((_, index) => index !== helpModes.length - 1), { opacity: 0.12, duration: 0.3 }, finalStart)
        .to(items[helpModes.length - 1], { scale: 1.055, duration: 0.42, ease: "power2.inOut" }, finalStart)
        .to(portalTicks, { autoAlpha: 0.28, scale: 1.04, duration: 0.32 }, finalStart + 0.08)
        .to(stage, { opacity: 1, duration: 0.45 }, 10.59)
      helpTimelineRef.current = timeline

      const trigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        animation: timeline,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * 8)}`,
        pin: stage,
        pinSpacing: true,
        scrub: 1.05,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const storyTime = timeline.duration() * self.progress
          const sceneThresholds = helpModes.slice(1).map((_, index) => 3.16 + index)
          const nextAccessibleIndex = sceneThresholds.reduce(
            (index, threshold) => index + (storyTime >= threshold ? 1 : 0),
            0,
          )
          if (nextAccessibleIndex !== accessibleIndex) {
            accessibleIndex = nextAccessibleIndex
            setAccessibleMode(accessibleIndex)
            setActiveModeId(helpModes[accessibleIndex].id)
          }
          if (!exploredRef.current && self.progress > 0.025) {
            exploredRef.current = true
            gsap.set(scrollCueRef.current, { autoAlpha: 0, y: 8 })
          }
          sectionRef.current?.setAttribute("data-animation-active", String(self.isActive))
          syncStoryVideo(accessibleIndex, self.isActive && storyTime >= introEnd && storyTime < finalStart + 0.3)
        },
        onEnter: () => syncStoryVideo(accessibleIndex, true),
        onEnterBack: () => syncStoryVideo(accessibleIndex, true),
        onLeave: () => syncStoryVideo(-1, false),
        onLeaveBack: () => syncStoryVideo(-1, false),
      })

      helpScrollTriggerRef.current = trigger
      const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh())

      return () => {
        window.cancelAnimationFrame(refreshFrame)
        helpScrollTriggerRef.current = null
        helpTimelineRef.current = null
        sectionRef.current?.setAttribute("data-animation-active", "false")
        syncStoryVideo(-1, false)
      }
    },
    { scope: sectionRef, dependencies: [desktopStory, reducedMotion], revertOnUpdate: true },
  )

  const selectMode = (mode, index) => {
    const trigger = helpScrollTriggerRef.current
    const timeline = helpTimelineRef.current
    if (desktopStory && !reducedMotion && trigger && timeline) {
      const progress = Math.min(1, helpModeSceneTimes[index] / timeline.duration())
      window.scrollTo({
        top: trigger.start + (trigger.end - trigger.start) * progress,
        behavior: "smooth",
      })
      return
    }
    setActiveModeId(mode.id)
    mediaItemRefs.current[index]?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "start",
    })
  }

  const selectRelativeMode = (offset) => {
    const nextIndex = Math.min(helpModes.length - 1, Math.max(0, activeIndex + offset))
    selectMode(helpModes[nextIndex], nextIndex)
  }

  return (
    <section ref={sectionRef} id="help-modes" className={`dpl-help${desktopStory && !reducedMotion ? " is-scroll-story" : ""}`} data-landing-section="help_modes">
      <div ref={stageRef} className="dpl-shell dpl-help-stage">
        <div className="dpl-help-giant-title" aria-hidden="true">
          <span>Help That Fits</span>
          <div className="dpl-help-giant-words">
            <strong>Choose Your</strong>
            <strong>Help Mode</strong>
          </div>
        </div>

        <div className="dpl-help-editorial">
          <h2><span>Choose Your</span>{" "}<span>Help Mode</span></h2>
          <div className="dpl-help-mode-details" aria-hidden="true">
            {helpModes.map((mode, index) => (
              <div key={mode.id} data-help-mode-detail={index} className="dpl-help-mode-detail">
                <strong>{mode.title}</strong>
                <span>{mode.outcome}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dpl-help-portal-ticks" aria-hidden="true">
          <span /><span /><span /><span />
        </div>

        <div ref={mediaTrackRef} className="dpl-help-media-track" role="group" aria-label="Homework help modes">
          {helpModes.map((mode, index) => {
            const slot = index - activeIndex
            const active = slot === 0
            const loadVideo = sectionVisible && active
            const railOffset = active ? 0 : Math.sign(slot) * (360 + (Math.abs(slot) - 1) * 178)

            return (
              <button
                key={mode.id}
                ref={(node) => { mediaItemRefs.current[index] = node }}
                type="button"
                data-help-mode-index={index}
                className={`dpl-help-media-item${mode.mediaType === "cover" ? " is-cover" : ""} ${active ? "is-active" : slot < 0 ? "is-past" : "is-upcoming"}`}
                style={{
                  "--dpl-help-slot": slot,
                  "--dpl-help-rail-offset": `${railOffset}px`,
                  "--dpl-help-object-position": mode.objectPosition,
                }}
                aria-current={active ? "true" : undefined}
                aria-label={active ? `${mode.title}. ${mode.outcome}` : `Show ${mode.title}`}
                onClick={() => selectMode(mode, index)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault()
                    selectRelativeMode(-1)
                  }
                  if (event.key === "ArrowRight") {
                    event.preventDefault()
                    selectRelativeMode(1)
                  }
                }}
              >
                <span className="dpl-help-media-window">
                  {mode.mediaType === "cover" ? (
                    <span className="dpl-help-magazine" role="img" aria-label={mode.alt}>
                      <span className="dpl-help-magazine-header">
                        <small>Student Edition 01</small>
                        <strong>Diana</strong>
                      </span>
                      <span className="dpl-help-magazine-cast" aria-hidden="true">
                        <img src="/assets/help-fit/decode-the-ask.webp" alt="" />
                        <img src="/assets/help-fit/use-your-sources.webp" alt="" />
                        <img src="/assets/help-fit/plan-your-time.webp" alt="" />
                      </span>
                      <span className="dpl-help-magazine-headline">Homework That Fits Your Life</span>
                    </span>
                  ) : mode.mediaType === "video" && !reducedMotion ? (
                    <>
                      <video
                        ref={(node) => { videoRefs.current[index] = node }}
                        poster={mode.poster}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        aria-label={mode.alt}
                      >
                        {loadVideo ? (
                          <>
                            <source src={mode.src.replace(/\.mp4$/, ".webm")} type="video/webm" />
                            <source src={mode.src} type="video/mp4" />
                          </>
                        ) : null}
                      </video>
                      <img
                        className="dpl-help-video-poster"
                        src={mode.poster}
                        alt=""
                        aria-hidden="true"
                        decoding="async"
                      />
                    </>
                  ) : (
                    <img
                      src={mode.poster || mode.src}
                      alt={mode.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </span>
                <span className="dpl-help-media-caption">
                  <strong>{mode.title}</strong>
                  <small>{mode.outcome}</small>
                </span>
              </button>
            )
          })}
        </div>

        <p ref={scrollCueRef} className="dpl-help-scroll-cue" aria-hidden="true">Scroll to explore</p>
      </div>
    </section>
  )
}

export default function PublicLandingV2() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeHotspot, setActiveHotspot] = useState(null)
  const headerHidden = useHeaderAfterHero()
  useSectionAnalytics()

  useEffect(() => {
    if (headerHidden) setMenuOpen(false)
  }, [headerHidden])

  const closeMenu = () => setMenuOpen(false)
  const activeCoachHotspot = coachHotspots.find((hotspot) => hotspot.id === activeHotspot)

  return (
    <div className="dpl-page">
      <header className={`dpl-header${headerHidden ? " is-hidden" : ""}`} aria-hidden={headerHidden}>
        <div className="dpl-shell dpl-header-inner">
          <a className="dpl-brand" href="#top" onClick={closeMenu} aria-label="Diana home">
            <img src="/screendesign/brand/diana-logo-tight-dark-wordmark.png" alt="Diana" />
          </a>
          <nav className="dpl-nav" aria-label="Primary navigation">
            {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
          </nav>
          <button className="dpl-header-cta" type="button" onClick={() => scrollToWaitlist("header")}>Get Early Access</button>
          <button
            className="dpl-menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="dpl-mobile-navigation"
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
        {menuOpen && (
          <nav id="dpl-mobile-navigation" className="dpl-mobile-nav" aria-label="Mobile navigation">
            {navItems.map((item) => <a key={item.href} href={item.href} onClick={closeMenu}>{item.label}</a>)}
            <button type="button" onClick={() => { closeMenu(); scrollToWaitlist("mobile_navigation") }}>Get Early Access</button>
          </nav>
        )}
      </header>

      <main id="main-content">
        <section id="top" className="dpl-hero" data-landing-section="hero">
          <HeroFilm />
          <div className="dpl-shell dpl-hero-overlay">
            <div className="dpl-hero-copy">
              <p className="dpl-kicker">Homework Help Built Around Your Assignment</p>
              <h1>Stuck on homework?</h1>
              <p className="dpl-hero-body">Diana keeps the assignment, directions, notes, and help together, then shows the next move without doing the work for you.</p>
              <div className="dpl-hero-actions">
                <button type="button" className="dpl-primary-button" onClick={() => scrollToWaitlist("hero")}>Get Early Access <ArrowRight size={18} /></button>
              </div>
              <p className="dpl-hero-launch">Early access opens November 1, 2026</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="dpl-workspace dpl-shell" data-landing-section="workspace">
          <div className="dpl-section-intro">
            <h2>Your Homework Workspace</h2>
          </div>
          <div className="dpl-workspace-layout">
            <div className="dpl-device-copy">
              <span className="dpl-device-status">Coming to iOS and Android</span>
              <h3>Bring in the assignment</h3>
              <p>Connect Google Classroom, Canvas, or your school portal. Upload PDFs, photos, and paper assignments too.</p>
            </div>
            <div className="dpl-connect-visual">
              <img src="/assets/homework/connect-school-accounts-video-still-clean.png" alt="Google, Canvas, school portal, and homework upload connection options" />
            </div>
          </div>
          <figure className="dpl-workspace-screen">
            <img
              src="/assets/homework/diana-workspace-source-analysis-today.png"
              alt="Diana's source-analysis workspace with assignment steps, a Diana guidance prompt, a work area, and review controls visible together"
              loading="lazy"
              decoding="async"
            />
          </figure>
          <div className="dpl-workspace-steps">
            {workspaceSteps.map(([title, body]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
          <div className="dpl-subjects">
            <div>
              <h3>Every Subject, Same Flow</h3>
            </div>
            <div className="dpl-subject-carousel" role="img" aria-label="A moving collection of Diana subject covers showing every class from math and English to art, music, and AP">
              <div className="dpl-subject-row" aria-hidden="true">
                {subjectCarousel.map((subject, index) => (
                  <span key={`${subject.label}-${index}`} className="dpl-subject" style={{ "--dpl-cover-accent": subject.accent, "--dpl-cover-image": `url(\"${subject.image}\")` }}>
                    <span className="dpl-subject-photo" />
                    <span className="dpl-subject-copy"><strong>{subject.label}</strong><small>{subject.task}</small></span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="why-diana" className="dpl-coach" data-landing-section="why_diana">
          <div className="dpl-shell dpl-coach-header">
            <h2>This Isn’t Just a ChatBot</h2>
            <p>Diana sees the assignment, your notes, and what is due. It gives you a next move without writing the response for you.</p>
          </div>
          <div className="dpl-shell dpl-coach-stage">
            <div className="dpl-coach-image-wrap">
              <img src="/assets/dashboard/diana-today-home-screen.png" alt="Diana Today dashboard with a next assignment, daily check-in, and assignment queue" />
              {coachHotspots.map((hotspot, index) => {
                const active = activeHotspot === hotspot.id

                return (
                  <button
                    type="button"
                    key={hotspot.id}
                    className={`dpl-hotspot ${hotspot.id === "live-help" ? "dpl-hotspot--orb" : ""} ${active ? "is-active" : ""}`}
                    style={{ left: hotspot.x, top: hotspot.y, "--dpl-hotspot-delay": `${index * 0.22}s` }}
                    aria-label={`${active ? "Hide" : "Learn about"} ${hotspot.label}`}
                    aria-controls={`coach-hotspot-${hotspot.id}`}
                    aria-expanded={active}
                    onClick={() => setActiveHotspot(active ? null : hotspot.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setActiveHotspot(null)
                    }}
                  >
                    <span aria-hidden="true" />
                    <span id={`coach-hotspot-${hotspot.id}`} className="dpl-hotspot-tooltip" role="tooltip"><strong>{hotspot.label}</strong>{hotspot.body}</span>
                  </button>
                )
              })}
            </div>
            <div id="coach-mobile-hotspot-detail" className={`dpl-mobile-hotspot-detail ${activeCoachHotspot ? "is-visible" : ""}`} aria-live="polite">
              {activeCoachHotspot && <><span aria-hidden="true" /><div><strong>{activeCoachHotspot.label}</strong><p>{activeCoachHotspot.body}</p></div></>}
            </div>
            <p className="dpl-coach-instruction">Explore the points to see how Diana supports your day.</p>
          </div>
        </section>

        <HelpModesPreview />

        <OwnershipFilm />

        <section id="early-access" className="dpl-early-access" data-landing-section="early_access">
          <div className="dpl-shell dpl-early-access-content">
            <p className="dpl-kicker">Early Access Opens November 1, 2026</p>
            <h2>Get the First Invite</h2>
            <EarlyAccessForm />
          </div>
        </section>
      </main>

      <footer className="dpl-footer">
        <div className="dpl-shell dpl-footer-inner">
          <div className="dpl-footer-brand">
            <img src="/screendesign/brand/diana-logo-tight.png" alt="Diana" />
            <p>Homework help that keeps the work yours.</p>
            <p className="dpl-footer-copyright">&copy; 2026 Diana. All rights reserved.</p>
          </div>
          <nav className="dpl-footer-links" aria-label="Legal and support">
            <a href={siteConfig.privacyUrl}>Privacy</a>
            <a href={siteConfig.termsUrl}>Terms</a>
            <a href={siteConfig.safetyUrl}>Trust &amp; Safety</a>
            <a href={siteConfig.accessibilityUrl}>Accessibility</a>
            <a href="mailto:support@diana.app">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
