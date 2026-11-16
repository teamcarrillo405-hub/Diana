-- A capture can create one assignment. The source and capture state commit together.
create or replace function public.confirm_work_capture(
  p_capture_id uuid,
  p_class_id uuid,
  p_title text,
  p_kind text,
  p_due_at timestamptz,
  p_photo_mime text default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
  capture public.inbox_items%rowtype;
  photo_extension text;
  photo_path text;
  photo_source_id uuid;
begin
  select * into capture
    from public.inbox_items
    where id = p_capture_id and owner_id = student_id
    for update;

  if not found then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if capture.status = 'converted' then
    return jsonb_build_object('status', 'converted', 'assignmentId', capture.assignment_id);
  end if;
  if capture.status = 'dismissed' then
    return jsonb_build_object('status', 'dismissed');
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 160
    or p_kind is null or p_kind not in ('essay','lab','problem_set','presentation','test_prep','reading','other') then
    return jsonb_build_object('status', 'details');
  end if;

  perform id from public.classes
    where id = p_class_id and owner_id = student_id and archived_at is null
    for share;
  if not found then
    return jsonb_build_object('status', 'class');
  end if;

  if capture.capture_mode = 'photo' then
    photo_extension := case p_photo_mime
      when 'image/jpeg' then 'jpg'
      when 'image/png' then 'png'
      when 'image/webp' then 'webp'
      when 'image/gif' then 'gif'
    end;
    photo_path := student_id::text || '/assignments/' || capture.id::text || '/captured-photo.' || photo_extension;
    if capture.photo_storage_key is null
      or not exists (
        select 1 from storage.objects
        where bucket_id = 'note-docs' and name = photo_path
      ) then
      return jsonb_build_object('status', 'photo');
    end if;
  end if;

  insert into public.assignments (id, owner_id, class_id, title, description, kind, due_at, difficulty, reading_load, writing_load, source_import_status)
  values (capture.id, student_id, p_class_id, btrim(p_title), left(capture.raw, 2000), p_kind, p_due_at, 3, 1, 1,
    case when photo_path is null then 'imported' else 'not_started' end);

  if photo_path is not null then
    insert into public.assignment_sources (assignment_id, owner_id, source_type, title, storage_key, mime_type, import_status)
    values (capture.id, student_id, 'upload', 'Captured photo', photo_path, p_photo_mime, 'ready')
    returning id into photo_source_id;
  else
    insert into public.assignment_sources (assignment_id, owner_id, source_type, title, extracted_text, import_status)
    values (capture.id, student_id, 'extracted_text',
      case capture.capture_mode when 'voice' then 'Voice capture' else 'Captured text' end, capture.raw, 'imported');
  end if;

  update public.inbox_items
    set status = 'converted', assignment_id = capture.id, updated_at = now()
    where id = capture.id and owner_id = student_id;

  return jsonb_build_object('status', 'converted', 'assignmentId', capture.id, 'photoSourceId', photo_source_id);
end;
$$;

create or replace function public.dismiss_work_capture(p_capture_id uuid) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  student_id uuid := auth.uid();
  capture public.inbox_items%rowtype;
begin
  select * into capture
    from public.inbox_items
    where id = p_capture_id and owner_id = student_id
    for update;

  if not found then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if capture.status = 'converted' then
    return jsonb_build_object('status', 'converted', 'assignmentId', capture.assignment_id);
  end if;
  if capture.status <> 'dismissed' then
    update public.inbox_items set status = 'dismissed', updated_at = now()
      where id = capture.id and owner_id = student_id;
  end if;

  return jsonb_build_object('status', 'dismissed');
end;
$$;

-- Classification runs asynchronously and can return after the student chooses an outcome.
create or replace function public.keep_work_capture_outcome() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('converted', 'dismissed') and new.status is distinct from old.status then
    return null;
  end if;
  return new;
end;
$$;

create trigger keep_work_capture_outcome
  before update of status on public.inbox_items
  for each row execute function public.keep_work_capture_outcome();

revoke execute on function public.confirm_work_capture(uuid, uuid, text, text, timestamptz, text) from public, anon, service_role;
revoke execute on function public.dismiss_work_capture(uuid) from public, anon, service_role;
grant execute on function public.confirm_work_capture(uuid, uuid, text, text, timestamptz, text) to authenticated;
grant execute on function public.dismiss_work_capture(uuid) to authenticated;
