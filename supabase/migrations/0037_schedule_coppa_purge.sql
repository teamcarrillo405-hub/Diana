-- 0037: schedule the COPPA deletion purge.
-- purge_due_deletion_requests (migration 0034) existed but nothing ran it —
-- a 30-day deletion policy on paper. pg_cron runs it daily at 09:00 UTC.

create extension if not exists pg_cron;

select cron.schedule(
  'coppa-purge-daily',
  '0 9 * * *',
  $$select public.purge_due_deletion_requests()$$
);
