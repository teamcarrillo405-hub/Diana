begin;

-- The predecessor migration originally used CREATE TABLE IF NOT EXISTS. On
-- long-lived staging projects the table can predate that migration, so the
-- identity column must be added explicitly instead of assuming the create
-- statement extended an existing table.
alter table public.course_mode_lms_student_links
  add column if not exists identity_connection_id uuid
    references public.lms_connections(id) on delete cascade;

-- Preserve the exact credential connection and provider destination used by a
-- grade claim. Historical receipts are bound only when the complete assignment,
-- course, student, and live provider link agree. Ambiguous historical records
-- remain non-reusable instead of being silently rebound after a relink.
alter table public.lms_grade_sync_receipts
  add column if not exists provider_connection_id uuid,
  add column if not exists canvas_institution_id text,
  add column if not exists canvas_origin text,
  add column if not exists provider_target_fingerprint text;

-- Canvas numeric user ids are tenant-local. Store and verify the canonical
-- institution id and origin alongside every active Canvas identity binding.
alter table public.course_mode_lms_student_links
  add column if not exists canvas_institution_id text,
  add column if not exists canvas_origin text;

-- A provider import can legitimately observe zero active course links. Keep a
-- private, per-student snapshot watermark so that empty snapshot still blocks
-- a delayed older roster from re-verifying revoked identities.
create table if not exists private.course_mode_lms_student_provider_snapshots (
  student_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('canvas', 'google_classroom')),
  observed_at timestamptz not null,
  provider_evidence_digest text not null
    check (provider_evidence_digest ~ '^[a-f0-9]{64}$'),
  identity_connection_id uuid not null references public.lms_connections(id) on delete restrict,
  external_student_id text not null check (
    external_student_id = btrim(external_student_id)
    and char_length(external_student_id) between 1 and 300
  ),
  canvas_institution_id text,
  canvas_origin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, provider),
  check (
    (provider = 'canvas'
      and char_length(btrim(canvas_institution_id)) between 1 and 64
      and canvas_origin = btrim(canvas_origin)
      and canvas_origin like 'https://%'
      and char_length(canvas_origin) between 9 and 300)
    or (provider = 'google_classroom'
      and canvas_institution_id is null
      and canvas_origin is null)
  )
);

revoke all on table private.course_mode_lms_student_provider_snapshots
  from public, anon, authenticated;

-- The predecessor validator guards this table before the stricter function
-- below is installed. Replace it first so the one-time stale-link revocation
-- cannot be rejected by rules that were written before revocation existed.
create or replace function private.validate_course_mode_lms_student_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The canonical Canvas columns are populated before the stricter validator
  -- is installed. Do not alter verification state during that data-only pass.
  if tg_op = 'UPDATE'
     and new.verification_status is not distinct from old.verification_status then
    new.updated_at := now();
    return new;
  end if;

  if new.verification_status = 'revoked' then
    if new.revoked_at is null then
      raise exception using errcode = '23514',
        message = 'revoked provider student link requires a revocation time';
    end if;
    new.updated_at := now();
    return new;
  end if;

  raise exception using errcode = '42501',
    message = 'only revocation is permitted during LMS identity backfill';
end;
$$;

revoke all on function private.validate_course_mode_lms_student_link()
  from public, anon, authenticated, service_role;

-- A legacy verified link without a student-owned identity cannot safely be
-- inferred from its course connection. Revoke it first, archive the resulting
-- audit record privately, then remove it from the live identity map so the
-- canonical non-null column contract can be restored.
update public.course_mode_lms_student_links
set verification_status = 'revoked',
    revoked_at = coalesce(revoked_at, now()),
    updated_at = now()
where verification_status = 'verified'
  and not exists (
    select 1
    from public.lms_connections identity_connection
    where identity_connection.id = course_mode_lms_student_links.identity_connection_id
      and identity_connection.owner_id = course_mode_lms_student_links.student_id
      and identity_connection.provider = course_mode_lms_student_links.provider
      and identity_connection.config ->> 'connection_mode' = 'student'
  );

create table if not exists private.course_mode_lms_student_link_legacy_archive (
  link_id uuid primary key,
  archived_at timestamptz not null default now(),
  reason text not null,
  link_snapshot jsonb not null
);

revoke all on table private.course_mode_lms_student_link_legacy_archive
  from public, anon, authenticated;

insert into private.course_mode_lms_student_link_legacy_archive (
  link_id,
  archived_at,
  reason,
  link_snapshot
)
select
  student_link.id,
  now(),
  'legacy LMS student link lacks a currently verified student-owned identity connection',
  to_jsonb(student_link)
from public.course_mode_lms_student_links student_link
where not exists (
  select 1
  from public.lms_connections identity_connection
  where identity_connection.id = student_link.identity_connection_id
    and identity_connection.owner_id = student_link.student_id
    and identity_connection.provider = student_link.provider
    and identity_connection.config ->> 'connection_mode' = 'student'
)
on conflict (link_id) do nothing;

delete from public.course_mode_lms_student_links student_link
where not exists (
  select 1
  from public.lms_connections identity_connection
  where identity_connection.id = student_link.identity_connection_id
    and identity_connection.owner_id = student_link.student_id
    and identity_connection.provider = student_link.provider
    and identity_connection.config ->> 'connection_mode' = 'student'
);

alter table public.course_mode_lms_student_links
  alter column identity_connection_id set not null;

update public.course_mode_lms_student_links student_link
set canvas_institution_id = identity_connection.config ->> 'institution_id',
    canvas_origin = rtrim(identity_connection.config ->> 'base_url', '/')
from public.lms_connections identity_connection,
     public.lms_connections course_connection
where student_link.provider = 'canvas'
  and student_link.identity_connection_id = identity_connection.id
  and student_link.connection_id = course_connection.id
  and nullif(btrim(identity_connection.config ->> 'institution_id'), '') is not null
  and nullif(btrim(identity_connection.config ->> 'base_url'), '') is not null
  and identity_connection.config ->> 'institution_id'
      is not distinct from course_connection.config ->> 'institution_id'
  and rtrim(identity_connection.config ->> 'base_url', '/')
      is not distinct from rtrim(course_connection.config ->> 'base_url', '/');

update public.course_mode_lms_student_links
set verification_status = 'revoked',
    revoked_at = coalesce(revoked_at, now()),
    updated_at = now()
where provider = 'canvas'
  and verification_status = 'verified'
  and (
    nullif(btrim(canvas_institution_id), '') is null
    or nullif(btrim(canvas_origin), '') is null
  );

alter table public.course_mode_lms_student_links
  drop constraint if exists course_mode_lms_student_links_canvas_destination_check;
alter table public.course_mode_lms_student_links
  add constraint course_mode_lms_student_links_canvas_destination_check
  check (
    verification_status <> 'verified'
    or (
      provider = 'canvas'
      and char_length(btrim(canvas_institution_id)) between 1 and 64
      and canvas_origin = btrim(canvas_origin)
      and canvas_origin like 'https://%'
      and char_length(canvas_origin) between 9 and 300
    )
    or (
      provider = 'google_classroom'
      and canvas_institution_id is null
      and canvas_origin is null
    )
  ) not valid;
alter table public.course_mode_lms_student_links
  validate constraint course_mode_lms_student_links_canvas_destination_check;

with exact_receipt_targets as (
  select
    receipt.id,
    link.connection_id,
    case when receipt.provider = 'canvas'
      then link_connection.config ->> 'institution_id' else null end
      as canvas_institution_id,
    case when receipt.provider = 'canvas'
      then rtrim(link_connection.config ->> 'base_url', '/') else null end
      as canvas_origin
  from public.lms_grade_sync_receipts receipt
  join public.assessment_attempts attempt
    on attempt.id = receipt.attempt_id
  join public.assessment_blueprints blueprint
    on blueprint.id = attempt.blueprint_id
   and blueprint.course_id = receipt.course_id
   and blueprint.external_assignment_id = receipt.external_assignment_id
  join public.course_mode_lms_links link
    on link.course_id = receipt.course_id
   and link.provider = receipt.provider
   and link.external_course_id = receipt.external_course_id
  join public.lms_connections link_connection
    on link_connection.id = link.connection_id
   and link_connection.provider = link.provider
  join public.course_mode_lms_student_links student_link
    on student_link.course_id = receipt.course_id
   and student_link.student_id = attempt.student_id
   and student_link.provider = receipt.provider
   and student_link.connection_id = link.connection_id
   and student_link.external_student_id = receipt.external_student_id
   and student_link.verification_status = 'verified'
   and student_link.revoked_at is null
  where receipt.provider_connection_id is null
    and (
      receipt.provider <> 'canvas'
      or (
        student_link.canvas_institution_id = link_connection.config ->> 'institution_id'
        and student_link.canvas_origin = rtrim(link_connection.config ->> 'base_url', '/')
      )
    )
)
update public.lms_grade_sync_receipts receipt
set provider_connection_id = target.connection_id,
    canvas_institution_id = target.canvas_institution_id,
    canvas_origin = target.canvas_origin
from exact_receipt_targets target
where receipt.id = target.id;

update public.lms_grade_sync_receipts receipt
set provider_target_fingerprint = encode(
  extensions.digest(
    concat_ws(
      E'\\x1f',
      receipt.provider,
      receipt.provider_connection_id::text,
      coalesce(receipt.canvas_institution_id, ''),
      coalesce(receipt.canvas_origin, ''),
      receipt.external_course_id,
      receipt.external_assignment_id,
      receipt.external_student_id
    ),
    'sha256'
  ),
  'hex'
)
where receipt.provider_connection_id is not null
  and (
    receipt.provider <> 'canvas'
    or (receipt.canvas_institution_id is not null and receipt.canvas_origin is not null)
  );

-- An old receipt without a full target must never be replayed. Completed
-- historical receipts remain as audit records; only pending work is closed.
update public.lms_grade_sync_receipts receipt
set status = 'not_accepted',
    error_detail = coalesce(
      receipt.error_detail,
      'Historical LMS grade receipt lacks a verified immutable provider target and cannot be replayed.'
    )
where receipt.provider_connection_id is null
  and receipt.status in ('prepared', 'syncing', 'confirmation_pending');

alter table public.lms_grade_sync_receipts
  drop constraint if exists lms_grade_sync_receipts_canvas_target_check;
alter table public.lms_grade_sync_receipts
  add constraint lms_grade_sync_receipts_canvas_target_check
  check (
    (
      provider = 'canvas'
      and nullif(btrim(canvas_institution_id), '') is not null
      and canvas_origin = btrim(canvas_origin)
      and canvas_origin like 'https://%'
    )
    or (
      provider = 'google_classroom'
      and canvas_institution_id is null
      and canvas_origin is null
    )
  ) not valid;
alter table public.lms_grade_sync_receipts
  drop constraint if exists lms_grade_sync_receipts_provider_target_fingerprint_check;
alter table public.lms_grade_sync_receipts
  add constraint lms_grade_sync_receipts_provider_target_fingerprint_check
  check (
    provider_target_fingerprint is null
    or provider_target_fingerprint ~ '^[a-f0-9]{64}$'
  ) not valid;

create index if not exists lms_grade_sync_receipts_provider_connection_idx
  on public.lms_grade_sync_receipts (provider_connection_id, status)
  where provider_connection_id is not null;

drop index if exists public.lms_grade_sync_receipts_active_attempt_provider_idx;
create unique index lms_grade_sync_receipts_active_attempt_provider_idx
  on public.lms_grade_sync_receipts (attempt_id, provider)
  where attempt_id is not null
    and provider_connection_id is not null
    and provider_target_fingerprint is not null
    and (
      provider <> 'canvas'
      or (canvas_institution_id is not null and canvas_origin is not null)
    )
    and status in ('syncing', 'confirmation_pending', 'synced');

create or replace function private.validate_course_mode_lms_student_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_organization_id uuid;
  v_course_connection_config jsonb;
  v_identity_connection_config jsonb;
begin
  if new.external_student_id is distinct from btrim(new.external_student_id) then
    raise exception using errcode = '22023',
      message = 'provider student identifier must be normalized';
  end if;

  -- Revocation must remain possible after the course link, enrollment, or
  -- provider account that justified the original binding has changed.
  if new.verification_status = 'revoked' then
    if new.revoked_at is null then
      raise exception using errcode = '23514',
        message = 'revoked provider student link requires a revocation time';
    end if;
    new.updated_at := now();
    return new;
  end if;

  select course.organization_id, connection.config
    into v_course_organization_id, v_course_connection_config
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

  select identity_connection.config
    into v_identity_connection_config
  from public.lms_connections identity_connection
  where identity_connection.id = new.identity_connection_id
    and identity_connection.owner_id = new.student_id
    and identity_connection.provider = new.provider
    and identity_connection.config ->> 'connection_mode' = 'student';

  if not found then
    raise exception using errcode = '23514',
      message = 'provider student link requires the student owned provider connection';
  end if;

  if new.provider = 'canvas' and (
    new.canvas_institution_id is distinct from v_identity_connection_config ->> 'institution_id'
    or new.canvas_institution_id is distinct from v_course_connection_config ->> 'institution_id'
    or new.canvas_origin is distinct from rtrim(v_identity_connection_config ->> 'base_url', '/')
    or new.canvas_origin is distinct from rtrim(v_course_connection_config ->> 'base_url', '/')
  ) then
    raise exception using errcode = '23514',
      message = 'Canvas student identity must match the canonical course institution';
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

  if new.verification_evidence ->> 'provider_verified' is distinct from 'true'
     or new.verification_evidence ->> 'verified_external_student_id'
        is distinct from new.external_student_id
     or new.verification_evidence ->> 'identity_connection_id'
        is distinct from new.identity_connection_id::text
     or (
       new.provider = 'canvas'
       and (
         new.verification_evidence ->> 'canvas_institution_id'
            is distinct from new.canvas_institution_id
         or new.verification_evidence ->> 'canvas_origin'
            is distinct from new.canvas_origin
       )
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

-- The current import is a complete account snapshot. Revoke anything no
-- longer observed before materializing the exact current set, including an
-- empty import and a provider-account identity change.
-- Long-lived environments can predate the provisional seven-argument helper.
-- REVOKE has no IF EXISTS form, so guard the cleanup instead of making the
-- security upgrade depend on that optional legacy function being present.
do $$
begin
  if to_regprocedure(
    'public.provision_course_mode_lms_student_links_from_provider(uuid, uuid, text, text, text[], timestamptz, text)'
  ) is not null then
    execute 'revoke all on function public.provision_course_mode_lms_student_links_from_provider(uuid, uuid, text, text, text[], timestamptz, text) from public, anon, authenticated, service_role';
  end if;
end;
$$;
drop function if exists public.provision_course_mode_lms_student_links_from_provider(
  uuid, uuid, text, text, text[], timestamptz, text
);

create function public.provision_course_mode_lms_student_links_from_provider(
  p_student_id uuid,
  p_identity_connection_id uuid,
  p_provider text,
  p_external_student_id text,
  p_observed_external_course_ids text[],
  p_observed_at timestamptz,
  p_provider_evidence_digest text,
  p_canvas_institution_id text default null,
  p_canvas_origin text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_count integer := 0;
  identity_connection_row public.lms_connections%rowtype;
  snapshot_row private.course_mode_lms_student_provider_snapshots%rowtype;
  latest_observed_at timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501',
      message = 'provider student identity provisioning requires the service role';
  end if;
  if p_provider not in ('canvas', 'google_classroom')
     or p_external_student_id is distinct from btrim(p_external_student_id)
     or char_length(p_external_student_id) not between 1 and 300
     or p_observed_external_course_ids is null
     or cardinality(p_observed_external_course_ids) > 1000
     or p_observed_at is null
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
  if p_provider = 'canvas' and (
    p_canvas_institution_id is null
    or p_canvas_institution_id is distinct from btrim(p_canvas_institution_id)
    or char_length(p_canvas_institution_id) not between 1 and 64
    or p_canvas_origin is null
    or p_canvas_origin is distinct from btrim(p_canvas_origin)
    or p_canvas_origin not like 'https://%'
    or char_length(p_canvas_origin) not between 9 and 300
  ) then
    raise exception using errcode = '22023',
      message = 'canonical Canvas institution evidence is invalid';
  elsif p_provider = 'google_classroom'
    and (p_canvas_institution_id is not null or p_canvas_origin is not null) then
    raise exception using errcode = '22023',
      message = 'Google identity evidence cannot contain a Canvas destination';
  end if;

  -- One provider account has one authoritative snapshot stream. Serialize its
  -- replacement and refuse an older snapshot before it can revoke newer links.
  perform pg_advisory_xact_lock(hashtextextended(
    concat('course-mode-student-provider-snapshot:', p_student_id::text, ':', p_provider),
    0
  ));
  select *
    into snapshot_row
  from private.course_mode_lms_student_provider_snapshots snapshot
  where snapshot.student_id = p_student_id
    and snapshot.provider = p_provider
  for update;
  if found then
    if snapshot_row.observed_at > p_observed_at then
      return 0;
    end if;
    if snapshot_row.observed_at = p_observed_at then
      if snapshot_row.provider_evidence_digest = p_provider_evidence_digest
         and snapshot_row.identity_connection_id = p_identity_connection_id
         and snapshot_row.external_student_id = p_external_student_id
         and snapshot_row.canvas_institution_id is not distinct from p_canvas_institution_id
         and snapshot_row.canvas_origin is not distinct from p_canvas_origin then
        return 0;
      end if;
      raise exception using errcode = '22023',
        message = 'provider snapshot timestamp conflicts with an existing identity snapshot';
    end if;
  else
    -- Legacy links have no snapshot watermark. Keep their latest verification
    -- as a conservative floor until the first complete snapshot is recorded.
    perform 1
    from public.course_mode_lms_student_links student_link
    where student_link.student_id = p_student_id
      and student_link.provider = p_provider
    for update;
    select max(student_link.verified_at)
      into latest_observed_at
    from public.course_mode_lms_student_links student_link
    where student_link.student_id = p_student_id
      and student_link.provider = p_provider;
    if latest_observed_at is not null and latest_observed_at > p_observed_at then
      return 0;
    end if;
  end if;

  select identity_connection.*
    into identity_connection_row
  from public.lms_connections identity_connection
  where identity_connection.id = p_identity_connection_id
    and identity_connection.owner_id = p_student_id
    and identity_connection.provider = p_provider
    and identity_connection.config ->> 'connection_mode' = 'student'
  for share;
  if not found then
    raise exception using errcode = '42501',
      message = 'provider identity connection ownership does not match the student';
  end if;
  if p_provider = 'canvas' and (
    identity_connection_row.config ->> 'institution_id' is distinct from p_canvas_institution_id
    or rtrim(identity_connection_row.config ->> 'base_url', '/') is distinct from p_canvas_origin
  ) then
    raise exception using errcode = '42501',
      message = 'Canvas identity readback does not match its canonical connection destination';
  end if;

  update public.course_mode_lms_student_links student_link
  set verification_status = 'revoked',
      revoked_at = coalesce(student_link.revoked_at, p_observed_at),
      updated_at = now()
  where student_link.student_id = p_student_id
    and student_link.provider = p_provider
    and student_link.verification_status = 'verified'
    and (
      student_link.identity_connection_id is distinct from p_identity_connection_id
      or student_link.external_student_id is distinct from p_external_student_id
      or not exists (
        select 1
        from public.course_mode_lms_links link
        join public.lms_connections course_connection
          on course_connection.id = link.connection_id
         and course_connection.provider = link.provider
        join public.course_mode_enrollments enrollment
          on enrollment.course_id = link.course_id
         and enrollment.enrollment_role = 'student'
         and enrollment.status = 'active'
        join public.organization_memberships membership
          on membership.id = enrollment.membership_id
         and membership.user_id = p_student_id
         and membership.verification_status = 'verified'
        where link.course_id = student_link.course_id
          and link.provider = p_provider
          and link.connection_id = student_link.connection_id
          and link.external_course_id = any(p_observed_external_course_ids)
          and (
            p_provider <> 'canvas'
            or (
              course_connection.config ->> 'institution_id' = p_canvas_institution_id
              and rtrim(course_connection.config ->> 'base_url', '/') = p_canvas_origin
              and student_link.canvas_institution_id = p_canvas_institution_id
              and student_link.canvas_origin = p_canvas_origin
            )
          )
      )
    );

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
    revoked_at,
    canvas_institution_id,
    canvas_origin
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
      'observed_at', p_observed_at,
      'canvas_institution_id', p_canvas_institution_id,
      'canvas_origin', p_canvas_origin
    ),
    p_observed_at,
    link.created_by,
    null,
    p_canvas_institution_id,
    p_canvas_origin
  from public.course_mode_lms_links link
  join public.lms_connections course_connection
    on course_connection.id = link.connection_id
   and course_connection.provider = link.provider
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
    and (
      p_provider <> 'canvas'
      or (
        course_connection.config ->> 'institution_id' = p_canvas_institution_id
        and rtrim(course_connection.config ->> 'base_url', '/') = p_canvas_origin
      )
    )
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
       canvas_institution_id = excluded.canvas_institution_id,
       canvas_origin = excluded.canvas_origin,
       updated_at = now()
   where public.course_mode_lms_student_links.verified_at <= excluded.verified_at;

  get diagnostics linked_count = row_count;

  insert into private.course_mode_lms_student_provider_snapshots (
    student_id,
    provider,
    observed_at,
    provider_evidence_digest,
    identity_connection_id,
    external_student_id,
    canvas_institution_id,
    canvas_origin
  ) values (
    p_student_id,
    p_provider,
    p_observed_at,
    p_provider_evidence_digest,
    p_identity_connection_id,
    p_external_student_id,
    p_canvas_institution_id,
    p_canvas_origin
  )
  on conflict (student_id, provider) do update
  set observed_at = excluded.observed_at,
      provider_evidence_digest = excluded.provider_evidence_digest,
      identity_connection_id = excluded.identity_connection_id,
      external_student_id = excluded.external_student_id,
      canvas_institution_id = excluded.canvas_institution_id,
      canvas_origin = excluded.canvas_origin,
      updated_at = now()
  where private.course_mode_lms_student_provider_snapshots.observed_at < excluded.observed_at;

  return linked_count;
end;
$$;

revoke all on function public.provision_course_mode_lms_student_links_from_provider(
  uuid, uuid, text, text, text[], timestamptz, text, text, text
) from public, anon, authenticated;
grant execute on function public.provision_course_mode_lms_student_links_from_provider(
  uuid, uuid, text, text, text[], timestamptz, text, text, text
) to service_role;

create or replace function private.revoke_course_mode_student_links_after_course_link_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.course_mode_lms_student_links student_link
    set verification_status = 'revoked',
        revoked_at = coalesce(student_link.revoked_at, now()),
        updated_at = now()
    where student_link.course_id = old.course_id
      and student_link.provider = old.provider
      and student_link.verification_status = 'verified';
    return old;
  end if;

  if new.connection_id is distinct from old.connection_id
     or new.external_course_id is distinct from old.external_course_id
     or new.provider is distinct from old.provider then
    update public.course_mode_lms_student_links student_link
    set verification_status = 'revoked',
        revoked_at = coalesce(student_link.revoked_at, now()),
        updated_at = now()
    where student_link.course_id = old.course_id
      and student_link.provider = old.provider
      and student_link.verification_status = 'verified';
  end if;
  return new;
end;
$$;

revoke all on function private.revoke_course_mode_student_links_after_course_link_change()
  from public, anon, authenticated, service_role;

drop trigger if exists course_mode_lms_links_revoke_student_links
  on public.course_mode_lms_links;
create trigger course_mode_lms_links_revoke_student_links
after update of connection_id, external_course_id, provider or delete
on public.course_mode_lms_links
for each row execute function private.revoke_course_mode_student_links_after_course_link_change();

create or replace function private.revoke_course_mode_student_links_after_connection_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.provider is distinct from old.provider
     or new.config ->> 'connection_mode'
        is distinct from old.config ->> 'connection_mode'
     or (
       coalesce(new.provider, old.provider) = 'canvas'
       and (
         new.config ->> 'institution_id'
           is distinct from old.config ->> 'institution_id'
         or rtrim(new.config ->> 'base_url', '/')
           is distinct from rtrim(old.config ->> 'base_url', '/')
       )
     ) then
    update public.course_mode_lms_student_links student_link
    set verification_status = 'revoked',
        revoked_at = coalesce(student_link.revoked_at, now()),
        updated_at = now()
    where (
        student_link.identity_connection_id = old.id
        or student_link.connection_id = old.id
      )
      and student_link.verification_status = 'verified';
  end if;
  return new;
end;
$$;

revoke all on function private.revoke_course_mode_student_links_after_connection_change()
  from public, anon, authenticated, service_role;

drop trigger if exists lms_connections_revoke_course_mode_student_links
  on public.lms_connections;
create trigger lms_connections_revoke_course_mode_student_links
after update of owner_id, provider, config
on public.lms_connections
for each row execute function private.revoke_course_mode_student_links_after_connection_change();

-- Replace the claim because PostgreSQL cannot change an existing function's
-- table return type in place. The returned target is copied from locked rows or
-- from the already-bound receipt in the same transaction.
revoke all on function public.claim_lms_grade_sync_receipt(uuid, text)
  from public, anon, authenticated, service_role;
drop function if exists public.claim_lms_grade_sync_receipt(uuid, text);

create function public.claim_lms_grade_sync_receipt(
  p_attempt_id uuid,
  p_provider text
)
returns table (
  receipt_id uuid,
  receipt_status text,
  claimed boolean,
  provider text,
  connection_id uuid,
  canvas_institution_id text,
  canvas_origin text,
  external_course_id text,
  external_assignment_id text,
  external_student_id text,
  score numeric,
  points_possible numeric,
  confirmed_by uuid,
  confirmed_at timestamptz
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
  computed_target_fingerprint text;
  computed_idempotency_key text;
begin
  if auth.uid() is null or p_provider not in ('canvas', 'google_classroom') then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    concat('lms-grade-sync-attempt:', p_attempt_id::text, ':', p_provider),
    0
  ));

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
    and public.can_author_course(blueprint.course_id)
  for share of attempt, blueprint;
  if not found then return; end if;

  select link.external_course_id, link.connection_id, connection.config
    into link_row
  from public.course_mode_lms_links link
  join public.lms_connections connection
    on connection.id = link.connection_id
   and connection.provider = link.provider
   and connection.owner_id = auth.uid()
  where link.course_id = attempt_row.course_id
    and link.provider = p_provider
  for share of link, connection;
  if not found then return; end if;

  select student_link.*
    into student_link_row
  from public.course_mode_lms_student_links student_link
  join public.lms_connections identity_connection
    on identity_connection.id = student_link.identity_connection_id
   and identity_connection.owner_id = attempt_row.student_id
   and identity_connection.provider = student_link.provider
   and identity_connection.config ->> 'connection_mode' = 'student'
  join public.course_mode_enrollments enrollment
    on enrollment.course_id = student_link.course_id
   and enrollment.enrollment_role = 'student'
   and enrollment.status = 'active'
  join public.organization_memberships membership
    on membership.id = enrollment.membership_id
   and membership.user_id = attempt_row.student_id
   and membership.verification_status = 'verified'
  where student_link.course_id = attempt_row.course_id
    and student_link.student_id = attempt_row.student_id
    and student_link.provider = p_provider
    and student_link.connection_id = link_row.connection_id
    and student_link.verification_status = 'verified'
    and student_link.revoked_at is null
    and (
      p_provider <> 'canvas'
      or (
        student_link.canvas_institution_id = link_row.config ->> 'institution_id'
        and student_link.canvas_origin = rtrim(link_row.config ->> 'base_url', '/')
        and student_link.canvas_institution_id = identity_connection.config ->> 'institution_id'
        and student_link.canvas_origin = rtrim(identity_connection.config ->> 'base_url', '/')
      )
    )
  for share of student_link, identity_connection;
  if not found then return; end if;

  computed_target_fingerprint := encode(
    extensions.digest(
      concat_ws(
        E'\\x1f',
        p_provider,
        link_row.connection_id::text,
        case when p_provider = 'canvas'
          then link_row.config ->> 'institution_id' else '' end,
        case when p_provider = 'canvas'
          then rtrim(link_row.config ->> 'base_url', '/') else '' end,
        link_row.external_course_id,
        attempt_row.external_assignment_id,
        student_link_row.external_student_id
      ),
      'sha256'
    ),
    'hex'
  );
  computed_idempotency_key := concat(
    attempt_row.id::text,
    ':', p_provider,
    ':', computed_target_fingerprint
  );

  -- An in-flight receipt is never redirected. Reuse it only when every target
  -- field agrees with the current verified course and student identity.
  select receipt.*
    into current_receipt
  from public.lms_grade_sync_receipts receipt
  where receipt.attempt_id = attempt_row.id
    and receipt.provider = p_provider
    and receipt.provider_target_fingerprint = computed_target_fingerprint
    and receipt.provider_connection_id = link_row.connection_id
    and receipt.external_course_id = link_row.external_course_id
    and receipt.external_assignment_id = attempt_row.external_assignment_id
    and receipt.external_student_id = student_link_row.external_student_id
    and (
      p_provider <> 'canvas'
      or (
        receipt.canvas_institution_id = link_row.config ->> 'institution_id'
        and receipt.canvas_origin = rtrim(link_row.config ->> 'base_url', '/')
      )
    )
    and receipt.status in ('syncing', 'confirmation_pending', 'synced')
  order by receipt.created_at desc
  limit 1
  for update;
  if found then
    return query select
      current_receipt.id,
      current_receipt.status,
      false,
      current_receipt.provider,
      current_receipt.provider_connection_id,
      current_receipt.canvas_institution_id,
      current_receipt.canvas_origin,
      current_receipt.external_course_id,
      current_receipt.external_assignment_id,
      current_receipt.external_student_id,
      current_receipt.score,
      current_receipt.points_possible,
      current_receipt.confirmed_by,
      current_receipt.confirmed_at;
    return;
  end if;

  -- Do not open a second delivery while a different locked target for the same
  -- attempt is unresolved. The reconciliation worker decides its final state.
  select receipt.*
    into current_receipt
  from public.lms_grade_sync_receipts receipt
  where receipt.attempt_id = attempt_row.id
    and receipt.provider = p_provider
    and receipt.status in ('syncing', 'confirmation_pending', 'synced')
  order by receipt.created_at desc
  limit 1
  for update;
  if found then
    return query select
      current_receipt.id,
      current_receipt.status,
      false,
      current_receipt.provider,
      current_receipt.provider_connection_id,
      current_receipt.canvas_institution_id,
      current_receipt.canvas_origin,
      current_receipt.external_course_id,
      current_receipt.external_assignment_id,
      current_receipt.external_student_id,
      current_receipt.score,
      current_receipt.points_possible,
      current_receipt.confirmed_by,
      current_receipt.confirmed_at;
    return;
  end if;

  select receipt.*
    into current_receipt
  from public.lms_grade_sync_receipts receipt
  where receipt.course_id = attempt_row.course_id
    and receipt.provider = p_provider
    and receipt.idempotency_key = computed_idempotency_key
    and receipt.provider_target_fingerprint = computed_target_fingerprint
    and receipt.provider_connection_id = link_row.connection_id
    and receipt.external_course_id = link_row.external_course_id
    and receipt.external_assignment_id = attempt_row.external_assignment_id
    and receipt.external_student_id = student_link_row.external_student_id
    and (
      p_provider <> 'canvas'
      or (
        receipt.canvas_institution_id = link_row.config ->> 'institution_id'
        and receipt.canvas_origin = rtrim(link_row.config ->> 'base_url', '/')
      )
    )
  for update;
  receipt_exists := found;

  if receipt_exists then
    update public.lms_grade_sync_receipts receipt
    set status = 'syncing',
        provider_receipt_id = null,
        provider_response = '{}'::jsonb,
        error_detail = null,
        synced_at = null
    where receipt.id = current_receipt.id
    returning receipt.* into current_receipt;
  else
    insert into public.lms_grade_sync_receipts (
      course_id,
      attempt_id,
       provider,
       provider_connection_id,
       provider_target_fingerprint,
       canvas_institution_id,
      canvas_origin,
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
       link_row.connection_id,
       computed_target_fingerprint,
       case when p_provider = 'canvas'
        then link_row.config ->> 'institution_id' else null end,
      case when p_provider = 'canvas'
        then rtrim(link_row.config ->> 'base_url', '/') else null end,
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

  return query select
    current_receipt.id,
    current_receipt.status,
    true,
    current_receipt.provider,
    current_receipt.provider_connection_id,
    current_receipt.canvas_institution_id,
    current_receipt.canvas_origin,
    current_receipt.external_course_id,
    current_receipt.external_assignment_id,
    current_receipt.external_student_id,
    current_receipt.score,
    current_receipt.points_possible,
    current_receipt.confirmed_by,
    current_receipt.confirmed_at;
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
begin
  if tg_op = 'UPDATE' and (
    new.course_id is distinct from old.course_id
    or new.attempt_id is distinct from old.attempt_id
    or new.final_grade_id is distinct from old.final_grade_id
    or new.provider is distinct from old.provider
    or new.provider_connection_id is distinct from old.provider_connection_id
    or new.provider_target_fingerprint is distinct from old.provider_target_fingerprint
    or new.canvas_institution_id is distinct from old.canvas_institution_id
    or new.canvas_origin is distinct from old.canvas_origin
    or new.external_course_id is distinct from old.external_course_id
    or new.external_assignment_id is distinct from old.external_assignment_id
    or new.external_student_id is distinct from old.external_student_id
    or new.score is distinct from old.score
    or new.points_possible is distinct from old.points_possible
    or new.confirmed_by is distinct from old.confirmed_by
    or new.confirmed_at is distinct from old.confirmed_at
  ) then
    raise exception using errcode = '42501',
      message = 'grade receipt provider target is immutable after claim';
  end if;

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

  if new.provider_connection_id is null
     or new.provider_target_fingerprint is null
     or new.provider_target_fingerprint is distinct from encode(
       extensions.digest(
         concat_ws(
           E'\\x1f',
           new.provider,
           new.provider_connection_id::text,
           coalesce(new.canvas_institution_id, ''),
           coalesce(new.canvas_origin, ''),
           new.external_course_id,
           new.external_assignment_id,
           new.external_student_id
         ),
         'sha256'
       ),
       'hex'
     )
     or not exists (
    select 1
    from public.course_mode_lms_student_links student_link
    where student_link.course_id = new.course_id
      and student_link.student_id = v_student_id
      and student_link.provider = new.provider
      and student_link.connection_id = new.provider_connection_id
      and student_link.external_student_id = new.external_student_id
      and student_link.verification_status = 'verified'
      and student_link.revoked_at is null
      and (
        new.provider <> 'canvas'
        or (
          student_link.canvas_institution_id = new.canvas_institution_id
          and student_link.canvas_origin = new.canvas_origin
        )
      )
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
before insert or update of
  course_id,
  attempt_id,
  final_grade_id,
  provider,
  provider_connection_id,
  provider_target_fingerprint,
  canvas_institution_id,
  canvas_origin,
  external_course_id,
  external_assignment_id,
  external_student_id,
  score,
  points_possible,
  confirmed_by,
  confirmed_at
on public.lms_grade_sync_receipts
for each row execute function private.enforce_lms_grade_student_binding();

create or replace function private.enforce_lms_grade_synced_target_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'synced' and (
    new.provider_response -> 'provider_target' ->> 'provider'
      is distinct from new.provider
    or new.provider_response -> 'provider_target' ->> 'connection_id'
      is distinct from new.provider_connection_id::text
    or new.provider_response -> 'provider_target' ->> 'canvas_institution_id'
      is distinct from new.canvas_institution_id
    or new.provider_response -> 'provider_target' ->> 'canvas_origin'
      is distinct from new.canvas_origin
    or new.provider_response -> 'provider_target' ->> 'external_course_id'
      is distinct from new.external_course_id
    or new.provider_response -> 'provider_target' ->> 'external_assignment_id'
      is distinct from new.external_assignment_id
    or new.provider_response -> 'provider_target' ->> 'external_student_id'
      is distinct from new.external_student_id
  ) then
    raise exception using errcode = '22023',
      message = 'synced receipt requires matching locked provider target evidence';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_lms_grade_synced_target_evidence()
  from public, anon, authenticated, service_role;

drop trigger if exists lms_grade_sync_receipts_synced_target_guard
  on public.lms_grade_sync_receipts;
create trigger lms_grade_sync_receipts_synced_target_guard
before update of status, provider_response
on public.lms_grade_sync_receipts
for each row execute function private.enforce_lms_grade_synced_target_evidence();

comment on function public.claim_lms_grade_sync_receipt(uuid, text) is
  'Atomically claims and returns the immutable provider connection, course, assignment, and student target copied from locked verified rows.';
comment on function public.provision_course_mode_lms_student_links_from_provider(
  uuid, uuid, text, text, text[], timestamptz, text, text, text
) is
  'Service-only complete-snapshot identity provisioning with stale-link revocation and canonical Canvas institution binding.';

commit;
