-- Restrict privileged RPCs to the roles that actually use them.
-- Postgres grants EXECUTE to PUBLIC by default, and Supabase can also add
-- explicit anon/authenticated grants, so each sensitive function is handled
-- deliberately here.

-- This atomic upsert does not need elevated privileges. Running as the caller
-- lets the existing owner_id RLS policy enforce student isolation.
create or replace function public.upsert_type_estimate(
  p_owner_id uuid,
  p_kind text,
  p_elapsed numeric
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.assignment_type_estimates as estimates (
    owner_id,
    kind,
    mean_minutes,
    n_samples
  )
  values (p_owner_id, p_kind, p_elapsed, 1)
  on conflict (owner_id, kind) do update set
    mean_minutes = (
      estimates.mean_minutes * estimates.n_samples + excluded.mean_minutes
    ) / (estimates.n_samples + 1),
    n_samples = estimates.n_samples + 1,
    updated_at = pg_catalog.now();
$$;

revoke execute on function public.upsert_type_estimate(uuid, text, numeric)
  from public, anon, service_role;
grant execute on function public.upsert_type_estimate(uuid, text, numeric)
  to authenticated;

-- Group RPCs validate auth.uid() and are intentionally callable only by a
-- signed-in student. Remove the inherited anonymous/public grant.
revoke execute on function public.join_study_group(text, text)
  from public, anon;
revoke execute on function public.install_shared_deck_for_members(uuid)
  from public, anon;
revoke execute on function public.is_study_group_member(uuid)
  from public, anon;
revoke execute on function public.is_study_group_owner(uuid)
  from public, anon;

grant execute on function public.join_study_group(text, text)
  to authenticated;
grant execute on function public.install_shared_deck_for_members(uuid)
  to authenticated;
grant execute on function public.is_study_group_member(uuid)
  to authenticated;
grant execute on function public.is_study_group_owner(uuid)
  to authenticated;

-- Worker coordination and retention purges are server operations. Browser
-- sessions must not be able to claim jobs, reserve tenant limits, or purge
-- student data.
revoke execute on function public.claim_worker_job(text, text, integer)
  from public, anon, authenticated;
revoke execute on function public.reserve_worker_rate_limit(text, uuid, text, text, integer, integer)
  from public, anon, authenticated;
revoke execute on function public.purge_due_deletion_requests(timestamptz)
  from public, anon, authenticated;

grant execute on function public.claim_worker_job(text, text, integer)
  to service_role;
grant execute on function public.reserve_worker_rate_limit(text, uuid, text, text, integer, integer)
  to service_role;
grant execute on function public.purge_due_deletion_requests(timestamptz)
  to service_role;
