create extension if not exists pg_cron;

select cron.schedule(
  'coppa-purge-daily',
  '0 9 * * *',
  $$select public.purge_due_deletion_requests()$$
);;
