"use client"

import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  coachStory,
  finalCta,
  hero,
  navigation,
  systemProof,
  tonightScenario,
  transformations,
} from './data/dianaStory'
import { siteConfig } from './config/site'
import { landingAnalyticsEvents, trackLandingEvent } from './analytics'
import { useMotion } from './motion'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RotateCcw, Volume2, VolumeX } from 'lucide-react'

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger)

function trackSignupClick(location) {
  trackLandingEvent(landingAnalyticsEvents.ctaClicked, { location })
}

function trackLoginClick(location) {
  trackLandingEvent(landingAnalyticsEvents.loginClicked, { location })
}

function Brand({ footer = false }) {
  const darkWordmarkLogo = '/screendesign/brand/diana-logo-tight-dark-wordmark.png'
  const lightWordmarkLogo = '/screendesign/brand/diana-logo-tight-no-shadow.png'

  return (
    <span className={`bb-brand ${footer ? 'bb-brand--footer' : ''}`}>
      {footer ? (
        <img
          alt=""
          aria-hidden="true"
          height="301"
          src={lightWordmarkLogo}
          width="950"
        />
      ) : (
        <>
          <img
            alt=""
            aria-hidden="true"
            className="bb-brand__logo bb-brand__logo--dark"
            height="301"
            src={darkWordmarkLogo}
            width="950"
          />
          <img
            alt=""
            aria-hidden="true"
            className="bb-brand__logo bb-brand__logo--light"
            height="301"
            src={lightWordmarkLogo}
            width="950"
          />
        </>
      )}
    </span>
  )
}

function DianaPortrait({ className = '' }) {
  return (
    <picture className={className} aria-hidden="true">
      <source
        media="(max-width: 760px)"
        srcSet="/assets/hero/diana-reference-robot-mobile-420x540.webp"
      />
      <img
        alt=""
        aria-hidden="true"
        decoding="async"
        height="978"
        src="/assets/hero/diana-reference-robot-desktop-760x978.webp"
        width="760"
      />
    </picture>
  )
}

function Header({ tone = 'light' }) {
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const navRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    const focusable = Array.from(navRef.current?.querySelectorAll('a, button') ?? [])
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => focusable[0]?.focus())

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        window.requestAnimationFrame(() => menuButtonRef.current?.focus())
        return
      }
      if (event.key !== 'Tab' || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const close = () => setOpen(false)
  return (
    <header className={`bb-header ${tone === 'dark' ? 'is-on-dark' : ''} ${open ? 'is-menu-open' : ''}`}>
      <a href={`#${hero.id}`} aria-label="Diana home" onClick={close}><Brand /></a>

      {open && (
        <button
          aria-label="Close navigation backdrop"
          className="bb-menu-scrim"
          onClick={close}
          tabIndex={-1}
          type="button"
        />
      )}

      <nav
        className={`bb-nav ${open ? 'is-open' : ''}`}
        id="primary-navigation"
        aria-label="Primary navigation"
        ref={navRef}
      >
        {navigation.links.map((link) => (
          <a
            href={link.href}
            key={link.id}
            onClick={close}
          >
            {link.label}
          </a>
        ))}
        <a
          className="bb-nav__login"
          href={siteConfig.loginUrl}
          onClick={() => {
            trackLoginClick('mobile_navigation')
            close()
          }}
        >Sign In</a>
        <a
          className="bb-nav__mobile-action"
          href={siteConfig.signupUrl}
          onClick={() => {
            trackSignupClick('mobile_navigation')
            close()
          }}
        >
          {navigation.cta.label}
        </a>
      </nav>

      <div className="bb-header__actions">
        <a
          className="bb-login-link"
          href={siteConfig.loginUrl}
          onClick={() => trackLoginClick('header')}
        >Sign In</a>
        <a
          className="bb-button bb-button--solid bb-button--small"
          href={siteConfig.signupUrl}
          onClick={() => trackSignupClick('header')}
        >
          {navigation.cta.label}
        </a>
      </div>

      <button
        ref={menuButtonRef}
        aria-controls="primary-navigation"
        aria-expanded={open}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        className="bb-menu"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span /><span />
      </button>
    </header>
  )
}

function SplitFilmHero({ reducedMotion }) {
  return (
    <section
      aria-labelledby={`${hero.id}-title`}
      className="bb-split-hero"
      data-analytics-section="hero"
      data-header-tone="dark"
      id={hero.id}
    >
      <div className="bb-split-hero__copy">
        <h1 id={`${hero.id}-title`}>{hero.headline}</h1>
        <p className="bb-split-hero__body">{hero.body}</p>
        <a
          className="bb-split-hero__cta"
          href={siteConfig.signupUrl}
          onClick={() => trackSignupClick('hero')}
        >
          {hero.primaryCta.label}
          <span aria-hidden="true">&#8594;</span>
        </a>
      </div>

      <div className="bb-split-hero__film" aria-hidden="true">
        <picture className="bb-split-hero__poster">
          <source
            media="(max-width: 760px)"
            srcSet="/assets/video/diana-coach-story-poster-mobile-720x720.webp"
          />
          <img
            alt=""
            height="900"
            src="/assets/video/diana-coach-story-poster-desktop-1600x900.webp"
            width="1600"
          />
        </picture>
        {!reducedMotion && (
          <video autoPlay loop muted playsInline preload="auto">
            <source
              media="(max-width: 760px)"
              src="/assets/video/diana-coach-story-mobile-720x720.mp4"
              type="video/mp4"
            />
            <source
              src="/assets/video/diana-coach-story-desktop-1600x900.mp4"
              type="video/mp4"
            />
          </video>
        )}
      </div>
    </section>
  )
}

function useHashNavigation(rootRef, contentReady) {
  useEffect(() => {
    if (!contentReady) return undefined
    let frame = 0
    let timer = 0

    const placeAndFocusHeading = (
      hash,
      updateHistory = false,
      preserveExistingFocus = false,
    ) => {
      if (!hash || hash === '#') return

      let id
      try {
        id = decodeURIComponent(hash.slice(1))
      } catch {
        return
      }

      const destination = document.getElementById(id)
      if (!destination) return

      if (updateHistory && window.location.hash !== hash) {
        window.history.pushState(null, '', hash)
      }

      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        frame = window.requestAnimationFrame(() => {
          frame = window.requestAnimationFrame(() => {
            const header = document.querySelector('.bb-header')
            const heading = destination.matches('h1, h2')
              ? destination
              : destination.querySelector('h1, h2')
            const focusTarget = heading ?? destination
            const headerBottom = header?.getBoundingClientRect().bottom ?? 0
            const contentCandidates = [
              destination.querySelector('.bb-kicker'),
              focusTarget,
              destination.querySelector('.bb-value-step'),
              destination.querySelector('.bb-control-console'),
            ].filter(Boolean)
            const documentTop = (element) => {
              let top = 0
              let current = element
              while (current) {
                top += current.offsetTop
                current = current.offsetParent
              }
              return top
            }
            const contentTop = Math.min(...contentCandidates.map(documentTop))
            const targetTop = id === hero.id
              ? 0
              : Math.max(0, contentTop - headerBottom - 36)
            const root = document.documentElement
            const previousScrollBehavior = root.style.scrollBehavior
            const activeElement = document.activeElement

            if (
              preserveExistingFocus
              && activeElement !== document.body
              && activeElement !== document.documentElement
            ) return

            focusTarget.setAttribute('tabindex', '-1')
            root.style.scrollBehavior = 'auto'
            focusTarget.focus({ preventScroll: true })
            window.scrollTo(0, targetTop)
            window.requestAnimationFrame(() => {
              root.style.scrollBehavior = previousScrollBehavior
            })
          })
        })
      }, 0)
    }

    const handleAnchorClick = (event) => {
      if (
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) return

      const anchor = event.target.closest('a[href]')
      if (!anchor || anchor.target === '_blank') return

      const url = new URL(anchor.href, window.location.href)
      if (
        !url.hash
        || url.origin !== window.location.origin
        || url.pathname !== window.location.pathname
      ) return

      event.preventDefault()
      placeAndFocusHeading(url.hash, true)
    }

    const handleHistoryNavigation = () => placeAndFocusHeading(window.location.hash)
    const root = rootRef.current
    root?.addEventListener('click', handleAnchorClick)
    window.addEventListener('popstate', handleHistoryNavigation)
    window.addEventListener('hashchange', handleHistoryNavigation)

    const ready = document.fonts?.ready ?? Promise.resolve()
    ready.then(() => {
      const activeElement = document.activeElement
      const pageStillOwnsFocus = activeElement === document.body
        || activeElement === document.documentElement
      if (pageStillOwnsFocus) placeAndFocusHeading(window.location.hash, false, true)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      root?.removeEventListener('click', handleAnchorClick)
      window.removeEventListener('popstate', handleHistoryNavigation)
      window.removeEventListener('hashchange', handleHistoryNavigation)
    }
  }, [contentReady, rootRef])
}

function PlatformAppleIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M16.25 2.35c.04 1.02-.37 2.02-1.09 2.75-.75.78-1.81 1.28-2.84 1.2-.12-.98.38-2.03 1.07-2.72.75-.76 2.01-1.34 2.86-1.23Zm3.23 14.82c-.43.99-.63 1.43-1.19 2.31-.77 1.17-1.86 2.63-3.2 2.64-.66.01-1.1-.19-1.57-.4-.5-.23-1.03-.47-1.87-.47-.87 0-1.43.25-1.94.48-.46.21-.88.39-1.5.42-1.28.05-2.27-1.27-3.05-2.44-1.68-2.55-2.98-7.2-1.24-10.34.86-1.56 2.4-2.55 4.07-2.58.74-.01 1.43.25 2.04.48.47.18.9.34 1.27.34.33 0 .77-.17 1.28-.36.8-.3 1.78-.67 2.83-.55.72.03 2.78.29 4.1 2.23-3.6 1.98-3.03 6.98-.03 8.24Z" />
    </svg>
  )
}

function PlatformAndroidIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M7.35 9.55h9.3c.75 0 1.35.6 1.35 1.35v5.75c0 .75-.6 1.35-1.35 1.35h-.72v2.25c0 .58-.47 1.05-1.05 1.05s-1.05-.47-1.05-1.05V18h-3.66v2.25c0 .58-.47 1.05-1.05 1.05s-1.05-.47-1.05-1.05V18h-.72C6.6 18 6 17.4 6 16.65V10.9c0-.75.6-1.35 1.35-1.35Zm-3.1 1.15c.58 0 1.05.47 1.05 1.05v4.05c0 .58-.47 1.05-1.05 1.05S3.2 16.38 3.2 15.8v-4.05c0-.58.47-1.05 1.05-1.05Zm15.5 0c.58 0 1.05.47 1.05 1.05v4.05c0 .58-.47 1.05-1.05 1.05s-1.05-.47-1.05-1.05v-4.05c0-.58.47-1.05 1.05-1.05ZM7.75 8.3a4.57 4.57 0 0 1 8.5 0h-8.5Zm1.12-3.98a.45.45 0 0 1 .63.07l1 1.22c.46-.15.96-.23 1.5-.23s1.04.08 1.5.23l1-1.22a.45.45 0 0 1 .7.56l-.92 1.13c.7.44 1.24 1.08 1.56 1.86H8.16c.32-.78.86-1.42 1.56-1.86L8.8 4.95a.45.45 0 0 1 .07-.63Zm.83 5.97a.72.72 0 1 0 0 1.44.72.72 0 0 0 0-1.44Zm4.6 0a.72.72 0 1 0 0 1.44.72.72 0 0 0 0-1.44Z" />
    </svg>
  )
}

const subjectCovers = [
  {
    id: 'math',
    label: 'Math',
    accent: '#dfff4a',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=640&q=82',
  },
  {
    id: 'english',
    label: 'English',
    accent: '#e8defe',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=640&q=82',
  },
  {
    id: 'biology',
    label: 'Biology',
    accent: '#75f0a2',
    image: 'https://images.pexels.com/photos/16328884/pexels-photo-16328884.jpeg?auto=compress&cs=tinysrgb&w=640',
  },
  {
    id: 'chemistry',
    label: 'Chemistry',
    accent: '#8fe7ff',
    image: 'https://images.pexels.com/photos/8325948/pexels-photo-8325948.jpeg?auto=compress&cs=tinysrgb&w=640',
  },
  {
    id: 'physics',
    label: 'Physics',
    accent: '#a78bfa',
    image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=640&q=82',
  },
  {
    id: 'history',
    label: 'History',
    accent: '#e4b36b',
    image: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=640&q=82',
  },
  {
    id: 'languages',
    label: 'Languages',
    accent: '#ffb5d0',
    image: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=640&q=82',
  },
  {
    id: 'cs',
    label: 'Computer Science',
    accent: '#67e8f9',
    image: 'https://images.unsplash.com/photo-1742811631376-6e6a72f29181?auto=format&fit=crop&w=640&q=82',
  },
  {
    id: 'art',
    label: 'Art',
    accent: '#f8d94a',
    image: 'https://images.pexels.com/photos/5907793/pexels-photo-5907793.jpeg?auto=compress&cs=tinysrgb&w=640',
  },
  {
    id: 'music',
    label: 'Music',
    accent: '#c6f6d5',
    image: 'https://images.unsplash.com/photo-1511132081771-2a63dab7b512?auto=format&fit=crop&w=640&q=82',
  },
  {
    id: 'economics',
    label: 'Economics',
    accent: '#dfff4a',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=640&q=82',
  },
  {
    id: 'ap',
    label: 'AP',
    accent: '#fef08a',
    image: 'https://images.unsplash.com/photo-1769794371055-54436b54577e?auto=format&fit=crop&w=640&q=82',
  },
]

function SubjectCover({ cover }) {
  return (
    <span
      className="bb-subject-cover"
      style={{
        '--cover-accent': cover.accent,
        '--cover-image': `url("${cover.image}")`,
      }}
    >
      <span className="bb-subject-cover__photo" aria-hidden="true" />
      <span className="bb-subject-cover__label">{cover.label}</span>
    </span>
  )
}

function SubjectCoverRow() {
  return (
    <div className="bb-subject-carousel__row">
      {[...subjectCovers, ...subjectCovers].map((cover, index) => (
        <SubjectCover cover={cover} key={`${cover.id}-${index}`} />
      ))}
    </div>
  )
}

function ScenarioSummary({ reducedMotion }) {
  const summaryRef = useRef(null)

  useGSAP(() => {
    const summary = summaryRef.current
    if (!summary || reducedMotion) return undefined

    const timeline = gsap.fromTo(summary, {
      autoAlpha: 0,
      y: 56,
      scale: .94,
    }, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      ease: 'none',
      duration: 1,
      scrollTrigger: {
        trigger: summary,
        start: 'top 82%',
        end: 'top 35%',
        scrub: .45,
      },
    })

    return () => timeline.kill()
  }, { dependencies: [reducedMotion], scope: summaryRef })

  return (
    <figure className="bb-day-reveal bb-signal-stage" ref={summaryRef}>
      <div className="bb-day-reveal__scene">
        <div className="bb-day-reveal__floor" aria-hidden="true" />
        <div className="bb-day-reveal__video-card">
          <video
            aria-label="Diana homework workspace playing inside a mobile preview."
            autoPlay
            loop
            muted
            playsInline
            poster="/assets/homework/diana-homework-workspace-demo-poster.jpg"
            preload="metadata"
          >
            <source src="/assets/homework/diana-homework-workspace-demo.mp4" type="video/mp4" />
          </video>
          <div className="bb-day-reveal__media-glass" aria-hidden="true" />
        </div>
      </div>
    </figure>
  )
}

function HomeworkExtension() {
  return (
    <div className="bb-homework-extension" aria-label="Ways to bring homework into Diana">
      <article className="bb-homework-extension__item">
        <div className="bb-homework-extension__copy">
          <h3>Bring Homework In</h3>
          <p>
            Connect Google, Canvas, and your school portal. Upload PDFs, photos, or paper
            assignments when needed.
          </p>
        </div>
        <div className="bb-homework-extension__panel bb-homework-extension__panel--connect" aria-hidden="true">
          <div className="bb-connect-image-frame">
            <video
              autoPlay
              loop
              muted
              playsInline
              poster="/assets/homework/connect-school-accounts-video-still-clean.png"
              preload="metadata"
            >
              <source src="/assets/homework/connect-school-accounts-video.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </article>

      <article className="bb-homework-extension__item">
        <div className="bb-homework-extension__copy">
          <h3>Every Subject Fits</h3>
          <p>
            Math, English, science, history, languages, electives, and AP work all live in one
            focused workspace.
          </p>
        </div>
        <div className="bb-homework-extension__panel bb-homework-extension__panel--subjects" aria-label="Subject cover library showing Diana supports every class." role="img">
          <div className="bb-subject-carousel" aria-hidden="true">
            <SubjectCoverRow />
          </div>
        </div>
      </article>
    </div>
  )
}

function CoachStory() {
  const todayDashboard = coachStory.dashboard

  return (
    <div className="bb-coach-story bb-coach-story--today">
      <div className="bb-coach-story__copy">
        {coachStory.eyebrow ? <p className="bb-kicker">{coachStory.eyebrow}</p> : null}
        <h2>{coachStory.headline}</h2>
        {coachStory.body ? <p>{coachStory.body}</p> : null}
      </div>

      <figure className="bb-coach-today-shot">
        <div className="bb-coach-today-shot__bar" aria-hidden="true">
          <span>Diana Today</span>
          <i />
        </div>
        <figcaption>Hover or tap the glowing points to see what makes Diana different.</figcaption>
        <div className="bb-coach-today-shot__frame">
          <img
            alt={todayDashboard.alt}
            height={todayDashboard.height}
            loading="lazy"
            src={todayDashboard.src}
            width={todayDashboard.width}
          />
          <div className="bb-coach-hotspots" aria-label="Why Diana is different">
            {coachStory.hotspots.map((hotspot) => (
              <button
                aria-label={`${hotspot.label}: ${hotspot.body}`}
                className="bb-coach-hotspot"
                key={hotspot.id}
                style={{
                  '--hotspot-x': `${hotspot.x}%`,
                  '--hotspot-y': `${hotspot.y}%`,
                }}
                type="button"
              >
                <span className="bb-coach-hotspot__dot" aria-hidden="true" />
                <span className="bb-coach-hotspot__panel">
                  <strong>{hotspot.label}</strong>
                  <span>{hotspot.body}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        {coachStory.closingPhrases?.length ? (
          <p
            aria-label={`${coachStory.closingPhrases.join('. ')}.`}
            className="bb-coach-today-shot__closing"
          >
            {coachStory.closingPhrases.map((phrase, index) => (
              <span
                aria-hidden="true"
                key={phrase}
                style={{ '--closing-index': index }}
              >
                {phrase}
              </span>
            ))}
          </p>
        ) : null}
      </figure>
    </div>
  )
}

function HelpModeCover({ item }) {
  return (
    <>
      <span className="bb-help-fit-card__media" aria-hidden="true">
        <img
          alt=""
          decoding="async"
          height="1672"
          loading="lazy"
          src={item.image.src}
          width="941"
        />
      </span>
      <span className="bb-help-fit-card__sheen" aria-hidden="true" />
    </>
  )
}

function HelpThatFits({ story }) {
  const [activeHelpId, setActiveHelpId] = useState(story.items[0]?.id)

  return (
    <div className="bb-values-story bb-help-fit">
      <div className="bb-section-intro bb-help-fit__intro">
        {story.eyebrow ? <p className="bb-kicker">{story.eyebrow}</p> : null}
        <h2>{story.headline}</h2>
        {story.body ? <p className="bb-section-intro__body">{story.body}</p> : null}
      </div>

      <div
        aria-label="Diana help modes"
        className="bb-value-grid bb-help-fit__gallery"
        role="group"
      >
        {story.items.map((item, index) => {
          const isActive = activeHelpId === item.id

          return (
            <button
              aria-expanded={isActive}
              aria-label={`${item.title}. ${item.body}`}
              className={`bb-help-fit-card${isActive ? ' is-active' : ''}`}
              key={item.id}
              onClick={() => setActiveHelpId(item.id)}
              onFocus={() => setActiveHelpId(item.id)}
              onMouseEnter={() => setActiveHelpId(item.id)}
              style={{
                '--help-accent': item.accent,
                '--help-accent-rgb': item.accentRgb,
                '--help-index': index,
              }}
              type="button"
            >
              <span aria-hidden="true" className="bb-help-fit-card__chrome" />
              <span className="bb-help-fit-card__copy">
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </span>
              <HelpModeCover item={item} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ControlVideoScene({ reducedMotion, story }) {
  const filmRef = useRef(null)
  const videoRef = useRef(null)
  const hasStartedRef = useRef(false)
  const hasEndedRef = useRef(false)
  const isVisibleRef = useRef(false)
  const [hasEnded, setHasEnded] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const descriptionId = `${story.id}-film-description`

  useEffect(() => {
    const film = filmRef.current
    const video = videoRef.current
    if (!video) return undefined

    if (reducedMotion) {
      video.pause()
      video.currentTime = 0
      hasStartedRef.current = false
      hasEndedRef.current = false
      isVisibleRef.current = false
      return undefined
    }

    const playWhenVisible = () => {
      if (hasEndedRef.current) return
      if (!hasStartedRef.current) {
        video.currentTime = 0
        hasStartedRef.current = true
        setHasEnded(false)
      }
      video.play().catch(() => undefined)
    }

    if (!film || !('IntersectionObserver' in window)) {
      isVisibleRef.current = true
      playWhenVisible()
      return undefined
    }

    let wasVisible = false
    const observer = new IntersectionObserver(([entry]) => {
      const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.52
      if (isVisible === wasVisible) return

      wasVisible = isVisible
      isVisibleRef.current = isVisible
      if (isVisible) playWhenVisible()
      else video.pause()
    }, {
      threshold: [0, 0.52, 1],
    })

    observer.observe(film)
    return () => observer.disconnect()
  }, [reducedMotion])

  const replayFilm = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    hasStartedRef.current = true
    hasEndedRef.current = false
    setHasEnded(false)
    video.play().catch(() => undefined)
  }

  const toggleSound = () => {
    const video = videoRef.current
    if (!video) return
    const nextMuted = !isMuted
    video.muted = nextMuted
    setIsMuted(nextMuted)
    if (!nextMuted && !hasEndedRef.current && isVisibleRef.current && !video.ended) {
      video.play().catch(() => undefined)
    }
  }

  const finishFilm = () => {
    const video = videoRef.current
    if (!video) return
    const endAt = story.visual.endAt

    video.pause()
    if (Number.isFinite(endAt) && Math.abs(video.currentTime - endAt) > 0.04) {
      video.currentTime = endAt
    }
    hasEndedRef.current = true
    setHasEnded(true)
  }

  const handleTimeUpdate = () => {
    const video = videoRef.current
    const endAt = story.visual.endAt
    if (!video || !Number.isFinite(endAt) || video.currentTime < endAt) return
    finishFilm()
  }

  return (
    <figure className="bb-control-film" ref={filmRef}>
      <div className="bb-control-film__backdrop" aria-hidden="true" />
      <div className="bb-control-film__stage">
        {reducedMotion ? (
          <picture>
            <source media="(max-width: 760px)" srcSet={story.visual.mobilePoster} />
            <img src={story.visual.poster} alt={story.visual.alt} />
          </picture>
        ) : (
          <video
            aria-describedby={descriptionId}
            aria-label={story.visual.alt}
            muted={isMuted}
            onEnded={finishFilm}
            onTimeUpdate={handleTimeUpdate}
            playsInline
            poster={story.visual.poster}
            preload="metadata"
            ref={videoRef}
          >
            <source media="(max-width: 760px)" src={story.visual.mobileSrc} type="video/webm" />
            <source src={story.visual.desktopSrc} type="video/webm" />
          </video>
        )}
        {!reducedMotion ? (
          <div className="bb-control-film__controls">
            {hasEnded ? (
              <button
                aria-label="Replay film"
                className="bb-control-film__control"
                onClick={replayFilm}
                title="Replay film"
                type="button"
              >
                <RotateCcw aria-hidden="true" size={18} strokeWidth={2} />
              </button>
            ) : null}
            <button
              aria-label={isMuted ? 'Turn sound on' : 'Turn sound off'}
              aria-pressed={!isMuted}
              className="bb-control-film__control"
              onClick={toggleSound}
              title={isMuted ? 'Turn sound on' : 'Turn sound off'}
              type="button"
            >
              {isMuted ? (
                <VolumeX aria-hidden="true" size={18} strokeWidth={2} />
              ) : (
                <Volume2 aria-hidden="true" size={18} strokeWidth={2} />
              )}
            </button>
          </div>
        ) : null}
      </div>
      <figcaption className="bb-visually-hidden" id={descriptionId}>
        {story.visual.description}
      </figcaption>
    </figure>
  )
}

function useLandingSectionAnalytics(rootRef, contentReady) {
  useEffect(() => {
    if (!contentReady) return undefined
    const root = rootRef.current
    if (!root || !('IntersectionObserver' in window)) return undefined

    const reached = new Set()
    const sections = Array.from(root.querySelectorAll('[data-analytics-section]'))
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = entry.target.dataset.analyticsSection
        if (!entry.isIntersecting || !section || reached.has(section)) return

        reached.add(section)
        trackLandingEvent(landingAnalyticsEvents.sectionReached, { section })
        observer.unobserve(entry.target)
      })
    }, {
      rootMargin: '-30% 0px -30% 0px',
      threshold: 0,
    })

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [contentReady, rootRef])
}

function usePageMotion(rootRef, reducedMotion, contentReady) {
  useEffect(() => {
    if (!contentReady) return undefined
    const root = rootRef.current
    if (!root) return undefined

    const revealElements = Array.from(root.querySelectorAll('.bb-reveal'))
    const signalStages = Array.from(root.querySelectorAll('.bb-signal-stage'))
    const valuesStory = root.querySelector('.bb-values-story')
    const valueGrid = root.querySelector('.bb-value-grid')
    const valueSteps = Array.from(root.querySelectorAll('.bb-value-step'))
    const desktopMedia = window.matchMedia('(min-width: 961px)')
    let stepObserver

    const activateValueStep = (activeIndex) => {
      valueSteps.forEach((step, index) => {
        step.classList.toggle('is-active', index === activeIndex)
      })
      valuesStory?.style.setProperty(
        '--signal-offset',
        String(1 - ((activeIndex + 1) / Math.max(valueSteps.length, 1))),
      )
    }

    activateValueStep(0)

    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('is-revealed'))
      signalStages.forEach((element) => element.classList.add('is-signal-active'))
      valuesStory?.classList.add('is-story-active')
      valuesStory?.style.setProperty('--signal-offset', '0')
      return () => {
        revealElements.forEach((element) => element.classList.remove('is-revealed'))
        signalStages.forEach((element) => element.classList.remove('is-signal-active'))
        valuesStory?.classList.remove('is-story-active')
        valuesStory?.style.removeProperty('--signal-offset')
      }
    }

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
        } else if (entry.boundingClientRect.top > 0) {
          entry.target.classList.remove('is-revealed')
        }
      })
    }, {
      rootMargin: '0px 0px -12% 0px',
      threshold: 0,
    })
    revealElements.forEach((element) => revealObserver.observe(element))

    const signalObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-signal-active')
        signalObserver.unobserve(entry.target)
      })
    }, {
      rootMargin: '0px 0px -16% 0px',
      threshold: 0,
    })
    signalStages.forEach((element) => signalObserver.observe(element))

    const storyObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) valuesStory?.classList.add('is-story-active')
    }, {
      rootMargin: '0px 0px -32% 0px',
      threshold: 0,
    })
    if (valueGrid) storyObserver.observe(valueGrid)

    const configureStepObserver = () => {
      stepObserver?.disconnect()
      stepObserver = undefined
      activateValueStep(0)
      if (!desktopMedia.matches) return
      stepObserver = new IntersectionObserver((entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)
          .at(-1)
        if (!activeEntry) return
        activateValueStep(valueSteps.indexOf(activeEntry.target))
      }, {
        rootMargin: '-36% 0px -48% 0px',
        threshold: 0,
      })
      valueSteps.forEach((step) => stepObserver.observe(step))
    }

    desktopMedia.addEventListener('change', configureStepObserver)
    configureStepObserver()

    return () => {
      desktopMedia.removeEventListener('change', configureStepObserver)
      stepObserver?.disconnect()
      storyObserver.disconnect()
      signalObserver.disconnect()
      revealObserver.disconnect()
      revealElements.forEach((element) => element.classList.remove('is-revealed'))
      signalStages.forEach((element) => element.classList.remove('is-signal-active'))
      valuesStory?.classList.remove('is-story-active')
      activateValueStep(0)
      valuesStory?.style.removeProperty('--signal-offset')
    }
  }, [contentReady, reducedMotion, rootRef])
}

function App() {
  const rootRef = useRef(null)
  const [journeyReady, setJourneyReady] = useState(false)
  const [headerTone, setHeaderTone] = useState('light')
  const { reducedMotion } = useMotion()
  const [mediaPreview, setMediaPreview] = useState('candidate')
  const [showMediaPreview, setShowMediaPreview] = useState(false)
  usePageMotion(rootRef, reducedMotion, journeyReady)
  useHashNavigation(rootRef, journeyReady)
  useLandingSectionAnalytics(rootRef, journeyReady)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setJourneyReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !('IntersectionObserver' in window)) return undefined

    const sections = Array.from(root.querySelectorAll('[data-header-tone]'))
    const observer = new IntersectionObserver((entries) => {
      const active = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => Math.abs(first.boundingClientRect.top) - Math.abs(second.boundingClientRect.top))[0]
      if (active?.target.dataset.headerTone) setHeaderTone(active.target.dataset.headerTone)
    }, { rootMargin: '-8% 0px -84% 0px', threshold: 0 })

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [journeyReady])

  useEffect(() => {
    const requestedPreview = new URLSearchParams(window.location.search).get('media')
    if (requestedPreview === 'current' || requestedPreview === 'candidate') {
      setMediaPreview(requestedPreview)
      setShowMediaPreview(true)
    } else if (requestedPreview === 'compare') {
      setShowMediaPreview(true)
    }
  }, [])

  return (
    <div
      className="bb-app"
      data-motion={reducedMotion ? 'reduced' : 'full'}
      ref={rootRef}
    >
      <a className="bb-skip" href="#main-content">Skip to content</a>
      <Header tone={headerTone} />

      <main id="main-content">
        <SplitFilmHero reducedMotion={reducedMotion} />

        {process.env.NODE_ENV !== 'production' && showMediaPreview && (
          <div className="bb-media-preview" role="group" aria-label="Landing media preview">
            <span>Media</span>
            <button
              aria-pressed={mediaPreview === 'current'}
              onClick={() => setMediaPreview('current')}
              type="button"
            >Current</button>
            <button
              aria-pressed={mediaPreview === 'candidate'}
              onClick={() => setMediaPreview('candidate')}
              type="button"
            >Candidate</button>
          </div>
        )}

        {journeyReady && (
          <>
        <section
          className="bb-tonight bb-chapter bb-chapter--cream"
          data-analytics-section="product_proof"
          data-header-tone="light"
          id={tonightScenario.id}
        >
          <div className="bb-section-intro" id={tonightScenario.legacyId}>
            <p className="bb-kicker">{tonightScenario.eyebrow}</p>
            <h2>{tonightScenario.headline}</h2>
            <p className="bb-section-intro__body">{tonightScenario.intro}</p>
            <div className="bb-platform-availability" aria-label="Available on mobile for iOS and Android">
              <span className="bb-platform-availability__label">Available on mobile</span>
              <span className="bb-platform-pill">
                <PlatformAppleIcon />
                <span>iOS</span>
              </span>
              <span className="bb-platform-pill">
                <PlatformAndroidIcon />
                <span>Android</span>
              </span>
            </div>
          </div>
          <ScenarioSummary reducedMotion={reducedMotion} />
          <HomeworkExtension />
        </section>

          <section
          className="bb-coach-chapter bb-chapter bb-chapter--cream"
          data-analytics-section="meet_diana"
          data-header-tone="light"
          id={coachStory.id}
        >
          <CoachStory mediaPreview={mediaPreview} reducedMotion={reducedMotion} />
        </section>

        <section
          className="bb-values bb-chapter bb-chapter--cream"
          data-analytics-section="how_diana_helps"
          data-header-tone="light"
          id={transformations.id}
        >
          <HelpThatFits story={transformations} />
        </section>

        <section
          aria-describedby={`${systemProof.id}-summary`}
          aria-labelledby={`${systemProof.id}-title`}
          className="bb-trust-strip bb-chapter--cream"
          data-analytics-section="control"
          data-header-tone="light"
          id={systemProof.id}
        >
          <div className="bb-trust-strip__inner">
            <div className="bb-visually-hidden">
              <h2 id={`${systemProof.id}-title`}>{systemProof.headline}</h2>
              <p id={`${systemProof.id}-summary`}>{systemProof.body}</p>
            </div>

            <ControlVideoScene reducedMotion={reducedMotion} story={systemProof} />
          </div>
        </section>

        <section
          className="bb-final"
          data-analytics-section="final_cta"
          data-header-tone="dark"
          id={finalCta.id}
        >
          <div className="bb-final__copy bb-signal-stage">
            <p className="bb-kicker">{finalCta.eyebrow}</p>
            <h2>{finalCta.headline}</h2>
            <div className="bb-actions">
              <a
                className="bb-button bb-button--light"
                href={siteConfig.signupUrl}
                onClick={() => trackSignupClick('final')}
              >
                {finalCta.primaryCta.label}
              </a>
            </div>
          </div>

          <footer className="bb-footer">
            <div className="bb-footer__bar">
              <div className="bb-footer__brand">
                <a href={`#${hero.id}`} aria-label="Diana home"><Brand footer /></a>
                <p>Diana © {new Date().getFullYear()}</p>
              </div>
              <div className="bb-footer__right">
                <div className="bb-footer__links">
                  <div>
                    <strong>Account</strong>
                    <a href={siteConfig.signupUrl} onClick={() => trackSignupClick('footer')}>Create your Diana</a>
                    <a href={siteConfig.loginUrl} onClick={() => trackLoginClick('footer')}>Sign In</a>
                  </div>
                  <div>
                    <strong>Trust</strong>
                    <a href={siteConfig.privacyUrl}>Privacy</a>
                    <a href={siteConfig.termsUrl}>Terms</a>
                    <a href={siteConfig.safetyUrl}>Safety</a>
                  </div>
                </div>
              </div>
            </div>
          </footer>
          </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
