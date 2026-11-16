-- Run on the disposable migration-replay database. All fixtures are rolled back.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000911', 'authenticated', 'authenticated', 'capture-owner-a@example.invalid', '', now(), '{}'::jsonb, '{"date_of_birth":"1990-01-01"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000912', 'authenticated', 'authenticated', 'capture-owner-b@example.invalid', '', now(), '{}'::jsonb, '{"date_of_birth":"1990-01-01"}'::jsonb, now(), now());

insert into public.classes (id, owner_id, name)
values
  ('00000000-0000-4000-8000-000000000921', '00000000-0000-4000-8000-000000000911', 'Biology'),
  ('00000000-0000-4000-8000-000000000922', '00000000-0000-4000-8000-000000000912', 'Geometry');

insert into public.inbox_items (id, owner_id, raw, capture_mode, status, photo_storage_key)
values
  ('00000000-0000-4000-8000-000000000931', '00000000-0000-4000-8000-000000000911', 'Summarize the lab observations.', 'text', 'unclassified', null),
  ('00000000-0000-4000-8000-000000000932', '00000000-0000-4000-8000-000000000911', 'Set this capture aside.', 'voice', 'classified', null),
  ('00000000-0000-4000-8000-000000000933', '00000000-0000-4000-8000-000000000911', 'Biology photo', 'photo', 'unclassified', '00000000-0000-4000-8000-000000000911/quick-add/lab.png'),
  ('00000000-0000-4000-8000-000000000934', '00000000-0000-4000-8000-000000000911', 'Force source write rejection', 'text', 'unclassified', null);

alter table public.assignment_sources add constraint test_work_capture_rollback
  check (extracted_text is distinct from 'Force source write rejection') not valid;

-- Reproduce the authenticated API grants present in the linked project.
-- Fresh disposable Supabase projects omit those default public-table grants.
grant select on public.inbox_items, public.classes, storage.objects to authenticated;
grant update (status, assignment_id, updated_at) on public.inbox_items to authenticated;
grant update (id) on public.classes to authenticated;
grant insert on public.assignments, public.assignment_sources to authenticated;
grant select (id, owner_id) on public.assignments to authenticated;
grant select (id) on public.assignment_sources to authenticated;

do $permissions$
begin
  if has_function_privilege('anon', 'public.confirm_work_capture(uuid,uuid,text,text,timestamptz,text)', 'execute')
    or has_function_privilege('anon', 'public.dismiss_work_capture(uuid)', 'execute')
    or not has_function_privilege('authenticated', 'public.confirm_work_capture(uuid,uuid,text,text,timestamptz,text)', 'execute')
    or not has_function_privilege('authenticated', 'public.dismiss_work_capture(uuid)', 'execute') then
    raise exception 'Capture action privileges are incorrect';
  end if;
end;
$permissions$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000912', true);
do $isolation$
declare capture_id constant uuid := '00000000-0000-4000-8000-000000000931';
begin
  if public.confirm_work_capture(capture_id, '00000000-0000-4000-8000-000000000922', 'Foreign capture', 'other', null)->>'status' is distinct from 'unavailable'
    or public.dismiss_work_capture(capture_id)->>'status' is distinct from 'unavailable' then
    raise exception 'A second student can change this capture';
  end if;
end;
$isolation$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000911', true);
do $conversion$
declare
  text_id constant uuid := '00000000-0000-4000-8000-000000000931';
  dismiss_id constant uuid := '00000000-0000-4000-8000-000000000932';
  photo_id constant uuid := '00000000-0000-4000-8000-000000000933';
  rejected_id constant uuid := '00000000-0000-4000-8000-000000000934';
  class_id constant uuid := '00000000-0000-4000-8000-000000000921';
  result jsonb;
  rejected boolean := false;
begin
  if public.confirm_work_capture(text_id, '00000000-0000-4000-8000-000000000922', 'Foreign class', 'other', null)->>'status' is distinct from 'class' then
    raise exception 'The owner can convert to another student’s class';
  end if;
  result := public.confirm_work_capture(text_id, class_id, 'Lab report', 'lab', '2030-01-15T19:30:00Z');
  if result->>'status' is distinct from 'converted' or (result->>'assignmentId')::uuid is distinct from text_id then
    raise exception 'Text capture did not return the new assignment';
  end if;
  result := public.confirm_work_capture(text_id, class_id, 'New title from a retry', 'essay', null);
  if (result->>'assignmentId')::uuid is distinct from text_id or public.dismiss_work_capture(text_id)->>'status' is distinct from 'converted' then
    raise exception 'Retry or set-aside changed a committed conversion';
  end if;
  if public.dismiss_work_capture(dismiss_id)->>'status' is distinct from 'dismissed'
    or public.confirm_work_capture(dismiss_id, class_id, 'Already set aside', 'other', null)->>'status' is distinct from 'dismissed' then
    raise exception 'Set aside did not win before confirmation';
  end if;
  if public.confirm_work_capture(photo_id, class_id, 'Lab diagram', 'lab', null, 'image/png')->>'status' is distinct from 'photo' then
    raise exception 'Photo converted without a staged original';
  end if;
  begin
    perform public.confirm_work_capture(rejected_id, class_id, 'Rejected material', 'other', null);
  exception when check_violation then rejected := true;
  end;
  if not rejected then
    raise exception 'Expected the source fixture to reject insertion';
  end if;
end;
$conversion$;

-- Emulate an in-flight classifier finishing after the student’s decision.
reset role;
update public.inbox_items set status = 'classified' where id in (
  '00000000-0000-4000-8000-000000000931', '00000000-0000-4000-8000-000000000932'
);
insert into storage.objects (bucket_id, name, metadata)
values ('note-docs', '00000000-0000-4000-8000-000000000911/assignments/00000000-0000-4000-8000-000000000933/captured-photo.png', '{"mimetype":"image/png"}'::jsonb);

set local role authenticated;
do $photo$
declare result jsonb;
begin
  result := public.confirm_work_capture('00000000-0000-4000-8000-000000000933', '00000000-0000-4000-8000-000000000921', 'Lab diagram', 'lab', null, 'image/png');
  if result->>'status' is distinct from 'converted' or result->>'photoSourceId' is null then
    raise exception 'A staged photo did not become an assignment source';
  end if;
end;
$photo$;

reset role;
do $persisted$
declare
  text_id constant uuid := '00000000-0000-4000-8000-000000000931';
  dismiss_id constant uuid := '00000000-0000-4000-8000-000000000932';
  photo_id constant uuid := '00000000-0000-4000-8000-000000000933';
  rejected_id constant uuid := '00000000-0000-4000-8000-000000000934';
begin
  if not exists (select 1 from public.assignments where id = text_id and title = 'Lab report' and due_at = '2030-01-15T19:30:00Z')
    or (select count(*) from public.assignment_sources where assignment_id = text_id) <> 1
    or not exists (select 1 from public.assignment_sources where assignment_id = text_id and extracted_text = 'Summarize the lab observations.')
    or not exists (select 1 from public.inbox_items where id = text_id and status = 'converted' and assignment_id = text_id) then
    raise exception 'Text capture did not preserve one original assignment and source';
  end if;
  if not exists (select 1 from public.inbox_items where id = dismiss_id and status = 'dismissed' and assignment_id is null)
    or exists (select 1 from public.assignments where id = dismiss_id) then
    raise exception 'Dismissed capture reopened or created an assignment';
  end if;
  if exists (select 1 from public.assignments where id = rejected_id)
    or not exists (select 1 from public.inbox_items where id = rejected_id and status = 'unclassified' and assignment_id is null) then
    raise exception 'Source insertion error left half a conversion';
  end if;
  if not exists (select 1 from public.assignment_sources
    where assignment_id = photo_id and mime_type = 'image/png' and storage_key =
      '00000000-0000-4000-8000-000000000911/assignments/00000000-0000-4000-8000-000000000933/captured-photo.png') then
    raise exception 'Original photo was not linked to its workspace';
  end if;
end;
$persisted$;

rollback;
