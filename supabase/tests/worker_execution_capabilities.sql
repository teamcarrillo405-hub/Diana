-- Disposable database only. Both production migrations run verbatim, all rolled back.
\set ON_ERROR_STOP on
begin;
do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; end $$;
do $$ begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end $$;
do $$ begin if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if; end $$;
create schema auth;
create function auth.role() returns text language sql as $$ select current_setting('request.jwt.claim.role',true) $$;
create table auth.users(id uuid primary key);
create table public.profiles(user_id uuid primary key, consent_ai boolean, age_bracket text,
 daily_token_budget integer default 100000, tokens_used_today integer default 0, token_reset_date date default current_date);
create table public.classes(id uuid primary key,owner_id uuid,ai_mode text);
create table public.assignments(id uuid primary key,owner_id uuid,class_id uuid,ai_mode_override text);
create table public.data_deletion_requests(owner_id uuid,status text);
create table public.authorship_log(owner_id uuid,assignment_id uuid,actor text,event_type text,payload jsonb);
create table public.ai_interactions(owner_id uuid,assignment_id uuid,feature text,model text,prompt_summary text,tokens_used integer);
create table public.worker_jobs(trace_id text primary key,owner_id uuid,tenant_id text,feature text,queue_name text,queue_mode text,
 status text,locked_by text,locked_until timestamptz,locked_at timestamptz,attempts integer,payload jsonb,constraints jsonb,
 result_payload jsonb,error_summary text,completed_at timestamptz);
\ir ../migrations/20260731170000_ai_token_budget_reservations.sql
\ir ../migrations/20260929035711_worker_execution_capabilities.sql
insert into auth.users values('11111111-1111-4111-8111-111111111111');
insert into profiles(user_id,consent_ai,age_bracket) select id,true,'adult' from auth.users;
insert into classes values('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','green');
insert into assignments values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',null);
create function pg_temp.job(t text) returns void language sql as $$
 insert into public.worker_jobs values(t,'11111111-1111-4111-8111-111111111111','personal:owner','diana.voice_candidate','student-ai-candidate','managed_queue',
 'running','worker-a',clock_timestamp()+interval '2 minutes',clock_timestamp(),1,
 '{"input":{"transcript":"Help me begin.","assignmentId":"33333333-3333-4333-8333-333333333333"}}','{}','{}',null,null);
$$;
create function pg_temp.go(a text,t text,d jsonb default '{}') returns jsonb language sql as $$
 select public.worker_execution_transition(a,t,'worker-a',repeat('a',64),d);
$$;
create function pg_temp.deny(q text) returns void language plpgsql as $$ begin
 begin execute q; exception when others then return; end;
 raise exception 'Expected denial: %',q;
end $$;
create function pg_temp.authorize(t text) returns void language plpgsql as $$ begin
 perform pg_temp.go('issue',t); perform pg_temp.go('begin',t); perform pg_temp.go('dispatch',t,'{"requestedTokens":100}');
end $$;
do $$ begin
 if has_table_privilege('authenticated','public.worker_executions','select') or has_table_privilege('anon','public.worker_executions','select')
 or has_function_privilege('authenticated','public.worker_execution_transition(text,text,text,text,jsonb)','execute')
 or has_function_privilege('anon','public.worker_execution_transition(text,text,text,text,jsonb)','execute') then raise exception 'ACL bypass'; end if;
 if not has_function_privilege('service_role','public.worker_execution_transition(text,text,text,text,jsonb)','execute') then raise exception 'service denied'; end if;
end $$;
select pg_temp.job('denied'); select pg_temp.go('issue','denied'); select pg_temp.go('reject','denied');
do $$ begin if (select status from worker_jobs where trace_id='denied')<>'error' then raise exception 'Claim denial not recorded'; end if; end $$;
select pg_temp.job('stale-denial'); select pg_temp.go('issue','stale-denial');
update worker_jobs set attempts=2 where trace_id='stale-denial';
select pg_temp.deny($q$select pg_temp.go('reject','stale-denial')$q$);
do $$ begin if (select status from worker_jobs where trace_id='stale-denial')<>'running' then raise exception 'Stale claim denial cancelled new lease'; end if; end $$;
select pg_temp.job('success'); select pg_temp.authorize('success');
select pg_temp.deny($q$select pg_temp.go('dispatch','success','{"requestedTokens":100}')$q$);
select pg_temp.deny($q$select public.worker_execution_transition('begin_complete','success','other-worker',repeat('a',64),jsonb_build_object('completionHash',repeat('b',64)))$q$);
select pg_temp.deny($q$select public.worker_execution_transition('begin_complete','success','worker-a',repeat('c',64),jsonb_build_object('completionHash',repeat('b',64)))$q$);
select pg_temp.go('begin_complete','success',jsonb_build_object('completionHash',repeat('b',64)));
select pg_temp.deny($q$select pg_temp.go('begin_complete','success',jsonb_build_object('completionHash',repeat('b',64)))$q$);
select pg_temp.go('finish','success',jsonb_build_object('completionHash',repeat('b',64),'result',jsonb_build_object('status','succeeded','response','What do you know?','model','local-model')));
select pg_temp.go('begin_complete','success',jsonb_build_object('completionHash',repeat('b',64)));
select pg_temp.deny($q$select pg_temp.go('begin_complete','success',jsonb_build_object('completionHash',repeat('c',64)))$q$);
do $$ begin
 if (select count(*) from authorship_log)<>1 or (select count(*) from ai_interactions)<>1
 or (select charged_tokens from ai_token_budget_reservations where idempotency_key='worker:success')<>100
 or (select status from worker_jobs where trace_id='success')<>'succeeded' then raise exception 'success/audit/accounting mismatch'; end if;
end $$;
select pg_temp.job('lease'); select pg_temp.authorize('lease');
update worker_jobs set attempts=2,locked_until=clock_timestamp()+interval '3 minutes' where trace_id='lease';
select pg_temp.deny($q$select pg_temp.go('begin_complete','lease',jsonb_build_object('completionHash',repeat('b',64)))$q$);
select pg_temp.deny($q$select pg_temp.go('issue','lease')$q$);
select pg_temp.job('reclaim'); select pg_temp.go('issue','reclaim'); select pg_temp.go('begin','reclaim');
update worker_executions set expires_at=clock_timestamp()-interval '1 second' where trace_id='reclaim';
update worker_jobs set attempts=2,locked_until=clock_timestamp()+interval '2 minutes' where trace_id='reclaim';
select public.worker_execution_transition('issue','reclaim','worker-a',repeat('d',64));
select pg_temp.deny($q$select pg_temp.go('begin','reclaim')$q$);
select public.worker_execution_transition('begin','reclaim','worker-a',repeat('d',64));
select public.worker_execution_transition('dispatch','reclaim','worker-a',repeat('d',64),'{"requestedTokens":100}');
select pg_temp.job('expire'); select pg_temp.go('issue','expire');
update worker_jobs set locked_until=clock_timestamp()-interval '1 second' where trace_id='expire';
select pg_temp.deny($q$select pg_temp.go('begin','expire')$q$);
select pg_temp.job('mutate'); select pg_temp.go('issue','mutate');
update worker_jobs set payload='{"input":{"transcript":"changed"}}' where trace_id='mutate';
select pg_temp.deny($q$select pg_temp.go('begin','mutate')$q$);
select pg_temp.job('consent'); select pg_temp.go('issue','consent'); select pg_temp.go('begin','consent');
update profiles set consent_ai=false;
select pg_temp.deny($q$select pg_temp.go('dispatch','consent','{"requestedTokens":100}')$q$);
update profiles set consent_ai=true;
update classes set ai_mode='red';
select pg_temp.deny($q$select pg_temp.go('dispatch','consent','{"requestedTokens":100}')$q$);
update classes set ai_mode='green';
insert into data_deletion_requests values('11111111-1111-4111-8111-111111111111','requested');
select pg_temp.deny($q$select pg_temp.go('dispatch','consent','{"requestedTokens":100}')$q$);
delete from data_deletion_requests;
update profiles set daily_token_budget=tokens_used_today;
select pg_temp.deny($q$select pg_temp.go('dispatch','consent','{"requestedTokens":100}')$q$);
update profiles set daily_token_budget=100000;
do $$ begin if exists(select 1 from ai_token_budget_reservations where idempotency_key='worker:consent') then raise exception 'Denied dispatch reserved'; end if; end $$;
select pg_temp.job('atomic'); select pg_temp.authorize('atomic');
select pg_temp.go('begin_complete','atomic',jsonb_build_object('completionHash',repeat('b',64)));
create function pg_temp.fail_audit() returns trigger language plpgsql as $$ begin raise exception 'audit unavailable'; end $$;
create trigger reject_audit before insert on authorship_log for each row execute function pg_temp.fail_audit();
select pg_temp.deny($q$select pg_temp.go('finish','atomic',jsonb_build_object('completionHash',repeat('b',64),'result',jsonb_build_object('status','succeeded','response','What do you know?','model','local-model')))$q$);
do $$ begin if (select status from worker_jobs where trace_id='atomic')<>'running' or
 (select status from ai_token_budget_reservations where idempotency_key='worker:atomic')<>'active' then raise exception 'Partial completion committed'; end if; end $$;
drop trigger reject_audit on authorship_log;
update classes set ai_mode='red';
select pg_temp.deny($q$select pg_temp.go('finish','atomic',jsonb_build_object('completionHash',repeat('b',64),'result',jsonb_build_object('status','succeeded','response','What do you know?','model','local-model')))$q$);
select pg_temp.go('finish','atomic',jsonb_build_object('completionHash',repeat('b',64),'result',jsonb_build_object('status','error','errorCode','student_eligibility_denied')));
do $$ begin if (select result_payload ? 'response' from worker_jobs where trace_id='atomic') or
 (select charged_tokens from ai_token_budget_reservations where idempotency_key='worker:atomic')<>100 then raise exception 'Error settlement/output mismatch'; end if;
 raise notice 'PASS real budget RPCs, ACL, lease/attempt fencing, single dispatch, consent/class/deletion/budget denial, exact replay, atomic audit/settlement, no unsafe error output'; end $$;
rollback;
