# Learned support policy operations

The application now loads an optional, private policy bundle when building the active problem's teaching context. With no bundle configured, it uses the existing support ladder. No candidate is active by default.

## Required evidence

Use actual reviewed trajectories and current, content-bound rights, consent and educator receipts. Keep train/development/test learner, source and template families separate. Run the existing trainer and held-out evaluation. Synthetic examples cannot authorize activation. An operator must verify the people and evidence behind the receipts; a local JSON file cannot establish a person's credentials.

After that review, prepare a private directory outside the web/public directory. It contains the immutable artifact, trajectory array and current receipt array, plus `activation.json`. Do not commit learner examples or secrets. The server setting `DIANA_LEARNED_POLICY_DIRECTORY` points to this directory. Browsers cannot select a directory or submit an activation.

The activation contract is `policyActivationSchema` in `lib/learning-engine/policy-runtime.ts`. It requires status, three simple JSON filenames, the exact approved artifact hash, operator identity, approval evidence reference, approval time and expiration. It does not accept a URL or a path that traverses directories. Each file is limited to 5 MB, and symlinks leaving the private directory are rejected.

## Activation and rollback

1. Inspect the trainer/evaluation reports and independently verify all authorizations.
2. Place the three complete data files in the private directory. Use fixed artifact names; never overwrite an active artifact or trajectory file.
3. Prepare an activation file for that exact artifact with a bounded expiry. Atomically rename it into place after operator approval.
4. Exercise source-unconfirmed, missing-evidence, supported-answer and ordinary-help journeys. Inspect the returned policy source and artifact hash without logging private trajectories.
5. To stop the candidate immediately, atomically replace the activation with `status: "disabled"` or unset the directory setting. To return to an earlier candidate, perform a fresh authorization check for that candidate, including current receipts; rollback does not revive revoked consent.

The loader rereads the activation and receipts on each decision. Invalid files, unavailable storage, changed activation, expired approval, revoked receipts or an ineligible artifact return the existing baseline. The loader also applies the fixed confirmation/evidence constraints. It does not change grades, independent-attempt rules, LLM weights, model-provider selection or submission state.

This is deployment plumbing, not an activated research result. The existing synthetic artifact remains inactive. `sessionsSincePractice` is conservatively zero until a separate session-history signal is available; it is not inferred from calendar days.

On a serverless deployment with immutable files, changing a local directory does not change deployed instances. Supply a genuinely shared private mount or deploy a newly reviewed bundle with configuration rollback. Neither that production storage arrangement nor a reviewed active policy is configured here.
