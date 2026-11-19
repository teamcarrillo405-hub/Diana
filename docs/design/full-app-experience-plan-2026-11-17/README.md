# Diana: complete campus experience update plan

November 17, 2026 (America/Los_Angeles). Source baseline: `25477d594afdd83a7ac5b91ee9e09ddbadf579cf`, current `main`.

**Goal:** make arriving, signing in, loading, learning, recovering work and managing an account feel like one personalized campus. Keep the confident menus, typography and sense of place inspired by college football games, with an accessible learning experience and no gamification.

**Start with shared identity/loading and the complete Sign-in family.** Preserve the accepted Lobby, Work, Classes and Calendar rooms. Update the remaining pages and their deeper states rather than redesigning those four tabs again.

**Implementation update:** The application/design work is now implemented and locally verified. [Implementation, evidence and release boundary](IMPLEMENTATION.md) · [20 desktop/phone preview pairs, no sign-in](previews/index.html). The owner approved the visual direction on November 18 with a brighter-background correction, now implemented. [Approved design standard](DESIGN-STANDARD.md). Production remains unchanged; external email verification is still open. The inventory below preserves the original planning baseline. Paid Higgsfield credits spent: 0.

## Read the plan

- [Interactive overview and page browser](index.html)
- [Entry, onboarding, public pages and system states](entry-and-system-pages.md)
- [Lobby, Work, Classes, Calendar and their deeper pages](primary-pages.md)
- [More, Notes, Study, Record, Wellness, Sharing and Settings](more-settings-and-study-pages.md)
- [Every source route, boundary, static HTML surface and technical handler](route-inventory.md)
- [Page implementation checklist](page-checklist.csv)
- [Background briefs and asset manifest](background-plan.json)
- [Detailed state checklist](state-checklist.csv)
- [Machine-readable inventory](route-inventory.json)

## 1. What was reviewed

The inventory covers **93 page files**: 45 rendered-page candidates, 1 public read-only Lobby example, 4 gated development/QA specimens, 42 compatibility/lifecycle redirects and 1 retired boundary. Also mapped: 19 layout/boundary files (including 7 loading, 2 error and 3 not-found boundaries), 84 technical handlers and 4 static HTML surfaces.

A page pattern is not a promise it is available to every user. Data, account, role and feature gates apply. A redirect or download is not another designed room. Its visible pending/error/result states still belong in the originating page's checklist.

**Evidence:** current source was inspected across all families. The approved primary design and latest Calendar release have existing live proof at this baseline, including 21 checks, 51 captures and 2 PDFs. This planning pass did not newly render all 45 candidate routes or all possible states. Each implementation phase begins with fresh desktop/phone captures using synthetic data and explicitly records unvisited states.

The November15 audit is historical: it describes primary screens that have since changed. Current source and the later verified release take precedence. The existing untracked audit document is preserved.

## 2. Rules for the whole program

1. **One Diana identity:** approved cream athletic wordmark, Campus Slab navigation, condensed display headings, readable body font and paintbrush selection. Replace old raster/gradient-symbol branding in the entry/secondary/system families. Keep the removed white line removed.
2. **Personalized campus:** use school short name plus Campus, such as Tigard Campus, and two saved school colors. Before authentication, use neutral Diana branding without revealing a previous user's school. Keep the school logo on the Home/Lobby banner and its setup preview; keep it off the left rail, Classes roster and class pages.
3. **One school-color authority:** reconcile the independent five-color AccentPicker with saved school colors. Retire or migrate the obsolete Gamer high school background choice after reference checks. Keep accessibility font/contrast/theme preferences as separate supports.
4. **The room surrounds the task:** scenic entry/menu/overview views; opaque paper, questions, graphs, code, source PDFs, IEP/permission forms and exports. A shallow parent-room header keeps context without obscuring work.
5. **Real UI over original art:** no generated text, controls, charts or school marks inside room images. Keep consistent architecture, materials, daylight and camera language. Diana stays integrated into the accepted Lobby room; no repeated foreground portrait on every page.
6. **Calm academic meaning:** no XP, streaks, ranks, badges, trophies, victory screens or football-role labels. Optional health history is not a completion score. Errors remain amber, with useful retry and recovery language.
7. **Readability:** use Lexend or the student's reading font for body/input, Campus Slab for navigation and Saira Condensed for display. Propose 16px body/input and 14px necessary secondary text, verified at actual phone size. Preserve spacing, dyslexia fonts, large text and low-visual options.
8. **Truthful progress:** use indeterminate or measured progress, not an animated bar reaching 90% by elapsed time. Preserve input during work. Distinguish local draft, saved to Diana, ready, recorded submission and confirmed school delivery.
9. **Learning and privacy stay intact:** teacher policy, IEP-adjusted time, tutoring/answer discretion, optional check-ins, authorship, source provenance, explicit hand-in and ownership are functional acceptance requirements.

## 3. Background plan

### Keep these approved environments

| Scene | Current asset family | Decision |
| --- | --- | --- |
| KEEP-01 Lobby | `/assets/today-now/diana-campus-with-guide-{4k,mobile}.webp` | Keep one room for Now, Check-in and This Week, integrated Diana and separate school banner. |
| KEEP-02 Work | `/assets/work/college-classroom-{1920,4k,mobile}.webp` | Keep classroom and chosen Work layout. Reuse restrained headers in intake, workspace and hand-in. |
| KEEP-03 Classes | `/assets/classes/academic-hall-{1920,4k,mobile}.webp` | Keep distinct hall/commons; reuse for class-origin readers and a Record header. |
| KEEP-04 Calendar | `/assets/calendar/campus-planning-{1920,4k,mobile}.webp` | Keep planning room and the verified date/view/event navigation. |
| Public welcome | `/assets/landing-cinematic-v3/` | Keep cinematic narrative structure; align brand and replace stale product captures. |

### Six new scene briefs, not six images already approved

| ID | Proposed environment | Pages and composition |
| --- | --- | --- |
| NEW-01 | Campus Entry | Sign in/up, recovery, confirmation and public mastheads. Believable student-center entrance/foyer, campus visible outside, natural daylight and quiet left area for a solid form. Neutral identity before login. |
| NEW-02 | Student Commons | More and Search. Campus wayfinding/commons, menu-safe left side, depth and architectural interest at the perimeter. Opaque directory/results panel. |
| NEW-03 | Library Study Alcove | Notes library, capture and editor perimeter. Related campus materials/bookshelves; plain readable paper inside the editor. |
| NEW-04 | Quiet Courtyard | Check-in history header. Shaded planted courtyard/terrace, calm and low-detail around plain charts; no clinic or fitness-score imagery. |
| NEW-05 | Seminar/Tutoring Room | Quiz hub, Saved practice, recall and artifact overview. Distinct from Work's classroom; neutral teaching wall, quiet table area, no fake equations or scores. Questions and results stay plain. |
| NEW-06 | Student Services/Advising | Onboarding, Settings, account/security, Sharing and staff/access headers. Welcoming advising space with form-safe composition. Same room through sections, no new office per setting. |

These six masters serve many URLs. Reuse headers/crops and plain focus surfaces. Review each family's desktop/phone composition before commissioning its final scene.

**Quality:** native 3840x2160 or larger source; intentional desktop and portrait framing, not a blind center crop or visible upscale. Deliver 1920 desktop, 4K/high-DPI, approximately 920px-wide phone and a tiny/local fallback. Manifest each source, dimensions, hash, provenance, focal coordinates and text-safe region.

**Proposed delivery targets:** <=160KB mobile, <=250KB desktop, <=650KB 4K, with a justified exception when needed. Current approved Work/Classes/Calendar are roughly 55–133KB mobile, 126–199KB desktop and 296–537KB 4K; Lobby guide 4K is about 585KB. Choose the right derivative; phones should not automatically download the4K master.

**Graphics pack:** one approved wordmark/icon/maskable-icon set, existing brush mask, coherent subject thumbnails and a neutral unknown-subject fallback. Unmapped subjects currently can fall back to the old studio portrait. Replace that fallback; do not buy another room image for every subject.

**Generation:** this plan spends no credits. Later Higgsfield no-cost/Unlimited web use must satisfy the repository's visible eligibility checks. Any paid final call needs its exact model, resolution, references, output count and total cost approved; no automatic paid variants/retries. Keep iterative/compositing work local under the existing ComfyUI/Remotion rules.

## 4. Implementation sequence

Work one page family at a time. Every family gets desktop/phone review, functional proof and release verification before moving on.

| Wave | Work | Done when |
| --- | --- | --- |
| 0 | Shared scene/brand/type/brush, safe neutral fallback, loading/recovery/offline/PWA | Every family has explicit scene/focus intent; image failure, reduced motion and offline launch stay usable. |
| 1 | Sign in/up, real password recovery/change, confirmation, two actual onboarding steps, canonical policy links | Real safe sign-in/recovery and age/consent work; branding can be skipped/saved; provider availability and cancel/deny are accurate. |
| 2 | More, Search, all 10 Settings sections and planned Security | Common Commons/Services identity, one palette source, clear save model, real capability-aware connections and privacy choices. |
| 3 | Retain primary tabs; align their deeper pages and gaps | Approved layouts preserved; source/section/filter/date/item survive save/reload/Back; readers, assessment, offline and PDF behavior stay correct. |
| 4 | Notes library/capture/detail, recording, reading/annotation and offline | Actual save/edit/reopen, recording/permissions/retry, readable paper and exact class/source return pass. |
| 5 | Quiz, Saved practice, guides/cards/tests/results, recall | Source-bound and policy-aware help, retained answers/drafts, accessible controls, calm results and unchanged FSRS. |
| 6 | Record, Check-in history, Sharing and public recipients | Distinct purposes, honest missing health data, selected-only private sharing, expiry/revocation and print coverage. |
| 7 | Public product captures, staff/access, preview/legacy cleanup and final journey | Current brand/screens at every entry; gated staff/tools, accurate billing capability and no old design returning from a stale link/cache. |

Public Google verification belongs in the entry/account dependency work: consistent homepage/policy/brand, truthful provider capabilities and owner approval are required for broader access. A successful approved test-account connection is not approval for all students or every provider.

## 5. Specific work that must not be missed

The three detailed page audits assign every current screen family, substates and backgrounds. The generated route checklist has one row for each of the 93 physical page files; redirects are explicitly separated.

- **Entry:** sign-in pending/error/recovery, signup age/check-email/resend, safe next path, callback invalid/expired/reused links, same/cross-device recovery, session expiry and draft protection. New recovery/security screens are proposed additions, not current pages.
- **Onboarding:** two reachable steps: Personalize and Connect. Older wizard fragments are not the live flow. Keep school name/two colors/logo and photo optional; show a campus/banner preview. Do not advertise disabled Classroom/Canvas as ready or confuse Classroom with Calendar.
- **Primary depth:** preserve approved paper and quiet reading. Add high-DPI parity to shallow headers without generating new rooms. Replace the unknown-subject studio fallback. Audit Classes and Review/Hand-in section persistence as a source-level risk, not an already proven failure.
- **Settings:** Profile, Appearance, Notifications/PWA, Accessibility, Goals, Learning, Tutor, AI export, Connections/IEP/Canva and Sign out are10 actual sections. Security/change-password is new. Resolve competing color/background controls. Preserve consent, supports and owner-bound reconnect/remove.
- **Notes/Study:** retain class/source/version/page and saved/unsaved context; organize secondary tools into disclosures. Cover microphone/camera/file permissions, transcription, reading/TTS, annotation, source citations, practice draft, finish/retry and results.
- **Record/Wellness:** one canonical Saved practice location, long-term Record distinct from This Week, optional Check-in history consistent with food/water/break and energy/sleep/activity. Replace participation-pressure percentages and distinguish missing data from zero.
- **Sharing:** precise recipient, schedule and content preview. Public token summary/portfolio/unavailable states remain permission-limited and printable. Do not add private health, IEP or chats to make the design richer.
- **Special routes:** `/me` is a duplicate/consolidation candidate; `/settings/course-review` is role-gated staff work; `/upgrade` is a capability/offer-gated Access page. Do not invent new parent/teacher/admin dashboards that are not present.
- **Public policy:** `/privacy.html`, asset-local privacy and `/trust.html` are separate static variants. Consolidate authoritative content/links while preserving valid URLs. Substantive legal/policy wording is separately reviewed.

## 6. Loading, recovery and offline

Seven actual loading boundaries share old studio-based SmartLoading. Root/app error and not-found variants also use the older recovery family. The installed icon/launch colors still belong to an older identity.

- Keep parent navigation, stable layout and a small cached poster or solid campus surface. Rename old Today loading copy to Lobby.
- Use truthful operation phases for upload, transcription, preparation, tutoring, PDF/export and sync. Keep previous work visible; add cancel/retry only where supported.
- Design first use, no matches, all completed, partial failure, no access, disabled feature, expired session and record missing as distinct states.
- Current `public/sw.js` does not explicitly cache campus `/assets/*` backgrounds or the static manifest SVG icon. Add a narrow versioned safe public-static allowlist and guaranteed CSS/font/icon fallback; never globally cache authenticated HTML/RSC or private documents.
- Verify production offline reload, saved-pack search, draft save/reopen, reconnect/conflict and account-switch/quarantined data. Never claim a local draft is synced before confirmation.
- Update maskable icons and neutral launch color, install/permission/unsupported states, and safe refresh/update behavior with unsaved-work protection.
- External Google/Canvas/Canva and browser-owned permission screens cannot be reskinned. Design their app entry, instructions and return outcomes.

### Conditional desktop wrapper and public preview graphics

The repository also contains two non-route Electron surfaces: native startup/backing window and standalone launch-failure HTML in `electron/main.cjs`. No shipped desktop channel is assumed. Before desktop distribution, align its light startup color, missing custom window icon and white/purple developer-oriented error card with local campus recovery. Verify the external/OAuth system-browser handoff and safe return without weakening navigation or permissions. There is no separate native settings/offline page and no new scenic master is needed.

Include browser tab/favicon, `app/icon.tsx`, maskable/install/shortcut icons and the Open Graph/social card in the shared brand work. Current metadata still points to an older Today dashboard image. Public previews use neutral Diana branding and sample content, not a student logo or private work.

## 7. Shared implementation contract

Proposed scene identifiers: entry, lobby, work, classes, calendar, commons, library, seminar, services, courtyard and none. Frame intent: scenic, shallow header, focused work, document and system.

Decouple scene from active navigation. Today `StudentShell` chooses Work/Classes/Calendar from active nav and otherwise can silently show the legacy portrait. A Library page must keep More active while explicitly choosing Library. A focus page must retain campus branding while using a plain surface. Migrate without breaking existing primary layouts.

Every scene descriptor includes responsive sources, fallback color/poster, focal/text-safe data and permitted frame modes. Pass the real student profile consistently so secondary pages do not replace identity with a generic S. Preserve school palette precedence and reading/contrast preferences.

## 8. Acceptance gate for every family

- 320/390 phone,768 tablet,1440 desktop, high-DPI/4K; landscape, keyboard-open phone and 200% text where relevant. Keep necessary graph/table/document scrolling local.
- Body contrast >=4.5:1 and qualifying large text >=3:1. 44px action targets are this product's target; WCAG 2.2's minimum is 24px with exceptions. Verify focus/non-color cues, keyboard/Escape/focus return and screen-reader names.
- Reading-font/spacing, forced colors, light/dark/device and reduced-motion/static equivalents. No forced intro delay, unsolicited audio or animated scenery behind active work.
- Canonical brand, correct school name/two colors and permitted logo placement; test extreme/similar colors and neutral logged-out/shared-device behavior.
- Direct entry, query/hash, reload, Back/forward, section/filter/selection and exact class/source/page returns. Verify real save/reopen, pending/failure/retry/cancel and explicit confirmation.
- Synthetic ownership-isolated fixtures, no real student data in design screenshots. Preserve teacher rules, IEP time, optional health context, authorship and submission boundaries.
- Future regression examples include math/graphs, writing/research, legal/economics, coding and calculus/physics/chemistry, with long/short content and readable PDFs. This plan does not claim those were newly retested today.
- Slow/blocked image/font/video/WebGL, network loss, full offline reload, stale artifacts and provider denial/expiry. No blank or white brand flash, duplicate full-scene downloads or mobile 4K default.
- Target LCP <=2.5s at 75th percentile; distinguish lab diagnostics from field performance. Record exceptions and untested states rather than asserting complete certification.
- Desktop+phone concrete preview, relevant functional evidence, owner review, then applicable commit/push/merge/release. Verify canonical production SHA and clean synthetic fixtures. Prior approval does not automatically approve a new visual family or paid render.

Criteria: [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C targets](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [W3C motion](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html), [web.dev LCP](https://web.dev/articles/optimize-lcp).

## 9. Cleanup and first implementation package

Middleware policy wins over many old files. Keep useful redirects and their return context; verify imports, links, gates, service-worker cache keys and release provenance before removing presentation. Preserve server actions/adapters still used by canonical pages and all stored work. Old file names or unreachable wizard copy are not evidence of current UI.

Candidates: signature-studio defaults, unknown-subject portrait fallback, stale accent/background pickers, duplicate policies and `/me`, unused Lobby overrides and preview/wizard fragments. Each requires usage proof before deletion.

**First package:** freeze the four accepted primary references; add explicit scene/focus and brand/loading contracts; compose Campus Entry at desktop/phone; implement the complete sign-in/up/recovery/confirmation family; prove actual email/redirect/age/draft behavior; review before moving into Services/onboarding/More/Settings.

The direction is established. Remaining decisions are concrete scene compositions, exact final-render costs if needed, substantive policy wording and external-provider approvals at their relevant checkpoint.

Source anchors: `components/student-shell/`, `components/screen-design/`, `lib/student-route-policy.ts`, `middleware.ts`, `app/(auth)/`, `app/onboarding/`, `app/(app)/settings/`, `app/manifest.ts`, `public/sw.js`, and the linked page audits.

Inventory regeneration uses the installed Node 24 runtime: get `git rev-parse HEAD`, then run `node docs/design/full-app-experience-plan-2026-11-17/collect-inventory.mjs <SHA>` from the repository root. It reads source and writes only planning inventory/checklist files.
