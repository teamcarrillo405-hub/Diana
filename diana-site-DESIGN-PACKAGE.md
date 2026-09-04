# Diana, design package (Tier 2, The Settling)

Every line of copy below ships verbatim. Numbers are starting points, validated by the flick test.

## 1. Brand premise

**The next five minutes.** Diana's own research names the enemy as task-initiation paralysis, not laziness: too many assignments to choose from, a task that feels too big, a vague first step. The documented fix is decision elimination, one concrete next action. The whole site teaches one idea: the pile settles into the next five minutes. The hero performs it. The interactive moment performs it. The closing line names it. Any section that does not serve it is cut.

## 2. Palette (direction now, exact tokens finalized from the approved footage after the video gate)

The world is retro pop-art comic: flat saturated fills, halftone dot shadows, bold ink outlines, a limited palette. The canvas is comic-ink navy, never pure black, tinted toward the footage. The one accent is the tablet's cyan glow, the only saturated light in the hero, spent on the CTA, focus states, and two moments of emphasis. Paper white is warm comic-page white, never #fff.

```css
:root{
  --canvas:#0b1030;        /* comic-ink navy, tinted to the footage grade */
  --panel:#141a45;         /* raised surfaces, one step lighter ink */
  --accent:#3ee1ed;        /* the tablet glow. CTA and rare emphasis only */
  --accent-hover:#7ff0f6;
  --accent-muted:rgba(62,225,237,.16);  /* halftone, borders, particles at whisper level */
  --text-primary:#f4efe6;  /* warm comic-page white */
  --text-secondary:#a9b0cc;
}
```

Said out loud: this is a dark canvas, and dark is the AI-default reach the skill warns about. It earns it because the footage is a night bedroom in comic ink and the page samples that world. The tell it avoids is the amber-accent-plus-serif default. Cyan glow, halftone, and a condensed display face are this brand's, not the template's.

## 3. Type trio

- **Display: Saira Condensed, 800 italic and 700.** The face the product already uses inside the app, so a visitor lands in the same voice they will meet after signup. Condensed and italic reads as motion, which suits a page about settling.
- **Body: Lexend, 300 and 400.** Named in Diana's research as the evidence-backed dyslexia-friendly default (findings.md, item 8). A subject-specific reason no other brand has.
- **Mono: IBM Plex Mono, 400 and 500.** Due times, counters, the 9:47 readout. Deadline data reads as system output.

## 4. The storyboard (three segments, one continuous descending shot, ~18 seconds, 1000vh hero)

The camera descends the whole way (law 6, vertical axis matches scroll). Scrolling down reads as settling and landing (law 1).

**Segment 1, The pile (0 to 6s).** High angle looking down into a slow tornado of homework: worksheets, a planner page, sticky notes, index cards, swirling in a dim bedroom at night. Pop-art comic style, halftone shadows, bold ink outlines. The girl is small at bottom center, seated at her desk, head down, seen from above. Papers fill the middle of the frame. The camera begins a slow straight descent. The upper left and upper right stay calmer, less paper, receding room. Ends MID-MOTION: camera still descending, papers at about sixty percent density, one sheet brushing past the lens. Final frame becomes segment 2's start.

**Segment 2, The turn (6 to 12s).** The descent continues to desk-lamp height. Papers slow and begin drifting down like leaves. The girl lifts her head and reaches for a tablet on the desk. It wakes with a single cyan glow, the only saturated light in the frame. Halftone shadows shift toward the glow. Ends MID-MOTION: her hand on the tablet, glow growing, the last few papers still falling. The seam lands inside falling paper and growing light, so texture refreshes naturally (the seam law).

**Segment 3, The settle (12 to 18s).** The descent completes to a low over-the-shoulder angle behind the girl, slightly above. The last papers land softly on the desk edges and go still. The tablet fills the lower center with a calm cyan screen showing one glowing rounded rectangle, an abstract card, no readable text. Her shoulders drop. **The composed ending at rest:** girl centered-low, tablet glow center, warm desk lamp at right, settled papers at the frame edges, generous empty room across the top third for the settle headline, nothing croppable in the top fifteen percent where the header sits. Verified with the header mocked over it at wide and short windows before approval.

Risk noted: the girl is the one non-forgiving subject (hands, face). Mitigation: she is small in segment 1, seen from behind in segment 3, and the one close beat (hand on tablet, segment 2) is protected by the comic style, which forgives anatomy the way photoreal does not.

## 5. Band map (starting points; 900vh scroll range, so 0.02 progress is 18vh)

| Band | Range | Footage moment | Copy (verbatim) | Entrance |
|---|---|---|---|---|
| 1 | 0.00 to 0.13 | high in the tornado, girl small below | "9:47 PM. Four things due." | Drift-down, opens settled via the load ramp |
| 2 | 0.16 to 0.30 | descending, papers thick, one brushes the lens | "You did the reading. You just can't start." | Scatter, characters gather like paper |
| 3 | 0.36 to 0.50 | the turn, head lifts, glow wakes | "Diana finds the one you can finish tonight." | Blur-to-sharp, focus arriving |
| 4 | 0.56 to 0.70 | papers landing, hand on tablet | "Then shrinks it to five minutes." | Word-punch with overshoot, the landing |
| 5 | 0.78 to 1.00 | settled, over shoulder, glow | headline "Start with one." subline "Your next five minutes, made obvious." button "Start tonight" | Word-by-word rise into a staged settle |

Bands 1 and 2 sit in the upper-left calm; band 3 upper-right; band 4 upper-left; band 5 centered in the top third over the settled room. The action lane (center, the paper column, then the glow) stays clear throughout.

## 6. Static-hero copy block (phones, portrait tablets, reduced motion, over the ending frame)

Headline: **Start with one.**
Subline: Four things due. Diana finds the one you can finish tonight and shrinks it to five minutes.
Button: **Start tonight**

Mobile decision, made consciously: static hero. The joined video will exceed 8 MB and the low over-the-shoulder composition does not survive a portrait cover-crop with the glow and the room both intact. Ship the still proudly.

## 7. Below-fold outline (every section funnels to #start; no two neighbors share a skeleton)

**A. What just happened.** Ending frame reused full-bleed at left on a diagonal ink cut, copy at right.
Kicker: WHAT JUST HAPPENED
Headline: It picks the one you can actually finish.
Body: Diana pulls your assignments straight from Canvas and Google Classroom, so it already knows the proofs are two days late and the biology set is due at midnight. It does not sort by deadline. It sorts by what you can get through tonight, at 9:47, tired. Then it shrinks that one to a first step small enough to start without deciding anything.

**B. The refusal, with the interactive moment.** Centered dialogue thread on a panel, the hold control beneath.
Headline: Ask it to write the essay. It says no.
Thread:
you: can you just write the New Deal paragraph for me
Diana: No. But I can get you unstuck in about a minute. You have Chapter 12 open. What is one thing that changed and stayed changed?
you: idk, people got jobs from the government?
Diana: That is a real answer. Write that sentence in your own words, then find the page in your notes that backs it up.
The interactive moment: a press-and-hold button labeled **Hold to ask Diana to write it.** Progress builds while held. Releasing early eases back, never snaps. Completing it does not produce an essay; it lights the four lines of the thread in sequence and ends on a chip reading **Your next five minutes: one sentence, your words.** The visitor performs the brand's one idea. Reduced motion gets the lit final state with no hold.

**C. Four ways to get moving.** A stepped list on ink rules, no cards, no images (a list of four gets none, so nothing reads as a hole).
Headline: Four ways to get moving.
Lead: None of them hand you an answer. They change what Diana does with the question.
01 Break it down. One overwhelming assignment becomes the three steps that actually come next. You choose where to start and the rest waits.
02 Body double. Diana sits with you and says nothing at all. A timer, your one task, and quiet company until you are moving again.
03 Study buddy. Diana asks you the questions instead of answering them, so you find out what you already know before the test does.
04 Check my thinking. You write the paragraph. Diana points at the sentence where the argument thins out and does not offer to replace it.

**D. Done is not submitted.** Supporting still B at right (the tap), copy at left. Diana's research names this the most defensible single feature and an unfilled hole: students finish the work and never turn it in.
Kicker: THE STEP EVERYONE SKIPS
Headline: You finished it. Did you turn it in?
Body: Students with ADHD finish the essay and forget the upload. Diana treats turning it in as its own step, with its own nudge, until the button has actually been pressed.

**E. Your work stays yours.** The ownership meter, built in code, no image. Answers the teacher objection surfaced in research: not cheating itself, but not being able to tell what the student learned.
Kicker: THE RECEIPT
Headline: You can always show the work is yours.
Body: Every assignment keeps a running count of how much of it came from you. Not a grade. Not a warning. Just the receipt, ready the moment a teacher asks.
Meter: New Deal reflection, English 11. Your words 87%. 6 turns with Diana, all saved. 13% quoted and cited from your sources. Nothing in this draft was pasted from Diana. Send the receipt to [TEACHER NAME] in one tap.

**F. Inside the app.** The real dashboard screenshot (dash_desktop_v3.png), crisp and untouched, in an ink-outlined frame. Caption: This is the real app. The illustrations on this page are generated artwork.

**G. Questions people actually ask.** Five, in the buyers' words, answers short.
Is this cheating? No. Diana refuses to write your work and keeps a record that shows what came from you. Ask it for the answer and you get the next step instead.
Will my teacher know I used it? Only if you show them. The receipt is yours to share or keep.
Does it work with my school's stuff? Yes. It pulls from Canvas and Google Classroom.
What happens to my data? [CONFIRM PRIVACY WORDING] Built for the strictest state rules and ready for students under 13.
Is it free? Free for students during early access.

**H. Early access, the one call to action.**
Kicker: EARLY ACCESS
Headline: Tonight there are four things. Tomorrow there is one.
Body: Free for students while we are in early access. Bring your Canvas or Google Classroom account and Diana fills itself in.
Label: School email. Placeholder: you@school.edu. Button: **Start tonight.**
Success state: **You're on the list. We'll email you the night it opens.**
Form handling on a static site: JS-only success state for now, said plainly. Swapping to a mailto or a form service is a one-line change once a real inbox is named.

**I. Footer.** Diana. A homework workspace that leaves the work with the student. Links: How it works, Help modes, Your work, Privacy, Terms. Disclosure line: Illustrations on this page are generated artwork. The app screens are real.

## 8. Vector layer plan and the signature element

**The signature: the halftone that settles.** One fixed background layer behind the whole page, comic halftone dots drifting on a 75-second cycle. Its density is dense at the top of the page (the pile) and thins as the visitor descends, reaching near-empty by the early-access section. Remove it and the page loses both its pop-art identity and its story. That is the loudness test passed. It is also the one fixed environment layer the design direction asks for.

Supporting vectors: comic panel borders as section dividers, ink lines that draw themselves on scroll. Whisper-level paper particles in the static hero. Speech-bubble tails on the refusal thread drawn in SVG. All hold final states under reduced motion.

## 9. Supporting stills (after the video gate, same world, 2 credits each)

- Still B: the girl's hand tapping one glowing rounded button on the tablet, close, halftone, cyan glow, night room, pop-art comic. No text, no logos.
- Still C: wide, the girl calm at the settled desk, tablet glow, used at whisper opacity behind the refusal panel. No text, no logos.

## 10. Engineering list

Blob fetch behind the streamed loading ring (the joined video will exceed 8 MB). The dt-normalized lerp that rests. Gated, deadlock-safe seeks. Delta-gated DOM writes. Band pacing validated by the flick test at 120, 240, 360. The four-layer legibility system with the worst-frame audit at 3.5:1. The five static-hero gates, matched character-for-character in CSS and JS, live on change. Complete without the video. The whole-site-animated standard: entrances retire their delays, one living element per section, animate transform and opacity only, overflow-x clip on html and body, reduced motion honored live in both directions.

## 11. Costs (exact, preflighted)

Start frame, 2 credits. Three segments on Seedance 2.5 at 54 each, 162 credits. Two stills, 4 credits. Total to a built site: 168 credits. One segment re-roll is 54. Balance: 2,460.

## 12. The copy gate

Every viewer-facing line above ships verbatim. The built page passes the Phase 9 grep gate, zero em dashes and zero stock words, plus the body-copy sweep for AI tells, before anyone sees it. The staccato lines in the band map and the closing headline are designed devices and stay.
