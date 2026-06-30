# Diana — Master Build Plan (start to launch)

This is the single source of truth for finishing Diana. "Finish" means a launch-ready product that is hardened and tested, not just visually redesigned. Read this before starting any work. Update the status columns as phases complete. This file sits alongside NAVIGATION.md and the design handoffs in docs/design/.

## The core principle

Every screen answers one question. What would Fortnite do. That means show, do not explain. Cut headings, subheadings, and paragraphs that describe instead of act. Bold confident actions over quiet panels. A game lobby never explains itself with text, it shows you the thing and lets you move.

The second principle is just as important. Stop styling pages. Build a system. Every page from here is assembled from a documented kit of reusable parts, not hand styled from scratch. This is what makes the rest of the work fast and consistent instead of slow and drifting.

## Working rules that prevent the chaos we already hit

These are not optional. Every problem in this build so far traces back to breaking one of them.

1. One branch only. All design work lives on `design/dashboard-tabs`. No other agent or automation touches it. The Codex worktrees that wiped work earlier are retired.
2. Commit immediately after every confirmed change. Never leave work uncommitted, the cleaner wipes it.
3. One change at a time, screenshot, confirm, then commit. Never stack three unconfirmed changes.
4. Service worker stays off in development. Already fixed. This is what was masking real changes behind a stale cache.
5. One dev server, from `C:\Users\glcar\Diana`, on one port. Confirm the working directory before trusting a screenshot.
6. Read this file and NAVIGATION.md before starting any page.

---

## Phase 0 — Stabilize the environment (almost done)

| Item | Status |
|---|---|
| Service worker disabled in dev | Done |
| Handoff files committed to git so they survive cleans | Done |
| tokens.css with --gl-* aliases committed | Done |
| NAVIGATION.md committed as routing source of truth | Done |
| Confirm only one dev server runs, from the correct folder | Ongoing discipline |
| Retire the stray Codex and clean-deploy worktrees so nothing else writes to this branch | To do |

The one open item is retiring the extra worktrees on the machine so no automation can write to this branch again. Worth doing before heavy building resumes.

---

## Phase 1 — Formalize the design system (the keystone)

This is the highest-leverage work left and it has not been done. Right now there is no component library. Every page hand styles its own version of the same parts, which is why drift keeps appearing. Build each part once, document it, and every later page assembles from these instead of reinventing them.

### Step 1a — Audit what exists

Run a full audit. Find every hardcoded hex value, every place a panel or card or button is styled inline instead of from a shared component, and every naming inconsistency. classes-grid.tsx alone is 100 percent hardcoded values today. The audit tells us the true scope.

### Step 1b — Build the component kit

Extract these into real, documented, reusable components. Each one built once, with its states and variants, using only --gl-* tokens.

| Component | Where it already appears | Notes |
|---|---|---|
| Panel (HUD-framed) | Start Now, metric column | Corner brackets, blur, border, one shared component |
| Metric tile | Assignments metrics column | Tone-colored top bar, big Saira number |
| Mission card | Assignment lanes | Class color accent, status pill, progress bar |
| Status pill | Cards | Ready, In progress, Submitted, Past due — amber not red |
| Class card | My Classes | Currently hardcoded, needs tokenizing |
| Hero CTA button | Lobby Start Next Mission | The bold cyan convention |
| Slanted action button | Talk to Diana | Lime, skewed, counter-skewed text |
| Lane (header plus card grid) | Assignments | Eyebrow, title, count badge |
| Empty state | Start Now empty | Calm, no dead stretch |
| Alert strip | Not built yet | See Phase 2 |
| AppTopNav | Built | Already the shared nav, the model for this whole approach |

### Step 1c — Document it

A DESIGN-SYSTEM.md in docs/design/ listing each component, its variants, its states, the tokens it uses, and its accessibility notes. The rule from the skill applies. If it is not documented, it does not exist, and the next page will reinvent it.

---

## Phase 2 — Finish the in-flight structural decisions

These were decided this session but not yet built. They come before the broad page migration because they settle what each page even contains.

| Item | Decision | Status |
|---|---|---|
| Move My Classes from Today to Work | Confirmed move | Diagnosed, not built |
| Today keeps hero plus alert slot only | Confirmed | Pending the move |
| Build the alert slot on Today | Planned in Dashboard Plan, never built | To do |
| Convert assignment lane cards to the new kit | Still old nexus style | To do |
| Tokenize the green Open Now button on class cards | Hardcoded today | Fold into the class card component |
| Remove dead computed data on the dashboard (unused burnout and reminder calls) | Cleanup | To do |

---

## Phase 3 — Page by page migration

Once the kit exists, every remaining page is assembled from it, prioritized by how much students use it. Each page follows the same loop. Get a feature inventory, decide what Fortnite would cut, design or assemble from the kit, screenshot, confirm, commit. Repoint its top-bar destination in NAVIGATION.md when it reaches parity.

Priority order, highest traffic first.

1. Assignments — in progress, finish the lanes and detail view
2. Assignment detail page — the heaviest surface, roughly 20 sections, prime candidate for ruthless trimming and progressive disclosure
3. Notes — the Think destination
4. Proof — the Proof destination
5. Future Path — the Future destination
6. Settings — where photo upload and config live
7. Classes and class detail
8. Grades, Insights, Calendar
9. The remaining secondary pages reachable from More (Flashcards, Timer, Wellness, Voice, and the rest)

The 19 components currently parked in the curated dashboard tabs find their real homes during this phase, per the table already in NAVIGATION.md. The curated tab pages retire as each real page reaches parity.

---

## Phase 4 — The deferred AI agent work

This is real backend engineering, not design, and was deliberately set aside. It is a separate project with its own scope.

| Item | Notes |
|---|---|
| Upgrade study-buddy from templates to the real AI model | Currently hardcoded responses |
| Upgrade break-down from heuristic to the real AI model | Currently local logic |
| Surface the real voice agent prominently | Entry point on Work already decided and built |
| Cost, rate limiting, and prompt design for the above | Needs its own planning pass |

---

## Phase 5 — Hardening

This is what separates a demo from a launch-ready product. For this app specifically, accessibility is not a nice to have, it is the entire point, since the product exists to serve students with IEPs, dyslexia, and ADHD.

| Item | Why it matters |
|---|---|
| WCAG AA contrast audit on the full navy and cyan palette | Muted text on dark backgrounds is the risk area, must be verified not assumed |
| Keyboard navigation and focus states across all interactive parts | A real accessibility requirement, not optional here |
| Screen reader labels on every icon button, card, and control | Same |
| Reading supports confirmed working after redesign | Bionic reading, pacing, line focus were in the old detail page, must survive |
| Mobile and responsive pass across all redesigned pages | We have only viewed desktop this entire build, phones are untested |
| The bottom nav versus top nav tradeoff on mobile | Flagged but never decided, belongs here |
| Apply the pending player_photo database migration | Committed but never run, the photo feature is incomplete until it is |
| Remove dead CSS and dead computed code accumulated during redesign | Several flagged this session |
| Error states and empty states on every page | Calm framing throughout, amber not red |
| Loading states where data fetches | Currently many pages just pop in |

---

## Phase 6 — Testing and launch

| Item | Notes |
|---|---|
| Use the QA seed account to test every page with real populated data | The account exists and seeds demo data |
| Test every page in both empty and populated states | Empty states have repeatedly looked broken when only the full state was designed |
| Test the full assignment lifecycle end to end | To do, drafting, checking, submitting, submitted, the checklist gate |
| Test the calm invariant holds everywhere | No red on due or status, past due reframed gently, amber for attention |
| Cross browser check | At minimum the browsers students actually use |
| Performance pass | Bundle size, load time, the service worker behavior in production |
| Final accessibility sign off | The launch gate for this product specifically |

---

## Definition of done

Diana is launch ready when every page is built from the documented component kit, navigation is the single top bar everywhere with the old sidebar fully retired, every page works in both empty and populated states, the calm and accessibility invariants hold throughout, the product has been tested with real data on the devices students use, and the hardening checklist is complete. The deferred AI agent upgrades in Phase 4 can ship as a fast follow if needed, since the real agent is already reachable.

## How to use this file

Before any work session, open this file and NAVIGATION.md. Pick the next item in the lowest open phase. Do not jump ahead to a later phase while an earlier one has open structural items, since later work depends on earlier decisions. Update the status as you go. This file is the thing that lets the work happen across many sessions without losing the thread.
