-- Optional operator-run smoke check using the existing synthetic QA owner/class.
-- All writes target random new notebook IDs and roll back. No auth.users writes,
-- signing-key changes, global failure triggers, provider calls, or money changes.
begin;
set local lock_timeout='2s';
set local statement_timeout='10s';
set local role authenticated;
set local request.jwt.claim.sub='ad37c468-67f5-4b5f-9e28-b5e947a4075c';
do $$
declare
  owner_uuid uuid:='ad37c468-67f5-4b5f-9e28-b5e947a4075c';
  class_uuid uuid:='6873b241-a111-432f-ac43-ad6a2738808b';
  record_uuid uuid:=gen_random_uuid();
  rejected_uuid uuid:=gen_random_uuid();
  exercise text:='course-practice-v2:rollout-smoke:synthetic';
  draft jsonb; response jsonb; saved jsonb;
begin
  if not exists(select 1 from public.classes where id=class_uuid and owner_id=owner_uuid)
    then raise exception 'Expected synthetic QA class is unavailable'; end if;
  response:=jsonb_build_object('id','response','field','response','role','student_step',
    'modality','typed','provenance','student_entered','text','Synthetic rollout check');
  draft:=jsonb_build_object('schemaVersion','problem-state-v1','id',record_uuid,'revision',1,
    'scope',jsonb_build_object('classId',class_uuid,'assignmentId',null,'exerciseId',exercise),
    'observations',jsonb_build_array(response));
  saved:=public.learning_save_problem(record_uuid,class_uuid,null,exercise,0,gen_random_uuid(),draft);
  if saved->>'revision' is distinct from '1' then raise exception 'Typed save failed'; end if;
  -- Browser recognition is a student-reviewed draft, without a signed machine claim.
  response:=response||jsonb_build_object('modality','voice','text','Synthetic voice draft');
  draft:=draft||jsonb_build_object('revision',2,'observations',jsonb_build_array(response));
  saved:=public.learning_save_problem(record_uuid,class_uuid,null,exercise,1,gen_random_uuid(),draft);
  if saved->>'revision' is distinct from '2' then raise exception 'Voice draft save failed'; end if;
  response:=response||jsonb_build_object('provenance','machine_interpretation');
  draft:=draft||jsonb_build_object('id',rejected_uuid,'revision',1,'observations',jsonb_build_array(response));
  begin
    perform public.learning_save_problem(rejected_uuid,class_uuid,null,exercise,0,gen_random_uuid(),draft);
    raise exception 'Unsigned machine claim was accepted';
  exception when others then
    if sqlerrm<>'recognition_proof_required' then raise; end if;
  end;
  if exists(select 1 from public.learning_problem_records where id=rejected_uuid)
    then raise exception 'Rejected save left a parent row'; end if;
end $$;
select 'typed and student-entered voice drafts accepted; unsigned machine claim rejected; transaction will roll back' as result;
rollback;
