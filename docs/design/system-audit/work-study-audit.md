# Work, Assignment Workspace, and Study Source Audit

Date: 2026-09-16  
Repository: `C:/Users/glcar/Diana`  
Status: **SOURCE AUDIT ONLY. REVIEW PREVIEWS FIRST. No redesign is approved.**

## 1. Evidence and Scope

This report inventories the current working-tree source, including existing uncommitted changes. It covers every `page.tsx` and presentation component under `app/(app)/assignments`, `inbox`, `quick-add`, `break-down`, `timer`, `voice`, `body-double`, `study`, `study-artifacts`, `study-buddy`, `study-groups`, `concepts`, `knowledge-graph`, `ap`, and `templates`. Critical imported workspace controls, shared navigation, loading/recovery components, stylesheet ownership, and relevant action contracts were traced too. File paths below are relative to the repository root unless stated otherwise.

**Source evidence:** route policy, middleware, imports, JSX, styles, state branches, action calls, and selected existing test cases. Route classification follows `lib/student-route-policy.ts` and `middleware.ts:19`, not the mere existence of a page or its entry in `lib/screendesign/screens.ts`.

**Visual evidence: NONE collected in this audit.** No browser, screenshot, rendered viewport, contrast measurement, device test, network request, live record access, or visual acceptance. Source findings about composition are not claims about what currently renders. Tests were inspected as evidence of intended contracts, not executed. No build or development server was run.

The local `docs/design/work-concept-comparison.md` describes the user's Madden Objectives reference and a separate fixture-based Work comparison. It is useful direction, not fresh visual evidence or approval of this scope. Its historical browser results are not inherited here. No external Madden reference was browsed.

Only this report was authored. Production code, routes, CSS, data, assets, and preview implementations remain untouched.

## 2. Inventory Summary

| Measure | Count | Interpretation |
| --- | ---: | --- |
| Scoped page route patterns | **23** | Each `page.tsx` counted once; IDs are route parameters, not individual records. |
| Not retired by student route policy | **10** | Nine canonical page surfaces plus the conditional assignment-detail entry route. Auth, ownership, and data checks still apply. |
| Deliberately retired | **13** | Middleware rewrites to `/not-found` with HTTP 404 before page-level redirect/render logic. |
| Scoped route-specific loading files | **2** | Assignment list and assignment detail subtree. Other scoped pages inherit the authenticated loading boundary. |
| Scoped route-specific error/not-found files | **0** | Shared authenticated recovery boundaries remain relevant. |

Counts describe source routing, not HTTP verification. Query states, responsive drawers, overlays, artifact types, and specialist tools are additional screen states, not additional routes.

### 2.1 Canonical and Conditional Routes

All page owners in this table begin with `app/(app)/`.

| ID | Route | Source disposition and screen variants | Presentation owner |
| --- | --- | --- | --- |
| W01 | `/assignments` | Current Work selection surface. Featured assignment; grouped remaining queue; five-item disclosure; one-assignment state; no-active-work state. Submitted/graded work excluded. | `assignments/page.tsx`, `assignments/work-command-center.tsx` |
| W02 | `/quick-add` | Canonical assignment intake. Upload versus pasted instructions; selected/removable file; no classes; pending/error/warning. Creates an assignment and opens its workspace. | `quick-add/page.tsx`, `quick-add/assignment-upload-form.tsx` |
| W03 | `/assignments/captures/[id]` | Canonical capture review alias. Pending capture, high/low-confidence suggestions, photo/no photo, converted, dismissed, no classes, not found. | `assignments/captures/[id]/page.tsx` re-exports `inbox/[id]/page.tsx`; `inbox/[id]/confirm-form.tsx` |
| W04 | `/assignments/[id]` | Usually redirects to workspace. `sdState` beginning `writing-coach` renders a real draft editor. `sdState=submit` redirects to submit only for `exporting`. This is not the dormant cockpit screen. | `assignments/[id]/page.tsx`, `components/screen-design/ai-writing-coach.tsx` |
| W05 | `/assignments/[id]/workspace` | Canonical active-work surface across subjects. Work units, student work, source tools, contextual tutor, focus clock, specialist editors, mobile drawers. | `assignments/[id]/workspace/page.tsx`, `components/assignment-workspace.tsx` and component inventory below |
| W06 | `/assignments/[id]/submit` | `exporting`: outgoing-work review/checklist/handoff. `submitted` or `graded`: read-only receipt. Other states redirect to workspace. | `assignments/[id]/submit/page.tsx`, `checklist.tsx`, `assignments/[id]/external-submission-sync.tsx`, `components/assignment-submission-preview.tsx` |
| W07 | `/study` | Assignment-based study router, up to 30 open assignments. Notices and empty list. Study action can generate an artifact or route into workspace coaching/tools. | `study/page.tsx`, `study/actions.ts` |
| W08 | `/study-artifacts` | Saved library plus source/type generator. Assignment/note sources; quiz, guide, flashcards; no sources; no saved artifacts; creation notices. Limits: 60 artifacts and 30 sources per source type. | `study-artifacts/page.tsx` |
| W09 | `/study-artifacts/new` | Source-linked quiz briefing. `source=assignment:<id>` or `note:<id>`; 5/10/15/20 questions; invalid source redirects; generation notices. | `study-artifacts/new/page.tsx` |
| W10 | `/study-artifacts/[id]` | Payload-driven variants: guide, editable flashcard drafts, active quiz, empty quiz, completed quiz, review/restart. Not driven by the registry's `practice` label. | `study-artifacts/[id]/page.tsx`, `practice-session.tsx`, `artifact-flashcards.tsx` |

### 2.2 Retired Routes and Surviving Capabilities

**Do not redesign or revive these URLs.** Dormant states below are migration context only. Where there is no equivalent canonical capability, that is explicitly a product decision, not permission to add another hub.

| ID | Retired route | Dormant page/component behavior | Surviving canonical capability and disposition |
| --- | --- | --- | --- |
| R01 | `/assignments/new` | `assignments/new/page.tsx`, `form.tsx`: template, title/class/type, due date, time estimate/calibration hint, difficulty, reading/writing load, dictated description; no-class/error/pending states. | Assignment creation survives in W02. Manual metadata/calibration/template controls are not equivalent features of the new upload form. Inventory the gap; do not restore the old page. |
| R02 | `/inbox` | Page would redirect to `/assignments`, but middleware 404 wins. | Work and W03 own surviving assignment capture review. Do not add an Inbox hub. |
| R03 | `/inbox/[id]` | Capture review source still exists. The URL is blocked. | **Component is live via W03's re-export.** Retired URL does not mean dead presentation code. |
| R04 | `/break-down` | Page would find an assignment and redirect to `workspace?plan=1`; `break-down-client.tsx` retains empty/generate/proposed/accept/persisted/checkoff/error/policy-disabled states but is not imported by that page. | Work-unit sequence and source confirmation survive in W05. No wired `plan=1` consumer or imported `BreakDownClient` was found in W05. Optional plan generation is not proven migrated. Any future preview belongs inside assignment preparation, not this route. |
| R05 | `/timer` | `timer/page.tsx`, `timer-ui.tsx`: default/rough mode, difficulty, assignment selection, optional countdown, work/break settings, ambient audio, reward, start ritual, pause/resume/end; `with=others` switches body-double UI. | W05 uses **`AssignmentFocusClock`**, a different persisted start/stop timer. Pause/break/ambient/reward options are not evidenced in that clock. Do not label them as already migrated or reopen `/timer`. |
| R06 | `/voice` | Page would redirect to `/notes/new?mode=voice`; standalone `voice-command-surface.tsx` has editable transcript, optional class, save/clear/error/device states but no production importer found. | Dictation and live voice survive in W05 through `VoiceTextarea` and `AssignmentRealtimeTutor`. Voice-note links target `/notes/new?mode=voice`, outside this audit's screen ownership. Do not equate voice notes, dictation, and realtime tutoring. |
| R07 | `/body-double` | Page would redirect to `/timer?with=others`; both URLs are retired. `BodyDoubleUi` is imported only by retired timer. Clock/ambient sound/pulse is explicitly a visual signal, not remote presence. | No body-double session inside W05 was found. Do not invent online students, a shared room, or a migrated capability. Park it pending a separate product decision. |
| R08 | `/study-buddy` | `page.tsx`, `study-buddy-client.tsx`: guide/hint/quiz modes, editable source context, tutor preferences, message feed, evidence/provider states, refusal, waiting/error; source-less example defaults. | W05's contextual `AssignmentReviewPanel` owns persistent work-unit tutoring; W10 has quiz support chat. No new standalone chat hub. Preserve real source context and honest availability, not the dormant header's unconditional `Active now`. |
| R09 | `/study-groups` | `page.tsx`, `study-groups-client.tsx`: room and `view=community`/`sdState=view=community`; invite/join/create, roster, sessions, shared decks, collaborative-note version/conflict states. Messaging intentionally closed. | No equivalent collaboration surface is imported by the canonical assignment workspace. Keep retired. Do not reinterpret private roster counts as live presence or a public leaderboard. |
| R10 | `/concepts/[id]` | `concepts/[id]/page.tsx`: evidence summary, mastery versus self-confidence, last practice, eight-event timeline, related cards, no evidence/not found. | Source anchors, per-unit feedback and quiz review survive, but these are **not** a mastery timeline. A canonical evidence inspector is an optional future placement decision, not an existing workspace tab. |
| R11 | `/knowledge-graph` | `knowledge-graph/page.tsx`: ten fixed-position nodes, class disclosures, two focus concepts, empty state; decorative graph image, not demonstrated semantic edges. | No graph capability in W05. Keep retired. If relationships are later approved, put a source-backed list/map in an evidence inspector, never a second navigation hub or invented concept connections. |
| R12 | `/ap` | `ap/page.tsx`, `ap-client.tsx`: plan/no plan, subject/date/goal, local milestones, latest scored practice, unscored/empty history, MCQ/FRQ/mixed logging, pending/error. | Test preparation survives generically through W07-W10 and assignment tools. AP-plan/date/score-band editing is not evidenced as migrated. Do not resurrect an AP command center or promise exam outcomes. |
| R13 | `/templates` | Page would redirect to retired `/assignments/new`; no independent template gallery is rendered. | Template input exists only in R01's dormant form in this scope. A future optional W02 disclosure requires separate approval; do not make a Templates destination. |

The redirects in R02/R04/R06/R07/R13 are **latent source behavior**, not working compatibility redirects under the current middleware.

### 2.3 Dormant Assignment Components

Production import search under `app` and `components`, excluding tests, found declarations but no callers for these assignment-local UI components:

| Owner | Retained states/behavior | Design disposition |
| --- | --- | --- |
| `assignments/[id]/assignment-cockpit.tsx` | Lifecycle start/continue/review actions, training-drill toggles, empty-drill link to retired breakdown, practice/submit destinations. | Do not add a second assignment detail hub before W05. Its sports terminology is not the new language. |
| `breadcrumb.tsx` | Return note, save indicator, focus query, saved-work reminder. | Possible compact resume context in W05, only if approved; no separate screen. |
| `intention-prompt.tsx` | Optional cue, skip/save, URL cleanup. | Potential briefing disclosure, not a compulsory modal. |
| `pivot-form.tsx` | Closed/open, pause note, pending/error, return to closed. | Potential work overflow action; retain intentional set-aside semantics if surfaced. |
| `status-buttons.tsx` | Lifecycle actions, offline queue, transition feedback, redirects. | Do not swap into W05 and bypass its newer review/receipt contracts. |
| `task-switch-cue.tsx` | Dismissible transition cue and pause/continue choices. | Optional quiet transition treatment, not a default interruption. |

`assignments/new/actions.ts`, assignment action modules, and other retired-route server actions are not themselves retired by middleware. Their existence does not authorize UI revival. `lib/screendesign/screens.ts` still contains historical screen/state labels; it is not the authoritative current route inventory.

## 3. Madden-Inspired Pattern System

Interpretation for review, not a claim of Madden parity: use strong selection hierarchy, a stable selected item, concise context, one obvious next action, and clean transitions between preparation, doing, and results. Keep student language: Assignment, Work, Review, Study, Saved. Avoid Play, Matchup, Training Drills, Game Film, scoreboards, rankings, streaks, and fabricated progress.

| Pattern | Concrete preview composition | Where it belongs |
| --- | --- | --- |
| Selection | Work date ribbon and compact assignment rail; dominant selected assignment/title or relevant subject art; right-side due/time/state/primary action. Filters must keep no-date and outside-week work discoverable. | W01 only. Preserve the composition described by the existing Work comparison; do not duplicate its hero elsewhere. |
| Pre-session briefing | Short task/source summary, actual requirements, optional choices, one Start/Resume action. No second hub and no mandatory interstitial on every resume. | Selected assignment detail within W01; W02/W03 intake; W09 quiz setup; optional W05 preparation disclosure. |
| Quiet active work | Largest area is the student's document/tool; compact unit rail; contextual assistance secondary; timer is a small persistent control. Hide ambient hero art behind reading/editing surfaces. | W05 and active quiz W10. |
| Context inspector | One source/details/tools inspector; desktop side panel, mobile sheet with close/Escape/focus return. Tool mode selection uses icons/tabs, not launch cards. | W05 imports, rubric, specialist tools, optional future evidence. |
| Review checkpoint | Stable read-only outgoing artifact, final checks, destination/type confirmation; one explicit handoff action. Errors stay next to the responsible control. | W06. |
| Results/receipt | Verified result or receipt at center, evidence/limitations and next action beside it; no celebratory claim before persistence. | W06 submitted/graded, W10 quiz completion and flashcard save acknowledgement. |
| Library | Dense saved-material list with source/type/date, selection details and a compact create control. | W08; not another featured-assignment board. |

Proposed shared visual rules for the review previews:

- Use Diana's existing neutral/light work surfaces and real subject/source material. Reserve environment photography and selection artwork for selection/briefing; do not duplicate studio backgrounds as the primary active-work content.
- One readable body family, one heading scale, zero letter-spacing. Fixed-size typography by breakpoint, not viewport-scaled text. Respect accessibility font preferences. Restrained pink selection, lime primary action, cyan focus/accent and amber recovery are candidate roles, not a final approved palette. Avoid neon-purple emphasis competing with every tool.
- Full-width/unframed sections, one frame for a genuine editor, at most 8px corners on repeated items. No card inside a card or three equally dominant glass panels. Preserve legibility before translucency.
- Desktop: bounded rail, flexible main, bounded inspector. Tablet: inspector collapses before the main editor shrinks. Phone: current work first, rails become sheets; numeric paper/tool controls stay stable; safe-area and software-keyboard space reserved.
- Icons with accessible names/tooltips for tools; radio/segmented control for modes; checkbox for checks; numeric inputs/sliders for quantities. Selection, hover, focus, disabled, busy, saved and recovery are separate treatments.
- Brief coordinated selection transition only; no mandatory countdown or delay on navigation. Reduced motion removes nonessential movement. Error state remains amber and actionable, never blame-oriented.

## 4. Workflow Recommendations

### 4.1 Work Selection (W01)

**Current:** top ranked assignment, Today/This week/Later queue, overview counts, capture links. `page.tsx` applies `rankAssignments` with diagnoses and extra-time preferences, then `workMinutes` uses effective minutes. Current rows have no inline search/filter controls.

**Preview:** use the Work comparison's selected-assignment composition, but bind fixture states to real lifecycle distinctions. Start, Continue, Review work, and Review submission must have different destinations. Add compact class/status/search filtering and no-date handling, not more summary cards. A completed handoff goes to a receipt/Record, not back to a fake Start state.

**Preserve:** ranking and accommodation-adjusted estimates, class labels, long titles, no due date, explicit submission, accessible row names, Add assignment and note-capture distinctions. Do not use synthetic requirements or percentages as student data.

**States:** loading; zero/one/many assignments; expanded group; no filter matches; outside selected week/no due date; todo/drafting/checking/exporting; return from submitted/graded receipt. Search/date selection are proposed preview states, not claims about current W01.

**Risks:** date buckets are mislabeled in source; checking is called ready to turn in although it still opens workspace; query errors collapse into an apparently empty queue. See risk register.

### 4.2 Assignment Intake and Capture Confirmation (W02-W03)

**Preview:** W02 is a compact import briefing: class and optional title, Upload/Paste mode, source preview, one Add to Work action. W03 is a source-versus-fields confirmation screen, with raw capture/photo alongside class/type/due date and explicit confirm/set-aside. On mobile use one vertical form, not multiple hero cards. Converted and dismissed states are short terminal acknowledgements with a truthful destination.

**Owners:** `quick-add/page.tsx` owns page-local CSS; `assignment-upload-form.tsx` owns input state. W03 presentation is owned by `inbox/[id]/page.tsx` and `confirm-form.tsx`, despite the retired Inbox URL.

**Preserve:** file validation in actions, original source linkage, 20 MB upload messaging, text versus file input, owner-scoped short-lived photo URLs, suggestion confidence threshold of 0.7, student confirmation, optional due date, no-class recovery, pending duplicate-action prevention and error retention.

**States:** untouched, selected file, replace/remove, pasted text, missing class/source, upload/extraction pending, partial/warning, converted, dismissed, source/photo unavailable, save error and retry. The source warning currently precedes immediate navigation; a preview should show where that warning survives in W05.

**Risks:** upload says Drop but has no drag/drop handlers; upload tabs lack explicit panel relationships and arrow-key tab behavior; capture date initialization uses UTC text in a local datetime input. Replace forced `Confirm the play` copy with assignment/capture language. Do not silently restore R01's template/time-estimate fields.

### 4.3 Active Assignment Workspace (W05)

**Current:** shared work-unit shell for all subjects, not just mathematics. `subjectPresentationFor` supplies unit nouns and a primary/optional capability split. Workspace page loads sources, profile/understanding, units, typed/ink work, message history, artifact blocks, paper preferences and practical-safety gate. Legacy saved work can be carried into the first unit.

**Preview:** task title/course at top, compact unit rail, current prompt, dominant work editor, secondary Ask Diana, one collapsed contextual inspector. Do not make the tutor conversation visually precede all student work just because it occurs earlier in JSX. Keep Work/Source/Tools as context modes when necessary, not new routes or hub cards. Existing controls are mainly disclosures/drawers, not a complete tab system today.

**Preserve:** unit identity and order; imported-source confirmation; per-unit conversation; draft coordinator/local recovery; flush before unit switch/review; completed work becomes working after edits; reviewed snapshot must match the work; explicit Mark done; typed plus ink work; undo/redo and undo clear; paper style and height preferences; keyboard unit navigation and sheet focus handling. `done` on a unit does not submit the assignment.

**Owners:** `components/assignment-workspace.tsx`, `assignment-math-work-surface.tsx`, `assignment-review-panel.tsx`, `assignment-source-importer.tsx`, `assignment-focus-clock.tsx`; `app/assignment-workspace.css`. Relevant actions: `hm-actions.ts`, `workspace-state-actions.ts`, `workspace/source-actions.ts`, `workspace/safety-actions.ts`.

**Risks:** source initialization and mount effects can write; specialist editors have a different save mechanism; current server/page props include legacy concepts that are not rendered (for example fetched steps are not a visible plan). Do not claim a plan tab exists. Keep optional tools genuinely secondary but reachable.

### 4.4 Tutor, Dictation, Live Voice, and Writing (W04-W05-W10)

**Preview:** contextual assistance dock with distinct typed question, Dictate message, and Live voice controls. Live voice expands a small status/control overlay, never replaces the assignment. Show listening/thinking/speaking/retrying honestly and provide a persistent stop control. Writing guidance should share the work editor's visual language, with a reviewable suggestion diff and explicit accept/reject.

**Owners:** `assignment-review-panel.tsx`, `assignment-realtime-tutor.tsx`, `voice-textarea.tsx`, `screen-design/ai-writing-coach.tsx`; quiz support is `QuizReviewChat` within `practice-session.tsx`. `TodayDianaOrb` is imported for realtime status, not evidence of another page.

**Preserve:** author-owned final work; provider/evidence labels; source anchors; per-unit stored/queued messages; interrupted reply recovery without duplicate student turns; attachment extraction confirmation; selected input device; permission and unsupported-device recovery; typed fallback; stop/unmount media cleanup; student-triggered recording. Do not start microphone, transcription, AI generation or recording upload in a preview.

**States:** empty prompt; draft message; thinking; streaming; complete; interrupted; retryable error; degraded/unavailable provider; uploading/ready/needs-attention attachments (up to four in the composer); dictation recording/transcribing/blocked/waiting/unsupported; realtime connecting/listening/thinking/speaking/reconnecting/stopped/retry; writing draft/no draft, checking, suggestion ready, accept/reject, save/error, AI unavailable.

**Policy risk:** current source has product-tier trust rules, not a simple universally active traffic light. `resolveDianaHomeworkTrust` defaults to direct-to-student and makes school policy dormant there; the school tier supports red/yellow/green and consent denial. The kernel and writing entry call the resolver without explicit class/override/consent inputs, while `AssignmentReviewPanel` declares but does not consume its `aiMode` prop. This is not proof of an end-to-end bypass, but the redesign cannot claim policy enforcement from UI styling. Resolve intended policy and server enforcement separately; preview allowed/limited/disabled/consent-denied states without changing policy.

### 4.5 Focus and Quiet Support (W05, R05-R07 Context)

**Preview:** quiet active-work clock in the shared control strip; small completion acknowledgement with saved duration, no fullscreen victory screen. Retry start/stop should not disable homework. Do not reproduce the dormant timer's invented `Step 1 of 3` or its mandatory start ritual.

**Preserve current clock:** assignment-bound server session IDs, idempotent start/finish behavior, local snapshots, cross-tab/reload reconciliation, elapsed-time truth, retry distinction between start and stop, and no assignment completion as a side effect of ending a timer.

**States:** idle, starting, running, stopping, completed, retryable error; recovering an interrupted request; stale local state, another tab's completion, expired session, controls disabled while busy. Timer telemetry failure must remain separate from homework save state.

**Migration boundary:** the older pure timer has idle/running/paused/break/done and ambient/reward settings. The new clock does not expose the same state machine. Pause, break, countdown visibility, ambient audio and body-double are unapproved capability decisions, not cosmetic omissions to fill automatically. If later approved, place settings in W05's inspector; never re-enable the retired URLs or imply live peers.

### 4.6 Review, Handoff, and Receipt (W06)

**Preview:** review artifact at center; compact final-check list; clearly named destination and payload; explicit Confirm and send separate from preparing a PDF or opening a school link. After persistence, replace action-heavy review with read-only receipt and Back to Work/Open Record. Manual confirmation must say it records the student's handoff, not that Diana delivered to the school.

**Preserve:** canonical typed/ink/specialist output, incomplete-unit warning, payload digest binding, stale-artifact detection, required-check validation, manual URL handling, text-versus-file provider capabilities, idempotency keys, pending confirmation versus accepted receipt, source-file external handoff for media/CAD, and server-owned graded state.

**States:** wrong lifecycle redirects; no outgoing work; incomplete work; checklist empty/partial/complete; add/delete check; URL pending/error; PDF preparing/error/stale; provider unavailable; text/file confirmation open/closed; prepared/confirmation_pending/not_accepted/submitted; missing external URL; manual handoff; submitted versus graded receipt. `ExternalSubmissionSync` confirmation is currently inline, not a modal; no need to invent a modal merely for visual drama.

**Owners:** W06 table, plus `assignments/[id]/actions.ts`, `delivery-actions.ts`, `lib/assignment-submission-server.ts` and canonical payload contracts. Preserve server boundaries during later presentation-only work.

### 4.7 Study Selection, Saved Library, and Quiz Briefing (W07-W09)

**Preview:** W07 is a compact assignment selector with a short reason for the suggested study action and one launch control. W08 is the saved-material library, with type filters/list and source selection. W09 is a pre-session quiz briefing: actual source, question-count segmented radios, compact contextual details, one Generate action. Do not copy W01's date/hero/overview panels into any of them.

**Preserve:** `selectStudentStudySkill` routing and source/work/policy checks; assignment-owned context; note-owned source handling; generation errors and authored-source provenance; question-count options; return to originating assignment or class; empty states that do not invent data.

**States:** no open assignments, query error, source removed, requested skill unavailable, policy fallback, no sources, no saved sets, source/type preselection, generating, create error, count validation, saved-artifact ready. Generation needs visible pending feedback in a future preview; these server-action forms currently lack a local pending component.

**Risks:** W07 duplicates much of the Work list and shows raw/default estimates rather than accommodation-adjusted Work minutes. Study's coach destination uses `#diana` while the workspace exposes `#ask-diana`. W09 creates return notices on `returnTo`, which may be a class page rather than the quiz setup; recovery ownership needs alignment. Do not turn canonical routes into retired study-buddy links.

### 4.8 Guide, Flashcards, Quiz, and Results (W10)

**Guide preview:** quiet reading surface with section navigation and source/authorship information; no large hub header. Preserve guide sections, summary and review-loop copy; distinguish no evidence from unavailable data.

**Flashcard preview:** editable front/back list or selected-card editor, source anchor and a persistent Save to review control. Preserve edited student content, pending/error/saved count, and real FSRS scheduling, not a fake flip-card animation standing in for the review system. Current save CTA links to `/study`; that page does not render FSRS review, so the continuation is a gap, not a completed migration.

**Quiz preview:** one question in a quiet center stage, compact question rail, choice/free-response input, optional hint/support, explicit save/continue. Results are a distinct composition: recorded response count, auto-checked subset and limitations, per-question review, optional support, Try another pass. No score on ungraded free response and no implication that quiz completion submits coursework.

**Preserve:** response persistence, question cursor, source anchors, server scoring, completion integrity, restart history/support-fading state, optional support re-enable, authored responses, assignment-versus-standalone exit, and calm feedback. Review of a completed answer should be visibly different from editing a new pass.

**Risks:** local answered responses are labeled Saved in the rail before a successful save; moving questions does not flush the previous draft; quiz support chat is local rather than the workspace's persisted transcript. Use separate draft/saved labels and an approved continuity design before integration. Existing completion UI can reopen questions for editing; make the pass/review boundary explicit.

## 5. Embedded Tool and Overlay Inventory

### 5.1 Workspace Controls

| Surface | Existing owner and behavior | Preview treatment and preservation |
| --- | --- | --- |
| Unit rail / mobile sheet | `assignment-workspace.tsx`: roving focus, state labels, source-preview/edit/remove/confirm, manually add unit, empty first-unit action. | Keep one stable queue; no fake tabs to separate identical hubs. Sheet must preserve selection, Escape and return focus. |
| Student work toolbar | `assignment-math-work-surface.tsx`: blank/lined/graph, typing/pen/eraser, ink undo/redo, Review, clear/undo clear, resize, saved/local/retry state. | Familiar icons/segmented paper modes; preserve ink coordinate system and typed fallback. Pending labels cannot resize toolbar. |
| Details and sources | Workspace details and nested `AssignmentSourceImporter`: directions/rubric, linked material, partial/extracting warning, add text/file, automatic connected import and retry. | Source inspector with explicit provenance/confirmation, not a generic attachment-success badge. |
| Ask Diana | `assignment-review-panel.tsx`: work-unit feed, reply retry, review/keep-working/mark-done/next, photo/PDF attachments, dictation/live voice. | Assistance dock; independent chat, save, source and voice notices. Correct subject nouns instead of always saying problem. |
| Live voice overlay | `assignment-realtime-tutor.tsx`: active voice status, end control, connecting/retry states. | Non-blocking active-session control; restore context and stop media when closed or unit changes. |
| Tools drawer | Workspace `toolsOpen` and inspector disclosures; dynamically imported tool families. | Capability-specific modes within the assignment, never route revival or one card per tool. |
| Submission confirmation | `external-submission-sync.tsx`: inline destination/assignment/type/output confirmation. | Retain explicit action and verified payload; dialog behavior required only if a later preview actually turns it into a dialog. |
| Writing suggestions | `ai-writing-coach.tsx`: student draft, suggestion review, accept/reject, guidance/save states. | In-editor comparison; no automatic replacement or hidden route mutation. |

### 5.2 Specialist Tool Families

All fifteen tools below are capability-gated descendants of W05, not separate routes. Each needs empty/input/loading/saving/saved/recovery fixtures where its runtime supports them. Capability selection comes from assignment profile/subject presentation, not a student-facing list of every possible app feature.

| Capability / owner | Actual tool surface | Proposed pattern and must-preserve constraints |
| --- | --- | --- |
| Equation / `assignment-native-tools.tsx` | Notation input, plain-text preview and explanation. | Quiet notation editor; do not claim current preview is typeset algebra. Preserve notation and student explanation. |
| Graph / same | Expression and bounded -10..10 graph; invalid-expression guidance. | Graph fills tool area with compact controls; preserve supported expression set and honest empty/unsupported state. |
| Spreadsheet / same | 4x4 editable core, formula display, bounded CSV/TSV import, chart controls, 8x8 data preview. | Table-first workspace with local chart view; preserve full bounded imported data separately from cropped preview, no macro/network spreadsheet claims. |
| Ledger / same | Editable account/debit/credit entries and balance result. | Dense accounting table and compact validation footer; preserve numeric/balance rules, not a decorative finance card. |
| Code / same | Python/JavaScript, code editor, Run, stdout/status, full/limited/unavailable execution. | Editor/output split with run toolbar; preserve bounded browser workers, time/output limits and explicit Python Lite fallback. |
| Map / `assignment-creative-tools.tsx` | Title/legend/scale/source, rounded coordinate markers, GeoJSON import and local analysis/rendering. | Map plus compact layer/data inspector; preserve privacy rounding, bounded imports and lack of online basemap/routing. |
| Drawing / same | Student strokes and Clear drawing. | Main canvas with familiar tools; propose reversible clear. Current drawing tool is not the more capable work-ink undo/redo system. |
| Music / same | Pitch/duration/add/remove-last/play; MusicXML import and score viewer. | Score area with transport and notation controls; preserve bounded note sequence, view-only imported score and unsupported-format states. |
| Audio review / same | Consent, private upload, recording lifecycle, timestamp annotations/removal. | Recording/timeline review, never automatic microphone capture; preserve retention/deletion and rubric-based feedback boundaries. |
| Video review / same | Same private media contract for video. | Video/timestamp review with real media or fixture placeholder; no appearance/identity inference or fake analysis. |
| Approved procedure / `assignment-technical-tools.tsx` | Approved protocol, acknowledgement, gated checklist, theory-only/unavailable explanations. | Safety briefing then checklist; never turn a decorative check into supervisor approval or rewrite hazardous instructions. |
| Design notebook / same | Problem, stakeholders, criteria/constraints, alternatives/evidence, selected choice, tests/revisions. | Sectioned editor with stage navigation; preserve student reasoning, not a generated project dashboard. |
| CAD / same | Controlled box/cylinder, dimensions/units, constraints, validated STL/OBJ/glTF/GLB inspection, source-file/session limitations. | Dominant 3D tool viewport with dimension inspector; preserve bounded geometry and no arbitrary CAD scripting/simulation claims. |
| Data lab / same | Measurement/value/unit/uncertainty/observation rows, CSV/TSV and chart. | Data table plus analysis view; preserve limits/uncertainty and distinguish typed rows from imported dataset. |
| Performance log / same | Date, focus, duration, evidence/reflection, teacher verification distinction. | Timeline/table with entry form; never student-self-awarded teacher verification or competitive ranking. |

Critical runtime UI also traced: `specialist-code-editor.tsx` (CodeMirror with textarea fallback), `specialist-data-chart.tsx` (ECharts loading/unavailable), `specialist-map-runtime.tsx` and its CSS (MapLibre limited/unavailable), `specialist-notation-runtime.tsx` (VexFlow/MusicXML states), and `cad-model-viewer.tsx` (Three.js unavailable/limited). Library presence is not evidence that a canvas renders correctly. Every future preview must visibly distinguish unavailable renderer from lost student work.

### 5.3 Shared Shell and State Variants

| Owner | Source responsibility | Audit implication |
| --- | --- | --- |
| `app/(app)/layout.tsx` | Auth/onboarding/age redirects, app main wrapper, QuickCapture, OverwhelmedButton, agent/PWA/session helpers. | Do not mount this live shell in a supposedly inert preview. Avoid nested mains/duplicate `main-content` IDs in eventual integration. |
| `lib/navigation.ts`, `student-desktop-nav.tsx`, `student-bottom-nav.tsx` | Today/Work/Classes/Calendar/More; desktop Add menu (assignment/note); profile/settings; bottom owner from route. | No new primary destinations for retired routes. W09/W10 hard-code Classes while study routes normally resolve to More; settle ownership deliberately. |
| `screen-design-viewport.tsx`, `primitives.tsx`, `source-media.tsx` | Shared wrapper, wordmark, declared source assets. | `data-screen-design-viewport="393x852"` is metadata, not responsive evidence. Referenced assets have not been visually verified. |
| `assignments/loading.tsx`, `assignments/[id]/loading.tsx`, `app/(app)/loading.tsx`, `smart-loading.tsx` | Cinematic loading shell, different labels, timed decorative progress, reduced-motion rule. | Prefer contextual skeleton/indeterminate activity for active work; do not depict timed progress as measured server progress. |
| `app/(app)/error.tsx`, `not-found.tsx`, `diana-recovery-screen.tsx` | Retry/reset/refresh/reload and return to Today; unavailable-page message. | Retired URL is intentional unavailable, not an empty assignment. These shared files do not prove which exact 404 pixels the middleware rewrite renders. |
| `quick-capture.tsx`, `overwhelmed-button.tsx` | Quick-capture dialog and smallest-next-step status panel; fixed variants hidden on canonical navigation owners. | Do not count them as guaranteed visible on every route: placement checks and page CSS hide some variants. Preserve overlay focus/close/cancel only where surfaced. |
| `app/layout.tsx`, `tokens.css`, `app/globals.css`, `app/screendesign.css`, `app/assignment-workspace.css` | Shared CSS cascade; workspace CSS loaded after screendesign CSS; route-local inline styles add overrides. | Build scoped preview tokens; do not append another global override layer to live CSS. |

### 5.4 Required State Fixtures for Review

| Area | Source states to demonstrate | Missing distinction to design, not assume |
| --- | --- | --- |
| Data loading | Assignment/app loading labels; local operation pending. | Loading versus no records versus query error versus expired/unauthorized source. |
| Assignment lifecycle | `todo`, `drafting`, `checking`, `exporting`, `submitted`, `graded`, `abandoned`. | User-friendly labels must not erase the separate submission checkpoint. |
| Unit lifecycle | Not started, working, reviewed, done; edit after done. | Reviewed is not done; done is not submitted. |
| Draft persistence | `idle`, `saving`, `synced`, `local_only`, `retryable_error`, `session_expired`. | Local-only is not cloud saved; retries must not discard recoverable work. |
| Sources | None, description-only, extracting, partial/needs confirmation, ready; invalid upload/retry. | No source is not approved evidence; original file availability differs from extracted text. |
| AI | Allowed, limited/disabled, consent denied, busy, degraded/unavailable, interrupted reply, retry. | Server policy is authoritative; no green badge based only on local props. |
| Voice | Device checking/permission waiting/blocked/unsupported; recording/transcribing; realtime phases. | Dictation and live conversation cannot share ambiguous recording state. |
| Focus | Idle/starting/running/stopping/completed/error and rehydration/cross-tab change. | Focus session result is not assignment result. |
| Specialist tools | Empty/input; renderer loading/ready/limited/unavailable; import validation; save error. | Save status and local renderer status are different facts. |
| Submission | Review, incomplete, checklist, stale PDF, manual/connected, confirmation pending, accepted receipt, graded. | Opening school URL, preparing file and receiving school acceptance are distinct. |
| Study | Source/type/count choice, generation pending/error, saved guide/cards, zero-question quiz, partial/resumed/finished/restarted quiz. | Draft response versus saved response; auto-checked subset versus teacher grade. |
| Responsive/accessibility | Long content, >24 assignments, large unit lists, small viewport, keyboard, reduced motion, alternative font. | Source media queries/tests are not actual visual evidence. |

## 6. Source-Backed Gaps and Risks

Priority here orders design/integration attention, not a claim of runtime exploit severity.

| Priority | Finding and source evidence | Recommendation / approval impact |
| --- | --- | --- |
| P0 | **Preview isolation is mandatory.** `workspace/page.tsx:170` updates classification; `:186` can insert work units. `assignment-workspace.tsx:174` starts workspace lifecycle on mount. `assignment-source-importer.tsx:45` materializes sources on mount. Study generation and submission controls mutate too. | Future previews use synthetic IDs/data and presentation-only handlers. No imports of live pages/actions, Supabase clients, auth/PWA/session trackers, upload/mic/provider calls or live local-storage keys. Never rely on disabled buttons alone. |
| P1 | **Route policy beats screen catalog.** Thirteen scoped routes are middleware-404. W03 uniquely reuses a retired route's component. | Keep route-policy filtering in the master inventory. Preserve W03's shared source; do not delete it as dead code or revive Inbox. |
| P1 | **Lifecycle contract differs from older prose.** Current state machine is todo/drafting/checking/exporting/submitted/graded with abandoned branch; unit done is separate. `work-command-center.tsx:265` and `:290` label checking ready to turn in, but submit page accepts only exporting for review. | Align displayed actions to actual lifecycle. Preserve done != submitted and explicit student handoff; no cosmetic auto-completion. |
| P1 | **AI policy inputs need explicit reconciliation.** `diana-trust-rules.ts:46`, `server-understanding.ts:404`, assignment detail `page.tsx:32`, and review panel `:511` show tier/default/input and UI-prop differences. | Document both intended school/consent limits and current source behavior. Do not fix policy or assert school-policy enforcement as part of visual redesign. |
| P1 | **Specialist autosave is not the unit flush contract.** `assignment-native-tools.tsx:53` uses a 600ms effect timer whose cleanup cancels it. W05's review action flushes the unit coordinator, not this hook. | Risk of reviewing/leaving before latest specialist save. Include delayed/rejected save and immediate review in later verification; no Saved claim until acknowledged. This is a source-level risk, not a reproduced loss report. |
| P1 | **AI outage/disabled-state completion path needs proof.** Review panel exposes Mark done only after reviewed; W05 exposes submission review when units are done. The current review flow calls AI. | Include a no-AI/manual-review fixture and verify legitimate student completion is not trapped behind unavailable help. Do not bypass review rules without product approval. |
| P1 | **FSRS continuation is missing in scoped canonical UI.** `artifact-flashcards.tsx:69` links Review cards to `/study`; W07 renders assignments, and `/flashcards` is retired. | Do not claim save-to-cards completes the study loop. Decide a canonical review placement separately; preserve scheduler and card identity if integrated. |
| P2 | **Work date groups do not match labels.** `work-command-center.tsx:229`: startOfWeek is today +7 days; everything before it goes into Today, next seven days into This week. | Preview day/week/no-date/earlier-date boundaries explicitly with a defined student timezone. Later correction must be tested independently of styling. |
| P2 | **Capture local date can shift.** `inbox/[id]/confirm-form.tsx:54` seeds datetime-local with `toISOString().slice(0,16)`. | Preserve the intended local wall time during future implementation; test timezone and DST boundaries. |
| P2 | **Canonical handoff anchors drift.** `study/actions.ts:114` targets `#diana`; workspace tutor ID is `ask-diana`. Breakdown's dormant `?plan=1` is not consumed. | Use actual canonical targets. Do not suggest links to nonexistent plan/chat tabs. |
| P2 | **Empty states can hide read errors.** W01/W07/W08 consume query `data` and fall back to empty arrays without a specific read-error branch. | Preview recovery separately from Caught up/empty library; add no new data behavior in this audit. |
| P2 | **Quiz draft and persistence look equivalent.** `practice-session.tsx:284` rail uses local nonempty responses to show Saved; persistence occurs in `submitResponse`, and navigation only updates the index. | Differentiate draft/saved, specify leaving/review behavior and test refresh. Completion/scoring must remain server-validated. |
| P2 | **Visual ownership is fragmented.** Global screendesign styles, v11 workspace stylesheet, page-local Study/quiz/upload styles and desktop-nav `!important` rules coexist. Study retains older navy/neon rules followed by light overrides. | A preview-specific token/primitive set first; later scoped replacement plan instead of piling global CSS overrides. No source-only claim about final computed colors. |
| P2 | **Accessibility semantics need a dedicated pass.** Submit checklist buttons show visual checks without `aria-checked`/`aria-pressed`; upload tabs lack panel/keyboard wiring; shared layout and child pages can duplicate main landmarks/IDs. | Preserve working workspace roving focus and drawer restoration; include keyboard, screen reader and mobile-sheet fixtures before accepting implementation. |
| P2 | **Continuity/feedback is uneven.** W07-W09 server forms have no local pending UI; W07 uses different time estimates; W09/W10 nav ownership differs from route-based ownership. | Shared operation status and origin-aware return/navigation design, not duplicate hub cards. |
| P3 | **Dormant copy can reintroduce false claims.** Timer Step 1 of 3, buddy Active now, graph's fixed positions and concept Game film label are source artifacts, not verified progress/presence/relationships/media. | Do not carry these claims into canonical previews. Retired source needs no redesign work now. |

## 7. Review-First Delivery Sequence

This is a proposed review queue for the main full-system inventory, not an instruction to implement during this audit.

1. **Work selection and intake:** W01 selection/empty/long list, W02 upload/paste/error, W03 review/converted/dismissed. Compare with the existing Work concept, without touching it or assuming approval.
2. **Assignment preparation and active work:** W05 empty/working/reviewed/done, source inspector, mobile unit/tools sheets, autosave recovery. Show at least mathematics and a non-math work unit.
3. **Contextual assistance and focus:** typed chat, attachment confirmation, permission/voice lifecycle, timer reconciliation/retry; W04 writing suggestion variant. Show all of these on the same underlying assignment rather than as new hubs.
4. **Specialist tools:** fifteen capability fixtures within W05, including one unavailable runtime and one save error per applicable family. No extra route destinations.
5. **Review and receipt:** W06 manual/connected, stale file, confirmation pending, accepted and graded receipt. No real provider or submission calls.
6. **Study:** W07 selector, W08 library, W09 briefing, W10 guide/cards/quiz/results and recovery. Flag FSRS continuation as unresolved rather than simulate a completed feature.

Every fixture needs an explicit preview label, deterministic mock state, in-memory changes/reset, and a boundary that prevents production writes. Keep any prototype outside the authenticated production route tree and do not mount production components with their side effects intact. Exact preview URL and files belong to the separately approved preview task.

**Approval gate:** user reviews preview compositions and state transitions first. Visual approval does not authorize live-data migration, route revival, policy changes, or behavior removal. Integration requires a separate explicit approval and a scoped implementation plan.

**Future evidence gate, not executed here:** capture approved previews at desktop/tablet/phone and reduced motion; inspect asset loading, long text, focus, keyboard and mobile keyboard/safe-area behavior; use canvas checks for actual graph/map/CAD/score renderers. Independently test draft flush/recovery, explicit submission, server policy, focus reconciliation, voice cleanup, quiz persistence and specialist exports. Keep source checks, automated verification, rendered evidence and user acceptance as four separate records.

Existing test source provides useful later coverage anchors: workspace recovery/ink/focus tests; focus-clock cross-tab/reload/idempotency tests; review-panel interruption/attachment/evidence tests; submit-page lifecycle/receipt tests; delivery hardening tests; practice continuation/support tests; route-policy tests. None was run by this audit, and none by itself establishes visual acceptance.

## 8. Decision Summary for the Master Inventory

- Count **23 scoped page routes: 10 non-retired, 13 deliberately retired**. Track W04's query-rendered writing coach and W10's artifact/session states separately from route totals.
- Keep one canonical assignment workspace. Preserve contextual capabilities without reviving timer, voice, buddy, inbox, AP, graph, concepts, templates or group routes.
- Not every retired feature migrated. Explicitly park body-double/social/AP-plan/template/full-FSRS/optional-breakdown capability gaps instead of inventing equivalent tabs.
- Use selection, briefing, quiet active work, context inspector, review and results as distinct patterns with consistent controls. Madden inspiration is hierarchy and progression, not sports vocabulary or duplicated dashboard cards.
- Protect data truth and continuity first: preview isolation, student-owned work, source confidence, tier/consent policy, save acknowledgements, done != submitted, provider receipts, independent timer/voice state.
- This report is source evidence only. **REVIEW PREVIEWS FIRST** remains the next approval boundary.
