-- Operator-issued, reviewer-accepted invitations bind a response review to
-- exactly two known educators without making registry UUIDs a client choice.
begin;

-- This operator-controlled database gate is independent of the HTTP flag.
-- Its missing-row behavior is OFF, and the migration starts it OFF.
create table diana_private.learning_response_review_feature_gate (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into diana_private.learning_response_review_feature_gate(singleton,enabled)
values (true,false);
revoke all on diana_private.learning_response_review_feature_gate from public,anon,authenticated;
grant usage on schema diana_private to service_role;
grant select,update on diana_private.learning_response_review_feature_gate to service_role;

create function diana_private.learning_response_review_enabled()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce((select enabled from diana_private.learning_response_review_feature_gate
    where singleton),false);
$$;
revoke all on function diana_private.learning_response_review_enabled()
  from public,anon,authenticated;

-- Profile age is self-declared. This operator-maintained assertion is the
-- actual adult gate for response disclosure and review participation. Store
-- only a non-sensitive verification reference, never an ID image or DOB scan.
create table public.learning_response_review_adult_eligibility (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_by text not null check (length(btrim(verified_by)) between 2 and 200),
  verification_method text not null check (verification_method in
    ('manual_document_check','institution_attestation','trusted_identity_provider')),
  verification_reference text not null check (length(btrim(verification_reference)) between 8 and 200),
  verified_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  eligibility_revision bigint not null default 1 check (eligibility_revision>0),
  check (expires_at>verified_at and expires_at<=verified_at+interval '1 year')
);
alter table public.learning_response_review_adult_eligibility enable row level security;
revoke all on public.learning_response_review_adult_eligibility from public,anon,authenticated;
grant all on public.learning_response_review_adult_eligibility to service_role;

create function diana_private.learning_response_review_adult_eligibility_revision(p_user uuid)
returns bigint language plpgsql stable security definer set search_path=public,pg_temp as $$
declare revision bigint;
begin
  select e.eligibility_revision into revision
    from public.learning_response_review_adult_eligibility e
    join public.profiles p on p.user_id=e.user_id and p.age_bracket='adult'
    where e.user_id=p_user and e.revoked_at is null
      and e.verified_at<=now() and e.expires_at>now()
      and e.verified_by<>e.user_id::text;
  if revision is null then raise exception 'verified_adult_required'; end if;
  return revision;
end $$;
revoke all on function diana_private.learning_response_review_adult_eligibility_revision(uuid)
  from public,anon,authenticated;

create function diana_private.learning_response_review_adult_eligible(p_user uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  perform diana_private.learning_response_review_adult_eligibility_revision(p_user);
  return true;
exception when others then return false;
end $$;
revoke all on function diana_private.learning_response_review_adult_eligible(uuid)
  from public,anon,authenticated;

create function diana_private.learning_response_review_adult_revision_trigger()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.user_id is distinct from old.user_id then raise exception 'adult_eligibility_identity_immutable'; end if;
  if (new.verified_by,new.verification_method,new.verification_reference,
      new.verified_at,new.expires_at,new.revoked_at)
    is distinct from (old.verified_by,old.verification_method,old.verification_reference,
      old.verified_at,old.expires_at,old.revoked_at)
    then new.eligibility_revision:=old.eligibility_revision+1;
    else new.eligibility_revision:=old.eligibility_revision; end if;
  return new;
end $$;
revoke all on function diana_private.learning_response_review_adult_revision_trigger()
  from public,anon,authenticated;
create trigger learning_response_review_adult_revision before update
  on public.learning_response_review_adult_eligibility for each row
  execute function diana_private.learning_response_review_adult_revision_trigger();

create table public.learning_response_review_invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (subject in ('reading','english','science','history')),
  display_label text not null check (length(btrim(display_label)) between 2 and 80),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_credential_revision bigint,
  claimed_request_id uuid references public.learning_response_review_requests(id) on delete cascade,
  revoked_at timestamptz,
  invitation_revision bigint not null default 1 check (invitation_revision>0),
  check (owner_id<>reviewer_id),
  check (expires_at>created_at and expires_at<=created_at+interval '90 days'),
  check ((accepted_at is null and accepted_credential_revision is null)
    or (accepted_at is not null and accepted_credential_revision is not null)),
  check (accepted_at is null or (accepted_at>=created_at and accepted_at<expires_at))
);
create index learning_response_review_invitation_owner
  on public.learning_response_review_invitations(owner_id,subject,expires_at);
create index learning_response_review_invitation_reviewer
  on public.learning_response_review_invitations(reviewer_id,expires_at);
alter table public.learning_response_review_invitations enable row level security;
revoke all on public.learning_response_review_invitations from public,anon,authenticated;
grant all on public.learning_response_review_invitations to service_role;

create function diana_private.learning_response_review_invitation_revision()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if (new.id,new.owner_id,new.reviewer_id,new.subject,new.created_at)
    is distinct from (old.id,old.owner_id,old.reviewer_id,old.subject,old.created_at)
    then raise exception 'review_invitation_identity_immutable'; end if;
  if old.accepted_at is not null and (new.display_label is distinct from old.display_label
    or new.expires_at>old.expires_at)
    then raise exception 'accepted_invitation_scope_immutable'; end if;
  if old.claimed_request_id is not null and new.claimed_request_id is distinct from old.claimed_request_id
    then raise exception 'review_invitation_claim_immutable'; end if;
  if (new.display_label,new.expires_at,new.accepted_at,new.accepted_credential_revision,
      new.claimed_request_id,new.revoked_at)
    is distinct from
    (old.display_label,old.expires_at,old.accepted_at,old.accepted_credential_revision,
      old.claimed_request_id,old.revoked_at)
    then new.invitation_revision:=old.invitation_revision+1;
    else new.invitation_revision:=old.invitation_revision; end if;
  return new;
end $$;
revoke all on function diana_private.learning_response_review_invitation_revision()
  from public,anon,authenticated;
create trigger learning_response_review_invitation_revision before update
  on public.learning_response_review_invitations for each row
  execute function diana_private.learning_response_review_invitation_revision();

alter table public.learning_response_review_requests
  add column invitation_ids uuid[],
  add column invitation_snapshot jsonb,
  add constraint learning_response_review_invitation_pair check
    (invitation_ids is null or
      (cardinality(invitation_ids)=2 and invitation_ids[1]<>invitation_ids[2]));

-- An invitation is current only while both its acceptance and the educator's
-- credential still match. The snapshot also closes revoke-then-restore races.
create function diana_private.learning_response_review_invitation_snapshot(
  p_request public.learning_response_review_requests
) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb:='[]'::jsonb; inv public.learning_response_review_invitations%rowtype;
  credential public.learning_editor_access%rowtype; position integer;
  owner_age_revision bigint; reviewer_age_revision bigint;
begin
  if p_request.invitation_ids is null or cardinality(p_request.invitation_ids)<>2
    or p_request.invitation_ids[1]=p_request.invitation_ids[2]
    then raise exception 'review_invitations_required'; end if;
  owner_age_revision:=diana_private.learning_response_review_adult_eligibility_revision(p_request.owner_id);
  for position in 1..2 loop
    select * into inv from public.learning_response_review_invitations
      where id=p_request.invitation_ids[position];
    if not found or inv.owner_id<>p_request.owner_id or inv.subject<>p_request.subject
      or inv.reviewer_id<>p_request.reviewer_ids[position]
      or inv.claimed_request_id is distinct from p_request.id
      or inv.accepted_at is null or inv.accepted_credential_revision is null
      or inv.revoked_at is not null or inv.expires_at<=now()
      then raise exception 'review_invitation_changed'; end if;
    select * into credential from public.learning_editor_access where user_id=inv.reviewer_id;
    reviewer_age_revision:=diana_private.learning_response_review_adult_eligibility_revision(inv.reviewer_id);
    if not found or not exists(select 1 from public.profiles
        where user_id=inv.reviewer_id and age_bracket='adult')
      or credential.review_credential_revision<>inv.accepted_credential_revision
      or not 'reviewer'=any(credential.roles)
      or not inv.subject=any(credential.subjects)
      or credential.revoked_at is not null or credential.verified_at>now()
      or credential.expires_at<=now()
      or credential.verified_by=credential.user_id::text
      then raise exception 'review_invitation_credential_changed'; end if;
    result:=result||jsonb_build_array(jsonb_build_object(
      'id',inv.id,'ownerId',inv.owner_id,'reviewerId',inv.reviewer_id,
      'subject',inv.subject,'revision',inv.invitation_revision,
      'claimedRequestId',inv.claimed_request_id,
      'ownerEligibilityRevision',owner_age_revision,
      'reviewerEligibilityRevision',reviewer_age_revision,
      'acceptedAt',inv.accepted_at,'expiresAt',inv.expires_at,
      'credentialRevision',inv.accepted_credential_revision));
  end loop;
  return result;
end $$;
revoke all on function diana_private.learning_response_review_invitation_snapshot(public.learning_response_review_requests)
  from public,anon,authenticated;

-- The operator provisions invitations through the service role. An educator
-- can accept only their own current invitation and never sees the response
-- until both invitations have been used in a sealed request.
create function public.learning_accept_response_review_invitation(p_invitation uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare inv public.learning_response_review_invitations%rowtype;
  credential public.learning_editor_access%rowtype;
begin
  if not diana_private.learning_response_review_enabled() or auth.uid() is null
    then return false; end if;
  select * into inv from public.learning_response_review_invitations
    where id=p_invitation and reviewer_id=auth.uid() for update;
  if not found or inv.revoked_at is not null or inv.expires_at<=now()
    or inv.claimed_request_id is not null
    or not diana_private.learning_response_review_adult_eligible(inv.owner_id)
    or not diana_private.learning_response_review_adult_eligible(inv.reviewer_id)
    then return false; end if;
  select * into credential from public.learning_editor_access where user_id=auth.uid();
  if not found or not exists(select 1 from public.profiles
      where user_id=auth.uid() and age_bracket='adult')
    or not 'reviewer'=any(credential.roles)
    or not inv.subject=any(credential.subjects)
    or credential.revoked_at is not null or credential.verified_at>now()
    or credential.expires_at<=now() or credential.verified_by=credential.user_id::text
    then return false; end if;
  if inv.accepted_at is not null then
    return inv.accepted_credential_revision=credential.review_credential_revision;
  end if;
  update public.learning_response_review_invitations
    set accepted_at=clock_timestamp(),
      accepted_credential_revision=credential.review_credential_revision
    where id=p_invitation;
  return true;
end $$;

create function public.learning_list_response_review_invitations(p_role text)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'displayLabel',i.display_label,'subject',i.subject,
    'expiresAt',i.expires_at,'acceptedAt',i.accepted_at)
    order by i.created_at desc),'[]'::jsonb)
  from (select * from public.learning_response_review_invitations inv where
    diana_private.learning_response_review_enabled()
    and inv.revoked_at is null and inv.expires_at>now() and inv.claimed_request_id is null
    and diana_private.learning_response_review_adult_eligible(inv.owner_id)
    and diana_private.learning_response_review_adult_eligible(inv.reviewer_id)
    and exists(select 1 from public.learning_editor_access a where a.user_id=inv.reviewer_id
      and 'reviewer'=any(a.roles) and inv.subject=any(a.subjects)
      and a.revoked_at is null and a.verified_at<=now() and a.expires_at>now()
      and a.verified_by<>a.user_id::text
      and (inv.accepted_at is null or inv.accepted_credential_revision=a.review_credential_revision))
    and ((p_role='owner' and inv.owner_id=auth.uid() and inv.accepted_at is not null)
      or (p_role='reviewer' and inv.reviewer_id=auth.uid()))
    order by inv.created_at desc limit 100) i;
$$;

create function public.learning_request_response_review_by_invitations(
  p_record uuid,p_revision integer,p_invitations uuid[]
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); inv public.learning_response_review_invitations%rowtype;
  credential public.learning_editor_access%rowtype; reviewers uuid[]:='{}';
  req public.learning_response_review_requests%rowtype; position integer; request_id uuid;
  claimed_count integer;
begin
  if actor is null or p_invitations is null or cardinality(p_invitations)<>2
    or p_invitations[1]=p_invitations[2]
    then raise exception 'two_distinct_invitations_required'; end if;
  if not diana_private.learning_response_review_enabled()
    then raise exception 'response_review_disabled'; end if;
  if not diana_private.learning_response_review_adult_eligible(actor)
    then raise exception 'verified_adult_required'; end if;
  for position in 1..2 loop
    select * into inv from public.learning_response_review_invitations
      where id=p_invitations[position] for update;
    if not found or inv.owner_id<>actor or inv.accepted_at is null
      or inv.revoked_at is not null or inv.expires_at<=now()
      or inv.claimed_request_id is not null
      then raise exception 'review_invitation_unavailable'; end if;
    select * into credential from public.learning_editor_access where user_id=inv.reviewer_id;
    if not found or not diana_private.learning_response_review_adult_eligible(inv.reviewer_id)
      or inv.accepted_credential_revision<>credential.review_credential_revision
      or not 'reviewer'=any(credential.roles) or not inv.subject=any(credential.subjects)
      or credential.revoked_at is not null or credential.verified_at>now()
      or credential.expires_at<=now() or credential.verified_by=credential.user_id::text
      then raise exception 'review_invitation_unavailable'; end if;
    reviewers:=array_append(reviewers,inv.reviewer_id);
  end loop;
  if reviewers[1]=reviewers[2] then raise exception 'two_independent_reviewers_required'; end if;
  request_id:=public.learning_request_response_review(p_record,p_revision,reviewers);
  select * into req from public.learning_response_review_requests where id=request_id for update;
  if req.subject is distinct from (select subject from public.learning_response_review_invitations
      where id=p_invitations[1])
    or req.subject is distinct from (select subject from public.learning_response_review_invitations
      where id=p_invitations[2]) then raise exception 'review_invitation_subject_mismatch'; end if;
  -- The displayed review deadline cannot outlive either invitation.
  update public.learning_response_review_requests
    set invitation_ids=p_invitations,
      expires_at=least(req.expires_at,
        (select expires_at from public.learning_response_review_invitations where id=p_invitations[1]),
        (select expires_at from public.learning_response_review_invitations where id=p_invitations[2]))
    where id=request_id;
  update public.learning_response_review_invitations set claimed_request_id=request_id
    where id=any(p_invitations) and claimed_request_id is null;
  get diagnostics claimed_count=row_count;
  if claimed_count<>2 then raise exception 'review_invitation_already_used'; end if;
  return request_id;
end $$;

-- Rebind the old seal claim. Prior raw-ID requests cannot be newly sealed and
-- any old seal no longer validates after the migration.
alter function diana_private.learning_response_review_claim(
  public.learning_response_review_requests,jsonb)
  rename to learning_response_review_claim_before_invitations;
create function diana_private.learning_response_review_claim(
  p_request public.learning_response_review_requests,p_packet jsonb
) returns bytea language plpgsql stable security definer set search_path=public,pg_temp as $$
declare invitation_state jsonb; previous_claim bytea;
begin
  if not diana_private.learning_response_review_enabled()
    then raise exception 'response_review_disabled'; end if;
  invitation_state:=diana_private.learning_response_review_invitation_snapshot(p_request);
  if p_packet#>'{permission,invitationIds}' is distinct from to_jsonb(p_request.invitation_ids)
    then raise exception 'review_packet_invitation_mismatch'; end if;
  if p_request.invitation_snapshot is not null
    and p_request.invitation_snapshot is distinct from invitation_state
    then raise exception 'review_invitation_changed'; end if;
  previous_claim:=diana_private.learning_response_review_claim_before_invitations(p_request,p_packet);
  return convert_to(jsonb_build_array('response-review-invitation-v1',
    encode(previous_claim,'base64'),invitation_state)::text,'UTF8');
end $$;
revoke all on function diana_private.learning_response_review_claim(public.learning_response_review_requests,jsonb),
  diana_private.learning_response_review_claim_before_invitations(public.learning_response_review_requests,jsonb)
  from public,anon,authenticated;

create or replace function diana_private.learning_response_review_seal_valid(
  p_request public.learning_response_review_requests
) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare secret bytea; expected text;
begin
  if not diana_private.learning_response_review_enabled()
    or p_request.sealed_packet is null or p_request.packet_seal is null or p_request.sealed_at is null
    then return false; end if;
  select key_bytes into secret from diana_private.learning_response_review_seal_key where singleton;
  if secret is null then return false; end if;
  expected:=encode(extensions.hmac(
    diana_private.learning_response_review_claim(p_request,p_request.sealed_packet),
    secret,'sha256'),'hex');
  return expected=p_request.packet_seal;
exception when others then return false;
end $$;

create or replace function public.learning_response_review_seal_ready(p_challenge text,p_signature text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(diana_private.learning_response_review_enabled()
    and p_challenge ~ '^[a-f0-9]{32}$' and p_signature ~ '^[a-f0-9]{64}$'
    and exists(select 1 from diana_private.learning_response_review_seal_key where singleton
      and encode(extensions.hmac(convert_to(p_challenge,'UTF8'),key_bytes,'sha256'),'hex')=p_signature),false);
$$;

create function diana_private.learning_response_review_set_invitation_snapshot()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if old.sealed_at is null and new.sealed_at is not null then
    new.invitation_snapshot:=diana_private.learning_response_review_invitation_snapshot(new);
  end if;
  return new;
end $$;
revoke all on function diana_private.learning_response_review_set_invitation_snapshot()
  from public,anon,authenticated;
create trigger learning_response_review_set_invitation_snapshot before update
  on public.learning_response_review_requests for each row
  execute function diana_private.learning_response_review_set_invitation_snapshot();

create or replace function diana_private.learning_response_review_immutable_seal()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if old.sealed_at is not null and (new.owner_id,new.record_id,new.revision,new.subject,
    new.reviewer_ids,new.invitation_ids,new.created_at,new.expires_at,new.sealed_packet,
    new.packet_seal,new.sealed_at,new.reviewer_credentials,new.invitation_snapshot)
    is distinct from (old.owner_id,old.record_id,old.revision,old.subject,
    old.reviewer_ids,old.invitation_ids,old.created_at,old.expires_at,old.sealed_packet,
    old.packet_seal,old.sealed_at,old.reviewer_credentials,old.invitation_snapshot)
    then raise exception 'review_seal_immutable'; end if;
  return new;
end $$;

-- These wrappers expose invitation IDs while their existing seal checks keep
-- every response path closed when either invitation changes.
create or replace function public.learning_response_review_draft(p_request uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare req public.learning_response_review_requests%rowtype;
begin
  select * into req from public.learning_response_review_requests where id=p_request and owner_id=auth.uid();
  if not diana_private.learning_response_review_enabled()
    or auth.uid() is null or not found or req.sealed_at is not null or req.revoked_at is not null
    or req.expires_at<=now() or not exists(select 1 from public.profiles where user_id=req.owner_id and age_bracket='adult')
    or req.invitation_ids is null
    then raise exception 'review_access_denied'; end if;
  perform diana_private.learning_response_review_invitation_snapshot(req);
  return public.learning_response_review_access_unsealed(p_request)||
    jsonb_build_object('invitationIds',req.invitation_ids);
end $$;

create or replace function public.learning_response_review_access(p_request uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare req public.learning_response_review_requests%rowtype; delivered jsonb;
begin
  select * into req from public.learning_response_review_requests where id=p_request;
  if not found or not diana_private.learning_response_review_seal_valid(req)
    then raise exception 'review_access_denied'; end if;
  delivered:=public.learning_response_review_access_unsealed(p_request);
  return delivered||jsonb_build_object('sealedPacket',req.sealed_packet,
    'invitationIds',req.invitation_ids);
end $$;

create or replace function public.learning_list_response_reviews(p_role text)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'recordId',r.record_id,'revision',r.revision,
   'reviewerIds',r.reviewer_ids,'invitationIds',r.invitation_ids,
   'createdAt',r.created_at,'expiresAt',r.expires_at,'revokedAt',r.revoked_at)
   order by r.created_at desc),'[]'::jsonb)
 from (select * from public.learning_response_review_requests where
   diana_private.learning_response_review_seal_valid(learning_response_review_requests)
   and ((p_role='owner' and owner_id=auth.uid()) or
     (p_role='reviewer' and auth.uid()=any(reviewer_ids) and revoked_at is null and expires_at>now()
       and public.learning_response_reviewer_current(auth.uid(),subject)
       and exists(select 1 from public.profiles where user_id=owner_id and age_bracket='adult')))
   order by created_at desc limit 100) r;
$$;

-- The rating form gets only the caller's credential reference. This extends
-- the existing editor profile without exposing the reviewer registry.
create or replace function public.learning_editor_profile()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object('roles',a.roles,'subjects',a.subjects,
    'expiresAt',a.expires_at,'reviewerId',a.user_id,
    'qualificationReference',a.qualification_ref)
  from public.learning_editor_access a where a.user_id=auth.uid()
    and a.revoked_at is null and a.verified_at<=now() and a.expires_at>now();
$$;

-- Direct authenticated calls can no longer choose arbitrary registry UUIDs.
revoke all on function public.learning_request_response_review(uuid,integer,uuid[])
  from public,anon,authenticated;
revoke all on function public.learning_accept_response_review_invitation(uuid),
  public.learning_list_response_review_invitations(text),
  public.learning_request_response_review_by_invitations(uuid,integer,uuid[]),
  public.learning_editor_profile()
  from public,anon,authenticated;
grant execute on function public.learning_accept_response_review_invitation(uuid),
  public.learning_list_response_review_invitations(text),
  public.learning_request_response_review_by_invitations(uuid,integer,uuid[]),
  public.learning_editor_profile()
  to authenticated;
commit;
