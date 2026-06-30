# Product

## Register

product

## Users

High-school students (teens, ~13–18), with a deliberate focus on those who have ADHD, dyslexia, and executive-function challenges. They arrive stressed and time-pressured, often at night, deciding "what do I even do right now?" Diana sits *on top of* Canvas / Google Classroom — it pulls assignment data from those systems and re-presents it as a space the student actually wants to open. The job to be done: turn an overwhelming pile of schoolwork into one obvious next move, then the next, without anxiety.

## Product Purpose

Diana is a student-native "learning lobby." Its core surface is an authenticated dashboard styled like a game lobby (Fortnite-adjacent), where the hero answers exactly one question — *what do I do now?* — and the rest of the experience is distributed across four tabs (WORK / THINK / PROOF / FUTURE) so no single screen becomes a 21-feature scroll. Success looks like a student opening Diana voluntarily, starting the highest-leverage task within seconds, and leaving without feeling behind or ashamed.

## Brand Personality

Game energy, grounded. The lobby carries real arcade/HUD charisma — cyan accent (`#29d0ff`), Saira Condensed italic display type, corner-bracket HUD framing, immersive full-bleed background — but the voice is calm, supportive, and low-anxiety, never hype or aggressive. Three words: **calm, capable, energizing.** The interface should make a struggling teen feel like a player with a clear next move, not a student behind on a list.

## Anti-references

- Shaming / scolding edtech: progress bars that turn red, "you missed" / "you're behind" copy, nagging.
- Streak mechanics and guilt loops (Duolingo-style "don't lose your streak" pressure).
- Anxiety-inducing red error states and alarm-colored urgency.
- Dense productivity dashboards that dump every feature on one screen.
- Generic SaaS-cream / hero-metric-template landing aesthetics — Diana is a lived-in player space, not a marketing page.

## Design Principles

1. **One question per screen.** TODAY answers "what now?"; each tab answers exactly one follow-up. Distribute, don't pile up.
2. **Calm is non-negotiable.** Amber over red, neutral counters over streaks, accumulated cards over guilt. The `tone-audit` script enforces the language half of this; the color/state rules enforce the rest.
3. **Game energy in service of focus.** The Fortnite-style charisma exists to lower the activation cost of starting, not to overstimulate. Motion and color are intentional, never decorative noise.
4. **Accessibility is the spec, not an add-on.** Dyslexia font support, reduced-motion alternatives, WCAG AA contrast, and executive-function-friendly clarity are baseline requirements for this audience.
5. **Appearance-only at the seams.** Visual work never alters protected logic, data flows, auth gates, or the assignment state machine (see `LOGIC_MANIFEST.md`). The design system rides on top of locked behavior.

## Accessibility & Inclusion

- Target WCAG 2.1 AA: body text ≥ 4.5:1, large/bold text ≥ 3:1, against actual rendered backgrounds (including the tinted hero).
- Dyslexia support: OpenDyslexic / Lexend available via a profile-driven `.dyslexia-font` class; the 1.6× reading-load time multiplier reflects real student cost.
- Reduced motion: every animation needs a `prefers-reduced-motion: reduce` alternative (crossfade or instant).
- Calm-state safety: no red error color, no shame/scolding language, no streak/guilt pressure — these are accessibility requirements for an anxiety-prone, neurodivergent teen audience, not just stylistic preferences.
