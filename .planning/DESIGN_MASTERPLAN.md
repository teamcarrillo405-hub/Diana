# Diana Design Masterplan — "Quiet Command"

**Goal:** a UI that beats the EdTech competition outright, beats teen consumer
apps on *felt care*, and beats Apple on the one axis Apple cannot win:
**cognitive-load-as-aesthetic for a brain that school was not built for.**

**The thesis.** Apple's design language optimizes universal elegance. Duolingo
optimizes dopamine. Diana optimizes **regulation**: every pixel either lowers
cognitive load or earns its place. We don't out-Apple Apple — we make calm
*feel premium* the way Apple made minimalism feel premium. The name of the
language is **Quiet Command**: the student is the commander; the interface is
a calm, beautiful instrument panel that never raises its voice.

The unfair advantages already in hand: a token-driven system, an automated
tone audit, a WCAG gate that fails the build, the Diana OS visual identity,
and design constraints (no red, no badges, one move at a time) that read as
*brand* the way Braun's constraints read as brand.

---

## Part 1 — The Quiet Command design language (specification)

### 1.1 Color: elevation, not decoration
Current tokens are sound. Codify them into a **five-level elevation system**
(bg → surface → surface-raised → card → overlay), each level one step of
lightness in light mode and one step of *glow proximity* in dark mode (the
Diana OS grid/glow becomes the dark-mode elevation metaphor — depth = nearer
the command field). Subject colors stay as the only saturation in the app;
everything else is violet-tinted neutral. Rule: **at most one saturated hue
per viewport** besides brand. This single rule is what will make screenshots
look composed instead of busy.

### 1.2 Typography: an optical scale, not ad-hoc sizes
Replace per-screen `text-sm/text-lg` judgment with a fixed modular scale
(1.2 ratio, 13/16/19/23/28/34) exposed as semantic tokens:
`type-caption`, `type-body`, `type-emphasis`, `type-title`, `type-display`,
`type-hero`. Lexend stays (it's evidence-based for our audience — a flex
Apple can't copy without abandoning SF). Two refinements:
- `type-display`+ get tightened letter-spacing (-0.01em) and heavier weight —
  the "composed headline" look.
- Tabular numerals (`font-variant-numeric: tabular-nums`) on every timer,
  grade, and countdown — numbers that don't jiggle read as engineered.

### 1.3 Space and shape: one rhythm
- Spacing snaps to a 4px grid with three named gaps only: `tight (8)`,
  `group (16)`, `section (28)`. Audit every screen to these three.
- Radius system: `control (12) / card (16) / panel (24) / pill (999)` —
  already mostly true; codify and sweep outliers.
- One shadow recipe per elevation level, never bespoke shadows.

### 1.4 Motion: physics with manners (the Apple gap, closed our way)
A motion taxonomy with exactly four verbs, each with one duration/easing:
| Verb | Use | Spec |
|---|---|---|
| **Settle** | content entering | 240ms, spring(1, 80, 12) — translate 8px + fade |
| **Respond** | press/toggle feedback | 120ms ease-out scale/lift (exists: press-scale, card-lift) |
| **Carry** | screen-to-screen | View Transitions API: the tapped card *becomes* the next page's hero (shared-element). This is the single highest-impact "feels native" upgrade a web app can make |
| **Breathe** | ambient (timer ring, body-double dot) | ≥2s loops, opacity/scale ≤6%, never on text |
Rules: nothing bounces, nothing moves more than 12px, everything
interruptible, `prefers-reduced-motion` collapses all four verbs to opacity.
Calm is the brand — motion *confirms*, never *celebrates at* the student.

### 1.5 Identity and illustration: the Spark system
No mascot (mascots infantilize; teens know). Instead, the ✦ spark becomes a
**generative geometric system**: constellations of sparks/lines/glow on the
Diana OS grid, rendered in code (SVG components, no asset pipeline), themed
by accent color, composed per context — empty states, onboarding steps,
completion moments, season variants. Code-renderable means infinitely
consistent and theme-aware — an illustration system Duolingo pays artists
for, we generate.

### 1.6 Sound and haptics (staged)
- **Sound: off by default, forever.** One optional "focus start" and
  "session complete" tone, designed like a watch chime (≤400ms, warm). ADHD
  + unexpected audio = no.
- **Haptics: native phase.** Tap-confirm on completion, soft tick on timer
  start. Carries the Respond verb into the hand.

### 1.7 The copy IS the interface
Already best-in-class; canonize it in the language spec: second person, verbs
first, numbers concrete ("9 min for you"), zero exclamation marks, the (i)
transparency mark. The tone audit is the style guide's compiler.

---

## Part 2 — Signature moments (what gets screenshotted)
Polish is table stakes; *moments* make love. Four to perfect:

1. **Focus ignition.** Tap "Start focus" → Carry transition into the timer →
   3-second "Ready." ritual where the field dims and the ring draws itself →
   optional chime/haptic. The calmest "let's go" in software.
2. **The grid solve.** The digit grid is already unique; add a quiet
   completion state — when the student fills the last cell, the columns
   align-glow once (Breathe verb). The dysgraphia tool becomes the demo.
3. **Done, with dignity.** Completion = the check-draw (exists) + the spark
   constellation assembling one new node (their work, accumulating) — a
   private galaxy instead of confetti. Streak-free progress made visible.
4. **Diana OS reveal.** The future-mode toggle becomes a Carry transition
   where the grid field powers on outward from the toggle. Make trying it
   feel like turning a key.

---

## Part 3 — Execution

### Workstream A — Code-buildable now (D1–D7, in order)
- **D1 Tokenize the language.** `lib/ui/design-system.ts` + Tailwind theme:
  type scale, spacing trio, radius set, elevation/shadow levels, motion verb
  constants. The spec becomes importable truth.
- **D2 Type & space sweep.** Migrate every route to the semantic scale and
  three gaps. Mechanical, route-by-route, screenshot-diffed both themes.
- **D3 Motion system.** Implement the four verbs (CSS springs via
  `linear()` easing + View Transitions API for Carry with fallback).
  Convert existing animations to verbs; add Carry to the three highest-traffic
  paths (dashboard→assignment, assignment→timer, list→detail).
- **D4 Spark system.** `components/spark/*`: generative SVG constellation
  primitives; replace EmptyStateMark; add to onboarding done + wins.
- **D5 Signature moments** (Part 2, all four).
- **D6 Tabular numerals + micro-typography pass** (timers, grades, countdowns).
- **D7 Perf as polish.** INP < 200ms budget in the a11y/QA gate; transition
  jank audit at 6x CPU throttle. Smooth *is* premium.
Each phase: gates green, both-theme screenshots, commit.

### Workstream B — The designer engagement (owner-gated, brief ready)
Hire one **product designer with type/motion depth** (not an illustrator;
the Spark system is code). Contract scope, ~2-3 weeks:
1. Audit pass against this spec — they tune the scale/spacing/easing values
   (the system makes their taste land everywhere at once),
2. The four signature moments, frame by frame,
3. App icon + store/landing art.
Deliverable = adjusted token values + Figma of the four moments. Because the
system is tokens, their work ships in days, not months. Budget realism:
$8–15k contract or a strong freelancer; this is the highest-ROI dollar in
the project.

### Workstream C — Native finish (after teen validation)
Capacitor build: haptics (Respond verb), true 120Hz scrolling, dynamic type
mapping to our scale, share sheet, widgets ("Right now" on the home screen —
the one-task philosophy as a widget is a category-defining artifact).

### Workstream D — Proof
Teen testing (plan exists) gains two design-specific measures: "show me the
screen you'd screenshot" and the existing looksMadeForMe / loveTheLook bars.
Plus instrumented INP/LCP in production. **Definition of better-than-Apple:**
a diagnosed-ADHD student completes first-move → focus → done with fewer
taps, less hesitation, and lower self-reported stress than on any competitor
— while the screens hold AA contrast, reduced-motion grace, and 60fps. Apple
can't enter this contest; its design system forbids the constraints that win it.

---

## Sequencing
A:D1–D3 first (the system + motion are the spine) → D4–D6 (identity +
moments) → D7 (perf gate) → B in parallel once started → C after teens →
D continuously. Every phase lands behind the existing gates: tone, axe,
tests, both-theme QA.
