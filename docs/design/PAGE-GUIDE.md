# Diana Page Guide

This is the page-level design and implementation contract for Diana. It uses `/wellness` as the current reference because that screen has a clear purpose, a shared header, a focused check-in flow, and a single final action.

Use this guide with [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). The design system defines reusable components. This guide defines how a complete page should behave and fit together.

## Product Standard

Every page should help a student complete one clear job without creating pressure, duplicate navigation, or unnecessary information.

1. Start with the student job, not a list of available features.
2. Show the page title and the most useful next action immediately.
3. Keep one primary action per page state.
4. Remove information once it no longer helps the student make a decision.
5. Use direct, calm copy. Never blame, shame, or imply that a student has fallen behind.

## Required Page Anatomy

### 1. Shared Shell

Every authenticated desktop page uses the shared `StudentDesktopNav`.

- Diana wordmark anchors the upper left.
- The same primary destinations appear in the same order on every desktop screen.
- The active destination is white. Inactive destinations are muted.
- Capture, Record, profile, and settings keep their established positions.
- Do not add a grid icon, search icon, or destination shortcuts that duplicate the header.
- A page must not invent another desktop navigation system.

Mobile keeps the page identity in the top area and relies on the established bottom navigation for destinations. Do not repeat the full desktop destination menu above the mobile content.

### 2. Page Identity

Place one `h1` directly below the shared header or inside the mobile page header.

- Use the established page-title treatment for the relevant flow. When a title is meant to match an approved live screen, that screen's actual computed typography takes precedence over the generic display-type rule.
- Keep the title short and concrete: `Daily wellness`, `Work`, `Classes`, `Record`, or `Sharing`.
- Add supporting text only when it helps the student decide what to do. Do not add a generic feature description.
- Do not repeat the page title, the student name, or a navigation label in the body.

### 3. Content Lane

Use the width that matches the task.

- Single-task and form pages use one constrained content lane. Wellness uses a maximum of `760px` on desktop.
- Expand to a wider layout only when the student must compare parallel information, such as a calendar or classes grid.
- Mobile uses consistent side gutters. Desktop uses larger responsive gutters, not content stretched edge to edge without a reason.
- For a focused form, make the desktop lane only as wide as its focal module plus its page gutters. The form, header, and context controls should share the same left edge; do not leave a large unused right side.
- Inspect the computed desktop width after implementation. A generic shell rule must not silently expand a focused lane back to `100%` or remove its maximum width.
- Keep a deliberate vertical rhythm between modules. A new section should earn its space by introducing a new decision.
- Avoid cards inside cards. A page section is a layout band; cards are for a distinct tool, item, or form.

### 4. Surface Hierarchy

The dark navy page shell carries the overall Diana identity. Reading and input surfaces must be light and calm.

| Surface | Use | Treatment |
| --- | --- | --- |
| Page shell | App background and shared chrome | Deep navy `#0F172A` with restrained blue or pink atmosphere only when it supports hierarchy |
| Standard content card | Lists, assignment cards, calendar areas, and supporting modules | White background, dark `#0F172A` text, slate border |
| Primary form or ownership panel | A focused task such as Wellness movement logging | Warm ivory `#F4EFE6`, dark text, subtle slate border and shadow |
| Priority framed module | A contained, important block that needs separation | White background, dark text, dotted or dashed slate outline |
| Inputs and unselected controls | Options that can be chosen or edited | White or near-white background, dark text, clear border |
| Selected control | Current choice within a module | A restrained blue or pink fill with dark text. Never rely on color alone. |

Use the warm ivory for a limited number of larger task surfaces. It is a hierarchy tool, not a new page background.

### 5. Controls and Actions

Every action must make its purpose clear.

- Use a verb plus object: `Log wellness`, `Log it`, `Save digest`, `Start English`.
- Keep the strongest action closest to the decision it completes.
- Use an icon-only button for familiar compact tools. Use text buttons for meaningful commands.
- A primary submission action can span the content lane when it completes the page task.
- Incomplete or setup-state actions stay visually quiet and compact. Wellness uses `Choose how it felt` as a small disabled prompt until the student selects a feeling; it becomes the full `Log it` action only when the form is ready.
- Do not repeat the same action in a card, a footer, and a floating button unless each location serves a clearly different workflow.
- Use a footer action only when the page needs an explicit final commit. Remove the footer when it does not add a decision.
- Context tabs such as `Parent digest` and `Teacher portal` switch views; they are not a two-column layout. On desktop, keep them content-sized in a `fit-content` tab list. On mobile, they may fill the row when that improves tap targets.
- A compact option uses a white background, dark text, and a clear border. A selected option may use the restrained blue or pink fill with dark text. Do not let global dark-shell button styles override these controls.

### 6. Information Discipline

Show only the information that changes the next action.

- Work and Calendar own due-date detail. Do not repeat it across Today, Record, Wellness, or Sharing.
- Remove activity history, explanatory text, and secondary labels when they do not change the task. Wellness removed the recent-movement list after logging because it did not help the next check-in.
- Use `Caught up` when there is no due work rather than creating an empty list or pressure message.
- Search does not need shortcuts to destinations already present in the header. Students can search by typing.
- Record owns verified evidence and the weekly showcase. Portfolio is not a separate destination.

### 7. States

Every interactive page needs the following states before it is considered complete.

| State | Requirement |
| --- | --- |
| Default | The student can identify the page purpose and next action in one scan. |
| Selected | The choice is visibly selected with text and color. |
| Disabled or incomplete | Explain the next required choice with calm, compact copy. Do not create a dead-looking full-width button. |
| Saving | Preserve context, prevent duplicate submission, and use a direct waiting label. |
| Success | Confirm what was saved in a brief status message. |
| Empty | State what is true now and offer one useful action when needed. |
| Error | Use clear recovery guidance and an amber treatment where appropriate. Never use red or blame-oriented copy. |

## Responsive Contract

Desktop and mobile show the same student decision, data, and action. They may use different arrangements.

### Desktop

- Use the shared desktop header on every page.
- Constrain focused forms and check-ins instead of stretching content across the entire viewport.
- Let content determine the page height. Do not reserve empty space below a completed module.
- Move the primary action immediately after the relevant content when the page is short. Wellness reduces its desktop bottom reserve so `Log wellness` follows the check-in instead of floating far below it.
- When a page title is meant to match another page, reuse its full typographic treatment at the active breakpoint: font family, size, style, weight, tracking, line height, case, and color. A smaller eyebrow is not an acceptable substitute for the page title.

### Mobile

- Preserve the content order and primary action from desktop.
- Use the mobile top identity area and the existing bottom navigation. Do not duplicate desktop destination links.
- Keep tap targets at least `32px` high for compact choices and `44px` or more for primary actions where space permits.
- Let option rows wrap without clipping or changing the card width.
- Keep critical action controls visible without overlaying form fields.

## Implementation Contract

For a new or revised page:

1. Start with the shared route layout, `ScreenDesignViewport` where applicable, and `StudentDesktopNav` for desktop.
2. Keep data loading in the server page and interaction state in a client component only when needed.
3. Fetch only data that is displayed or required to make a decision. Remove stale display queries when their UI is removed.
4. Use existing shared components and tokens before adding page-specific styles.
5. Provide accessible names, keyboard focus, disabled states, and status messages for interactive controls.
6. Keep sensitive wellness, record, and sharing data owner-scoped. Do not expose private data through decorative UI.
7. Keep live pages and their desktop/mobile design references aligned when a page is being actively reviewed in `/design/compare`.
8. When asked to match an existing screen or component, inspect the source element's computed styles in the live route, apply those values to the target, then compare the computed styles again after refresh.
9. Before reporting a visual change complete, inspect the actual live route at the requested viewport. Source CSS alone is not proof because shell and global selectors can override it.

## Review Checklist

Use this checklist before calling a page ready.

### Purpose and hierarchy

- [ ] The page has one clear student job.
- [ ] The `h1` is short, direct, and appears once.
- [ ] The primary action is obvious and placed near the decision it completes.
- [ ] There is no repeated due-date pressure or duplicate action.
- [ ] Every visible module earns its space.

### Shared design language

- [ ] The desktop header matches the established Diana header.
- [ ] Active navigation is white and inactive navigation is muted.
- [ ] Standard cards are light with dark text.
- [ ] Only larger focal task panels use warm ivory `#F4EFE6`.
- [ ] Important framed boxes use a restrained dotted outline when separation is needed.
- [ ] Inputs and unselected controls remain white with dark text.
- [ ] Accent colors are limited to selection, status, or a single page action.
- [ ] Desktop context tabs are compact unless the task genuinely needs a full-width segmented control.
- [ ] A focused-form lane is visibly constrained and aligned with its focal module.

### Mobile and interaction

- [ ] Mobile preserves the same task, information order, and primary action.
- [ ] Mobile does not duplicate desktop navigation.
- [ ] Controls fit without overlap, clipping, or horizontal scrolling.
- [ ] Every interactive element has focus, disabled, saving, success, and recovery behavior as applicable.
- [ ] A live browser check confirms the requested text, color, control size, and margins at the reviewed breakpoint.

### Engineering and QA

- [ ] The route uses the approved data-access boundary and only loads needed data.
- [ ] Live and design-reference versions match when both are maintained.
- [ ] `npm run typecheck` passes.
- [ ] Relevant Vitest coverage passes or is added for changed behavior.
- [ ] `npm run tone-audit` has no new copy violations.

## Page Planning Template

Before building a page, write these six answers in the implementation task:

1. **Student job:** What is the student trying to do right now?
2. **Primary action:** What is the one action that completes that job?
3. **Required data:** What must be loaded to make that action useful?
4. **Modules:** What is the smallest set of modules that changes the next decision?
5. **States:** What does the page show before selection, while saving, after success, and when empty?
6. **Responsive rule:** What remains identical across desktop and mobile, and what only changes layout?
