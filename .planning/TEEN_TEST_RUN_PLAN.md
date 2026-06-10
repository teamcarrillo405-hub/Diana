# Teen Testing — Run Plan

The one gap no code can close: real teenagers using Diana. The measurement
protocol already exists in code (`lib/teen-testing/protocol.ts`) and the
proof panel is wired to receive results. This is the operational plan.

## Who and how many

- **5 students**, ages 13–17, at least 2 with a diagnosed or suspected
  learning difference (ADHD/dyslexia) — that's the design target, not an
  edge case.
- Recruit from family/friends/teammates first; a teacher contact can refer
  more later. Do not recruit strangers online for v1.

## Consent (minors — required, not optional)

- Written parental consent before any session. Keep it simple: what Diana
  is, that the session is observed, that no recordings leave your device,
  that their data can be deleted afterward on request.
- The student assents verbally at the start and can stop at any time.
- Use a fresh account per student; offer deletion at the end (the /export
  privacy center does this).

## Session shape (30 minutes, one student at a time)

1. **Setup (5 min)** — student's own phone or laptop, real account, real
   onboarding. Say only: "This is Diana. It helps with school. Set it up
   however you want." Do not guide.
2. **Task 1 — first move (5 min)**: "Add a real assignment you actually
   have this week and find what Diana thinks you should do first."
3. **Task 2 — get help (10 min)**: "Use Diana to actually start it." Watch
   whether they find the helper, whether the Socratic shape frustrates or
   lands, whether they tap the feedback buttons unprompted.
4. **Task 3 — the comparison (5 min)**: "Now do the same thing with the
   chat AI you normally use." (This feeds `generic_chat_comparison`.)
5. **Exit questions (5 min)** — exactly the protocol fields:
   - Does this look like it was made for someone your age? (looksMadeForMe)
   - Do you like how it looks? (loveTheLook)
   - Would you open it again tomorrow without being told to? (wouldOpenAgain)
   - Would you pick this over your normal chat AI for school? (wouldChooseOverGenericChat)
   - Was it faster to a useful next step than the chat AI? (fasterThanGenericChat)
   - Did you ever feel like Diana did the work *for* you? (final-work confusion — must be zero)

## What to write down during the session

- Time from dashboard load → first real action (timeToFirstActionSeconds).
- Every moment of hesitation longer than ~5 seconds — where, and what they
  said. These are the real findings.
- Any banned-feeling reaction ("this feels like school software") verbatim.

## Recording results

Enter each session into the teen-test observation flow so the proof panel
and scorecards pick them up (`teen_test_observations`). The market bar:
**4 of 5 prefer Diana over generic chat, zero final-work confusion.**

## Rules for the facilitator

- Never explain a feature before the student finds (or fails to find) it.
- Never defend the product mid-session; write the criticism down.
- A confused student is data, not a problem to fix live.
- Fix nothing between sessions 1–5; batch the findings, then iterate once.

---

# Teacher accounts — design note (deliberately not built yet)

Receipts and analytics today live on student-controlled pages. Real teacher
accounts mean **cross-account data access**, which is an RLS security
redesign, not a feature toggle:

- A `teacher_links` table (student_id, teacher_email, scopes, status) where
  the **student grants** and can revoke; RLS policies that allow a teacher
  role to read only granted, scoped views (receipts, prep readiness — never
  notes, never AI conversations, never wellness).
- Teacher auth via the existing Supabase auth with a `role` claim; teacher
  dashboard route group with its own layout.
- The invariant to protect: Diana is the student's tool. Teacher visibility
  is always a student-side grant, scope-limited, and logged.

Build it after teen testing — teacher pull will be much stronger with
student results in hand.
