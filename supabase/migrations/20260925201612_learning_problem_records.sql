-- Student-owned multimodal practice notebooks. These rows are not mastery or
-- educator-review evidence. Responses are checked again from server templates.
begin;
create table public.learning_problem_records (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  exercise_id text not null check(length(exercise_id) between 1 and 200),
  current_revision integer not null check(current_revision between 1 and 10000),
  updated_at timestamptz not null default now(),
  unique(id,owner_id)
);
create table public.learning_problem_revisions (
  record_id uuid not null,
  owner_id uuid not null,
  revision integer not null check(revision between 1 and 10000),
  request_id uuid not null,
  state jsonb not null check(jsonb_typeof(state)='object' and octet_length(state::text)<=400000),
  created_at timestamptz not null default now(),
  primary key(record_id,revision),
  unique(owner_id,request_id),
  foreign key(record_id,owner_id) references public.learning_problem_records(id,owner_id) on delete cascade
);
create index learning_problem_records_class on public.learning_problem_records(owner_id,class_id,updated_at desc);
alter table public.learning_problem_records enable row level security;
alter table public.learning_problem_revisions enable row level security;
create policy learning_problem_records_read on public.learning_problem_records for select to authenticated using(owner_id=auth.uid());
create policy learning_problem_revisions_read on public.learning_problem_revisions for select to authenticated using(owner_id=auth.uid());
revoke all on public.learning_problem_records,public.learning_problem_revisions from anon,authenticated;
grant select on public.learning_problem_records,public.learning_problem_revisions to authenticated;

-- Browser/PDF offsets count UTF-16 code units; Postgres length counts characters.
create function public.learning_utf16_span(p_text text,p_start integer,p_end integer)
returns text language plpgsql immutable strict set search_path=pg_catalog,pg_temp as $$
declare position integer:=0; width integer; symbol text; extracted text:='';
begin
  if p_start<0 or p_end<=p_start then return null; end if;
  for symbol in select regexp_split_to_table(p_text,'') loop
    if symbol='' then continue; end if;
    width:=case when ascii(symbol)>65535 then 2 else 1 end;
    if position<p_start and position+width>p_start then return null; end if;
    if position>=p_start then
      if position+width>p_end then return null; end if;
      extracted:=extracted||symbol;
    end if;
    position:=position+width;
    if position=p_end then return extracted; end if;
  end loop;
  return null;
end $$;
revoke all on function public.learning_utf16_span(text,integer,integer) from public,anon,authenticated;

create function public.learning_save_problem(
  p_id uuid,p_class uuid,p_assignment uuid,p_exercise text,p_expected integer,p_request uuid,p_state jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); current_record public.learning_problem_records; replay public.learning_problem_revisions;
  observation jsonb; locator jsonb; document public.learning_documents; source_page jsonb; region jsonb; span_start integer; span_end integer; source_text text;
begin
  if actor is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.classes where id=p_class and owner_id=actor) then raise exception 'scope_unavailable'; end if;
  if p_assignment is not null and not exists(select 1 from public.assignments where id=p_assignment and owner_id=actor and class_id=p_class) then raise exception 'scope_unavailable'; end if;
  if p_expected is null or p_expected<0 or p_expected>=10000 or p_request is null or p_id is null or p_exercise is null or length(p_exercise) not between 1 and 200 then raise exception 'invalid_revision'; end if;
  if p_state is null or jsonb_typeof(p_state) is distinct from 'object'
    or octet_length(p_state::text)>400000
    or p_state->>'schemaVersion' is distinct from 'problem-state-v1'
    or p_state->>'id' is distinct from p_id::text
    or p_state->>'revision' is distinct from (p_expected+1)::text
    or p_state#>>'{scope,classId}' is distinct from p_class::text
    or p_state#>>'{scope,assignmentId}' is distinct from p_assignment::text
    or p_state#>>'{scope,exerciseId}' is distinct from p_exercise
    or jsonb_typeof(p_state->'observations') is distinct from 'array'
  then raise exception 'invalid_state'; end if;
  if jsonb_array_length(p_state->'observations')>80 then raise exception 'invalid_state'; end if;
  -- The RPC is callable by a signed-in student. Do not rely only on HTTP checks.
  for observation in select value from jsonb_array_elements(p_state->'observations') loop
    locator:=observation->'source';
    if locator is not null and locator<>'null'::jsonb then
      select * into document from public.learning_documents where id=locator->>'versionId' and owner_id=actor
        and (case when p_assignment is null then class_id=p_class else assignment_id=p_assignment end);
      if not found then raise exception 'source_unavailable'; end if;
      select value into source_page from jsonb_array_elements(document.pages) where value->>'page'=locator->>'page';
      span_start:=(locator->>'startOffset')::integer; span_end:=(locator->>'endOffset')::integer;
      source_text:=public.learning_utf16_span(source_page->>'text',span_start,span_end);
      if source_page is null or source_text is null then raise exception 'source_span_unavailable'; end if;
      if locator ? 'assetHash' and locator->>'assetHash' is distinct from document.metadata->>'sourceAssetHash' then raise exception 'source_asset_changed'; end if;
      if locator ? 'regionId' then
        select value into region from jsonb_array_elements(coalesce(source_page->'regions','[]'::jsonb)) where value->>'id'=locator->>'regionId'
          and (value->>'startOffset')::integer<=span_start and (value->>'endOffset')::integer>=span_end;
        if region is null then raise exception 'source_region_changed'; end if;
      end if;
      if observation->>'provenance'='native_pdf' and (source_page->>'interpretation' is distinct from 'original'
        or observation->>'text' is distinct from source_text) then raise exception 'source_text_changed'; end if;
    elsif observation->>'modality'='pdf_region' or observation->>'provenance'='native_pdf' then
      raise exception 'source_unavailable';
    end if;
  end loop;
  -- Serializes first-create and updates alike. Collisions only serialize extra work.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,913));
  select * into replay from public.learning_problem_revisions where owner_id=actor and request_id=p_request;
  if found then
    if replay.record_id<>p_id or replay.state<>p_state then raise exception 'request_conflict'; end if;
    return jsonb_build_object('revision',replay.revision,'replayed',true);
  end if;
  select * into current_record from public.learning_problem_records where id=p_id for update;
  if found then
    if current_record.owner_id<>actor or current_record.class_id<>p_class or current_record.assignment_id is distinct from p_assignment or current_record.exercise_id<>p_exercise then raise exception 'scope_unavailable'; end if;
    if current_record.current_revision<>p_expected then raise exception 'revision_conflict'; end if;
    update public.learning_problem_records set current_revision=p_expected+1,updated_at=now() where id=p_id;
  else
    if p_expected<>0 then raise exception 'revision_conflict'; end if;
    insert into public.learning_problem_records(id,owner_id,class_id,assignment_id,exercise_id,current_revision) values(p_id,actor,p_class,p_assignment,p_exercise,1);
  end if;
  insert into public.learning_problem_revisions(record_id,owner_id,revision,request_id,state) values(p_id,actor,p_expected+1,p_request,p_state);
  return jsonb_build_object('revision',p_expected+1,'replayed',false);
end $$;
revoke all on function public.learning_save_problem(uuid,uuid,uuid,text,integer,uuid,jsonb) from public,anon;
grant execute on function public.learning_save_problem(uuid,uuid,uuid,text,integer,uuid,jsonb) to authenticated;
commit;
