# Today Dashboard: Data Map and Prototype Review

Updated September 9, 2026.

## Approved Integration

The user approved the neon preview on September 9, 2026. The authenticated `/dashboard` route now renders the approved six-panel Today interface through `components/dashboard/today-dashboard.tsx`. The preview and live route share chart components and the frosted/neon stylesheet. The background image is unchanged. The old lobby component remains in the checkout but is no longer rendered by Today.

- Start and plan rows link to real assignments. Ready-to-submit rows open the existing `/assignments/[id]/submit` review; no submission is performed by the dashboard.
- Check-In uses the existing server action and persistence workflow, including autosave, saved feedback, and retry, with the approved segmented controls and Save action.
- The weekly assignment goal and completed-work milestone use the existing cohort of assignments **due this local week**, including work finished early. They are not labeled as an activity-date completion ledger. A separate complete event history would be needed to count all assignments finished during the week irrespective of their due dates.
- Planned study bars now use the target duration chosen for recorded focus sessions; studied bars use saved elapsed minutes from finished focus sessions. Generic legacy time logs without valid focus targets are excluded. Session targets are not a future calendar study plan. Activity spanning local midnight is allocated proportionally across the covered dates; recorded elapsed time is not a new independent measurement of attention.
- Submitted work is counted by `submitted_at` in the local week, independently of due dates, and only while submitted/graded. Ready-to-submit work is excluded.
- Subject Overview includes every subject with estimated work in the due-week cohort. Upcoming work uses today plus six following local dates, with earlier and other ready work shown separately.
- Queries retain authentication, row-level security, and explicit owner filters. Source errors show unavailable states rather than fabricated zeros. No database migrations, auth exemptions, or account records were created for this integration.

### Integration Verification

- Production build, TypeScript, scoped lint, and 64 focused tests passed. The tone audit completed with no blocking findings using Node's TypeScript support after the standard launcher encountered a local process restriction.
- The real dashboard component was inspected with isolated synthetic data at desktop and phone sizes. Five states were checked at 360px, 820px, and 1366px: six panels, loaded artwork, no horizontal overflow or tested heading/control clipping. Lower mobile panels were also checked after scrolling.
- The development-only `/landing-3d/today-preview/integration` fixture renders the same production component without fetching student data. It is visibly labeled synthetic and returns not found outside development. It is not a substitute for authenticated account verification.
- Live `/dashboard` correctly redirected to sign-in. Account-data rendering, actual persisted check-in reload, and assignment navigation from the signed-in dashboard remain pending user sign-in. No live-account acceptance or deployment is claimed.

## Original Prototype

A development-only visual prototype is available at `/landing-3d/today-preview`.
It uses synthetic September 7-13 sample data. It does not read or change student records, bypass authentication for the live dashboard, or replace `/dashboard`.
The route returns not found outside development. No database, authentication, or production Today components were changed for this prototype.

The approved background image is retained, with frosted panels and reference-inspired violet, blue, mint, and amber graphics. The six panels remain in the requested order. Phone layouts retain separate panels; tablet layouts use two columns; desktop layouts use three.

Following the user's position change, the reading order is Today's Plan, Study Progress, Upcoming Deadlines, Check-In, Subject Overview, Achievements. Only the first two panels have swapped; the second row, material, background, and interactions are unchanged.

## Metric Definitions and Source Audit

| Measure | Proposed definition | Existing source and remaining work |
| --- | --- | --- |
| Assignment goal ring | Finished assignments in the week's goal cohort, divided by the assignment count in that cohort. Display the count separately from study minutes. | `app/(app)/dashboard/page.tsx:94` currently queries the due-week cohort. Use this only for an explicitly due-week goal, not as proof of when work was completed. Decide whether the long-term goal is the due-week cohort or a student-selected plan. |
| Assignments completed this week | Distinct assignments with a qualifying completion transition during the student's local week. Reopening and completing again must not double count. | `app/(app)/assignments/[id]/actions.ts:97` emits a `completed` task signal for submission, not for every done transition. State-snapshot triggers also exist but are not yet verified as a complete event ledger. Audit all completion paths before wiring this number. Do not substitute current status plus due date. |
| Study minutes | Recorded active study minutes, grouped by actual activity day. Preserve actual values above the planned target. | `app/(app)/timer/actions.ts:54` and `:125` persist `assignment_time_log` records with start, target end, end, elapsed minutes, and focus state. The inspected finish calculation uses elapsed wall-clock time and rounds to at least one minute. Pause subtraction and legacy rows need verification before describing the data as precise active study time. |
| Study sessions finished | Distinct qualifying completed focus sessions, within the local week. | Prefer validated `assignment_time_log` focus-session records with `focus_state = completed`, an end timestamp, and valid target/session metadata. This table is also used by assignment workflows; do not count every historical time-log row as a deliberate study session. |
| Planned study minutes | Minutes the student has scheduled or chosen to study on each day. This differs from total assignment effort estimates. | A canonical persisted daily study-plan source was not established in this audit. `calendar_events` has generic calendar start/end data but no verified study-only/assignment association. Do not treat all calendar events as study plans. This remains an integration decision. |
| Subject work share | Each subject's estimated assignment work in the weekly planning cohort, divided by the total for all subjects. | `lib/dashboard/lobby-view.ts:357` already uses assignment estimates but truncates the displayed groups. Include every subject, or an inspectable Other group. The prototype labels this as estimated assignment work, not actual study activity. |
| Work submitted | Distinct assignments explicitly submitted in the local week. | `app/(app)/assignments/[id]/actions.ts:82` sets `submitted_at`. Audit all submission/reopen paths and permissions, then aggregate this timestamp. Ready-to-submit items do not count as submitted. |
| Today's Plan | The highest-priority assignment followed by work actually selected for today. | Keep the existing priority scoring and assignment navigation. A priority assignment can be worked on today even if its deadline is tomorrow; do not invent a calendar appointment for it. |
| Upcoming Deadlines | Today through the following six student-local dates, plus a separately labeled earlier-work group. | Use assignment due dates and explicit readiness states. Deduplicate by assignment ID. The prototype shows three upcoming rows, with the full upcoming list in details. The busy state also shows earlier work. |
| Check-In | Existing Energy, Sleep, Movement, and saved feedback. | Keep the production Check-In component and its persistence behavior when integrating. The preview form is an isolated interaction demonstration with an explicit Save action; it is not a change to production's existing autosave behavior. |

### Pre-Integration Mismatches

- `lib/dashboard/lobby-view.ts:238` derives completed minutes from assignment estimates and finished status.
- Its daily bars group work by due date, not by the day study actually occurred.
- `lib/dashboard/lobby-view.ts:397` supplies a planned-time milestone where a completed-session measure is wanted.
- A due-week completion ratio and an activity-week completion count are different measures. The sample happens to use the same count for both; production must calculate them independently.

### Time and Missing Data Rules

- Use the student's configured timezone and a Monday-to-Monday half-open local week. Resolve boundaries to instants for queries, including daylight-saving changes.
- For activity spanning midnight or a week boundary, define and test allocation of active time before launch.
- Unknown history is unavailable, not zero. The prototype shows dashes and a neutral ring/badge treatment.
- A new student with no weekly goal gets a neutral goal state, not a misleading completion percentage.
- Never backfill actual time from estimates. Preserve duplicate protection and explicit submission confirmation.

## Prototype Interaction Scope

- The highest-priority Start opens sample assignment details.
- Finishing a sample session increments the displayed study duration by that task's own duration and adds one sample session. Repeating the same sample completion does not count it twice.
- Ready-to-submit opens a review demonstration and explicitly does not submit work.
- Daily bars expose exact values on hover, focus, and click/tap.
- Subject selection highlights the corresponding donut segment and updates its central value.
- Milestone buttons open category details. Check-In saves only to local component state.
- The scenario selector includes typical, busy/long-title, fresh, completed, and unavailable-history examples. Reset restores the initial preview state.
- Achievement artwork was refined in Figma after user feedback: layered paper, a blue stopwatch, and a folded mint plane replace the faceted CSS badges. Editable source: https://www.figma.com/design/C8emmnnCbIroT7jmkGVMPL?node-id=2-2. The three locally exported SVGs total under 10 KB and retain the Lucide attribution for adapted details. No Higgsfield credits were used.

### Graphics Revision

- Removed the outer frame's centered notch and reduced its excess top padding. The background and frosted panel material were preserved.
- Progress uses a single violet 9px arc instead of the multicolor 12px arc. The separate study-time measure remains separate.
- Planned time uses outlined electric-violet bars; actual studied time uses solid neon-mint bars with a darker edge. Bar width increased from 7px to 9px where space permits; chart labels are 11px.
- Subject segments use electric violet #9828FF, cyan #00BFFF, mint #00E99A, and golden yellow #FFD42A, with pink and orange for additional subjects. Segment width reduced from 24px to 18px, with a 20px selected state.
- The brighter neon revision also updates the Figma milestone artwork, Start accent, and check-in slider fills. Dark text, chart geometry, panel order, background, and frosted surfaces are unchanged. Neon is concentrated in graphics rather than small labels.
- The artwork has fixed aspect ratios and a subdued unearned/unavailable treatment. Existing milestone detail actions are preserved.

## Verification

- Local preview HTTP response: 200.
- TypeScript check passed.
- Targeted lint check passed for the prototype and its fixture tests.
- Seven focused fixture tests passed in `lib/dashboard/today-preview-data.test.ts`.
- Browser screenshots inspected for desktop and 390px phone composition.
- Five states checked at 360px, 390px, 820px, 1366px, and 1440px widths: six panels retained their order; no horizontal page overflow or clipped tested text/control elements were detected.
- Browser interaction checks verified sample session duration/count changes, check-in feedback, subject selection, and Escape dismissal of details.
- Exact 20-minute and 25-minute sample session totals were checked; repeat completion did not double count. Reset restored check-in state. Submission review left the submitted count unchanged. The full upcoming-work dialog included all four busy-week deadlines.
- At the final 390px by 844px phone check, Start ended above the fixed navigation; the reset control's icon rendered at its intended 16px width.
- Reduced-motion rules and visible keyboard-focus styles are implemented.
- After the graphics revision, the five states were rechecked at all five listed widths: the three artwork files loaded, panel order was preserved, and no tested text clipping or horizontal overflow was found. The artwork family was also visually inspected in Figma and its label font verified as Lexend.
- After the neon palette revision, typecheck, targeted lint, and all seven fixture tests passed again. Desktop (1366px) and phone (390px) screenshots were reviewed; all five phone scenarios retained six panels, loaded artwork, and no tested heading/control clipping or horizontal page overflow. Empty and unavailable milestones retained their neutral treatment.

These are prototype checks, not a production data/persistence audit, a comprehensive accessibility certification, or student validation. Composited contrast, browser zoom, assistive technology, modest-device performance, and real-account workflows still require acceptance testing during integration.

## Next Gate

Complete signed-in account verification. Future work may add an explicit daily study-planning source and a complete assignment-completion event ledger; neither should be inferred from due dates. Student evaluation and an evidence-backed award case study follow a working, validated product.
