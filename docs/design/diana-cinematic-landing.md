# Diana Cinematic Landing Design Contract

Status: approved 95+ direction, implementation and release contract
Last grounded against the repository: 2026-09-17

## Purpose

This document freezes the user-approved direction for Diana's public landing page. The page must feel like a premium student product, not a generic AI landing page: one cinematic school-night story, real Diana product proof, clear student ownership, and a direct early-access action.

The active route is `app/page.tsx` -> `components/canonical-public-landing/canonical-public-landing.jsx` -> `components/canonical-public-landing/cinematic-v3/cinematic-landing.tsx`. The cinematic narrative, motion, and asset bundle are published under `public/assets/landing-cinematic-v3`. This is the only public landing implementation in the checkout.

## Experience Contract

1. **Your AI Tutor** opens with the official glass Diana symbol, pixel wall, one supporting sentence, and the waitlist action.
2. **Meet Your Diana Workspace** proves four real product jobs: Lobby, Work, guided coaching, and test preparation.
3. **More Than A Chatbot** anchors Diana in the student's classes, assignments, notes, schedule, and progress without implying autonomous authorship or certified human tutoring.
4. **Built Around Your Day** shows the calendar, manual schoolwork entry, planned LMS connections, notes capture, and life beyond homework.
5. **You Stay In Control** proves that the student chooses the next step, controls personalization, and decides when work is complete.
6. **Good Questions** answers launch, subscription, cheating, class coverage, and school-account concerns.
7. **Join the Diana waitlist** is the sole conversion goal and uses the shared production early-access flow.

The header and opening story may fill most of the first viewport, but at least 24 px of the following section must remain visible at standard desktop and mobile heights. Product, brand, and student context must all be legible without waiting for motion.

## Typography

- Display face: `Saira Condensed`, weights 500-700, via `--font-saira-condensed`.
- Body and controls: `Lexend`, weights 400-700, via `--font-lexend`.
- Fallbacks: Arial Narrow/Arial for display and Arial/system sans for body.
- Letter spacing is always `0`. Do not tighten display copy with negative tracking.
- Desktop hero: 72-88 px, 0.92-0.98 line height, maximum three short lines.
- Mobile hero: 44-52 px, 0.96-1.0 line height, with whole words wrapping.
- Section headings: 52-74 px desktop and 40-48 px mobile.
- Body copy: 16-18 px with 1.5-1.6 line height and a 70-character practical maximum.
- Kicker text: 12-14 px, 700 weight. Uppercase is reserved for compact labels, not paragraphs or primary headings.
- Product screenshots retain their native interface typography. Do not recreate product UI as decorative marketing text.

## Palette

The shared public-page tokens in `app/public-pages.css` are the baseline:

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Primary ink | `--dpl-ink` | `#11182f` | Headlines, controls, dark text |
| Secondary ink | `--dpl-ink-soft` | `#465168` | Supporting copy |
| Night | `--dpl-night` | `#0b1022` | Cinematic stages, footer, dark product frames |
| Canvas | `--dpl-canvas` | `#f3f5f0` | Main page field |
| Deep canvas | `--dpl-canvas-deep` | `#e7ece7` | Section change and product context |
| Surface | `--dpl-surface` | `#ffffff` | Inputs and necessary product surfaces |
| Line | `--dpl-line` | `#cbd4cc` | Dividers and restrained borders |
| Action | `--dpl-yellow` | `#ebf85d` | Primary action, focus-adjacent emphasis |
| Cyan | `--dpl-cyan` | `#27c1d1` | Sparse subject/help accent |
| Lavender | `--dpl-lavender` | `#bd63f6` | Sparse subject/help accent |

Rules:

- Canvas, ink, school photography, and product imagery carry the composition. Accent colors do not become page-wide themes.
- Gradients are allowed only for legibility overlays, media fades, or subtle depth within an actual product/media surface.
- Error states use amber, never red. Status must never rely on color alone.
- Text and controls must meet WCAG 2.2 AA contrast. Large display type is not an excuse for low contrast.

## Layout And Spacing

- Base spacing unit: 8 px. Approved steps: 8, 12, 16, 24, 32, 48, 64, 80, 96, 112, and 128 px.
- Main shell: maximum 1320 px with 24 px desktop gutters. Header/footer may extend to 1680 px.
- Mobile gutters: 16 px minimum. No text or control may touch a viewport edge.
- Section spacing: `clamp(92px, 8vw, 128px)` desktop; 72-88 px mobile.
- Fixed-format media and product screens require an explicit `aspect-ratio`, dimensions, or stable min-height to prevent layout shift.
- Radius ceiling: 8 px for cards and fields. Round controls are reserved for familiar icon actions such as play/pause.
- Cards are limited to repeated help or subject items and actual framed product/media surfaces. Do not nest cards or float full page sections as cards.
- Product proof must be larger than supporting copy when the section's purpose is to prove the product.

## Motion

Motion explains sequence; it is not decoration.

- Use GSAP/ScrollTrigger only for the chapter story and necessary media transitions already established by the canonical components.
- Animate `transform`, `opacity`, and controlled `clip-path` values. Avoid layout properties that cause reflow during scroll.
- Scroll-linked video stays paused and is sought to the current chapter. Reverse scrolling must restore the prior state without a jump.
- Section transitions should complete in 180-700 ms. The complete journey must remain at or below 27 desktop viewport heights and 30 mobile viewport heights. Reading holds remain approximately one viewport; transition travel is shorter.
- Autoplaying rails pause when offscreen, when focused/dragged, when the user presses pause, or when reduced motion is active.
- Every moving media surface needs a visible pause/replay control when motion is not directly controlled by scroll.
- No scroll hijacking, cursor replacement, continuous camera drift, ornamental parallax, or motion that blocks navigation.

## Media Treatment

- The opening brand spectacle must identify Diana as an AI tutor immediately; real product proof follows in the first chapter.
- Use local responsive assets with explicit dimensions, WebP/AVIF for stills, WebM plus MP4 fallback for video, and a poster for every video.
- Crop for the subject, not for atmosphere. Faces, hands, schoolwork, and the Diana interface must remain inspectable.
- Product screenshots must be current, readable, and free of fabricated results. Synthetic demo data must remain student-safe and clearly illustrative where needed.
- Media should use restrained color correction, natural skin, stable geometry, and consistent lighting. Reject warped hands, changing faces, illegible screens, duplicate objects, or continuity shifts.
- The **Beyond Homework** Higgsfield film is now the approved single-render asset: job `15f2b603-d313-4fde-9488-6363e4779ada`, Seedance 2.0 standard, 10 seconds, 4K source, 16:9, high bitrate, silent, one output. The production page uses the locally encoded 1080p MP4 plus poster. No paid drafts, variants, retries, or parallel outputs are authorized without a new exact approval.

## Responsive Rules

- Primary breakpoints: mobile below 768 px, compact/tablet from 768-1179 px, cinematic desktop at 1180 px and above.
- Mobile uses a 64 px header; desktop uses 76 px. Navigation collapses to one menu with 44 px minimum controls.
- The hero uses mobile-specific posters/video and vertically composed product captures. Desktop crops must not be reused when they hide the student or interface on mobile.
- Desktop, tablet, and mobile retain the scroll narrative, but mobile renders one readable screen at a time. The complete static fallback remains in document order. No essential copy may exist only in an animated layer.
- Carousels must support pointer drag, keyboard arrows, focus, and a pause control. Duplicate looping items are hidden from assistive technology.
- Verify 360x800, 390x844, 768x1024, 1024x768, 1440x900, and 1920x1080 with no horizontal overflow, clipped headings, or occluded controls.

## Reduced Motion

At `prefers-reduced-motion: reduce`:

- Disable pinning, scrubbed seeking, auto-advancing rails, pulsing hotspots, flying-card transitions, and autoplay video.
- Render the three hero chapters as readable static sections using posters and product screenshots.
- Keep all headings, product proof, help modes, ownership copy, and the early-access form reachable in document order.
- Replace smooth scrolling with immediate navigation and reduce transition/animation durations to effectively zero.
- Do not hide content merely because its animated counterpart is disabled.

## Performance Budgets

Budgets are measured on a production build, cold cache, mid-tier mobile emulation, and Fast 4G unless stated otherwise.

| Budget | Target |
| --- | --- |
| Largest Contentful Paint | <= 2.5 s at p75 |
| Interaction to Next Paint | <= 200 ms at p75 |
| Cumulative Layout Shift | <= 0.10 |
| Initial route JavaScript | <= 180 KB gzip, excluding framework runtime reported separately |
| Landing CSS | <= 70 KB gzip |
| Landing font payload | <= 220 KB WOFF2 |
| Hero poster | <= 90 KB mobile, <= 190 KB desktop |
| Hero story video | <= 2 MB mobile, <= 6 MB desktop |
| Initial mobile media transfer | <= 2.5 MB before interaction |
| Long tasks during scroll | No task > 100 ms; <= 250 ms total over one hero pass |
| Scroll animation | >= 55 fps p95 on the reference desktop device |

Implementation rules:

- The opening poster is the LCP candidate and uses explicit dimensions plus high fetch priority.
- Hero video uses `preload="metadata"`; below-fold images are lazy and asynchronously decoded.
- Below-fold video must not play or fetch full media until its section approaches the viewport.
- Pause animation work outside the viewport. Remove `will-change` after a transition when practical.
- Remote stock URLs are not permitted in the canonical route. Production media lives under `public/assets/`.

## Accessibility

- Preserve one `main#main-content`, one page `h1`, semantic section headings, a working skip link, and logical source order.
- All controls and links must be keyboard reachable with a visible 3 px focus ring. Minimum target size is 44x44 px.
- Icon-only controls use Lucide icons plus an accessible name and tooltip/title where the meaning is not obvious.
- Chapter, carousel, hotspot, menu, and form state must use `aria-current`, `aria-pressed`, `aria-expanded`, `aria-controls`, or a restrained live region as appropriate.
- Decorative media uses empty alt text. Product proof and meaningful student media use concise, factual alt text. Do not narrate decorative styling.
- Autoplay video is muted and never carries unique information. Captions or a transcript are required before any spoken audio is introduced.
- Form errors are calm, specific, associated with the field, and announced without moving focus unexpectedly.
- Test keyboard-only navigation, 200% zoom, forced colors, reduced motion, VoiceOver/Safari, and NVDA/Chrome before release.

## Forbidden AI-Slop Patterns

- Generic gradient orbs, bokeh blobs, neon tunnels, star fields, or decorative particle systems.
- A robot portrait standing in for product proof, fake chat bubbles, or a giant assistant mascot with no student task in view.
- Floating dashboard fragments, nested glass cards, excessive blur, pill-shaped containers, or cards used as page sections.
- Purple/blue monochrome pages, arbitrary glow borders, and gradients used as the primary visual idea.
- Stock-photo mosaics, anonymous office scenes, or generated students with unstable faces, hands, clothing, screens, or lighting.
- Fake statistics, testimonials, school logos, app-store badges, rankings, streaks, countdown pressure, or guaranteed academic/lifestyle outcomes.
- Feature copy without a matching verified ledger entry, including live LMS behavior or native mobile availability.
- Food, calorie, meal, diet, or nutrition tracking as a landing capability. Food tracking is removed from the approved claim set.
- Oversized marketing prose inside cards, tutorial copy that explains the interface, or repeated slogans without new evidence.

## 95+ Acceptance Gate

The landing may be called 95+ only when it scores at least 95/100 and passes every hard gate.

| Area | Points |
| --- | ---: |
| Story, first-viewport clarity, and conversion hierarchy | 20 |
| Visual craft, typography, palette, and media continuity | 20 |
| Product proof and claim accuracy | 15 |
| Responsive behavior and content fit | 15 |
| Motion quality and user control | 10 |
| Accessibility | 10 |
| Performance | 10 |

Hard gates:

- The claim ledger is current and contains no unsupported live claim.
- Google Classroom and Canvas remain planned until their disposable staging smoke tests pass.
- Reduced-motion, keyboard, overflow, and form paths pass on the canonical route.
- Production build, focused tests, tone audit, and route-specific browser smoke pass.
- Desktop and mobile screenshots are reviewed from the current checkout. An earlier 93/100 media review does not certify this implementation.
- No paid or credit-consuming Higgsfield call occurs without exact final-render approval.
