-- ISOLATED DATABASE ONLY. Run after test-recognition-schema-setup.sql,
-- test-response-review-schema-setup.sql, the unmodified problem-record migration,
-- and 20260926110000_learning_response_review_delivery.sql.
-- The unsealed prototype must be entirely inaccessible to authenticated callers.
begin;
do $$ declare exposed integer; total integer; begin
 select count(*),count(*) filter(where has_function_privilege('authenticated',p.oid,'EXECUTE')
   or has_function_privilege('anon',p.oid,'EXECUTE')) into total,exposed
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in (
   'learning_response_reviewer_current','learning_request_response_review',
   'learning_revoke_response_review','learning_response_review_access',
   'learning_list_response_reviews','learning_submit_response_rating',
   'learning_response_review_ratings','learning_response_review_registry');
 if total<>8 or exposed<>0 then raise exception 'unsealed review RPC privilege exposure: %, %',total,exposed; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ begin
 begin
   perform public.learning_request_response_review('00000000-0000-4000-8000-000000000041',1,
     array['00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000022']::uuid[]);
   raise exception 'direct request RPC was callable';
 exception when others then if position('permission denied' in sqlerrm)=0 then raise; end if; end;
 begin
   perform public.learning_response_review_access('00000000-0000-4000-8000-000000000051');
   raise exception 'direct packet RPC was callable';
 exception when others then if position('permission denied' in sqlerrm)=0 then raise; end if; end;
 begin
   perform public.learning_submit_response_rating('00000000-0000-4000-8000-000000000051','english','{}'::jsonb);
   raise exception 'direct rating RPC was callable';
 exception when others then if position('permission denied' in sqlerrm)=0 then raise; end if; end;
end $$;
rollback;
