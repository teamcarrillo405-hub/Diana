-- Phase 2 GAP-08: speed up scorer recency lookup.
-- The dashboard fetches the most-recent 'started'/'completed' signal per
-- assignment in a 4-hour window; a compound partial index on
-- (owner_id, assignment_id, occurred_at desc) makes that query index-only.

create index if not exists task_signals_owner_assignment_time_idx
  on public.task_signals (owner_id, assignment_id, occurred_at desc)
  where kind in ('started', 'completed');
