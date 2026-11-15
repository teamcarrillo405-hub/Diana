-- Worker results must pass the authenticated status release boundary. RLS alone
-- previously allowed an owner to select the raw result before that check.
revoke select on public.worker_jobs from public, anon, authenticated;

-- Remove any pre-existing column SELECT grants as well as the table grant.
do $$
declare column_names text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
    into column_names
    from pg_attribute
    where attrelid = 'public.worker_jobs'::regclass and attnum > 0 and not attisdropped;
  execute format('revoke select (%s) on public.worker_jobs from public, anon, authenticated', column_names);
end $$;

-- Preserve owner-scoped status polling. Payload, result, errors and internal
-- execution metadata are only readable by the existing service role.
grant select (id, trace_id, owner_id, feature, queue_name, queue_mode, status,
  created_at, started_at, completed_at) on public.worker_jobs to authenticated;

-- Existing owner RLS remains in force; service-role privileges are unchanged.
notify pgrst, 'reload schema';
