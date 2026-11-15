-- NEXT CANDIDATE ONLY. Replicas receive one opaque capability, never a DB key.
create table public.worker_executions (
  trace_id text primary key references public.worker_jobs(trace_id) on delete cascade,
  capability_hash text not null check (capability_hash ~ '^[a-f0-9]{64}$'),
  worker_id text not null,
  attempt integer not null,
  expires_at timestamptz not null,
  job_snapshot jsonb not null,
  state text not null check (state in ('issued','screening','authorized','completing','completed')),
  reservation_id uuid,
  reserved_tokens integer,
  completion_hash text,
  created_at timestamptz not null default now()
);
alter table public.worker_executions enable row level security;
revoke all on public.worker_executions from public, anon, authenticated;
grant all on public.worker_executions to service_role;

-- Every transition locks the job first. A re-claimed lease fences the old replica.
-- There is deliberately only one authorization per trace, even after lease expiry.
create or replace function public.worker_execution_transition(
  p_action text, p_trace_id text, p_worker_id text, p_capability_hash text,
  p_data jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  j public.worker_jobs%rowtype;
  e public.worker_executions%rowtype;
  r record;
  s record;
  a uuid;
  eligible boolean;
  result jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_worker_id is null or length(p_worker_id) not between 1 and 128
    or p_capability_hash is null or p_capability_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid execution identity' using errcode = '22023';
  end if;
  select * into j from public.worker_jobs where trace_id = p_trace_id for update;
  if not found then raise exception 'execution unavailable'; end if;
  select * into e from public.worker_executions where trace_id = p_trace_id for update;
  if p_action <> 'issue' and (e.trace_id is null or e.worker_id <> p_worker_id
      or e.capability_hash <> p_capability_hash) then
    raise exception 'execution unavailable';
  end if;
  -- An exact completed replay is only an acknowledgement, never another payload.
  if p_action = 'begin_complete' and e.state = 'completed'
      and e.completion_hash = p_data->>'completionHash' then
    return jsonb_build_object('replayed', true);
  end if;
  if j.status <> 'running' or j.locked_by is distinct from p_worker_id
    or j.locked_until is null or j.locked_until <= clock_timestamp()
    or j.feature <> 'diana.voice_candidate' or j.queue_mode <> 'managed_queue' then
    raise exception 'execution lease unavailable';
  end if;
  if p_action = 'issue' then
    insert into public.worker_executions(trace_id, capability_hash, worker_id, attempt,
      expires_at, job_snapshot, state)
    values (j.trace_id, p_capability_hash, p_worker_id, j.attempts, j.locked_until,
      jsonb_build_object('owner_id',j.owner_id,'tenant_id',j.tenant_id,'feature',j.feature,
        'queue_name',j.queue_name,'payload',j.payload,'constraints',j.constraints), 'issued')
    on conflict (trace_id) do update set capability_hash = excluded.capability_hash,
      worker_id = excluded.worker_id, attempt = excluded.attempt, expires_at = excluded.expires_at,
      job_snapshot = excluded.job_snapshot, state = 'issued'
    where worker_executions.state in ('issued','screening')
      and worker_executions.attempt < excluded.attempt
      and worker_executions.expires_at <= clock_timestamp();
    if not found then raise exception 'execution already issued or dispatched'; end if;
    return jsonb_build_object('expiresAt',j.locked_until);
  end if;
  if e.attempt <> j.attempts or e.expires_at <> j.locked_until
    or e.expires_at <= clock_timestamp() or e.job_snapshot is distinct from
      jsonb_build_object('owner_id',j.owner_id,'tenant_id',j.tenant_id,'feature',j.feature,
        'queue_name',j.queue_name,'payload',j.payload,'constraints',j.constraints) then
    raise exception 'execution binding changed';
  end if;
  if p_action in ('dispatch','finish') then
    -- Lock before evaluating policy. A concurrent revocation may have committed
    -- while this transaction waited; checking before the budget lock is unsafe.
    -- Budget RPCs also use profile before reservation, preserving that order.
    perform 1 from public.profiles where user_id = j.owner_id for update;
    if j.payload->'input'->>'assignmentId' is not null then
      a := (j.payload->'input'->>'assignmentId')::uuid;
      perform 1 from public.assignments where id = a and owner_id = j.owner_id for share;
      perform 1 from public.classes c where c.owner_id = j.owner_id and c.id = (
        select x.class_id from public.assignments x where x.id = a and x.owner_id = j.owner_id
      ) for share;
    end if;
    if e.expires_at <= clock_timestamp() then raise exception 'execution lease expired during policy lock'; end if;
  end if;
  if p_action = 'reject' and e.state = 'issued' then
    update public.worker_jobs set status = 'error', completed_at = now(),
      error_summary = 'student_eligibility_denied',
      result_payload = '{"status":"error","errorCode":"student_eligibility_denied"}'::jsonb,
      locked_by = null, locked_at = null, locked_until = null where trace_id = j.trace_id;
    update public.worker_executions set state = 'completed' where trace_id = j.trace_id;
    return jsonb_build_object('rejected',true);
  elsif p_action = 'begin' and e.state = 'issued' then
    update public.worker_executions set state = 'screening' where trace_id = j.trace_id;
    return to_jsonb(j);
  elsif p_action = 'dispatch' and e.state = 'screening' then
    -- Recheck policy inside the transaction immediately before reserving/marking.
    select exists(select 1 from public.profiles p where p.user_id = j.owner_id
      and p.consent_ai = true and p.age_bracket in ('13_to_17','adult'))
      and not exists(select 1 from public.data_deletion_requests d where d.owner_id = j.owner_id
        and d.status not in ('completed','cancelled')) into eligible;
    if j.payload->'input'->>'assignmentId' is not null then
      a := (j.payload->'input'->>'assignmentId')::uuid;
      eligible := eligible and exists(select 1 from public.assignments x
        join public.classes c on c.id = x.class_id and c.owner_id = j.owner_id
        where x.id = a and x.owner_id = j.owner_id
        and coalesce(x.ai_mode_override::text,c.ai_mode::text) = 'green');
    end if;
    if not eligible then raise exception 'student eligibility denied'; end if;
    select * into r from public.reserve_ai_token_budget(j.owner_id,
      'worker:' || j.trace_id, (p_data->>'requestedTokens')::integer);
    if r.allowed is distinct from true or r.reservation_status <> 'active' then
      raise exception 'budget unavailable';
    end if;
    select * into s from public.mark_ai_budget_provider_started('token',r.reservation_id,p_capability_hash);
    if s.provider_start_status <> 'started' or s.provider_started_at is null then
      raise exception 'provider start unavailable';
    end if;
    update public.worker_executions set state = 'authorized', reservation_id = r.reservation_id,
      reserved_tokens = r.reserved_tokens where trace_id = j.trace_id;
    return jsonb_build_object('authorized',true,'expiresAt',e.expires_at);
  elsif p_action = 'begin_complete' and e.state = 'authorized' then
    if p_data->>'completionHash' is null or p_data->>'completionHash' !~ '^[a-f0-9]{64}$'
      or (e.completion_hash is not null and e.completion_hash <> p_data->>'completionHash') then
      raise exception 'completion identity conflict';
    end if;
    update public.worker_executions set state = 'completing', completion_hash = p_data->>'completionHash'
      where trace_id = j.trace_id;
    return to_jsonb(j);
  elsif p_action = 'finish' and e.state = 'completing'
      and e.completion_hash = p_data->>'completionHash' then
    -- Never trust replica usage to refund a reservation. Unknown local usage is
    -- charged at the reserved bound, including blocked output and provider errors.
    select * into s from public.settle_ai_token_budget(e.reservation_id,e.reserved_tokens);
    if s.reservation_status not in ('settled','settled_late') or s.charged_tokens < e.reserved_tokens then
      raise exception 'settlement unavailable';
    end if;
    result := p_data->'result';
    if result->>'status' = 'succeeded' then
    -- Recheck policy inside the transaction immediately before reserving/marking.
    select exists(select 1 from public.profiles p where p.user_id = j.owner_id
      and p.consent_ai = true and p.age_bracket in ('13_to_17','adult'))
      and not exists(select 1 from public.data_deletion_requests d where d.owner_id = j.owner_id
        and d.status not in ('completed','cancelled')) into eligible;
    if j.payload->'input'->>'assignmentId' is not null then
      a := (j.payload->'input'->>'assignmentId')::uuid;
      eligible := eligible and exists(select 1 from public.assignments x
        join public.classes c on c.id = x.class_id and c.owner_id = j.owner_id
        where x.id = a and x.owner_id = j.owner_id
        and coalesce(x.ai_mode_override::text,c.ai_mode::text) = 'green');
    end if;
    if not eligible then raise exception 'student eligibility denied'; end if;
    end if;
    if result->>'status' = 'succeeded' then
      if length(result->>'response') not between 1 and 1200 then raise exception 'invalid response'; end if;
      a := (j.payload->'input'->>'assignmentId')::uuid;
      insert into public.authorship_log(owner_id,assignment_id,actor,event_type,payload)
      values(j.owner_id,a,'diana','local_voice_candidate',jsonb_build_object(
        'traceId',j.trace_id,'workerId',p_worker_id,'responseChars',length(result->>'response'),
        'source',j.payload->'input'->>'source','provider','openjarvis','model',result->>'model',
        'imageSha',result->>'imageSha','durationMs',result->'durationMs',
        'usageBasis','conservative_reservation','tokensCharged',e.reserved_tokens));
      insert into public.ai_interactions(owner_id,assignment_id,feature,model,prompt_summary,tokens_used)
      values(j.owner_id,a,'voice_candidate',left(result->>'model',128),
        'feature=voice_candidate;usage_basis=conservative_reservation',e.reserved_tokens);
    elsif result->>'status' is distinct from 'error' then raise exception 'invalid completion';
    end if;
    update public.worker_jobs set status = result->>'status', result_payload = result,
      error_summary = case when result->>'status' = 'error' then result->>'errorCode' else null end,
      completed_at = now(), locked_by = null, locked_at = null, locked_until = null
      where trace_id = j.trace_id;
    update public.worker_executions set state = 'completed' where trace_id = j.trace_id;
    return jsonb_build_object('completed',true);
  end if;
  raise exception 'execution state conflict';
end $$;
revoke all on function public.worker_execution_transition(text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.worker_execution_transition(text,text,text,text,jsonb) to service_role;
notify pgrst, 'reload schema';
