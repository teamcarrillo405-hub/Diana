# Diana UI — Honest Audit (2026-06-09)

Method: fresh dark-mode + future-mode screenshots captured today against a live dev build
(`scripts/dark-mode-audit.mjs` → `.planning/qa-screenshots/dark-mode-audit-2026-06-09/`),
review of the 2026-06-05 light-mode QA screenshots, and code-level review of the theme system,
CSS tokens, and the scorecard scripts. No self-graded scores used.

---

## 1. The scorecard problem (why "10/10" misled)

`scripts/teen-ux-score.ts` and the competitive scorecard are **string-grep checks**:
`fileIncludes("app/page.tsx", "Your next 5")`, `fileIncludes("components/nav.tsx", "grid-cols-5")`, etc.,
plus screenshot counts of horizontal overflow / 500s / banned words. They verify features *exist*;
they cannot measure whether the UI looks good, feels teen-native, or works in dark mode.
`liveTeenValidationPassed` is hardcoded `false` — the one bar that measures actual teen opinion has
never been run. Treat the 10/10 as "wiring complete," nothing more.

## 2. Do we really have a dark mode?

**Yes — it's real, and it mostly looks good.** Verified live today: dashboard, landing, study buddy,
flashcards, notes, timer, settings, mobile all render a coherent slate-950/violet dark theme because
the design system is token-driven (`app/globals.css` CSS variables; only 1 raw `bg-white` in 168
component files).

**But it ships with real holes:**

| # | Issue | Evidence |
|---|---|---|
| D1 | **Zero QA coverage.** All 95 QA screenshots are light mode. Dark mode had never been visually verified until today. | `tests/responsive-qa.spec.ts` never sets theme |
| D2 | **Buried toggle.** Theme switch exists only inside Settings, behind "More". No nav/profile-level toggle, no onboarding choice. | `components/theme-picker.tsx`, settings page |
| D3 | **Binary, sticky.** Once a user picks light or dark, the app never follows the OS again — there's no "System" option. | `components/theme-provider.tsx` (`type Theme = 'light' | 'dark'`) |
| D4 | **`.reading-view` ignores the toggle.** Reading surfaces (#FAF8F3 warm paper) only go dark via the OS media query, not via the in-app `.dark` class. A student with OS-light + app-dark gets a glowing light reading panel inside a dark app. Same bug for `.high-contrast` dark values. | `app/globals.css` lines 196–222, 178–186 |
| D5 | **34/168 component files use raw Tailwind palette colors** (~85 utilities like `bg-violet-50`, `text-amber-800`) that don't adapt; only 89 lines have `dark:` variants. Seams in less-traveled screens. | grep audit |
| D6 | **Light is the default first impression** unless OS is dark. Teen default expectation is dark-first. | provider fallback |

Verdict: claim "dark mode: yes." Claim "first-class dark mode: not yet."

## 3. Would teenagers like this UI? (honest)

**They would respect it. They would not screenshot it for their group chat.**

What genuinely works for teens:
- **Copy is the best asset.** "Nothing on deck.", "I'm overwhelmed", "Ask for help without handing
  over the work", energy modes Low/OK/On it — calm, non-condescending, zero teacher-voice.
- **Landing page** is modern and credible (product preview above the fold, rounded Lexend, lavender).
- **Diana OS future mode is the most teen-appealing visual in the product** — cyan HUD on deep navy,
  grid field, signal matrix. It looks like a game UI. And it's hidden behind a toggle, mostly
  decorative, on landing/voice surfaces only.
- "I'm overwhelmed" button and voice layer are differentiated, caring features no competitor has.

What works against teen love:
- **The authenticated app reads "calm productivity SaaS for adults."** White/near-white, sparse,
  small muted chips, big empty regions. It's Linear/Notion-lite, not something that signals
  "made for me" to a 15-year-old whose visual baseline is Discord, Spotify, and TikTok.
- **No identity/personality surface.** Empty states are a sentence + two buttons. No illustration,
  no mascot, no color, no customization visible by default (accent picker exists — buried in Settings).
- **Visible jank** (teens read jank as "cheap app"):
  - "More tools" drawer captured stuck open on 3+ routes, covering the page H1 and a primary CTA
    (light AND dark runs — this is the screens' actual resting state in QA).
  - Mobile: "I'm overwhelmed" pill and avatar bubble collide with the bottom nav and content rows at 390px.
  - Nav rail label truncates to "Assignme…".
  - Settings full-page render is ~75% empty dark void below the content.
- **Reward moments are intentionally quiet** (calm invariant — correct for the mission), which means
  the *look* has to carry delight, and right now it doesn't.

## 4. Competitive comparison

Repo-defined competitors: ChatGPT Study Mode, Gemini Guided Learning, Khanmigo, Quizlet AI.

| Dimension | Diana today | ChatGPT Study Mode | Gemini Guided Learning | Khanmigo | Quizlet |
|---|---|---|---|---|---|
| First impression (teen) | Clean but adult-SaaS | Familiar, minimal, "the default" | Material 3 polish | Institutional, school-approved | Bold, playful, colorful |
| Dark mode | Real but buried, binary, unQA'd | First-class, system-following | First-class | Light-leaning | First-class |
| Personality / delight | Quiet by design; Diana OS hidden | Neutral tool | Neutral tool | Friendly tutor framing | High — illustration, motion, sound |
| Speed to first value | Add class → add assignment → plan | Type and get an answer in 5s | Same | Prompted tutoring | Search any deck instantly |
| Structure for ADHD/dyslexia | **Best in class** — nobody else has energy modes, reading tools, next-5-minutes | None | None | Some scaffolding | Study-only |
| Trust / anti-cheat receipts | **Unique** (authorship log, source anchors) | Weak | Weak | Strong (teacher-side) | n/a |
| Mobile feel | Good layout, floating-element collisions | Excellent native apps | Excellent | OK | Excellent native apps |

Diana's substance moat is real: no competitor combines executive-function scaffolding, dyslexia
accommodations, calm design, and authorship receipts. The gap is **surface**: against the daily
visual bar teens hold, Diana's default UI is the least expressive of the set, and the one surface
that *is* expressive (Diana OS) is opt-in and skin-deep.

## 5. Gaps and recommendations (prioritized)

### P0 — fix before any teen sees it (days)
1. **More-tools drawer stuck open** over page headings/CTAs (seen on study-buddy, focus, settings in
   both themes). Find why QA's resting state has it open; ensure route change closes it.
2. **Mobile floating-element collisions** at 375–390px: overwhelmed pill + quick-capture avatar vs
   bottom nav and content. Reserve safe-area; stack or dock them.
3. **`.reading-view` / `.high-contrast` dark via `.dark` class**, not just media query (D4).
4. **Add dark mode to the visual QA gate**: run the screenshot matrix in both themes; fail on
   contrast/seam regressions. Reuse `scripts/dark-mode-audit.mjs` as the seed.
5. **Settings page empty tail** (~3000px of void in full-page render) — find the stretching element.

### P1 — make dark and the look first-class (1–2 weeks)
6. **Theme = Light / Dark / System** (3-state), surfaced in the nav/profile and onboarding, not just
   Settings. Keep following OS until the user explicitly chooses.
7. **Sweep the 34 files with raw palette colors** → tokens or `dark:` variants. Mechanical.
8. Fix nav label truncation ("Assignme…" → "Tasks" or wider rail).
9. **Pull Diana OS energy into the default app.** The HUD aesthetic (grid field, glow accents,
   signal matrix) is the strongest "made for me" signal in the product. Options: make future mode a
   real full-app theme (it already flips tokens), or bleed its accents into default dark.
10. **Empty states with personality**: one consistent illustration style or the Diana ✦ mark doing
    something, in brand violet/cyan. Calm ≠ blank.

### P2 — earn "love the look" (weeks)
11. **Personalization up front**: accent color + theme choice during onboarding (teens customize
    identity immediately; the accent system already exists).
12. **Micro-interactions** on completion, card flips, focus start (respect `prefers-reduced-motion`;
    the check-draw animation is a good precedent).
13. **Run the live teen test** that the protocol already defines (`lib/teen-testing/protocol.ts`,
    looksMadeForMe / loveTheLook / wouldChooseOverGenericChat). It is the only honest scoreboard.

## Bottom line

- Dark mode: **real, decent, second-class.** Six concrete defects listed above.
- Teen appeal: **substance 9, surface 6.** Copy and care are genuinely teen-native; the visual layer
  is an adult productivity app with one hidden teen-native costume (Diana OS).
- The 10/10 scorecards measure presence, not quality — stop reading them as quality signals.
