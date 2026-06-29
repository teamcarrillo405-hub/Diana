# Diana AgentDB Learning Plugin Plan

## Goal

Use AgentDB learning plugins to improve Diana's next-move guidance without
letting a model experiment on teenagers during test launch.

Default posture: **observe only**. Diana collects student-owned telemetry,
converts it into offline learning experiences, and trains outside the live
recommendation path. Learned outputs can only become visible after QA and live
teen validation.

## Recommended Algorithm

Use a **Decision Transformer** plugin first.

Reason: Diana already has logged experiences from analytics events, student
state snapshots, assignment status changes, and teen testing observations. A
Decision Transformer can learn from those logs without online exploration.

Do not start with Q-learning or Actor-Critic for launch. Those are better when
the environment can safely explore. Diana's environment is a real student
workflow, so exploration must be controlled.

## Data Sources

Use only existing student-owned, exportable tables:

- `analytics_events`: route sessions, first actions, friction events, feature use
- `student_state_snapshots`: support intensity, struggle state, readiness, mastery
- `assignments`: durable completion/submission outcome
- `teen_test_observations`: human validation and final-work confusion checks

Do not train on raw private note content, wellness details, AI conversation text,
or protected accommodation decisions.

## Experience Shape

Implemented in `lib/learning/next-move-policy.ts`.

Each experience uses:

- state: route, feature, assignment kind, support intensity, struggle state,
  readiness/friction/recall/mastery signals
- action: observed event name and current next step
- reward:
  - `+1` for starting focus, completing work, submitting, or creating study artifacts
  - `+0.8` for first action within 60 seconds
  - `-1` for abandonment, overload/friction, route errors, or long hesitation
  - `0` for passive page views

## Safety Gates

The learning policy has three modes:

- `observe_only`: collect and train only; no UI effect
- `shadow_recommend`: produce recommendations for review/logging only
- `assistive_rank`: may influence allowed UI surfaces

`assistive_rank` is blocked unless:

- the surface is not protected
- live teen validation has passed
- no final-work confusion was observed
- QA passes on the deployed URL

Protected surfaces always stay observe-only:

- accommodations / IEP / 504
- diagnosis
- privacy
- safety
- AI policy
- final-work boundaries
- wellness

## Build Steps

1. Keep current policy module and tests green.
2. Add an export script that joins `analytics_events` with recent
   `student_state_snapshots` into AgentDB experience JSONL.
3. Create the plugin:

```bash
npx agentdb@latest create-plugin -t decision-transformer -n diana-next-move
```

4. Train only on exported test-launch data:

```bash
npx agentdb@latest list-templates
npx agentdb@latest plugin-info diana-next-move
```

5. Run in `shadow_recommend` mode against Grayson/demo accounts first.
6. Compare learned suggestions to Diana's rule-based `rankAssignments`.
7. Only after teen testing, consider `assistive_rank` for dashboard ordering.

## Launch Rule

For test launch, AgentDB learning is allowed to collect and train offline.
It is **not** allowed to change student recommendations yet.

## Advanced AgentDB Guardrails

Implemented in `lib/learning/agentdb-advanced-policy.ts`.

Diana can use AgentDB advanced retrieval after launch readiness, but the
student-facing system still defaults to conservative behavior:

- use separate stores for training, shadow review, and future reviewed ranking
- combine vector similarity with metadata filters for surface, assignment kind,
  support intensity, and struggle state
- use MMR so similar prior examples do not crowd out other useful examples
- synthesize context only for reviewer/debug views, not live student ranking
- keep QUIC sync off whenever minor/student data is present

Store mapping:

- `observe_only` -> `.agentdb/diana-next-move-training.db`
- `shadow_recommend` -> `.agentdb/diana-next-move-shadow.db`
- `assistive_rank` -> `.agentdb/diana-next-move-review.db`

Launch rule: QUIC can only be enabled for non-student internal research data
with an explicit operator opt-in. It stays off for Grayson/demo and test-launch
student telemetry.
