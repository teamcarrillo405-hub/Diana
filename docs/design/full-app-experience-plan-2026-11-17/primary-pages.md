# Primary student pages: complete update plan

Planning baseline: main `25477d59`, November 17, 2026. This is a read-only source audit converted into an implementation plan. It preserves the approved Lobby, Work, Classes, and Calendar designs. The existing live Calendar evidence (21 checks, 51 screenshots, two PDFs) is evidence for that release, not a claim that every page below has received a new rendered audit.

## Scope and scene decisions

There are 18 rendered route patterns in the primary area, plus one conditional material-reader alias, three redirect-only entries, and file/API responses. Subsections, sheets, dialogs, and lifecycle states must be tracked as states of their owning route.

| Scene ID | Existing master and derivatives | Decision |
|---|---|---|
| KEEP-01 Lobby | `/assets/today-now/diana-campus-with-guide-4k.webp`; `diana-campus-with-guide-mobile.webp` | Keep the approved room with Diana integrated. Use the same room for Now, Check-in, and This Week. Keep school branding in a separate personalized pennant. |
| KEEP-02 Work | `/assets/work/college-classroom-1920.webp`, `college-classroom-4k.webp`, `college-classroom-mobile.webp` | Keep the approved classroom. Reuse restrained crops in intake, capture, workspace, and hand-in headers. |
| KEEP-03 Classes | `/assets/classes/academic-hall-1920.webp`, `academic-hall-4k.webp`, `academic-hall-mobile.webp` | Keep the approved academic commons. Reuse a small header in deep class flows. Keep school logos off roster and class-detail pages. |
| KEEP-04 Calendar | `/assets/calendar/campus-planning-1920.webp`, `campus-planning-4k.webp`, `campus-planning-mobile.webp` | Keep the approved campus planning space. Use opaque functional panels and dialogs over the parent room. |
| Focused working surfaces | Existing campus ink, paper, border, and readable type tokens | No scenic image behind reading text, working paper, graphs, code, questions, or exported PDFs. The campus belongs around the task, not behind its content. |

No new full scenic master is required for these primary pages. New subject cover art is optional and separate from room backgrounds. Do not generate one background per assignment, class, modal, or screen state.

Current shared presentation is implemented in [StudentShell](C:/Users/glcar/Diana/components/student-shell/student-shell.tsx:6) and [its scene styles](C:/Users/glcar/Diana/components/student-shell/student-shell.module.css:1). Lexend is the reading/input family, Saira Condensed is used for display, and Diana Campus Slab is used for campus navigation. Preserve brush selections and the established two-color school personalization.

## Lobby

### `/dashboard`: Lobby, Now, Check-in, and This Week

Owner: [dashboard page](C:/Users/glcar/Diana/app/(app)/dashboard/page.tsx:1), [CampusLobby](C:/Users/glcar/Diana/components/dashboard/today-dashboard.tsx:65).

- Keep the approved composition, primary navigation, personalized campus name, integrated Diana, and school pennant. Avoid another portrait or duplicate logo in a side panel.
- Now states: actionable next task; no assignments; all work complete; review-ready or hand-in-ready task; unavailable assignments; partial data; long titles; concise explanation after an optional check-in changes the recommendation.
- Preserve actual assignment lifecycle routing. The primary button must describe its real next action, including Review submission when appropriate.
- Check-in states: energy choice; optional Snack/Water/Break support; optional sleep and activity; saving, saved, unavailable, and read-only; seven-day history with missing observations; completion returns to Now and restores focus.
- Keep food, water, and break choices visible without adding dense explanatory copy. Keep the detailed history expandable and distinguish missing observations from low energy or zero activity.
- This Week states: due/submitted assignment records, partial record failure, no records, factual completed/submitted/focus totals, expandable Study details, weekly activity, workload by class, missing estimates, and links to all work and the completed-work Record.
- Current mounted This Week does not include the older trophy or quest components. Do not mistake legacy source files for the live composition.
- Background: **KEEP-01** for all three sections. Strengthen panel scrims locally if charts/forms need contrast. No separate wellness or progress background.
- Plan navigation acceptance for the selected Lobby section across refresh, returning from an assignment, and phone scroll shortcuts. Current mode is local component state; verify intended behavior rather than claiming a new runtime defect.

## Work, intake, and homework

### `/assignments`: Work collection

Owner: [page](C:/Users/glcar/Diana/app/(app)/assignments/page.tsx:35), [WorkCommandCenter](C:/Users/glcar/Diana/app/(app)/assignments/work-command-center.tsx:85).

- Retain the approved roster/selected-assignment layout and **KEEP-02** classroom.
- Audit Active, In review, Ready, Submitted, search, subject filter, due-date/week picker, no due date, selected assignment, captured count, and Add assignment.
- Cover first-use empty, empty category, no matching results, unavailable assignments, long class/title/description, no estimate, missing due date, graded/submitted work, and disabled/absent capture data.
- Keep actual school hand-in distinct from work marked done in Diana.
- Verify outbound and return context. Work stores selected board context per student in sessionStorage on outbound links, then restores through `?return=1`; direct-entry views use `?view=review|ready|submitted`.
- Subject cover art is content identification, not teacher material. Keep the source material available inside the workspace.

### `/quick-add`: Add assignment

Owner: [page](C:/Users/glcar/Diana/app/(app)/quick-add/page.tsx:13), [upload form](C:/Users/glcar/Diana/app/(app)/quick-add/assignment-upload-form.tsx:14), [intake presentation](C:/Users/glcar/Diana/app/(app)/quick-add/intake.module.css:1).

- Two modes: file upload and pasted instructions. Cover photo, PDF, and text; selected file preview/name/size; replace/remove; class choice; optional assignment details; rejected file; pending; uncertain save; retry attachment; successful transition to Work.
- Distinguish an uploaded file from a completed assignment import. Show progress truthfully and keep the draft if attachment processing pauses.
- Cover no classes, class-load failure, invalid initial class, and Add class then return to intake.
- Improve small 12-13px helper/input-adjacent text and phone camera/upload clarity in the rendered review.
- Background: reuse a shallow **KEEP-02** header with an opaque form. No new intake room.

### `/assignments/captures`: Captured work

Owner: [capture list](C:/Users/glcar/Diana/app/(app)/assignments/captures/page.tsx:1).

- Photo, voice, and text capture rows; empty captures; load failure/retry; Add assignment; return to Work.
- Make capture-awaiting-confirmation distinct from an assignment that is ready to work on.
- Background: reuse the Work intake header; no new room.

### `/assignments/captures/[id]`: Review capture

Owner: [capture review](C:/Users/glcar/Diana/app/(app)/assignments/captures/[id]/page.tsx:1).

- Original photo, voice transcript, or text alongside confirmation; suggested title/class/kind/due date; class-list error; photo URL unavailable/expired; capture missing.
- Terminal states: converted with Open assignment; converted assignment unavailable; dismissed/set aside.
- Keep the actual original large enough to inspect on phone. Put confirmation controls after or beside the source without obscuring it.
- Background: reuse **KEEP-02** header; no scenery behind the source image/text.

### `/assignments/[id]/workspace`: Homework workspace

Owner: [route](C:/Users/glcar/Diana/app/(app)/assignments/[id]/workspace/page.tsx:1), [workspace](C:/Users/glcar/Diana/components/assignment-workspace.tsx:305), [workspace presentation](C:/Users/glcar/Diana/components/student-shell/workspace.module.css:1).

- Cover prompt, problem/section queue, working paper, Ask Diana, review, focus timer, tools, sources, subject/profile setup, save status, offline/local-only, reconnected/reconciled draft, interrupted tutor response, extraction preview/confirmation, phone problem sheet, and phone tools sheet.
- Audit the same interface contract across all 12 current modes: math, worksheet, writing, research, history, lab, reading, language, coding, art, project, handoff.
- Keep tools proportional to assignment type. Optional tools should not expand the default working area unpredictably.
- Preserve reading font/size/spacing preferences. Keep display type on headings/navigation and readable type for source text, instructions, draft, chat, code, and tables.
- Retain real subject tools, graph content, photo input, mathematical notation, lab/unit checks, source citations, and generated artifact blocks. Do not substitute generated decorative images for real graphs or instructions.
- Preserve teacher policy and the approved tutoring/help rules. Health/check-in context remains optional and must not become a required gate.
- Background: retain the shallow **KEEP-02** header. **No scenery behind working paper, graphs, code, or a long draft.**

### Ask Diana and Review work inside the workspace

These are states of the workspace, not additional routes or rooms.

- Ask Diana: initial help, thinking/streaming, interrupted response, retry, attachment/photo/graph input, hints, worked explanation/answer when allowed, source citation, unavailable source, and policy restriction.
- Review: incomplete work, reviewed problem/section, full-draft review, pending review, error/retry, and Review submission.
- Keep help readable and anchored to the current prompt/section. Use a restrained tutor identity rather than another large portrait.
- Background: solid task surfaces. Reuse the parent header only.

### `/assignments/[id]/submit`: Review, Hand in, and submitted receipt

Owner: [submission page](C:/Users/glcar/Diana/app/(app)/assignments/[id]/submit/page.tsx:178), [submission presentation](C:/Users/glcar/Diana/components/student-shell/submission.module.css:1).

- Review and Hand in are client tabs within this route. Audit preview, incomplete-work messaging, checklist, stale artifact/version checks, PDF download, manual school hand-off, connected-provider hand-in, reconnect, pending/uncertain/retry, and explicit confirmation.
- Preserve the distinction between done, submitted to a connected provider, and recorded manually in Diana.
- Review/Hand-in tab selection currently uses shared SectionTabs local state. Decide what a refresh/Back/direct link should restore; do not persist confirmation checkmarks across a changed artifact without revalidation.
- After submitted/graded, this same route renders the receipt: school-confirmed delivery versus Recorded in Diana, provider/time/source, saved submitted copy, Record, school assignment, and Work/Calendar return.
- Background: shallow Work header and plain paper preview. No confetti, victory screen, trophy, or new receipt background.

### `/assignments/[id]/submitted-work`: Saved copy

Owner: [saved-copy page](C:/Users/glcar/Diana/app/(app)/assignments/[id]/submitted-work/page.tsx:16), [PDF preview](C:/Users/glcar/Diana/components/submitted-pdf-preview.tsx:9).

- File, text, no copy, copy unavailable, original school copy, Diana-saved copy, multipage PDF paging, download, external school link, and submission timestamp/source.
- Keep PDF page controls and fallback content accessible on phone. Retain owned, authenticated file access and expire/retry handling at the launcher.
- Background: no imagery behind the document; small Work header only.

## Classes and every deep class flow

### `/classes`: Roster and Add class

Owner: [roster route](C:/Users/glcar/Diana/app/(app)/classes/page.tsx:1), [class grid](C:/Users/glcar/Diana/app/(app)/classes/my-classes-grid.tsx:122).

- Selected class card, teacher, grade/date, no grade, unavailable grade, open work, submitted work, next assignment, empty roster, and load failure.
- `/classes?create=1` opens Add class inline. `intake=add` supports return to assignment intake. Cover pending, validation, failure, cancel, and successful creation.
- Long course/teacher names and unavailable grades must remain legible. A missing grade is not a zero.
- Background: **KEEP-03**. Keep school logos off roster and individual class pages. Subject cover images remain secondary to real course information.

### `/classes/[id]`: Six class sections

Owner: [class detail route](C:/Users/glcar/Diana/app/(app)/classes/[id]/page.tsx:1), [CourseInsight](C:/Users/glcar/Diana/components/course-insight.tsx:268).

1. Overview: next assignments, recent notes/material, latest grade/feedback.
2. Assignments: active/completed work, real lifecycle action, Add work.
3. Notes: class notes and New note.
4. Materials: attached assignment files, reference books, syllabus and rubric upload/view.
5. Quizzes & Practice: school quiz links, saved practice quizzes, Make a practice quiz, Guided practice when available.
6. Grades & Feedback: confirmed class grade/date, released assignment scores, teacher feedback, unavailable/missing records, links to work or assessments.

Each section needs empty, loading/partial-error, retry, long-name/content, and restricted/unavailable states. `?section=overview|assignments|notes|materials|quiz|grades` and legacy `?materials=1`, `?rubric=scan`, `?work=...` entry states must land correctly. Source/material views must preserve their work-origin return.

- Keep consistent section headings, phone section navigation, one clear primary action, and readable grades/feedback.
- Audit refresh/Back and tab persistence. SectionTabs currently changes local state without updating the URL; this is a source-level risk to test, not a newly confirmed runtime defect.
- Background: **KEEP-03** for browse/overview; opaque panels where reading occurs.

### `/classes/[id]/settings`: Help rules

Owner: [class settings](C:/Users/glcar/Diana/app/(app)/classes/[id]/settings/page.tsx:68).

- Class AI policy choices, explanation, current selection, saving, failure, and return to class.
- Explain permitted help in text and icons, not color alone. Do not imply a student can bypass a teacher-controlled policy.
- Background: reuse faint **KEEP-03** header with a solid form; no new room.

### `/classes/[id]/assessments/[assessmentId]`: Teacher assessment

Owner: [assessment route](C:/Users/glcar/Diana/app/(app)/classes/[id]/assessments/[assessmentId]/page.tsx:87), [assessment session](C:/Users/glcar/Diana/components/course-mode/assessment-session.tsx:248).

- Start/instructions; not available to start; maximum attempts; timed in-progress attempt; autosave/unsaved response; IEP extra time; expired attempt; review-and-submit confirmation; submitting/error; awaiting release; released scores and teacher feedback; unavailable content.
- Check question navigation, keyboard/focus order, timer readability, all response types, long prompts, formulas, and phone keyboard coverage.
- Actual educational scores are appropriate. Do not introduce game rewards, punitive timer styling, or celebration animations.
- Review compact Tailwind/type treatments against the approved campus tokens.
- Background: existing Classes header through classesRoom and submission presentation. **No scene behind assessment questions.**

### `/classes/[id]/practice`: Guided practice

Owner: [guided practice](C:/Users/glcar/Diana/app/(app)/classes/[id]/practice/page.tsx:1).

- Subject/level, generated exercise, student work, feedback, pending/error, unavailable or policy-restricted, and return to Quizzes & Practice.
- This deeper flow has campus styling but no scenic parent context. Add only a small Classes header if needed for continuity.
- Background: reuse **KEEP-03** header; no scenery behind practice.

### `/classes/[id]/materials/[assignmentId]`: Material reader

Owner: [class material route](C:/Users/glcar/Diana/app/(app)/classes/[id]/materials/[assignmentId]/page.tsx:1), [shared material renderer](C:/Users/glcar/Diana/components/learning/assignment-material-page.tsx:16).

- Original versus enhanced reader; source/version/page selection; original PDF/image/text; preparing/progress/resume; extraction quality; confirm transcription/new version; unavailable saved version; anchored search matches; exercise preview; practice/Ask Diana; save offline and offline readiness.
- Keep original material visibly distinct from extracted/confirmed text and generated help. Preserve source, version, page, and class return context.
- Make this a readable campus-library reader instead of an unrelated tool layout. Avoid a large tool wall around small source content on phone.
- Background: reuse Classes header; no image behind the document.

### `/classes/[id]/materials/[assignmentId]/practice`: Material-based practice

Owner: [material practice](C:/Users/glcar/Diana/app/(app)/classes/[id]/materials/[assignmentId]/practice/page.tsx:1).

- Practice anchored to assignment source, selected version/page/session, work/feedback, unavailable state, and back to exact material context.
- Background: reuse the reader frame, solid exercise surfaces, no new plate.

### `/classes/[id]/reference/[bookId]`: Reference textbook

Owner: [reference reader](C:/Users/glcar/Diana/app/(app)/classes/[id]/reference/[bookId]/page.tsx:1).

- Supported book, chapters, selected chapter/page, page navigation, preparing/unavailable reference, and external publisher fallback.
- Use readable chapter navigation and stable return to class Materials. Unsupported catalog books must remain unavailable rather than showing unrelated content.
- Background: reuse Classes/library family; plain reading area.

### `/classes/[id]/reference/[bookId]/ask`: Reference Ask Diana

Owner: [reference tutor](C:/Users/glcar/Diana/app/(app)/classes/[id]/reference/[bookId]/ask/page.tsx:1).

- Class-scoped tutor with initial book/chapter, question, citations, streaming/interruption/retry, policy restriction, unavailable source, and return to class materials.
- Background: small **KEEP-03** header; no full tutor-room image behind chat or reading.

## Calendar and its opened surfaces

### `/calendar`: Schedule, Week, Month, details, and planning

Owner: [Calendar route](C:/Users/glcar/Diana/app/(app)/calendar/page.tsx:1), [StudentCalendar](C:/Users/glcar/Diana/app/(app)/calendar/student-calendar.tsx:237).

- Keep the recently approved design and navigation fixes. Cover Schedule/Week/Month, selected date/item, today, previous/next period, all-day/timed/multiday, local/imported/assignment-linked items, details, phone detail sheet, empty dates, partial feed failures, long titles, and timezone display.
- Preserve save/reload/native Back date/view/item context and invalid-day fallback.
- Cover per-event device export and global deadline export launchers, school/source links, and Work/workspace/Review/Hand-in/receipt/saved-copy returns.
- Background: **KEEP-04**. Do not replace it during unrelated standardization.

### Calendar dialogs, optional planning, and connection states

Owners: [event editor](C:/Users/glcar/Diana/app/(app)/calendar/event-editor.tsx:42), [weekly planning](C:/Users/glcar/Diana/app/(app)/calendar/calendar-week-planning.tsx:1), [Google panel](C:/Users/glcar/Diana/app/(app)/calendar/calendar-google-sync.tsx:82).

- Add/edit: title, start/end dates, all-day toggle, times, timezone/DST explanation, optional category/location/repeat/reminder/notes/photo, pending/save failure/cancel, and sticky phone actions.
- Repeating series: whole-series explanation, repeat-until, delete/keep, deletion failure inside confirmation, undo, overlap warning, spring clock gap, and repeated autumn time explanation.
- Study: linked assignment, adjusted estimate, optional readiness guidance, link/unlink behavior when category changes, and no assignment estimate.
- Week availability: not set, saved, clear, pending/error, unknown estimates, partial totals, and reload preservation. Availability is student-provided, not an invented capacity claim.
- Google: unavailable, connect, reconnect, approved scopes, syncing, first success, repeat success, provider failure, and readable last-success/range information.
- Background: opaque panels/dialogs over **KEEP-04**. A user event photo is content, never a replacement room background.

## Redirects, aliases, and file responses

Do not count the following as new scenic rooms:

| Entry | Actual behavior / presentation responsibility |
|---|---|
| `/assignments/new` | Redirect to `/quick-add`; preserve useful entry context. |
| `/assignments/[id]` | Resolve assignment lifecycle and redirect to workspace or submission. |
| `/break-down` | Retired entry redirects to Work. |
| `/study/material/[assignmentId]` | Shared material renderer. Redirect to canonical class material route when class-owned; render classless material under Work otherwise. |
| `/calendar/events/[id]/export` | Owned event ICS download. Style the launcher and its failure/retry state. |
| `/api/calendar.ics` | Deadline ICS download. Preserve timezone/recurrence correctness. |
| `/classes/[id]/mastery/export` | File export, not a separate designed page. |
| `/api/assignments/[id]/submission-artifact` | Submission artifact/PDF response. Preserve actual graph/work contents and correct artifact version. |
| `/api/assignments/[id]/submitted-file/[fileId]` | Owned saved-file response. Preserve access controls and usable unavailable-file launcher feedback. |
| Original-material / offline-package APIs | Transport and download surfaces. Design preparing, ready, expired access, interrupted transfer, retry, and offline readiness in their owning reader. |
| Google OAuth start/callback and Google sync API | Functional connection flow. Style and test owner-facing entry, return, success/reconnect/failure states; do not add scenic assets to redirect endpoints. |

Primary flows also open `/notes/[id]`, `/notes/new?class=...`, `/study?classId=...`, `/study-artifacts/[id]?classId=...`, `/proof`, and Settings connections. These are boundaries to the secondary-page inventory. They must preserve the class/assignment return context and the same campus navigation contract.

## Concrete implementation gaps and order

These are source findings and planned checks, not a claim that every item is a live runtime defect.

### P1: explicit scene assignment and safe parent fallback

The default non-campus StudentShell environment still loads the older Diana signature-studio image. A route that omits campus intent can silently return to the older visual era. Make each page's browsing/focused-work intent explicit, using the master scene IDs above and a neutral campus fallback. Do not remove a deliberately quiet reading/work surface just because it has no full photograph.

### P1: navigation-state contract across all sectioned flows

Calendar is already fixed. Shared SectionTabs in Classes and Review/Hand in uses local state initialized from props and does not update a URL. Lobby mode is also local state. Work context is stored per student on outbound links and restored through its explicit return route. Test reload, direct links, native Back/forward, and returning from another page for every selected section/filter/item/source page.

Decide and document which state belongs in the URL, which is temporary presentation state, and which must remain protected server state. Do not preserve a stale hand-in confirmation after source/work/artifact changes.

### P1: readability and focus area before decoration

Workspace already supports real reading preferences with a 16px base editor. Some intake, navigation, helper, and metadata text is 11-13px. Review real phone rendering and zoom rather than shrinking more text to fit. Retain font/size/spacing choices, use display type only where suitable, and group secondary detail instead of squeezing it into the main task.

### P2: reuse existing responsive images in shallow headers

Full primary scene roots select desktop, high-DPI/4K, and mobile assets. Work intake/workspace/submission headers currently reference 1920 and mobile sources without the same high-DPI override. Reuse the existing KEEP-02 4K source through a shared header/scene mechanism. Classes assessment headers already inherit the classesRoom variable, including its responsive derivatives. No new generation is required.

### P2: subject cover-art coverage and neutral fallback

The `subjectArtwork()` helper maps common subject names to existing subject covers, but unknown labels return the old signature studio. Examples such as Statistics and legal/general subject labels can miss the current heuristic. Replace the fallback with neutral subject/campus art and map against the actual subject taxonomy. Optional new subject covers should be a small, coherent illustration pack, not another full room or Diana portrait for every class.

### P2: consolidate approved presentation after coverage exists

CampusLobby currently composes several older review/override style modules with the campus module. Map the mounted rules, consolidate the stable approved result, and retire presentation only after references and screenshots establish that it is unused. Older quest/trophy/legacy dashboard files are not proof that those visuals are mounted today. Do not delete by filename alone or reintroduce a superseded design while simplifying styles.

### Shared loading and recovery coordination

The primary route loading files all call the generic SmartLoading recovery shell. They do not retain a route-specific navigation/scene skeleton. Coordinate with the entry/system-page plan to provide a quiet matching parent poster/fallback and truthful task labels. Preserve previous content and saved drafts during in-place operations. Do not show a fabricated progress percentage, old school logo, or another student's cached identity while the current profile is loading.

## Required acceptance evidence

For each primary family, capture desktop and phone before publishing its changes, and verify the actual functional path rather than a static mock.

- Widths: 320, 390, 768, 1440; high-DPI and 4K asset selection; large text and zoom; no unintended whole-page horizontal overflow.
- Access: keyboard, focus restoration, readable labels, errors and confirmations, reduced motion, forced colors, selected-state meaning without color alone, and the student's reading font/spacing preferences.
- School personalization: school name plus Campus, two school colors with usable contrast, correct dynamic-logo placement, and no logo or UI text baked into a scene image.
- Navigation: direct entry, reload, native Back/forward, selected view/date/item, tab/filter/source/version/page, and Work/Class/Calendar return context.
- Data states: empty, partially unavailable, slow, saving, interrupted, retry, expired access, ambiguous save, permission-restricted, and signed-out/expired-session return.
- Work safety: draft persistence, production offline reload/save/reconnect, explicit hand-in, artifact-version validation, and owner isolation for online/offline material.
- Learning: teacher policy, IEP time adjustments, optional check-in, help discretion, and no requirement to disclose health information to start work.
- Content: long writing, code, math/graphs, formulas, tables, images/PDFs, long course/assignment names, non-default subject labels, and accessibility settings.
- Exports: actual readable paper/PDF content, graph and work retention, multipage navigation, real device calendar formats, and a usable launcher if an owned file is unavailable.
- Media: stable crops and focal placement, no white flash, no unnecessary duplicate high-resolution downloads, a usable no-image fallback, and predictable image failure handling.
- Tone: no XP, streaks, badges, trophies, scoreboards, victory language, punitive red errors, or decorative controls that imply unavailable features. Genuine teacher grades and factual workload totals remain legitimate educational information.

## Source anchors

- Shared scene/type/navigation: [StudentShell](C:/Users/glcar/Diana/components/student-shell/student-shell.tsx:6), [scene CSS](C:/Users/glcar/Diana/components/student-shell/student-shell.module.css:1), [navigation CSS](C:/Users/glcar/Diana/components/screen-design/student-navigation.module.css:3), [SectionTabs](C:/Users/glcar/Diana/components/student-shell/section-tabs.tsx:15), [SmartLoading](C:/Users/glcar/Diana/components/screen-design/smart-loading.tsx:3).
- Lobby detail: [check-in fields](C:/Users/glcar/Diana/app/(app)/dashboard/lobby-check-in-fields.tsx:37), [This Week](C:/Users/glcar/Diana/components/dashboard/lobby/lobby-this-week.tsx:11), [check-in history](C:/Users/glcar/Diana/components/dashboard/lobby/lobby-check-in-week.tsx:22).
- Work lifecycle/subject art: [assignment navigation](C:/Users/glcar/Diana/lib/assignment-navigation.ts:1), [workspace modes](C:/Users/glcar/Diana/lib/assignment-workspace.ts:3), [submission presentation](C:/Users/glcar/Diana/components/student-shell/submission.module.css:1).
- Reader detail: [LearningMaterial](C:/Users/glcar/Diana/components/learning/learning-material.tsx:32), [original material reader](C:/Users/glcar/Diana/components/learning/original-material-reader.tsx:11), [conditional material alias](C:/Users/glcar/Diana/app/(app)/study/material/[assignmentId]/page.tsx:1).
