create or replace function public.save_assignment_artifact_block(
  p_assignment_id uuid,
  p_artifact_type text,
  p_block_key text,
  p_block_type text,
  p_capability text,
  p_label text,
  p_position integer,
  p_content jsonb,
  p_plain_text text,
  p_source_anchors jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_id uuid := auth.uid();
  v_document_id uuid;
  v_block public.artifact_blocks%rowtype;
begin
  if v_owner_id is null then
    raise exception 'Not signed in.';
  end if;
  if not exists (
    select 1 from public.assignments
    where id = p_assignment_id and owner_id = v_owner_id
  ) then
    raise exception 'Assignment not found.';
  end if;
  if nullif(trim(p_artifact_type), '') is null
    or nullif(trim(p_block_key), '') is null
    or nullif(trim(p_block_type), '') is null
    or nullif(trim(p_capability), '') is null
    or nullif(trim(p_label), '') is null
    or length(p_artifact_type) > 100
    or length(p_block_key) > 120
    or length(p_block_type) > 100
    or length(p_capability) > 100
    or length(p_label) > 300
    or p_position < 0
    or p_position > 1000
    or p_content is null
    or p_source_anchors is null
    or jsonb_typeof(p_content) <> 'object'
    or jsonb_typeof(p_source_anchors) <> 'array'
    or octet_length(convert_to(p_content::text, 'UTF8')) > 2000000
    or octet_length(convert_to(coalesce(p_plain_text, ''), 'UTF8')) > 1000000 then
    raise exception 'Artifact block is not valid.';
  end if;

  if jsonb_array_length(p_source_anchors) > 12
    or octet_length(convert_to(p_source_anchors::text, 'UTF8')) > 16384 then
    raise exception 'Artifact source anchors exceed their persistence limits.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_source_anchors) as anchor(value)
    where jsonb_typeof(anchor.value) <> 'object'
      or not (anchor.value ? 'sourceId')
      or jsonb_typeof(anchor.value -> 'sourceId') <> 'string'
      or (anchor.value ->> 'sourceId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (
        anchor.value ? 'location'
        and jsonb_typeof(anchor.value -> 'location') not in ('string', 'null')
      )
      or octet_length(convert_to(coalesce(anchor.value ->> 'location', ''), 'UTF8')) > 500
  ) then
    raise exception 'Artifact source anchors are not valid.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_source_anchors) as anchor(value)
    where not exists (
      select 1
      from public.assignment_sources source
      where source.id::text = lower(anchor.value ->> 'sourceId')
        and source.assignment_id = p_assignment_id
        and source.owner_id = v_owner_id
    )
  ) then
    raise exception 'Artifact source anchor does not belong to this assignment.';
  end if;

  insert into public.artifact_documents (
    assignment_id, owner_id, artifact_type, schema_version
  )
  values (p_assignment_id, v_owner_id, p_artifact_type, 3)
  on conflict (assignment_id, owner_id)
  do update set
    artifact_type = excluded.artifact_type,
    schema_version = greatest(public.artifact_documents.schema_version, 3),
    updated_at = case
      when public.artifact_documents.artifact_type is distinct from excluded.artifact_type
        or public.artifact_documents.schema_version < 3
        then now()
      else public.artifact_documents.updated_at
    end
  returning id into v_document_id;

  select *
    into v_block
  from public.artifact_blocks
  where document_id = v_document_id
    and block_key = p_block_key
    and owner_id = v_owner_id
  for update;

  if found then
    if v_block.block_type is not distinct from p_block_type
      and v_block.capability is not distinct from p_capability
      and v_block.label is not distinct from p_label
      and v_block.position is not distinct from p_position
      and v_block.content is not distinct from p_content
      and v_block.plain_text is not distinct from coalesce(p_plain_text, '')
      and v_block.source_anchors is not distinct from p_source_anchors then
      return jsonb_build_object(
        'document_id', v_document_id,
        'block_id', v_block.id,
        'version', v_block.version
      );
    end if;

    update public.artifact_blocks
    set block_type = p_block_type,
        capability = p_capability,
        label = p_label,
        position = p_position,
        content = p_content,
        plain_text = coalesce(p_plain_text, ''),
        source_anchors = p_source_anchors,
        version = v_block.version + 1,
        updated_at = now()
    where id = v_block.id
    returning * into v_block;
  else
    if (
      select count(*)
      from public.artifact_blocks
      where document_id = v_document_id
        and owner_id = v_owner_id
    ) >= 64 then
      raise exception 'Assignment artifact block limit reached.';
    end if;

    insert into public.artifact_blocks (
      document_id, assignment_id, owner_id, block_key, block_type, capability,
      label, position, content, plain_text, source_anchors
    )
    values (
      v_document_id, p_assignment_id, v_owner_id, p_block_key, p_block_type,
      p_capability, p_label, p_position, p_content, coalesce(p_plain_text, ''),
      p_source_anchors
    )
    returning * into v_block;
  end if;

  insert into public.artifact_revisions (
    block_id, document_id, assignment_id, owner_id, version, content, plain_text, source_anchors
  )
  values (
    v_block.id, v_document_id, p_assignment_id, v_owner_id, v_block.version,
    v_block.content, v_block.plain_text, v_block.source_anchors
  );

  insert into public.authorship_log (owner_id, assignment_id, actor, event_type, payload)
  values (
    v_owner_id,
    p_assignment_id,
    'student',
    'artifact_block_saved',
    jsonb_build_object(
      'block_id', v_block.id,
      'block_key', v_block.block_key,
      'block_type', v_block.block_type,
      'capability', v_block.capability,
      'version', v_block.version,
      'character_count', length(v_block.plain_text),
      'byte_count', octet_length(convert_to(v_block.plain_text, 'UTF8'))
    )
  );

  return jsonb_build_object(
    'document_id', v_document_id,
    'block_id', v_block.id,
    'version', v_block.version
  );
end;
$$;

revoke all on function public.save_assignment_artifact_block(
  uuid, text, text, text, text, text, integer, jsonb, text, jsonb
) from public, anon, authenticated;

grant execute on function public.save_assignment_artifact_block(
  uuid, text, text, text, text, text, integer, jsonb, text, jsonb
) to authenticated;
