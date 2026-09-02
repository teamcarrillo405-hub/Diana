begin;

-- Grade delivery must target a provider identity that was verified from the
-- connected course roster. Browser input is never authoritative for this map.
create table if not exists public.course_mode_lms_student_links (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('canvas', 'google_classroom')),
  connection_id uuid not null references public.lms_connections(id) on delete cascade,
  identity_connection_id uuid not null references public.lms_connections(id) on delete cascade,
  external_student_id text not null
    check (char_length(btrim(external_student_id)) between 1 and 300),
  verification_status text not null default 'verified'
    check (verification_status in ('verified', 'revoked')),
  verification_source text not null
    check (verification_source in (
      'provider_roster',
      'provider_profile_readback',
      'staging_fixture'
    )),
  verification_evidence jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(verification_evidence) = 'object'
      and octet_length(verification_evidence::text) <= 16384
    ),
  verified_at timestamptz not null,
  verified_by uuid not null references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, student_id, provider),
  unique (course_id, connection_id, provider, external_student_id),
  check (
    (verification_status = 'verified' and revoked_at is null)
    or (verification_status = 'revoked' and revoked_at is not null)
  )
);

create index if not exists course_mode_lms_student_links_lookup_idx
  on public.course_mode_lms_student_links (
    course_id,
    student_id,
    provider,
    connection_id,
    verification_status
  );

create or replace function private.validate_course_mode_lms_student_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_organization_id uuid;
begin
  if new.external_student_id is distinct from btrim(new.external_student_id) then
    raise exception using errcode = '22023',
      message = 'provider student identifier must be normalized';
  end if;

  select course.organization_id
    into v_course_organization_id
  from public.course_mode_courses course
  join public.course_mode_lms_links link
    on link.course_id = course.id
   and link.provider = new.provider
   and link.connection_id = new.connection_id
  join public.lms_connections connection
    on connection.id = link.connection_id
   and connection.provider = link.provider
  where course.id = new.course_id;

  if not found then
    raise exception using errcode = '23514',
      message = 'provider student link must use the connected course';
  end if;

  if not exists (
    select 1
    from public.lms_connections identity_connection
    where identity_connection.id = new.identity_connection_id
      and identity_connection.owner_id = new.student_id
      and identity_connection.provider = new.provider
      and identity_connection.config ->> 'connection_mode' = 'student'
  ) then
    raise exception using errcode = '23514',
      message = 'provider student link requires the student owned provider connection';
  end if;

  if not exists (
    select 1
    from public.course_mode_enrollments enrollment
    join public.organization_memberships membership
      on membership.id = enrollment.membership_id
    where enrollment.course_id = new.course_id
      and enrollment.enrollment_role = 'student'
      and enrollment.status = 'active'
      and membership.user_id = new.student_id
      and membership.verification_status = 'verified'
  ) then
    raise exception using errcode = '23514',
      message = 'provider student link requires an active verified enrollment';
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = v_course_organization_id
      and membership.user_id = new.verified_by
      and membership.verification_status = 'verified'
      and membership.role in ('district_admin', 'school_admin', 'teacher')
  ) then
    raise exception using errcode = '23514',
      message = 'provider student link requires a verified course authority';
  end if;

  if new.verification_status = 'verified'
     and (
       new.verification_evidence ->> 'provider_verified' is distinct from 'true'
       or new.verification_evidence ->> 'verified_external_student_id'
          is distinct from new.external_student_id
       or new.verification_evidence ->> 'identity_connection_id'
          is distinct from new.identity_connection_id::text
     ) then
    raise exception using errcode = '23514',
      message = 'provider student link requires matching provider evidence';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.validate_course_mode_lms_student_link()
  from public, anon, authenticated, service_role;

drop trigger if exists course_mode_lms_student_links_validate
  on public.course_mode_lms_student_links;
create trigger course_mode_lms_student_links_validate
before insert or update on public.course_mode_lms_student_links
for each row execute function private.validate_course_mode_lms_student_link();

alter table public.course_mode_lms_student_links enable row level security;

drop policy if exists course_mode_lms_student_links_staff_select
  on public.course_mode_lms_student_links;
create policy course_mode_lms_student_links_staff_select
  on public.course_mode_lms_student_links for select
  using (public.can_author_course(course_id));

revoke all on table public.course_mode_lms_student_links
  from public, anon, authenticated;
grant select on table public.course_mode_lms_student_links to authenticated;

-- Only the trusted import service can materialize a student mapping. It receives
-- a provider profile identity and the complete set of course ids observed by the
-- same student-owned OAuth/import connection, then derives every course/link
-- relationship inside the database.
create or replace function public.provision_course_mode_lms_student_links_from_provider(
  p_student_id uuid,
  p_identity_connection_id uuid,
  p_provider text,
  p_external_student_id text,
  p_observed_external_course_ids text[],
  p_observed_at timestamptz,
  p_provider_evidence_digest text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_count integer := 0;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501',
      message = 'provider student identity provisioning requires the service role';
  end if;
  if p_provider not in ('canvas', 'google_classroom')
     or p_external_student_id is distinct from btrim(p_external_student_id)
     or char_length(p_external_student_id) not between 1 and 300
     or p_observed_external_course_ids is null
     or cardinality(p_observed_external_course_ids) not between 1 and 1000
     or p_observed_at < now() - interval '1 hour'
     or p_observed_at > now() + interval '5 minutes'
     or p_provider_evidence_digest !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023',
      message = 'provider student identity evidence is invalid';
  end if;
  if exists (
    select 1
    from unnest(p_observed_external_course_ids) observed_course_id
    where observed_course_id is null
       or observed_course_id is distinct from btrim(observed_course_id)
       or char_length(observed_course_id) not between 1 and 300
  ) then
    raise exception using errcode = '22023',
      message = 'observed provider course identifiers are invalid';
  end if;
  if not exists (
    select 1
    from public.lms_connections identity_connection
    where identity_connection.id = p_identity_connection_id
      and identity_connection.owner_id = p_student_id
      and identity_connection.provider = p_provider
      and identity_connection.config ->> 'connection_mode' = 'student'
  ) then
    raise exception using errcode = '42501',
      message = 'provider identity connection ownership does not match the student';
  end if;

  insert into public.course_mode_lms_student_links (
    course_id,
    student_id,
    provider,
    connection_id,
    identity_connection_id,
    external_student_id,
    verification_status,
    verification_source,
    verification_evidence,
    verified_at,
    verified_by,
    revoked_at
  )
  select
    link.course_id,
    p_student_id,
    p_provider,
    link.connection_id,
    p_identity_connection_id,
    p_external_student_id,
    'verified',
    'provider_profile_readback',
    jsonb_build_object(
      'provider_verified', true,
      'verified_external_student_id', p_external_student_id,
      'identity_connection_id', p_identity_connection_id::text,
      'observed_external_course_id', link.external_course_id,
      'provider_evidence_digest', p_provider_evidence_digest,
      'observed_at', p_observed_at
    ),
    p_observed_at,
    link.created_by,
    null
  from public.course_mode_lms_links link
  join public.course_mode_enrollments enrollment
    on enrollment.course_id = link.course_id
   and enrollment.enrollment_role = 'student'
   and enrollment.status = 'active'
  join public.organization_memberships student_membership
    on student_membership.id = enrollment.membership_id
   and student_membership.user_id = p_student_id
   and student_membership.verification_status = 'verified'
  join public.course_mode_courses course
    on course.id = link.course_id
  join public.organization_memberships course_authority
    on course_authority.organization_id = course.organization_id
   and course_authority.user_id = link.created_by
   and course_authority.verification_status = 'verified'
   and course_authority.role in ('district_admin', 'school_admin', 'teacher')
  where link.provider = p_provider
    and link.external_course_id = any(p_observed_external_course_ids)
  on conflict (course_id, student_id, provider) do update
  set connection_id = excluded.connection_id,
      identity_connection_id = excluded.identity_connection_id,
      external_student_id = excluded.external_student_id,
      verification_status = 'verified',
      verification_source = 'provider_profile_readback',
      verification_evidence = excluded.verification_evidence,
      verified_at = excluded.verified_at,
      verified_by = excluded.verified_by,
      revoked_at = null,
      updated_at = now();

  get diagnostics linked_count = row_count;
  return linked_count;
end;
$$;

revoke all on function public.provision_course_mode_lms_student_links_from_provider(
  uuid, uuid, text, text, text[], timestamptz, text
) from public, anon, authenticated;
grant execute on function public.provision_course_mode_lms_student_links_from_provider(
  uuid, uuid, text, text, text[], timestamptz, text
) to service_role;

-- Replace the client-targeted claim signature. The database derives the
-- provider student identifier from the verified roster link above.
revoke all on function public.claim_lms_grade_sync_receipt(uuid, text, text)
  from public, anon, authenticated, service_role;
drop function if exists public.claim_lms_grade_sync_receipt(uuid, text, text);

create or replace function public.claim_lms_grade_sync_receipt(
  p_attempt_id uuid,
  p_provider text
)
returns table (
  receipt_id uuid,
  receipt_status text,
  claimed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_row record;
  link_row record;
  student_link_row record;
  current_receipt public.lms_grade_sync_receipts%rowtype;
  receipt_exists boolean;
  computed_idempotency_key text;
begin
  if auth.uid() is null or p_provider not in ('canvas', 'google_classroom') then
    return;
  end if;

  select
    attempt.id,
    attempt.student_id,
    attempt.final_score,
    attempt.points_possible,
    attempt.confirmed_by,
    attempt.confirmed_at,
    blueprint.course_id,
    blueprint.external_assignment_id
  into attempt_row
  from public.assessment_attempts attempt
  join public.assessment_blueprints blueprint on blueprint.id = attempt.blueprint_id
  where attempt.id = p_attempt_id
    and attempt.status = 'confirmed'
    and attempt.confirmed_by = auth.uid()
    and attempt.final_score is not null
    and blueprint.external_assignment_id is not null
    and public.can_author_course(blueprint.course_id);
  if not found then return; end if;

  select link.external_course_id, link.connection_id
  into link_row
  from public.course_mode_lms_links link
  where link.course_id = attempt_row.course_id
    and link.provider = p_provider;
  if not found then return; end if;

  select student_link.external_student_id
  into student_link_row
  from public.course_mode_lms_student_links student_link
  where student_link.course_id = attempt_row.course_id
    and student_link.student_id = attempt_row.student_id
    and student_link.provider = p_provider
    and student_link.connection_id = link_row.connection_id
    and student_link.verification_status = 'verified';
  if not found then return; end if;

  computed_idempotency_key := concat(
    attempt_row.id::text,
    ':',
    p_provider,
    ':',
    student_link_row.external_student_id
  );
  perform pg_advisory_xact_lock(hashtextextended(
    concat(
      'lms-grade-sync:',
      attempt_row.course_id::text,
      ':',
      p_provider,
      ':',
      computed_idempotency_key
    ),
    0
  ));

  select *
  into current_receipt
  from public.lms_grade_sync_receipts receipt
  where receipt.course_id = attempt_row.course_id
    and receipt.provider = p_provider
    and receipt.idempotency_key = computed_idempotency_key
  for update;
  receipt_exists := found;

  if receipt_exists
     and current_receipt.status in ('syncing', 'confirmation_pending', 'synced') then
    return query select current_receipt.id, current_receipt.status, false;
    return;
  end if;

  if receipt_exists then
    update public.lms_grade_sync_receipts
    set external_course_id = link_row.external_course_id,
        external_assignment_id = attempt_row.external_assignment_id,
        external_student_id = student_link_row.external_student_id,
        status = 'syncing',
        score = attempt_row.final_score,
        points_possible = attempt_row.points_possible,
        provider_receipt_id = null,
        provider_response = '{}'::jsonb,
        error_detail = null,
        confirmed_by = attempt_row.confirmed_by,
        confirmed_at = attempt_row.confirmed_at,
        synced_at = null
    where id = current_receipt.id
    returning * into current_receipt;
  else
    insert into public.lms_grade_sync_receipts (
      course_id,
      attempt_id,
      provider,
      external_course_id,
      external_assignment_id,
      external_student_id,
      idempotency_key,
      status,
      score,
      points_possible,
      confirmed_by,
      confirmed_at
    ) values (
      attempt_row.course_id,
      attempt_row.id,
      p_provider,
      link_row.external_course_id,
      attempt_row.external_assignment_id,
      student_link_row.external_student_id,
      computed_idempotency_key,
      'syncing',
      attempt_row.final_score,
      attempt_row.points_possible,
      attempt_row.confirmed_by,
      attempt_row.confirmed_at
    )
    returning * into current_receipt;
  end if;

  return query select current_receipt.id, current_receipt.status, true;
end;
$$;

revoke all on function public.claim_lms_grade_sync_receipt(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_lms_grade_sync_receipt(uuid, text)
  to authenticated;

create or replace function private.enforce_lms_grade_student_binding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student_id uuid;
  v_course_id uuid;
  v_connection_id uuid;
begin
  if new.attempt_id is not null then
    select attempt.student_id, blueprint.course_id
      into v_student_id, v_course_id
    from public.assessment_attempts attempt
    join public.assessment_blueprints blueprint on blueprint.id = attempt.blueprint_id
    where attempt.id = new.attempt_id;
  else
    select final_grade.student_id, final_grade.course_id
      into v_student_id, v_course_id
    from public.final_grade_records final_grade
    where final_grade.id = new.final_grade_id;
  end if;

  if not found or v_course_id is distinct from new.course_id then
    raise exception using errcode = '42501',
      message = 'grade receipt is not bound to its Diana student';
  end if;

  select link.connection_id
    into v_connection_id
  from public.course_mode_lms_links link
  where link.course_id = new.course_id
    and link.provider = new.provider;

  if not found or not exists (
    select 1
    from public.course_mode_lms_student_links student_link
    where student_link.course_id = new.course_id
      and student_link.student_id = v_student_id
      and student_link.provider = new.provider
      and student_link.connection_id = v_connection_id
      and student_link.external_student_id = new.external_student_id
      and student_link.verification_status = 'verified'
  ) then
    raise exception using errcode = '42501',
      message = 'grade receipt requires a verified provider student binding';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_lms_grade_student_binding()
  from public, anon, authenticated, service_role;

drop trigger if exists lms_grade_sync_receipts_student_binding_guard
  on public.lms_grade_sync_receipts;
create trigger lms_grade_sync_receipts_student_binding_guard
before insert or update of course_id, attempt_id, final_grade_id, provider, external_student_id
on public.lms_grade_sync_receipts
for each row execute function private.enforce_lms_grade_student_binding();

comment on table public.course_mode_lms_student_links is
  'Service-provisioned provider roster identity bindings. Authenticated users may read verified mappings for courses they author but cannot create or alter them.';
comment on function public.claim_lms_grade_sync_receipt(uuid, text) is
  'Claims a confirmed grade using the provider student identifier from a verified service-provisioned roster binding.';
comment on function public.provision_course_mode_lms_student_links_from_provider(
  uuid, uuid, text, text, text[], timestamptz, text
) is
  'Service-only provisioning from provider profile readback and course ids observed by the same student-owned import connection.';

commit;
