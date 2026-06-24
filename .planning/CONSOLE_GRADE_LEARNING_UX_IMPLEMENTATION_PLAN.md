# Console Grade Learning UX Implementation Plan

Purpose: convert Diana into a consistent mission-based learning command center while preserving all current product logic, AI safety, calm copy, and learning-science boundaries.

## Non-Negotiables

- Do not redesign from scratch.
- Do not replace working business logic.
- Do not make a traditional school dashboard.
- Do not make a childish game.
- Do not center a chatbot.
- Do not copy Fortnite or any game IP.
- Do not add decorative game mechanics that do not reduce cognitive load.
- Do not ship a screen that hides the next action.

## Current Technical Baseline

- Framework: Next.js App Router, TypeScript, Tailwind, shadcn/ui patterns, Supabase.
- Authenticated routes: `app/(app)/`.
- Auth routes: `app/(auth)/`.
- Core business logic: `lib/`.
- AI calls: Supabase Edge Functions only.
- Design system surfaces: `app/globals.css`, `lib/ui/design-system.ts`, `tailwind.config.ts`, shared components.
- Key student dashboard components: `app/(app)/dashboard/page.tsx`, `components/student-portal/student-today.tsx`.
- Current invariant: calm tone, no red error states, no shame/scolding, no streak pressure, no final-work takeover.

## Design Thesis

Diana should feel like a console-grade learning command center:

- Mission Control instead of dashboard.
- Mission Inventory instead of assignment list.
- Active Mission instead of assignment detail.
- Source Vault instead of notes app.
- Mission Map instead of calendar.
- Loadout instead of settings/tools.
- Recovery System instead of error or failure state.
- Match Summary instead of generic progress page.

## Phase 0: Lock The System

Goal: make the doctrine enforceable before more UI work.

Deliverables:

- `.planning/CONSOLE_GRADE_LEARNING_UX_RULES.md`
- `.planning/CONSOLE_GRADE_LEARNING_UX_IMPLEMENTATION_PLAN.md`
- `.planning/CONSOLE_GRADE_LEARNING_UX_AGENT_PROMPT.md`
- Optional later: scoring helper in `lib/teen-testing/` to score screen readiness.

Exit criteria:

- Future prompts point agents to the rules file.
- Every UI pass declares the screen role and single primary job.

## Phase 1: Dashboard Becomes Mission Control

Goal: the first screen answers "what do I do now?" in three seconds.

Current risk:

- The dashboard has improved, but it can still drift into project-management dashboard language instead of mission-control structure.

Required structure:

1. Mission Now
   - Class/channel.
   - Mission title.
   - First action.
   - Time box.
   - Start Mission.
   - Refresh analysis.
   - Why Diana picked it.

2. Today Inventory
   - Three to five visible items.
   - Grouped by class or urgency.
   - Each item shows type, due window, status, and missing item if any.

3. Progress Signal
   - Done today.
   - Left today.
   - Proof/source saved.
   - Energy mode, shown once.

4. Recovery
   - I'm stuck.
   - Body support.
   - Ask for next step.

Remove/de-emphasize:

- Repeated mood selectors.
- Visual objects that do not explain a state.
- Duplicated next-step panels.
- Secondary cards above the mission.

Exit criteria:

- 4 of 5 testers can name the next action after three seconds.
- No duplicate state controls above the fold.
- Dashboard score 95+ by the console-grade rubric.

## Phase 2: Assignments Becomes Mission Inventory

Goal: assignments feel like organized inventory, not a pile.

Required structure:

- Filters as inventory tabs: Now, This Week, Waiting, Submitted, Review.
- Each mission row shows class, objective, first step, due pressure, missing items, and support loadout.
- The first mission is visually dominant.
- Bulk scanning is possible without dense paragraphs.

Key components to inspect:

- `app/(app)/assignments/page.tsx`
- `app/(app)/assignments/[id]/page.tsx`
- `lib/scoring/next-five-minutes.ts`

Exit criteria:

- Student can find the next mission and missing items without opening every assignment.
- No more than one primary CTA per row.

## Phase 3: Assignment Detail Becomes Active Mission

Goal: one assignment page shows the objective, sources, tools, progress, and recovery.

Required structure:

1. Mission Brief
   - What it is.
   - Why it matters.
   - First move.

2. Source Slots
   - Prompt.
   - Rubric.
   - Teacher note.
   - Student draft.
   - Class notes.

3. Step Track
   - Done.
   - Current.
   - Left.

4. Loadout
   - Reading support.
   - Writing support.
   - Timer.
   - Notes.
   - TTS.
   - Study artifacts.

5. Recovery
   - I'm stuck.
   - Show smaller step.
   - Explain source.
   - Ask teacher/tutor/parent support.

Exit criteria:

- The page never looks like a generic AI answer page.
- The student sees what remains student-owned.
- Help is visible but secondary to doing the work.

## Phase 4: Notes Becomes Source Vault

Goal: notes support NotebookLM-style source-grounded study without becoming a file pile.

Required structure:

- Source cards with type: text, voice, photo, PDF, class, assignment.
- Ask Across Notes.
- Audio Overview.
- Flashcards.
- Citations.
- Missing-source prompts.

Preserve:

- Current `note-synthesis` source-grounded behavior.
- Citation fallback.
- ElevenLabs/OpenAI TTS support.

Exit criteria:

- Student can create a note and generate a cited study summary.
- Audio overview works.
- Source citation is always visible.

## Phase 5: Classes Becomes Mission Channels

Goal: each class is a channel with rules, rubrics, mastery, and next missions.

Required structure:

- Channel identity.
- Teacher expectations.
- Rulebrick/rubric.
- Current mission.
- Upcoming missions.
- Mastery/risk signal.
- Source vault for that class.

Exit criteria:

- A class page explains what matters in that subject without feeling like admin settings.

## Phase 6: Calendar Becomes Mission Map

Goal: show time, workload, prep windows, and due pressure without shame.

Required structure:

- Week map.
- Due windows.
- Prep windows.
- Load shape.
- Recovery buffers.
- Import/source status.

Exit criteria:

- Student can see why today's mission matters.
- Calendar does not become a wall of events.

## Phase 7: Proof Becomes Match Summary

Goal: show effort, authorship, source anchors, and learning progress with dignity.

Required structure:

- What the student did.
- What Diana organized.
- Sources used.
- What changed.
- What is ready to share.
- What stays private.

Exit criteria:

- Parent/teacher can understand help without takeover.
- Student does not feel judged by the proof screen.

## Phase 8: Recovery System

Goal: stuck states become a normal product mechanic.

Required structure:

- I'm stuck.
- Make smaller.
- Read it to me.
- Show source.
- Body reset.
- Ask support.
- Save and return.

Exit criteria:

- Recovery is always available in core work screens.
- Recovery never uses shame copy or red-state pressure.

## Phase 9: Mobile First Pass

Goal: make phone use feel native and low-load.

Required structure:

- Mission first.
- Full-width primary action.
- Inventory cards scroll vertically.
- Bottom nav remains stable.
- No horizontal overflow at 375px, 390px, 768px.
- Touch targets at least 44px.

Exit criteria:

- Student can start a mission with thumb navigation.
- No floating element collisions.

## Phase 10: QA And Launch Gates

Required automated checks after code changes:

- `npm run typecheck`
- `npm run tone-audit`
- targeted tests for touched logic
- `npm run build`

Required visual checks:

- Desktop screenshot.
- Mobile screenshot at 390px.
- Dark mode screenshot.
- Reduced-motion sanity check if animation changed.
- Console/server logs clean for target route.

Required human checks:

- Can the student name the mission?
- Can they name the first action?
- Can they tell what is left?
- Can they find help?
- Can they recover if stuck?
- Does the screen feel mature and teen-native?

## Rollout Order

1. Dashboard / Mission Control.
2. Assignment detail / Active Mission.
3. Assignments / Mission Inventory.
4. Notes / Source Vault.
5. Classes / Mission Channels.
6. Calendar / Mission Map.
7. Proof / Match Summary.
8. Recovery mechanics across all core routes.
9. Mobile polish.
10. Live teen validation.

This order matters because the dashboard sets the grammar, assignment detail proves the mission model, and inventory/source/proof screens reinforce the system.

