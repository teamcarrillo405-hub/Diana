# Remaining pages review specimens

Date: 2026-09-23. Scope: review-only routes under `/landing-3d/remaining-concept-review/`. These screens use synthetic, in-memory examples. They do not call auth, school, AI, upload, email, or sharing services. Production routes were not changed.

## Open the review

[Start with Quiz](http://127.0.0.1:3027/landing-3d/remaining-concept-review/study). The student header consistently offers Lobby, Work, Classes, Calendar, and More. Secondary tools live under More; Settings holds account and preference controls. The collapsed **Preview tools** panel contains the complete review catalog and scenario selector. Library, Entry, Public, and Recovery are review categories, not student menu tabs. Each screen also has a direct URL at `/landing-3d/remaining-concept-review/<screen-id>`.

| Family | Screen IDs | Source route coverage |
| --- | --- | --- |
| Classes | `class-detail`, `class-policy` | `/classes/[id]`, `/classes/[id]/settings` |
| Study | `study`, `study-library`, `study-new`, `study-guide`, `study-quiz`, `study-results` | `/study`, `/study-artifacts`, `/study-artifacts/new`, `/study-artifacts/[id]` modes. Recall cards are part of the quiz; the old review-only `study-flashcards` URL redirects to `study-quiz`. |
| Library | `notes`, `notes-new`, `notes-detail`, `search` | `/notes`, `/notes/new`, `/notes/[id]`, `/search` |
| Record | `proof`, `wellness`, `sharing`, `share-parent`, `share-portfolio`, `share-unavailable` | `/proof`, `/wellness`, `/sharing`, `/share/[token]` variants |
| Entry | `login`, `signup`, `onboarding` | `/login`, `/signup`, `/onboarding`; `/onboarding/done` stays a redirect |
| Public | `public-home`, `trust`, `student-control`, `early-confirm`, `early-unsubscribe`, `policy` | `/`, `/trust`, `/student-control`, early-access token screens, static privacy/terms reading; `/how-it-works` stays an anchor redirect |
| Recovery | `loading`, `error`, `not-found`, `offline` | Shared loading, error, not-found, and offline presentation |

The existing Lobby, Work, Classes, Calendar, More, Settings, Test Prep, Work capture, workspace, and Submission previews now share the same five-destination navigation. Public, account-entry, and shared-recipient screens use their own appropriate headers. On phones, secondary tool screens keep a Back to More link rather than repeat the whole tool rail.

## Verification

- The catalog now contains 31 direct review screens. The earlier 32-screen HTTP and 390px sweep predates this copy and Study consolidation; repeat visual checks are recorded separately from that baseline.
- The earlier browser review inspected Study selection, Notes capture/library, public home, signup, quiz, and unavailable share at desktop, 820px tablet, 390px phone, and 320px narrow phone sizes. The shared frame now uses one rail and stage column, with route subtitles and the explanatory sidebar removed.
- After consolidation, the browser confirmed Public, Study, Quiz recall, Notes, and the separate Classes preview at desktop size. Study and Public were checked again at 390px without horizontal document overflow. The quiz saved a choice and advanced to the reveal/self-check question. No console errors were reported in the reviewed tab.
- Vitest covers route catalog completeness, choice and recall quiz progression, local note modes, neutral unavailable sharing, token error wording, under-13 signup blocking, and optional school connection. TypeScript and scoped ESLint passed after the consolidation.
- The navigation pass passed 235 tests across 21 preview test files and TypeScript. Browser checks followed all five primary destinations; inspected More, Quiz, Public, Lobby, and Classes at 390px; and found no horizontal document overflow on Quiz, Public, Lobby, Work, or Classes. The collapsed catalog opened and navigated correctly. Quiz progression moved focus to the next question, and reduced-motion emulation produced no running CSS animations in the quiz content or header.
- Selected Biology, Algebra, or English work carries through quiz setup and three source-specific questions. The final inline review displays the answers entered during that session, with choice feedback, recall self-check, and ungraded written responses. Try again resets the local session. Selection and page-arrival transitions use opacity and transforms and honor reduced motion.
- The final Lobby check found that this worktree lacked the two local relit-character files expected by its existing media route. The existing `relit-motion-browser-poster.webp` and `relit-motion-browser.webm` were copied from the main Diana checkout into this worktree's `artifacts/today-graphics-fidelity` directory. No new render was generated.

## What still needs workflow review

- These are presentation specimens, not route integrations. Real data loading, saves, source validation, AI generation, school consent, account creation, email delivery, and share-token checks remain owned by their current production implementations.
- The policy reader uses layout-only placeholder paragraphs. Published `/privacy.html` and `/terms.html` remain authoritative. Trust and signup wording need the owner/policy decision flagged in the source audit before promotion.
- The direct `study-results` catalog specimen uses example results. The normal quiz flow displays the student's in-memory answers and does not claim a grade for free response. The quiz's recall step is a local self-check. Canonical flashcard persistence and FSRS scheduling still require a separate production integration decision.
- The active workspace's embedded specialist tools are not separate pages. Their full input/loading/saving/recovery designs remain an independent review task from the Work and study audit.
- Redirect aliases are represented by their destinations rather than new pages. The live `/offline` reachability and service-worker caching concerns remain open in the public/recovery audit.

No live workflow or visual acceptance is implied by a successful build or these screenshots. Review each specimen before any production integration.
