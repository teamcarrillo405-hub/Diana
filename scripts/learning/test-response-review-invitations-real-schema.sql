-- ISOLATED DATABASE ONLY. Load the actual problem-record, response review,
-- seal, and invitation migrations in order after the two schema setup files.
-- Synthetic rows and signing key are rolled back.
begin;
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000011'),
 ('00000000-0000-4000-8000-000000000021'),
 ('00000000-0000-4000-8000-000000000022'),
 ('00000000-0000-4000-8000-000000000023'),
 ('00000000-0000-4000-8000-000000000024');
insert into public.profiles(user_id,date_of_birth,age_bracket) values
 ('00000000-0000-4000-8000-000000000011','1990-01-01','adult'),
 ('00000000-0000-4000-8000-000000000021','1990-01-01','adult'),
 ('00000000-0000-4000-8000-000000000022','1990-01-01','adult'),
 ('00000000-0000-4000-8000-000000000023','2011-01-01','13_to_17');
insert into public.learning_editor_access(user_id,roles,subjects,qualification_ref,verified_by,verified_at,expires_at)
values
 ('00000000-0000-4000-8000-000000000021',array['reviewer'],array['english'],'qualified-1','operator',now()-interval '1 day',now()+interval '30 days'),
 ('00000000-0000-4000-8000-000000000022',array['reviewer'],array['english'],'qualified-2','operator',now()-interval '1 day',now()+interval '30 days'),
 ('00000000-0000-4000-8000-000000000023',array['reviewer'],array['english'],'qualified-teen','operator',now()-interval '1 day',now()+interval '30 days');
insert into public.classes(id,owner_id) values
 ('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000011');
insert into public.learning_problem_records(id,owner_id,class_id,assignment_id,exercise_id,current_revision)
values
 ('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000031',null,'course-practice-v2:english-test:response',1),
 ('00000000-0000-4000-8000-000000000042','00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000031',null,'course-practice-v2:english-test:response',1);
insert into public.learning_problem_revisions(record_id,owner_id,revision,request_id,state)
values ('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000011',1,
 '00000000-0000-4000-8000-000000000061',jsonb_build_object(
 'schemaVersion','problem-state-v1','id','00000000-0000-4000-8000-000000000041','revision',1,
 'supportCount',0,'exerciseVersionId',repeat('b',64),
 'scope',jsonb_build_object('classId','00000000-0000-4000-8000-000000000031',
   'assignmentId',null,'exerciseId','course-practice-v2:english-test:response'),
 'observations',jsonb_build_array(jsonb_build_object('id','response','text','Evidence supports the claim.',
   'modality','typed','contentHash',repeat('a',64),'confirmedHash',repeat('a',64)))));
insert into public.learning_problem_revisions(record_id,owner_id,revision,request_id,state)
select '00000000-0000-4000-8000-000000000042',owner_id,revision,
  '00000000-0000-4000-8000-000000000062',
  jsonb_set(jsonb_set(state,'{id}','"00000000-0000-4000-8000-000000000042"'),
    '{observations,0,text}','"A second response."')
from public.learning_problem_revisions
where record_id='00000000-0000-4000-8000-000000000041';
insert into diana_private.learning_response_review_seal_key(singleton,key_bytes)
values (true,decode(repeat('ab',32),'hex'));
create temporary table review_gate_test(signature text);
insert into review_gate_test(signature)
select encode(extensions.hmac(convert_to(repeat('a',32),'UTF8'),key_bytes,'sha256'),'hex')
from diana_private.learning_response_review_seal_key where singleton;
grant select on review_gate_test to authenticated;
set local role authenticated;
do $$ begin
 if public.learning_response_review_seal_ready(repeat('a',32),
     (select signature from review_gate_test))
   then raise exception 'default-off seal readiness worked'; end if;
end $$;
reset role;
update diana_private.learning_response_review_feature_gate
  set enabled=true,updated_at=clock_timestamp() where singleton;

-- This is the operator/service-role issuance step. No authenticated role can
-- read or insert the invitation table directly.
insert into public.learning_response_review_invitations
 (id,owner_id,reviewer_id,subject,display_label,expires_at)
values
 ('10000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000021','english','Educator One',now()+interval '7 days'),
 ('10000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000022','english','Educator Two',now()+interval '7 days'),
 ('10000000-0000-4000-8000-000000000023','00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000021','english','Educator One Again',now()+interval '7 days'),
 ('10000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000023','english','Teen Candidate',now()+interval '7 days');
-- Self-declared profile age and a reviewer credential are insufficient.
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ begin
 if public.learning_accept_response_review_invitation('10000000-0000-4000-8000-000000000021')
   then raise exception 'profile-only adult accepted invitation'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ begin
 if jsonb_array_length(public.learning_list_response_review_invitations('owner'))<>0
   then raise exception 'profile-only adult listed choices'; end if;
end $$;
reset role;
insert into public.learning_response_review_adult_eligibility
  (user_id,verified_by,verification_method,verification_reference,verified_at,expires_at) values
 ('00000000-0000-4000-8000-000000000011','operator','institution_attestation',
  'synthetic-eligibility-owner',now()-interval '1 day',now()+interval '30 days'),
 ('00000000-0000-4000-8000-000000000021','operator','institution_attestation',
  'synthetic-eligibility-one',now()-interval '1 day',now()+interval '30 days'),
 ('00000000-0000-4000-8000-000000000022','operator','institution_attestation',
  'synthetic-eligibility-two',now()-interval '1 day',now()+interval '30 days');
create temporary table invitation_test(request_id uuid,packet jsonb,signature text,assessment jsonb);
grant select,insert,update on invitation_test to authenticated;
do $$ declare exposed integer; begin
 if has_table_privilege('authenticated','public.learning_response_review_invitations','SELECT')
   or has_table_privilege('authenticated','public.learning_response_review_invitations','INSERT')
   or has_table_privilege('authenticated','public.learning_response_review_adult_eligibility','SELECT')
   or has_table_privilege('authenticated','public.learning_response_review_adult_eligibility','INSERT')
   or has_table_privilege('authenticated','diana_private.learning_response_review_feature_gate','SELECT')
   or has_schema_privilege('authenticated','diana_private','USAGE')
   or has_function_privilege('authenticated',
     'public.learning_request_response_review(uuid,integer,uuid[])','EXECUTE')
   then raise exception 'raw invitation or reviewer-id path exposed'; end if;
 select count(*) into exposed from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in
   ('learning_response_review_access_unsealed','learning_submit_response_rating_unsealed',
    'learning_response_review_ratings_unsealed','learning_response_review_registry_unsealed')
   and (has_function_privilege('authenticated',p.oid,'EXECUTE')
     or has_function_privilege('anon',p.oid,'EXECUTE'));
 if exposed<>0 then raise exception 'unsealed review RPC exposed'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare invitations jsonb; begin
 invitations:=public.learning_list_response_review_invitations('owner');
 if jsonb_array_length(invitations)<>0 then raise exception 'unaccepted invitation listed to owner'; end if;
 begin perform public.learning_request_response_review_by_invitations(
   '00000000-0000-4000-8000-000000000041',1,
   array['10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000022']::uuid[]);
   raise exception 'unaccepted invitation created review';
 exception when others then if sqlerrm='unaccepted invitation created review' then raise; end if; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000024';
do $$ begin
 if public.learning_accept_response_review_invitation('10000000-0000-4000-8000-000000000021')
   then raise exception 'outsider accepted invitation'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000023';
do $$ begin
 if public.learning_accept_response_review_invitation('10000000-0000-4000-8000-000000000024')
   then raise exception 'teen accepted educator invitation'; end if;
 if jsonb_array_length(public.learning_list_response_review_invitations('reviewer'))<>0
   then raise exception 'teen listed educator invitation'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ begin
 if not public.learning_accept_response_review_invitation('10000000-0000-4000-8000-000000000021')
   then raise exception 'reviewer one could not accept'; end if;
 if not public.learning_accept_response_review_invitation('10000000-0000-4000-8000-000000000023')
   then raise exception 'reviewer one could not accept second invite'; end if;
 if jsonb_array_length(public.learning_list_response_review_invitations('reviewer'))<>2
   then raise exception 'reviewer cannot list own invitations'; end if;
 if public.learning_editor_profile()->>'reviewerId' is distinct from
   '00000000-0000-4000-8000-000000000021'
   or public.learning_editor_profile()->>'qualificationReference' is distinct from 'qualified-1'
   or public.learning_editor_profile()::text like '%qualified-2%'
   then raise exception 'editor profile exposed wrong credential'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000022';
do $$ begin
 if not public.learning_accept_response_review_invitation('10000000-0000-4000-8000-000000000022')
   then raise exception 'reviewer two could not accept'; end if;
end $$;
reset role;
do $$ begin
 begin update public.learning_response_review_invitations
   set expires_at=expires_at+interval '1 day'
   where id='10000000-0000-4000-8000-000000000022';
   raise exception 'accepted invitation expiry extended';
 exception when others then
   if sqlerrm is distinct from 'accepted_invitation_scope_immutable' then raise; end if;
 end;
end $$;
reset role;
update diana_private.learning_response_review_feature_gate
  set enabled=false,updated_at=clock_timestamp() where singleton;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ begin
 if public.learning_response_review_seal_ready(repeat('a',32),
     (select signature from review_gate_test))
   then raise exception 'off seal readiness after acceptance worked'; end if;
 if jsonb_array_length(public.learning_list_response_review_invitations('owner'))<>0
   then raise exception 'off owner invitations listed'; end if;
 begin perform public.learning_request_response_review_by_invitations(
   '00000000-0000-4000-8000-000000000041',1,
   array['10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000022']::uuid[]);
   raise exception 'default-off request worked';
 exception when others then
   if sqlerrm is distinct from 'response_review_disabled' then raise; end if;
 end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ begin
 if public.learning_accept_response_review_invitation('10000000-0000-4000-8000-000000000021')
   then raise exception 'off invitation acceptance worked'; end if;
 if jsonb_array_length(public.learning_list_response_review_invitations('reviewer'))<>0
   then raise exception 'off reviewer invitations listed'; end if;
end $$;
reset role;
update diana_private.learning_response_review_feature_gate
  set enabled=true,updated_at=clock_timestamp() where singleton;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ begin
 if not public.learning_response_review_seal_ready(repeat('a',32),
     (select signature from review_gate_test))
   then raise exception 'enabled seal readiness unavailable'; end if;
end $$;
do $$ declare req uuid; invitations jsonb; begin
 if public.learning_editor_profile() is not null
   then raise exception 'owner read educator profile'; end if;
 invitations:=public.learning_list_response_review_invitations('owner');
 if jsonb_array_length(invitations)<>3
   or invitations::text like '%00000000-0000-4000-8000-000000000021%'
   then raise exception 'owner choice leaked reviewer ids'; end if;
 begin perform public.learning_request_response_review_by_invitations(
   '00000000-0000-4000-8000-000000000041',1,
   array['10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000023']::uuid[]);
   raise exception 'same educator invited twice';
 exception when others then if sqlerrm='same educator invited twice' then raise; end if; end;
 req:=public.learning_request_response_review_by_invitations(
   '00000000-0000-4000-8000-000000000041',1,
   array['10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000022']::uuid[]);
 insert into invitation_test(request_id) values(req);
 begin perform public.learning_request_response_review_by_invitations(
   '00000000-0000-4000-8000-000000000042',1,
   array['10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000022']::uuid[]);
   raise exception 'one-use invitations reused for another response';
 exception when others then
   if sqlerrm is distinct from 'review_invitation_unavailable' then raise; end if;
 end;
 if public.learning_response_review_draft(req)->'invitationIds' is distinct from
   to_jsonb(array['10000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000022']::uuid[])
   then raise exception 'draft invitation ids unavailable'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_draft(req);
   raise exception 'reviewer accessed unsealed draft';
 exception when others then if sqlerrm='reviewer accessed unsealed draft' then raise; end if; end;
 begin perform public.learning_response_review_access(req);
   raise exception 'reviewer accessed unsealed response';
 exception when others then if sqlerrm='reviewer accessed unsealed response' then raise; end if; end;
end $$;
reset role;
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 if exists(select 1 from public.learning_response_review_requests q
   join public.learning_response_review_invitations i on i.id=any(q.invitation_ids)
   where q.id=req and q.expires_at>i.expires_at)
   then raise exception 'request outlives invitation'; end if;
end $$;
update invitation_test t set packet=jsonb_build_object(
  'version','response-assessment-v1','id',repeat('c',64),'contentHash',repeat('d',64),
  'activityVersionId',repeat('b',64),'rubricHash',repeat('e',64),
  'rubric',jsonb_build_object('subject','english','criteria',jsonb_build_array(
    jsonb_build_object('id','evidence'),jsonb_build_object('id','reasoning'))),
  'response','Evidence supports the claim.','responseHash',repeat('f',64),
  'modality','typed','supportCount',0,
  'permission',jsonb_build_object('id',q.id,'scope','response_assessment',
    'provenance','consented_student','consentReference',q.id,
    'responseHash',repeat('f',64),'activityVersionId',repeat('b',64),
    'reviewerIds',q.reviewer_ids,'invitationIds',q.invitation_ids,
    'issuedAt',q.created_at,'expiresAt',q.expires_at,'revokedAt',null))
from public.learning_response_review_requests q where q.id=t.request_id;
update invitation_test set assessment=jsonb_build_object(
  'id','00000000-0000-4000-8000-000000000071',
  'packetId',repeat('c',64),'packetHash',repeat('d',64),'rubricHash',repeat('e',64),
  'reviewerId','00000000-0000-4000-8000-000000000021',
  'qualificationReference','qualified-1','role','rater','resolves',jsonb_build_array(),
  'conflictOfInterest',false,
  'reviewedAt',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'criteria',jsonb_build_array(
    jsonb_build_object('criterionId','evidence','score',2,
      'rationale','Evidence is stated and supports the claim.',
      'evidence',jsonb_build_array(jsonb_build_object('start',0,'end',8,'exactText','Evidence'))),
    jsonb_build_object('criterionId','reasoning','score',2,
      'rationale','Reasoning follows from this evidence.',
      'evidence',jsonb_build_array(jsonb_build_object('start',0,'end',8,'exactText','Evidence')))));
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; packet jsonb; begin
 select request_id,invitation_test.packet into req,packet from invitation_test;
 begin perform public.learning_response_review_seal_challenge(req,
   jsonb_set(packet,'{permission,invitationIds}',
     to_jsonb(array['10000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000021']::uuid[])));
   raise exception 'mismatched invitation packet got challenge';
 exception when others then if sqlerrm='mismatched invitation packet got challenge' then raise; end if; end;
 if public.learning_response_review_seal_challenge(req,packet) is null
   then raise exception 'valid invitation claim unavailable'; end if;
end $$;
reset role;
update invitation_test t set signature=encode(extensions.hmac(
  diana_private.learning_response_review_claim(q,t.packet),
  (select key_bytes from diana_private.learning_response_review_seal_key where singleton),'sha256'),'hex')
from public.learning_response_review_requests q where q.id=t.request_id;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; packet jsonb; signature text; begin
 select request_id,invitation_test.packet,invitation_test.signature into req,packet,signature from invitation_test;
 if not public.learning_seal_response_review(req,packet,signature) then raise exception 'seal unavailable'; end if;
 if public.learning_response_review_access(req)->>'response' is distinct from 'Evidence supports the claim.'
   then raise exception 'owner sealed response unavailable'; end if;
 if jsonb_array_length(public.learning_list_response_reviews('owner'))<>1
   then raise exception 'owner review list unavailable'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; assessment jsonb; begin
 select request_id into req from invitation_test;
 if public.learning_response_review_access(req)->>'response' is distinct from 'Evidence supports the claim.'
   then raise exception 'accepted reviewer sealed response unavailable'; end if;
 if jsonb_array_length(public.learning_list_response_reviews('reviewer'))<>1
   then raise exception 'reviewer review list unavailable'; end if;
 select invitation_test.assessment into assessment from invitation_test;
 if public.learning_submit_response_rating(req,'english',assessment) is null
   then raise exception 'accepted reviewer rating unavailable'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 if jsonb_array_length(public.learning_response_review_ratings(req))<>1
   then raise exception 'owner rating report unavailable'; end if;
 if jsonb_array_length(public.learning_response_review_registry(req))<>2
   then raise exception 'owner credential report unavailable'; end if;
end $$;
reset role;
update diana_private.learning_response_review_feature_gate
  set enabled=false,updated_at=clock_timestamp() where singleton;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; assessment jsonb; begin
 select request_id,invitation_test.assessment into req,assessment from invitation_test;
 if public.learning_response_review_seal_ready(repeat('a',32),
     (select signature from review_gate_test))
   then raise exception 'off seal readiness after seal worked'; end if;
 begin perform public.learning_response_review_access(req);
   raise exception 'off sealed response read worked';
 exception when others then if sqlerrm is distinct from 'review_access_denied' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',assessment);
   raise exception 'off sealed rating worked';
 exception when others then if sqlerrm is distinct from 'review_access_denied' then raise; end if; end;
 if jsonb_array_length(public.learning_list_response_reviews('reviewer'))<>0
   then raise exception 'off reviewer review list worked'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_ratings(req);
   raise exception 'off owner rating report worked';
 exception when others then if sqlerrm is distinct from 'review_access_denied' then raise; end if; end;
 begin perform public.learning_response_review_registry(req);
   raise exception 'off owner registry report worked';
 exception when others then if sqlerrm is distinct from 'review_access_denied' then raise; end if; end;
 if jsonb_array_length(public.learning_list_response_reviews('owner'))<>0
   then raise exception 'off owner review list worked'; end if;
end $$;
reset role;
update diana_private.learning_response_review_feature_gate
  set enabled=true,updated_at=clock_timestamp() where singleton;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 if public.learning_response_review_access(req)->>'response' is distinct from 'Evidence supports the claim.'
   or jsonb_array_length(public.learning_response_review_ratings(req))<>1
   then raise exception 're-enabled review did not reopen'; end if;
end $$;
savepoint review_before_owner_eligibility;
reset role;
update public.learning_response_review_adult_eligibility
  set revoked_at=clock_timestamp()
  where user_id='00000000-0000-4000-8000-000000000011';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'revoked owner eligibility kept reviewer response open';
 exception when others then
   if sqlerrm='revoked owner eligibility kept reviewer response open' then raise; end if; end;
 if jsonb_array_length(public.learning_list_response_reviews('reviewer'))<>0
   then raise exception 'revoked owner eligibility kept reviewer list open'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_ratings(req);
   raise exception 'revoked owner eligibility kept report open';
 exception when others then if sqlerrm='revoked owner eligibility kept report open' then raise; end if; end;
end $$;
reset role;
update public.learning_response_review_adult_eligibility
  set revoked_at=null
  where user_id='00000000-0000-4000-8000-000000000011';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'restored owner eligibility revived seal';
 exception when others then if sqlerrm='restored owner eligibility revived seal' then raise; end if; end;
end $$;
rollback to savepoint review_before_owner_eligibility;
savepoint review_before_reviewer_eligibility;
reset role;
update public.learning_response_review_adult_eligibility
  set revoked_at=clock_timestamp()
  where user_id='00000000-0000-4000-8000-000000000022';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; assessment jsonb; begin
 select request_id,invitation_test.assessment into req,assessment from invitation_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'revoked reviewer eligibility kept response open';
 exception when others then if sqlerrm='revoked reviewer eligibility kept response open' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',assessment);
   raise exception 'revoked reviewer eligibility kept rating open';
 exception when others then if sqlerrm='revoked reviewer eligibility kept rating open' then raise; end if; end;
end $$;
rollback to savepoint review_before_reviewer_eligibility;
savepoint review_before_adult_eligibility_expiry;
reset role;
update public.learning_response_review_adult_eligibility
  set expires_at=clock_timestamp()+interval '50 milliseconds'
  where user_id='00000000-0000-4000-8000-000000000022';
select pg_sleep(0.1);
do $$ begin
 if (select expires_at>clock_timestamp() from public.learning_response_review_adult_eligibility
     where user_id='00000000-0000-4000-8000-000000000022')
   then raise exception 'adult eligibility fixture did not expire'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'expired adult eligibility kept response open';
 exception when others then if sqlerrm='expired adult eligibility kept response open' then raise; end if; end;
end $$;
rollback to savepoint review_before_adult_eligibility_expiry;
savepoint review_before_age_transition;
reset role;
update public.profiles set age_bracket='13_to_17',date_of_birth='2011-01-01'
 where user_id='00000000-0000-4000-8000-000000000022';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; assessment jsonb; begin
 select request_id,invitation_test.assessment into req,assessment from invitation_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'reviewer age transition kept response open';
 exception when others then if sqlerrm='reviewer age transition kept response open' then raise; end if; end;
 if jsonb_array_length(public.learning_list_response_reviews('reviewer'))<>0
   then raise exception 'reviewer age transition kept list open'; end if;
 begin perform public.learning_submit_response_rating(req,'english',assessment);
   raise exception 'reviewer age transition kept rating open';
 exception when others then if sqlerrm='reviewer age transition kept rating open' then raise; end if; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_ratings(req);
   raise exception 'reviewer age transition kept owner report open';
 exception when others then if sqlerrm='reviewer age transition kept owner report open' then raise; end if; end;
end $$;
rollback to savepoint review_before_age_transition;
savepoint review_before_credential_drift;
reset role;
update public.learning_editor_access set qualification_ref='new-qualification'
 where user_id='00000000-0000-4000-8000-000000000022';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; assessment jsonb; begin
 select request_id,invitation_test.assessment into req,assessment from invitation_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'credential drift kept response open';
 exception when others then if sqlerrm='credential drift kept response open' then raise; end if; end;
 if jsonb_array_length(public.learning_list_response_reviews('reviewer'))<>0
   then raise exception 'credential drift kept list open'; end if;
 begin perform public.learning_submit_response_rating(req,'english',assessment);
   raise exception 'credential drift kept rating open';
 exception when others then if sqlerrm='credential drift kept rating open' then raise; end if; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_registry(req);
   raise exception 'credential drift kept registry open';
 exception when others then if sqlerrm='credential drift kept registry open' then raise; end if; end;
end $$;
rollback to savepoint review_before_credential_drift;
savepoint review_before_invitation_expiry;
reset role;
update public.learning_response_review_invitations
  set expires_at=clock_timestamp()+interval '50 milliseconds'
  where id='10000000-0000-4000-8000-000000000022';
select pg_sleep(0.1);
do $$ begin
 if (select expires_at>clock_timestamp() from public.learning_response_review_invitations
     where id='10000000-0000-4000-8000-000000000022')
   then raise exception 'expiry fixture did not expire'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'expired invitation kept response open';
 exception when others then if sqlerrm='expired invitation kept response open' then raise; end if; end;
 if jsonb_array_length(public.learning_list_response_reviews('reviewer'))<>0
   then raise exception 'expired invitation kept list open'; end if;
end $$;
rollback to savepoint review_before_invitation_expiry;
reset role;
update public.learning_response_review_invitations set revoked_at=clock_timestamp()
 where id='10000000-0000-4000-8000-000000000022';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; assessment jsonb; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'revoked invitation kept response open';
 exception when others then if sqlerrm='revoked invitation kept response open' then raise; end if; end;
 if jsonb_array_length(public.learning_list_response_reviews('reviewer'))<>0
   then raise exception 'revoked invitation kept list open'; end if;
 select invitation_test.assessment into assessment from invitation_test;
 begin perform public.learning_submit_response_rating(req,'english',assessment);
   raise exception 'revoked invitation kept rating open';
 exception when others then if sqlerrm='revoked invitation kept rating open' then raise; end if; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_ratings(req);
   raise exception 'revoked invitation kept ratings open';
 exception when others then if sqlerrm='revoked invitation kept ratings open' then raise; end if; end;
 begin perform public.learning_response_review_registry(req);
   raise exception 'revoked invitation kept registry open';
 exception when others then if sqlerrm='revoked invitation kept registry open' then raise; end if; end;
end $$;
reset role;
update public.learning_response_review_invitations set revoked_at=null
 where id='10000000-0000-4000-8000-000000000022';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; begin
 select request_id into req from invitation_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'restored invitation revived old seal';
 exception when others then if sqlerrm='restored invitation revived old seal' then raise; end if; end;
end $$;
rollback;
