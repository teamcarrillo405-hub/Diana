-- A class-selected voice note is a note first and a capture second. Earlier
-- versions only saved the capture record, which kept it out of course Notes.
-- Only confidence=1 rows are included because those represent an explicit
-- student class choice, not an AI suggestion.

do $$
declare
  capture record;
  note_id uuid;
  note_title text;
begin
  for capture in
    select id, owner_id, suggested_class_id, raw, created_at, updated_at
    from public.inbox_items
    where capture_mode = 'voice'
      and status = 'classified'
      and suggested_class_id is not null
      and suggestion_confidence = 1
      and source_note_id is null
  loop
    note_title := left(
      'Voice note: ' || coalesce(
        nullif(trim(split_part(regexp_replace(capture.raw, '\s+', ' ', 'g'), '.', 1)), ''),
        'Voice note'
      ),
      200
    );

    insert into public.notes (
      owner_id,
      class_id,
      title,
      body_text,
      source,
      created_at,
      updated_at
    ) values (
      capture.owner_id,
      capture.suggested_class_id,
      note_title,
      capture.raw,
      'voice',
      capture.created_at,
      capture.updated_at
    )
    returning id into note_id;

    update public.inbox_items
    set source_note_id = note_id
    where id = capture.id;
  end loop;
end
$$;
