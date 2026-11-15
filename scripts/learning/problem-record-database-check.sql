-- Existing synthetic QA scope only. Every write is rolled back.
begin;
set local statement_timeout='20s';
do $$ begin
  if not exists(select 1 from public.classes where id='6873b241-a111-432f-ac43-ad6a2738808b' and owner_id='ad37c468-67f5-4b5f-9e28-b5e947a4075c') then raise exception 'Synthetic QA scope unavailable'; end if;
end $$;
select set_config('request.jwt.claim.sub','ad37c468-67f5-4b5f-9e28-b5e947a4075c',true);
set local role authenticated;
do $$
declare fixture_id uuid:=gen_random_uuid(); request_id uuid:=gen_random_uuid(); course uuid:='6873b241-a111-432f-ac43-ad6a2738808b';
  state jsonb; result jsonb; next_state jsonb; source_id text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
begin
  state:=jsonb_build_object('schemaVersion','problem-state-v1','id',fixture_id,'revision',1,'supportCount',0,'exerciseVersionId',null,
    'scope',jsonb_build_object('classId',course,'assignmentId',null,'exerciseId','synthetic-practice'),'observations','[]'::jsonb);
  result:=public.learning_save_problem(fixture_id,course,null,'synthetic-practice',0,request_id,state);
  if result->>'replayed'<>'false' then raise exception 'Create did not save'; end if;
  result:=public.learning_save_problem(fixture_id,course,null,'synthetic-practice',0,request_id,state);
  if result->>'replayed'<>'true' then raise exception 'Replay did not return prior save'; end if;
  if (select count(*) from public.learning_problem_revisions where record_id=fixture_id)<>1 then raise exception 'Replay duplicated data'; end if;
  begin
    perform public.learning_save_problem(fixture_id,course,null,'synthetic-practice',0,gen_random_uuid(),state);
    raise exception 'Stale write accepted';
  exception when others then if sqlerrm<>'revision_conflict' then raise; end if; end;
  begin
    perform public.learning_save_problem(fixture_id,course,null,'synthetic-practice',0,request_id,state||'{"supportCount":1}'::jsonb);
    raise exception 'Altered replay accepted';
  exception when others then if sqlerrm<>'request_conflict' then raise; end if; end;
  if has_table_privilege('authenticated','public.learning_problem_revisions','UPDATE') or has_table_privilege('authenticated','public.learning_problem_revisions','INSERT') then raise exception 'Direct mutable access granted'; end if;
  next_state:=jsonb_set(state,'{revision}','2'::jsonb);
  next_state:=jsonb_set(next_state,'{observations}',jsonb_build_array(jsonb_build_object('id','source','field','prompt','role','problem_statement','modality','pdf_region','provenance','native_pdf','text','private text',
    'source',jsonb_build_object('versionId',repeat('f',64),'page',1,'startOffset',0,'endOffset',12))));
  begin
    perform public.learning_save_problem(fixture_id,course,null,'synthetic-practice',1,gen_random_uuid(),next_state);
    raise exception 'Unavailable source accepted';
  exception when others then if sqlerrm<>'source_unavailable' then raise; end if; end;
  perform public.learning_store_document(jsonb_build_object('version',jsonb_build_object('id',source_id,'ownerId',auth.uid(),'classId',course,'assignmentId','0a56fa43-3e0a-4fc1-9f43-dc65c529f080','documentId','synthetic-problem-source','contentHash',repeat('e',64),'trainingPermission','excluded'),
    'pages',jsonb_build_array(jsonb_build_object('page',1,'pageLabel','1','text','A😀x+2=7','interpretation','original')),'blocks','[]'::jsonb,'chunks','[]'::jsonb));
  next_state:=jsonb_set(next_state,'{observations,0,text}','"x+2=7"'::jsonb);
  next_state:=jsonb_set(next_state,'{observations,0,source}',jsonb_build_object('versionId',source_id,'page',1,'startOffset',3,'endOffset',8));
  result:=public.learning_save_problem(fixture_id,course,null,'synthetic-practice',1,gen_random_uuid(),next_state);
  if result->>'revision'<>'2' then raise exception 'Exact Unicode source rejected'; end if;
  next_state:=jsonb_set(next_state,'{revision}','3'::jsonb);
  next_state:=jsonb_set(next_state,'{observations,0,text}','"x-2=7"'::jsonb);
  begin
    perform public.learning_save_problem(fixture_id,course,null,'synthetic-practice',2,gen_random_uuid(),next_state);
    raise exception 'Forged source quote accepted';
  exception when others then if sqlerrm<>'source_text_changed' then raise; end if; end;
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000999',true);
  if exists(select 1 from public.learning_problem_records where id=fixture_id) or exists(select 1 from public.learning_problem_revisions where record_id=fixture_id) then raise exception 'Cross-owner read'; end if;
  begin
    perform public.learning_save_problem(fixture_id,course,null,'synthetic-practice',2,gen_random_uuid(),next_state);
    raise exception 'Cross-owner write';
  exception when others then if sqlerrm<>'scope_unavailable' then raise; end if; end;
end $$;
rollback;
select 'problem_records_owner_scope_replay_conflicts_unicode_source_checks_passed_all_writes_rolled_back' as verification;
