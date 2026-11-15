-- Composable assignment profiles and typed artifact persistence.

alter table public.assignments
  add column if not exists assignment_profile jsonb,
  add column if not exists assignment_profile_version integer not null default 1
    check (assignment_profile_version >= 1);

alter table public.assignments
  drop constraint if exists assignments_assignment_profile_object_check;

alter table public.assignments
  add constraint assignments_assignment_profile_object_check
  check (assignment_profile is null or jsonb_typeof(assignment_profile) = 'object');

create table if not exists public.artifact_documents (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  artifact_type text not null,
  schema_version integer not null default 2 check (schema_version >= 1),
  title text,
  state text not null default 'draft' check (state in ('draft', 'ready', 'submitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, owner_id)
);

create table if not exists public.artifact_blocks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.artifact_documents(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  block_key text not null,
  block_type text not null check (block_type in (
    'rich_text', 'equation', 'graph', 'spreadsheet', 'ledger', 'map', 'code',
    'drawing', 'cad', 'music_notation', 'audio', 'video', 'data_table',
    'design_notebook', 'performance_log', 'procedure_checklist'
  )),
  capability text not null check (capability in (
    'rich_text', 'equation_editor', 'graphing', 'spreadsheet', 'accounting_ledger',
    'map_workspace', 'code_runner', 'drawing_canvas', 'cad_workspace',
    'music_notation', 'audio_review', 'video_review', 'data_lab',
    'design_notebook', 'performance_log', 'procedure_checklist'
  )),
  label text not null,
  position integer not null default 0 check (position >= 0),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  plain_text text not null default '',
  source_anchors jsonb not null default '[]'::jsonb check (jsonb_typeof(source_anchors) = 'array'),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, block_key)
);

create table if not exists public.artifact_revisions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.artifact_blocks(id) on delete cascade,
  document_id uuid not null references public.artifact_documents(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version >= 1),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  plain_text text not null default '',
  source_anchors jsonb not null default '[]'::jsonb check (jsonb_typeof(source_anchors) = 'array'),
  created_at timestamptz not null default now(),
  unique (block_id, version)
);

create table if not exists public.tool_runs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  artifact_block_id uuid references public.artifact_blocks(id) on delete set null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  status text not null check (status in ('queued', 'running', 'completed', 'not_accepted', 'cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_detail text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists artifact_documents_owner_assignment_idx
  on public.artifact_documents (owner_id, assignment_id);
create index if not exists artifact_blocks_document_position_idx
  on public.artifact_blocks (document_id, position, created_at);
create index if not exists artifact_revisions_block_version_idx
  on public.artifact_revisions (block_id, version desc);
create index if not exists tool_runs_assignment_started_idx
  on public.tool_runs (assignment_id, started_at desc);

alter table public.artifact_documents enable row level security;
alter table public.artifact_blocks enable row level security;
alter table public.artifact_revisions enable row level security;
alter table public.tool_runs enable row level security;

create policy artifact_documents_owner_select on public.artifact_documents for select using (owner_id = auth.uid());
create policy artifact_documents_owner_insert on public.artifact_documents for insert with check (owner_id = auth.uid());
create policy artifact_documents_owner_update on public.artifact_documents for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy artifact_documents_owner_delete on public.artifact_documents for delete using (owner_id = auth.uid());

create policy artifact_blocks_owner_select on public.artifact_blocks for select using (owner_id = auth.uid());
create policy artifact_blocks_owner_insert on public.artifact_blocks for insert with check (owner_id = auth.uid());
create policy artifact_blocks_owner_update on public.artifact_blocks for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy artifact_blocks_owner_delete on public.artifact_blocks for delete using (owner_id = auth.uid());

create policy artifact_revisions_owner_select on public.artifact_revisions for select using (owner_id = auth.uid());
create policy artifact_revisions_owner_insert on public.artifact_revisions for insert with check (owner_id = auth.uid());

create policy tool_runs_owner_select on public.tool_runs for select using (owner_id = auth.uid());
create policy tool_runs_owner_insert on public.tool_runs for insert with check (owner_id = auth.uid());
create policy tool_runs_owner_update on public.tool_runs for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

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
security invoker
set search_path = public
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
    or nullif(trim(p_label), '') is null
    or length(p_block_key) > 120
    or length(p_label) > 300
    or p_position < 0
    or jsonb_typeof(p_content) <> 'object'
    or jsonb_typeof(p_source_anchors) <> 'array'
    or length(p_content::text) > 5000000
    or length(coalesce(p_plain_text, '')) > 1000000 then
    raise exception 'Artifact block is not valid.';
  end if;

  insert into public.artifact_documents (
    assignment_id, owner_id, artifact_type, schema_version
  )
  values (p_assignment_id, v_owner_id, p_artifact_type, 2)
  on conflict (assignment_id, owner_id)
  do update set
    artifact_type = excluded.artifact_type,
    schema_version = greatest(public.artifact_documents.schema_version, 2),
    updated_at = now()
  returning id into v_document_id;

  select *
    into v_block
  from public.artifact_blocks
  where document_id = v_document_id
    and block_key = p_block_key
    and owner_id = v_owner_id
  for update;

  if found then
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
      'character_count', length(v_block.plain_text)
    )
  );

  return jsonb_build_object(
    'document_id', v_document_id,
    'block_id', v_block.id,
    'version', v_block.version
  );
end;
$$;

grant execute on function public.save_assignment_artifact_block(
  uuid, text, text, text, text, text, integer, jsonb, text, jsonb
) to authenticated;
