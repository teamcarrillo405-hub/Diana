# Immersive 3D Scroll Landing — "The Anatomy of Focus"

Owner concept: a laptop comes apart as you scroll; each internal component
tells one part of what Diana is. References to beat: oryzo.ai,
findrealestate.com.

## The honest capability statement

**The scroll engine, choreography, overlays, motion, text, performance, and
accessibility — yes, buildable here at reference quality.** The technique is
Apple's: a pre-rendered frame sequence (~160 frames) scrubbed on a <canvas>
by scroll progress, with pinned sections and text choreographed to scroll
ranges. No heavy framework needed — native scroll + rAF + canvas beats
GSAP-bloat sites on performance, which is one of the ways we win.

**The 3D asset is the one hard problem.** Photoreal Chromebook teardown
renders need a 3D artist or days of Blender modeling. The plan solves it by
NOT competing on photorealism: we render a **stylized, glowing,
schematic laptop** — Diana OS aesthetic (dark field, violet/teal emission
edges, grid floor) — via **headless Blender driven by a Python script I
write** (installable here via winget; EEVEE renders 160 frames without
opening a UI). Stylized-schematic beats photoreal for this story anyway:
the components are *metaphors*, and the look matches the product's actual
brand instead of a stock teardown. Fallback if Blender misbehaves: the same
geometry built in Three.js, scroll-driven in real time.

## Why ours beats the references
1. **Story over spectacle** — oryzo/findrealestate scroll pretty objects;
   ours maps every component to a real product truth a parent/teen cares about.
2. **Performance** — frame-sequence + canvas, AVIF/WebP, lazy-loaded, no
   600KB animation libs. Target: LCP < 2.5s, scroll at 60fps, INP < 200ms.
   Reference sites routinely fail all three.
3. **Accessibility** — reduced-motion and mobile-lite users get the current
   (already strong) landing as the graceful fallback. Award sites almost
   never do this; ours is gated on it.
4. **A real product at the end** — the scroll ends by snapping INTO the
   actual product preview. The demo is the destination, not a brochure.

## The storyboard (scroll % → scene)

| Scroll | Scene | Component → meaning | Overlay copy |
|---|---|---|---|
| 0–8% | Closed laptop floating on the dark grid, breathing glow | — | "School runs on this." (display type) |
| 8–18% | Lid opens toward camera; screen shows the Right-now card | Display → **Focus** | "Diana shows one move. Never the mountain." |
| 18–32% | Chassis lifts; **CPU** rises, traces light up toward it | CPU → **The learning loop** | "It learns how you learn — and adapts." |
| 32–45% | **RAM sticks** fan out in a row | RAM → **Memory (FSRS)** | "Reviews timed to your memory, not a streak." |
| 45–58% | **SSD** slides out, opens into card stacks | Storage → **Notes & sources** | "Every note, source-anchored. Yours." |
| 58–70% | **Keyboard** detaches, keys float; one key glows ✦ | Keyboard → **Authorship** | "AI that never types for you. Receipts to prove it." |
| 70–82% | **Battery** pulses slow | Battery → **Energy modes** | "Low-energy days are planned for, not punished." |
| 82–92% | Reassembly — everything flies back, fast and clean | — | "All of it, working as one calm system." |
| 92–100% | Laptop closes → camera dives into the screen → **live product preview** + CTAs | — | "Your next 5 minutes, made clear." + Get started |

Text enters per scene with the Settle verb; component labels use thin
callout lines (schematic style); a progress spine on the right edge shows
the 8 chapters.

## Build phases

**I1 — Asset pipeline.** Install Blender (winget, headless). Write
`scripts/render-landing-sequence.py`: stylized laptop from primitives
(rounded chassis, screen plane with emission texture, CPU/RAM/SSD/keys/
battery as distinct meshes), keyframed disassembly along the storyboard,
camera path, EEVEE, 1280×800, 160 frames → `public/landing-3d/frame-{n}.webp`
(target < 5MB total via WebP q70 + 2x variant for retina).

**I2 — Scroll engine.** `components/immersive/scroll-sequence.tsx`: canvas
scrubber (preload strategy: first 20 frames eager, rest progressive),
scroll-progress hook (rAF-throttled), pinned section container, per-range
overlay choreography component. Zero dependencies.

**I3 — The page.** New `/film` route first (so the proven landing stays
until sign-off), assembling storyboard scenes + overlays + chapter spine +
end-cap product section reusing ProductPreviewCard/CTAs.

**I4 — Gates.** Reduced-motion/mobile-data fallback = render the current
landing sections instead. Axe pass, INP/LCP budget verified on the route,
tone audit, both-theme QA. Then swap `/` → film page (current landing
becomes the fallback component) and promote to production.

**Risks named:** Blender install/render time on this machine (mitigation:
low samples EEVEE, 1280px frames); total payload (mitigation: WebP, half
-rate frames on mobile); scroll-jack motion sickness (mitigation: fallback
+ modest camera moves). If the rendered look isn't good enough after I1,
the Three.js fallback uses identical storyboard and engine.
