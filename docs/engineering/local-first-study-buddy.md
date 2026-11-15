# Bounded local-first Study Buddy

Implemented September 28, 2026. Deployed September 29 UTC in the scoped web release
`dpl_7kuQjEpjxitMzXf7X6Y1cB9ZVdub`; the production source inventory matches the
reviewed candidate. See `tutoring-release-2026-09-29.md` for release evidence.

The authenticated Study Buddy route can now answer an initial linear-equation
hint without invoking the provider. The capability is
`owned-linear-initial-hint-v1`, implemented in `lib/math/local-first-algebra.ts`.
It does not select or activate a language model.

## Supported request

- A selected problem belongs to the authenticated student's assignment.
- The saved unit is a problem with manual or student-confirmed wording.
- The entire saved problem parses as the bounded integer `ax + b = c` contract;
  the coefficient is nonzero and operands and `c-b` are within 1,000,000.
- Saved student work is an object containing only empty strings. Missing,
  malformed or nonempty saved work cannot be bypassed by omitting client work.
- The request is an initial hint/guide with no prior conversation or textbook
  selection. The UI's single current student turn is accepted as the current
  request, not treated as earlier conversation.
- The parser accepts the exact optional `Solve for x: ` problem prefix.
- Visible work is empty or exactly the selected problem (optionally prefixed by
  `Problem: ` or `Work unit: `), and the whole question
  matches a short request such as "How do I start?" or "Give me a hint".

Other requests keep the existing provider path. Substring intent matching is
not used: a longer request, existing attempt, changed question or other task
cannot silently become an algebra hint. This deliberately small capability
reduces API dependence where its input contract is clear. Broader course
activities already use their own local checkers and scaffolds.

The response proposes one operation that preserves equality, or substitution
when `x` is already isolated. It neither grades a student answer nor records
independent mastery. No confidence percentage or independent verification claim
is invented. Source anchoring names the selected problem rather than a nearby
retrieved passage.

## Authorization and assistance

Authentication, age/consent, deletion state, ownership, class/assignment policy,
source confirmation and source-version conflict checks run before this branch.
Existing application usage limits remain in force. The output is fixed local
text plus parsed numbers; arbitrary question text is not echoed into it.

When durable assistance is enabled, the route waits for a matching broad
assignment receipt with `channel=local` before releasing the hint. Receipt
failure withholds output. Scope remains conservative because the route loads
assignment context. While the database foundation is staged, the flag remains
off; no complete shared-ledger enforcement claim is made.

Successful responses explicitly include whether a provider was attempted,
the delivered response origin and actual provider token count. A local hint
has `called=false`, `responseOrigin=local`, `tokens=0`. An API attempt followed
by an availability fallback retains `called=true`. Responses use `no-store`.

## Zero-provider operation

The server-only `DIANA_STUDY_BUDDY_PROVIDER_ENABLED=false` setting leaves this
bounded local path available and returns `local_capability_unavailable` for
requests needing the provider. It also disables semantic embedding fallback.
The setting defaults to provider-enabled when absent. It is a Study Buddy
control, not a global switch for every AI feature. Local eligible hints always
disable semantic embedding fallback so their zero-provider metadata remains
accurate.

## Verification

The pure helper checks supported signs/zero constants, unsupported syntax and
bounds, noninitial requests, conflicting visible work, long unrelated requests
and references. Route tests check actual hint text, zero Edge calls, zero tokens,
source confirmation, awaiting receipts and withholding output on receipt failure.

This is a bounded engineering capability, not a claim about all algebra,
representative tutoring accuracy, moderation of general conversations or student
learning. The generic capability registry's broader decisions remain in shadow
mode; this independently bounded path does not qualify a local language model.
