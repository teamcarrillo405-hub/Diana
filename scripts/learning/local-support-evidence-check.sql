-- Synthetic QA evidence isolation; all writes roll back.
begin;
set local statement_timeout='20s';
do $$
declare actor uuid:='ad37c468-67f5-4b5f-9e28-b5e947a4075c'; assignment uuid:='0a56fa43-3e0a-4fc1-9f43-dc65c529f080'; course uuid:='6873b241-a111-432f-ac43-ad6a2738808b';
  source_version text; problem text:='local-help-fixture-'||gen_random_uuid()::text; session jsonb; state jsonb; result jsonb; record_id uuid:=gen_random_uuid();
begin
  if not exists(select 1 from public.assignments where id=assignment and owner_id=actor and class_id=course) then raise exception 'Synthetic QA scope unavailable'; end if;
  select id into source_version from public.learning_documents where owner_id=actor and assignment_id=assignment limit 1;
  if source_version is null then raise exception 'Prepare the synthetic QA source first'; end if;
  insert into public.learning_exercises(id,owner_id,assignment_id,version_id,skill_id,prompt,specification,reviewed)
    values(problem,actor,assignment,source_version,'math.linear_equations','Synthetic fixture: 2x=4','{"kind":"equation_value","equation":"2x=4","variable":"x","solutionSetComplete":false}',true);
  session:=public.learning_start_independent(actor,assignment,problem);
  perform set_config('request.jwt.claim.sub',actor::text,true);
  state:=jsonb_build_object('schemaVersion','problem-state-v1','id',record_id,'revision',1,'supportCount',1,'exerciseVersionId',source_version,
    'scope',jsonb_build_object('classId',course,'assignmentId',assignment,'exerciseId',problem),'observations','[]'::jsonb);
  perform public.learning_save_problem(record_id,course,assignment,problem,0,gen_random_uuid(),state);
  begin
    perform public.learning_start_independent(actor,assignment,problem);
    raise exception 'Assisted work opened a fresh independent session';
  exception when unique_violation then null; end;
  result:=public.learning_record_attempt(actor,jsonb_build_object('id',gen_random_uuid(),'assignmentId',assignment,'problemId',problem,'revision',1,
    'sessionId',session->>'id','assistance','independent','confirmed',true,'modality','typed','subject','math'),repeat('a',64),'{"status":"supported","outcome":"supported","eligibleForKnowledge":true}');
  if result->'assessment'->>'eligibleForKnowledge'<>'false' then raise exception 'Local help became independent mastery evidence'; end if;
end $$;
rollback;
select 'local_help_excluded_from_independent_learning_evidence_all_writes_rolled_back' as verification;
