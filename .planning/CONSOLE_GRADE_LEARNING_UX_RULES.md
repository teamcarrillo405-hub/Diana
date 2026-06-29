# Console Grade Learning UX Rules

Purpose: lock Diana's product method before the next design pass. This file is the working design constitution for mission-based executive-function UX.

## Source Of Truth Order

When instructions conflict, use this order:

1. Product safety and calm invariant from `AGENTS.md`.
2. This console-grade learning UX rule file.
3. Existing Diana design direction in `.planning/DESIGN_MASTERPLAN.md`.
4. Existing teen UX plans and audits in `.planning/UI_HONEST_AUDIT_2026-06-09.md`, `.planning/TEEN_NATIVE_UX_10_PLAN.md`, and `.planning/TEEN_VISUAL_FUTURE_MODE_10_PLAN.md`.
5. Local component patterns already present in the repo.
6. General visual inspiration from games, Apple, Spotify, or competitors.

Fortnite, Valorant, Roblox, Minecraft, and console games are architecture references, not visual sources to copy.

## Product Doctrine

Diana is a mission-based executive-function system for students with ADHD, dyslexia, dysgraphia, anxiety, working-memory challenges, and school-related overwhelm.

The product method:

- The student does not need more willpower. The student needs visible structure.
- The student does not need a blank page. The student needs guided starts.
- The student does not need more folders. The student needs inventory.
- The student does not need more reminders. The student needs next-action clarity.
- The student does not need shame. The student needs recovery paths.
- The student does not need an answer bot. The student needs an AI executive-function companion.

The mission is the center. The student is the actor. Diana is the guide.

## Game Structure Translation

Translate game systems into learning systems:

| Game System | Diana System | Product Job |
|---|---|---|
| Lobby | Mission Control | Show the next mission and readiness state. |
| Quest | School mission | Make the task concrete and startable. |
| Ready button | Start Mission | Begin the next time-boxed action. |
| Inventory | Student inventory | Show assignments, notes, files, rubrics, drafts, missing items, and tools. |
| Loadout | Support loadout | Show available help: read, write, break down, timer, TTS, notes, ask, stuck recovery. |
| Map | Learning path | Show what is due, what is next, and where each class is headed. |
| Storm timer | Due pressure | Show time awareness without pressure language or red states. |
| XP/progress | Effort and completion progress | Show work done, recovery, source proof, and mastery. |
| Squad | Support network | Show parent, teacher, tutor, coach, or study group support only when useful. |
| Match summary | Reflection and proof | Show what the student did, what Diana helped organize, and what remains. |
| Revive mechanic | Recovery path | Make "I'm stuck" and "help me recover" visible and normal. |

## Every Screen Must Answer

Every route must answer these seven questions without forcing the student to infer the structure:

1. What am I doing?
2. Why does it matter?
3. What do I do first?
4. What is already done?
5. What is still left?
6. What help is available?
7. How do I recover if I get stuck?

If a screen cannot answer all seven, it must at least make clear where that answer lives.

## Screen Grammar

Use this grammar across the app:

| Current Route/Area | Console-Grade Role | Primary Job |
|---|---|---|
| `/dashboard` | Mission Control | Pick and start the next mission. |
| `/assignments` | Mission Inventory | Show open missions, grouped by class/status/urgency. |
| `/assignments/[id]` | Active Mission | Show objective, first step, sources, tools, progress, recovery. |
| `/notes` | Source Vault | Capture and retrieve notes, sources, audio, documents, and citations. |
| `/classes` | Mission Channels | Show subject lanes, rules, rubrics, mastery, and teacher expectations. |
| `/grades` | Risk Radar | Show what needs attention without scoreboard pressure. |
| `/calendar` | Mission Map | Show due windows, prep windows, and workload shape. |
| `/flashcards` | Recall Loop | Show review inventory and memory schedule. |
| `/timer` and `/focus` | Focus Run | Turn a selected step into a contained work session. |
| `/proof` | Match Summary | Show receipts, authorship, effort, and source anchors. |
| `/wellness` | Recovery System | Support energy, sleep, reset, and body check without competing with academics. |
| `/settings` | Loadout Configuration | Configure theme, access, connectors, voice, and support preferences. |

## Visual Rules

The target feel is mature, sharp, modern, immersive, and accessible.

Use:

- Dark mode as a first-class experience.
- Strong contrast and readable typography.
- Clean mission cards, source slots, inventory slots, status chips, progress bars, and recovery prompts.
- One clear primary action per screen.
- Motion with restraint. Motion must explain a state change or guide attention.
- Visual density around 4 out of 10: daily-app clarity, not cockpit overload.
- A mature gamer influence: HUD clarity, map/inventory grammar, status language, and responsive controls.

Avoid:

- Fortnite art, characters, weapons, brand, colors, or IP.
- Childish school-game visuals.
- Cartoon mascots.
- Fake classroom decorations.
- Confetti, streak pressure, or reward clutter.
- Decorative motion that competes with the mission.
- Generic SaaS dashboards.
- Generic chatbot layout as the center of the product.
- Widget walls.
- Multiple competing CTAs.
- Raw red error language or shame copy.

## Cognitive Load Rules

Every design decision must reduce invisible executive work:

- Keep the current mission visible.
- Keep the first step visible.
- Keep missing items visible.
- Keep tools visible but secondary.
- Keep progress visible and concrete.
- Keep recovery visible.
- Prefer visual status over long text.
- Prefer grouped inventory over folders.
- Prefer a small number of clear actions over many options.
- Never require the student to remember hidden state from another screen.

## AI Companion Rules

Diana is not the teacher, therapist, or shortcut machine.

Diana can:

- Start.
- Sequence.
- Organize.
- Read with the student.
- Scaffold writing.
- Help remember.
- Help revise.
- Help recover.
- Cite sources.
- Explain what changed.

Diana cannot:

- Hide authorship boundaries.
- Center final-answer generation.
- Replace teacher expectations.
- Treat wellness as diagnosis or therapy.
- Make pressure the motivator.

## Drift Prevention Rules

Before any UI change:

1. Name the screen's console-grade role.
2. Name the screen's single primary job.
3. Identify the existing logic that must be preserved.
4. Identify which of the seven screen questions are currently weak.
5. Identify what will be removed or de-emphasized.
6. Decide the primary action.
7. Decide the recovery path.

After any UI change:

1. Verify the primary action is obvious in three seconds.
2. Verify no duplicate state controls are competing.
3. Verify the screen is not a generic education dashboard.
4. Verify the screen is not a fake game skin.
5. Verify mobile has no horizontal overflow.
6. Verify touch targets are at least 44px.
7. Run tone, type, and build checks when code changed.

## Scoring Rubric

Score every major screen from 0 to 100.

| Category | Points | Pass Standard |
|---|---:|---|
| Mission clarity | 20 | Student can name what they are doing. |
| First action clarity | 20 | Student can start without choosing between many options. |
| Inventory clarity | 15 | Student can see what they have and what is missing. |
| Progress clarity | 15 | Student can see done/left/next without a grade-like scoreboard. |
| Recovery clarity | 10 | Stuck path is visible and normal. |
| Teen-native maturity | 10 | Feels serious, modern, and made for teens. |
| Accessibility and calm | 10 | Contrast, touch, reduced motion, no shame/red/streak pressure. |

Minimum target before launch: 90 for every core screen. Dashboard and active mission require 95+.

