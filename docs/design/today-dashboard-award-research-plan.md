# Today Dashboard: Award Research and Design Plan

Prepared September 9, 2026. Status: research complete; a development-only visual prototype is now available for review. Production Today remains unchanged. See `today-dashboard-data-map.md` for the source audit, prototype scope, and verification.

## Recommendation

Develop a distinctive student workspace through a coordinated set of progress graphics, original milestone badges, clear homework actions, and disciplined spacing. Keep the approved frosted appearance, existing background, and six-panel arrangement. The strongest opportunity is to make weekly effort visible and satisfying while making today's next action immediately understandable.

An award is an external jury decision. This plan defines work and evidence that could support a competitive entry; it does not predict a win or establish teenage appeal.

## Research Basis

The following projects have official award records. Award categories matter: these are recognized interface, experience, or concept projects, not winners of a universal category called "best dashboard graphics." Visual observations below are my assessment of published presentation images, not attributed jury comments or a hands-on evaluation of the products.

| Project | Verified recognition | Evidence and design lesson | Application to Diana |
| --- | --- | --- | --- |
| ICOD - Intelligent Computing & Operation Dashboard | Red Dot, Brands & Communication Design 2024, User Interface Design | Inspected the official gallery: a distinctive spatial infrastructure visualization anchors the experience, with compact charts and contextual labels around it. This is a useful example of purposeful visual identity. | Give Study Progress and Achievements a recognizable graphic language. Keep the existing background; a new 3D world is unnecessary for assignment data. |
| AI Ad Manager | Red Dot, Design Concept 2024, Interaction, UI and User Experience; described as Ready For Market | Inspected official desktop and mobile presentations: segmented rings, small trend charts, concise central values, and coherent graphical treatments across devices. | Coordinate ring proportions, bar shapes, typography, and milestone graphics across the six panels. Retain the user's own background and palette direction. |
| Logistics Risk Watcher, Samsung SDS | Red Dot, Brands & Communication Design 2019, User Interface Design / User Experience Design | Inspected official chart and regional-map presentations: readable chart divisions, visible legends, adjacent totals, and restrained color highlights. The official description emphasizes easy interpretation of logistics data. | Put labels, units, totals, and legends where students need them. Color should help compare subjects and understand progress. |
| Finix Payment Management Dashboard | UX Design Award, Product 2024 | The official award page and jury statement recognize researched task prioritization, a polished interface, and decision support. Used as workflow and research evidence; the product was not tested hands-on. | Make the priority assignment actionable and make readiness to submit easy to identify. Document student task success alongside visual quality. |

Sources: [ICOD](https://www.red-dot.org/project/icod-intelligent-computing-operation-dashboard-72985), [AI Ad Manager](https://www.red-dot.org/project/ai-ad-manager-71881), [Logistics Risk Watcher](https://www.red-dot.org/project/logistics-risk-watcher-41263), [Finix](https://ux-design-awards.com/winners/2024-1-finix-payment-management-dashboard).

The [UX Design Awards criteria](https://ux-design-awards.com/jury/judging-criteria) include research, accessibility, effective outcomes, consistent visual design, brand fit, and appropriate writing. Visual polish is one part of a credible award case.

Nielsen Norman Group's [teen usability research](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/) supports fast, clear interfaces and a respectful tone; it cautions against childish presentation and excessive effects. This is older research, not evidence of current fashion preferences or a test of Diana. Our intended students still need to evaluate the proposed design.

## Fixed Brief

| Left | Center | Right |
| --- | --- | --- |
| Today's Plan | Study Progress | Upcoming Deadlines |
| Check-In | Subject Overview | Achievements |

- Preserve the existing page background and frosted material direction.
- Preserve Check-In behavior, controls, and saved-state feedback.
- Keep the highest-priority homework first in Today's Plan, with a Start action.
- Today's Plan covers work intended for today; Deadlines covers the next seven days and includes ready-to-submit work. Earlier unfinished items remain clearly dated.
- Study Progress covers weekly assignment goals and planned study time completed.
- Subject Overview shows each subject's share of weekly planned work.
- Achievements cover assignments completed, study sessions finished, and work submitted.
- Mobile keeps all six panels in the same row-major reading order.
- Retain Diana's calm language, explicit submission confirmation, and absence of streak pressure.

## Proposed Visual System

### Composition and Spacing

Prototype a three-column layout with a slightly wider middle column, giving the priority action room. Begin with approximately 20px gaps, 24px panel padding, and desktop rows around 300-340px where content permits. These are starting dimensions to validate, not fixed heights that can clip content. Mobile panels use content-driven heights with stable chart dimensions.

Align headings and their supporting labels across each row. Keep charts directly connected to their headings and legends. Following user review, the outer frame now has an uninterrupted outline without a notch. Avoid stacking additional framed containers inside the panels; use spacing, separators, and a restrained priority-row highlight.

At shorter desktop heights, preserve comfortable text sizes and allow natural vertical scrolling. Do not force the whole workspace into one screen by shrinking labels.

### Color and Typography

Following user review, use bright neon graphic accents: electric violet #9828FF, cyan #00BFFF, mint #00E99A, and golden yellow #FFD42A. Validate their actual use against the composited glass surface. These are graphic accents, not automatically accessible small-text colors; retain dark labels and explicit values, with outlined planned bars and solid studied bars.

- Violet gives the homework Start action its primary emphasis.
- Planned and completed study time have distinct treatments: an outlined or pale planned track and a solid mint completion mark, with explicit labels.
- Subject colors stay stable across subject markers and the subject donut; deadline status uses a separate icon and written label.
- Amber identifies date-related attention calmly. Status is never communicated by color alone.
- Check-In's main control remains easy to find but has less visual weight than Start.
- Keep the current type family initially. Prototype 20-22px panel headings, 14-16px task text, 12-13px supporting labels, and 28-36px main chart values. Use plain short labels and consistent numeral alignment.

The glass material stays recognizable. Solve contrast through appropriate foreground colors and existing surface-token tuning where necessary; do not replace the page background or introduce a dark theme copied from the award references.

### Graphic Craft and Motion

Use a consistent family of ring thicknesses, rounded bar ends, spacing, and restrained highlights. Charts remain geometrically accurate. Decorative depth belongs mainly in milestone artwork, where it will not distort data.

Create three original badge illustrations with a coherent material treatment, around 64-80px at desktop size: a completed-work mark, a finished-session timer, and a submitted-work mark. Supporting controls continue using the existing icon library. Badge labels remain separate accessible text.

Use brief motion to explain change: a progress increment after recorded completion, a gentle confirmation after Check-In, and a single badge reveal on a newly reached milestone. Initial content must be readable immediately. Honor reduced motion and avoid continuous pulsing or decorative movement across the dashboard.

## Panel Specifications

### Study Progress

Make this the primary data graphic. Compose an assignment-goal ring beside a seven-day study-time chart on desktop, with a compact factual summary below. On phones, stack those parts without excessive blank space.

The ring shows assignments completed toward the week's goal, with numerator and denominator. The chart uses a labeled minutes/hours scale and distinguishable planned/completed marks. Hover, keyboard focus, and tap expose exact daily values; a text summary remains available without interaction. A small independent time total avoids combining assignments and minutes into an unexplained percentage.

No-data, zero-progress, partial-progress, complete-goal, and exceeded-time-target states each need designed appearances. Do not add visible bar height merely to make a zero day look occupied. If actual time exceeds plan, the chart domain accommodates it; values are never silently clipped.

### Today's Plan

Use the first entry as the page's clearest action: subject marker, readable homework title, today's planned duration when available, and Start. Show a brief reason such as "Due today" when the data supports it. Keep the whole-assignment estimate secondary.

Below it, use compact rows for other work scheduled or selected for today. Do not invent scheduled time slots or add tomorrow's work to fill the panel. Distinguish a selected priority from an actual calendar appointment. A one-item day should look composed at its natural density.

### Upcoming Deadlines

Use a calendar icon, a title allowed to wrap, subject, exact date, and a compact relative-time label. Ready to submit receives a discreet labeled state and leads to the existing review/submission workflow. Submission remains student-confirmed.

Deduplicate items that qualify for multiple statuses. Keep earlier unfinished work clearly dated, order upcoming dates predictably, and ensure a cluster of ready items cannot conceal all imminent deadlines. Make the seven-day horizon a student-local calendar rule.

### Check-In

Align the heading with the neighboring panels and coordinate spacing, type, and accent weight. Preserve Energy, Sleep, Movement, saved feedback, and existing input behavior. Keep controls comfortable for touch. The visual revision should not change what is recorded or trigger a new wellness workflow.

### Subject Overview

Use a true donut opening with a short central total and "planned this week" label. Keep the chart and legend together. The legend shows subject, share, and planned time using the same color mapping as other subject cues.

Include every subject in the calculation and presentation. If space requires an Other segment, its value must account for all omitted subjects and its contents must be inspectable. Do not silently show four subjects as though they were the entire week. Hover/focus/tap can highlight one segment and its legend row without shifting layout.

### Achievements

Show three substantial badges with concise milestone labels, supported counts, and earned or upcoming states. Initial proposed milestone: the first recorded completion in each category. Later thresholds should be based on product decisions and student feedback, not an arbitrary escalating pressure system.

Use a subdued outline/material state when nothing has been recorded and a richer color treatment when earned. Include concrete evidence such as a count or date. These are personal milestones, not rankings, competitive scores, or uninterrupted-day requirements.

## Data Work Required Before Final Visuals

The saved implementation was inspected during this research. It currently sums estimated assignment minutes into completedMinutes and groups daily bars by due date. Its weekly query selects assignments due within the week. Achievements currently substitutes planned time finished for finished study sessions. These definitions do not establish actual study activity or the time an assignment was completed.

Before implementation:

1. Define the weekly goal cohort and the student's local week boundary. A ring labeled "weekly goal" and a count labeled "completed this week" may require different calculations.
2. Locate and verify persisted assignment completion/submission events, scheduled study time, and actual session completion/duration records. A status or due date alone is not an activity timestamp.
3. Count study time from actual recorded activity, excluding pauses and avoiding double counting. Count completed sessions from completed-session records, not assignment estimates or open timer windows.
4. Keep weekly subject share explicitly based on planned work. Distinguish estimated work duration from scheduled study time if both exist.
5. If historical activity data does not exist, show an honest unavailable/tracking-start state and identify the smallest tracking change needed. Do not manufacture historical progress.

Existing implementation locations: `app/(app)/dashboard/page.tsx`, `lib/dashboard/lobby-view.ts`, `app/(app)/dashboard/today-dashboard-panels.tsx`, and the Today styles in `app/(app)/dashboard/lobby-dashboard.tsx`.

## Delivery Sequence

| Stage | Concrete deliverable | Acceptance condition |
| --- | --- | --- |
| 1. Baseline and data definitions | Recovered desktop/mobile captures and a compact metric-to-data map | Every proposed number has a defined source, time range, and zero/unavailable behavior. |
| 2. Visual prototype | One complete desktop and mobile design on the actual background, plus chart/badge details | Six-panel order preserved; graphics, typography, and accents form a coherent family. |
| 3. State review | Empty, typical, busy, long-title, completed, and unavailable-data examples | The layout remains composed without filler, clipping, or misleading values. |
| 4. Implementation | Scoped Today components, graphics, styles, and necessary data wiring | Existing homework, Check-In, and submission interactions still behave correctly. |
| 5. Product verification | Desktop/mobile visual comparison, keyboard/touch review, and meaningful data tests | Accurate charts, readable text, no overlap, and usable controls across target sizes. |
| 6. Student evaluation | Two small rounds with students in the intended age range, first usability then a short real-use follow-up | Fix recurring confusion; assess whether the design is appealing and useful beyond first impression. |
| 7. Award case study | Before/after views, rationale, originality, accessible interaction examples, and observed outcomes | Claims are backed by evidence. Choose an appropriate award category only after the product is ready. |

The research/planning deliverable is complete. A source audit and Stage 2 prototype are now available, with Stage 3 sample states reviewed. The audit found open production-data definitions, especially planned study time and completion events. Production integration, real-account validation, student evaluation, and an award case study are not complete.

## Quality Criteria

These are proposed project targets, not published award thresholds or evidence that Diana already meets them.

- In a brief first-look exercise, students can point to their next homework action and the nearest upcoming deadline. Then they can explain the assignment ring and time bars without coaching.
- Normal-size text meets at least 4.5:1 contrast over the actual composited surface; large text follows the applicable threshold. Review chart visibility and focus states separately. See [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- Main phone controls target at least 44px touch height as a project usability choice. Legends and useful values work without hover.
- Test representative 360px and 390px phones, a tablet, and 1366px and 1440px desktops. Include text zoom, long subject names, many subjects, sparse days, and a busy deadline week.
- Preserve the six-panel reading order. At a typical phone viewport, keep the priority Start action readily reachable by making Study Progress compact, without shrinking its labels.
- Finishing an assignment, completing a session, logging Check-In, and confirming submission produce the correct feedback and persisted state. Do not infer success from animation alone.
- Fresh users, missing history, and temporarily unavailable data receive calm, deliberate visual states.
- Study sessions and assignment metrics reconcile with underlying records. Test week boundaries, actual completion dates, reopened work, duplicate events, and subject totals.
- Keep interactions responsive on a modest phone or school laptop. Load badge artwork efficiently and avoid adding a heavy 3D dependency for decorative effect.
- In student review, ask both what looks appealing and what feels childish, distracting, confusing, or useful. Compare against the current design with the same data. A small sample guides iteration; it does not prove that all teenagers will love the product.

## Scope of This Research

Official award records were checked, and published ICOD, AI Ad Manager, and Logistics Risk Watcher images were inspected in the browser. Finix informed the workflow/research approach through its official jury statement. No claim is made that graphics alone caused any of these awards. No current live-product usability testing of those references, student testing of Diana, award submission, or application code change was performed in this research task.
