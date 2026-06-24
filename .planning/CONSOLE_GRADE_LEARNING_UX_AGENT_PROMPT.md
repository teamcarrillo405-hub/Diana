# Console Grade Learning UX Agent Prompt

Use this prompt to start a future design pass without drifting from Diana's product method.

```text
You are working inside the existing Diana education product.

Your job is to apply Diana's console-grade learning UX method to the requested screen or component while preserving existing product logic, data flow, safety rules, and accessibility.

Before changing code, read these files:

1. AGENTS.md
2. .planning/CONSOLE_GRADE_LEARNING_UX_RULES.md
3. .planning/CONSOLE_GRADE_LEARNING_UX_IMPLEMENTATION_PLAN.md
4. .planning/DESIGN_MASTERPLAN.md
5. .planning/UI_HONEST_AUDIT_2026-06-09.md
6. The route/component files for the screen being changed

Do not redesign the app from scratch.
Do not make a traditional school dashboard.
Do not make a childish game.
Do not center a generic chatbot.
Do not copy Fortnite, Valorant, Roblox, Minecraft, or any game IP.

Diana is a mission-based executive-function system for students with ADHD, dyslexia, dysgraphia, anxiety, working-memory challenges, and school-related overwhelm.

Translate game structure into learning structure:

- Lobby -> Mission Control
- Quest -> School Mission
- Inventory -> Assignments, files, notes, rubrics, sources, drafts, and missing items
- Loadout -> Student support tools
- Map -> Learning path and due windows
- Storm timer -> Due pressure without shame
- XP -> Effort, completion, recovery, and mastery progress
- Squad -> Parent, teacher, tutor, coach, or study support
- Match summary -> Proof, authorship, and reflection
- Revive -> Stuck recovery

Every screen must answer:

1. What am I doing?
2. Why does it matter?
3. What do I do first?
4. What is already done?
5. What is still left?
6. What help is available?
7. How do I recover if I get stuck?

Before implementation, return a short screen plan:

- Screen role:
- Primary job:
- Existing logic to preserve:
- Current cognitive-load problems:
- What will be removed or de-emphasized:
- New information hierarchy:
- Primary action:
- Recovery path:
- QA gates:

Then implement only the approved or clearly scoped change.

Implementation rules:

- Use existing components, tokens, and route patterns where possible.
- Prefer Server Components unless interactivity requires a small leaf Client Component.
- Do not add a third-party dependency without checking package.json first.
- Use Lucide icons already present in the app unless the repo has a stronger existing standard.
- Keep visual density around 4 out of 10.
- Use one primary CTA per screen.
- Use cards only when they communicate hierarchy.
- Use status chips, source slots, inventory slots, mission cards, and progress bars only when they clarify structure.
- Motion must explain a state change, not decorate.
- Use transform/opacity for animation.
- Respect reduced motion.
- Keep touch targets at least 44px.
- Avoid duplicate controls for the same state.
- Avoid raw red error states, shame copy, streaks, or pressure language.
- Preserve authorship boundaries and source anchors.

After implementation:

- Run `npm run typecheck`.
- Run `npm run tone-audit`.
- Run targeted tests for touched logic.
- Run `npm run build` when route/component changes are significant.
- Verify the route returns 200.
- Capture or inspect desktop and mobile states when UI changes are visual.
- Score the screen against the console-grade rubric.

Report:

- What changed.
- What product method it supports.
- What was intentionally removed or de-emphasized.
- Checks run.
- Remaining score gaps.
```

## Short Prompt Variant

```text
Apply Diana's console-grade learning UX rules to this screen. Read `.planning/CONSOLE_GRADE_LEARNING_UX_RULES.md` and `.planning/CONSOLE_GRADE_LEARNING_UX_IMPLEMENTATION_PLAN.md` first. Preserve logic. Do not code until you identify the screen role, primary job, first action, inventory, progress, help, and recovery path. Then implement the smallest change that makes the screen feel like a mature mission-based executive-function system, not a school dashboard or fake game skin.
```

## Dashboard-Specific Start Prompt

```text
Refactor `/dashboard` as Mission Control. Preserve `rankAssignments`, profile/readiness logic, support policy, token budget, flashcard due data, and existing route behavior. The first viewport must make the next mission obvious in three seconds. It must show mission title, class/channel, first action, time box, Start Mission, Refresh Analysis, why Diana picked it, and recovery. Today inventory should show only the next few items with due/load/proof signals. Remove or de-emphasize duplicate mood selectors, decorative motion, and redundant next-step panels. Score the result against the console-grade rubric and verify desktop/mobile.
```

