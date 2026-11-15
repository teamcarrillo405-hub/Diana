-- ISOLATED DATABASE ONLY. Run after the unmodified problem-record and review
-- prototype migrations, then 20260926113000_learning_response_review_seal.sql.
-- All rows and the synthetic key are rolled back.
begin;
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000011'),
 ('00000000-0000-4000-8000-000000000021'),
 ('00000000-0000-4000-8000-000000000022'),
 ('00000000-0000-4000-8000-000000000023');
insert into public.profiles(user_id,date_of_birth,age_bracket) values
 ('00000000-0000-4000-8000-000000000011','1990-01-01','adult'),
 ('00000000-0000-4000-8000-000000000021','1990-01-01','adult'),
 ('00000000-0000-4000-8000-000000000022','1990-01-01','adult');
insert into public.learning_editor_access(user_id,roles,subjects,qualification_ref,verified_by,verified_at,expires_at)
values
 ('00000000-0000-4000-8000-000000000021',array['reviewer'],array['english'],'qualified-1','operator',now()-interval '1 day',now()+interval '30 days'),
 ('00000000-0000-4000-8000-000000000022',array['reviewer'],array['english'],'qualified-2','operator',now()-interval '1 day',now()+interval '30 days');
insert into public.classes(id,owner_id) values
 ('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000011');
insert into public.learning_problem_records(id,owner_id,class_id,assignment_id,exercise_id,current_revision)
values ('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000011',
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
do $$ declare exposed integer; begin
 if public.learning_response_review_seal_ready(repeat('a',32),repeat('0',64))
   then raise exception 'no-key readiness worked'; end if;
 select count(*) into exposed from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in
   ('learning_response_review_access_unsealed','learning_submit_response_rating_unsealed',
    'learning_response_review_ratings_unsealed','learning_response_review_registry_unsealed')
   and (has_function_privilege('authenticated',p.oid,'EXECUTE')
     or has_function_privilege('anon',p.oid,'EXECUTE'));
 if exposed<>0 then raise exception 'unsealed RPC exposed'; end if;
end $$;
insert into diana_private.learning_response_review_seal_key(singleton,key_bytes)
values (true,decode(repeat('ab',32),'hex'));

create temporary table review_seal_test(packet jsonb, signature text, request_id uuid);
grant select,insert,update on review_seal_test to authenticated;

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; begin
 req:=public.learning_request_response_review('00000000-0000-4000-8000-000000000041',1,
  array['00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000022']::uuid[]);
 insert into review_seal_test(request_id) values(req);
 begin perform public.learning_response_review_access(req);
   raise exception 'unsealed owner access worked';
 exception when others then if sqlerrm='unsealed owner access worked' then raise; end if; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; begin
 select request_id into req from review_seal_test;
 begin perform public.learning_response_review_draft(req);
   raise exception 'reviewer draft access worked';
 exception when others then if sqlerrm='reviewer draft access worked' then raise; end if; end;
 begin perform public.learning_response_review_access(req);
   raise exception 'unsealed reviewer access worked';
 exception when others then if sqlerrm='unsealed reviewer access worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english','{}'::jsonb);
   raise exception 'unsealed rating worked';
 exception when others then if sqlerrm='unsealed rating worked' then raise; end if; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
reset role;
update review_seal_test t set packet=jsonb_build_object(
  'version','response-assessment-v1','id',repeat('c',64),'contentHash',repeat('d',64),
  'activityVersionId',repeat('b',64),'rubricHash',repeat('e',64),
  'rubric',jsonb_build_object('subject','english','criteria',jsonb_build_array(
    jsonb_build_object('id','evidence'),jsonb_build_object('id','reasoning'))),
  'response','Evidence supports the claim.','responseHash',repeat('f',64),
  'modality','typed','supportCount',0,
  'permission',jsonb_build_object('id',q.id,'scope','response_assessment',
    'provenance','consented_student','consentReference',q.id,
    'responseHash',repeat('f',64),'activityVersionId',repeat('b',64),
    'reviewerIds',q.reviewer_ids,'issuedAt',q.created_at,'expiresAt',q.expires_at,
    'revokedAt',null))
from public.learning_response_review_requests q where q.id=t.request_id;
set local role authenticated;
do $$ declare req uuid; packet jsonb; begin
 select request_id,review_seal_test.packet into req,packet from review_seal_test;
 if public.learning_response_review_seal_challenge(req,packet) is null then raise exception 'challenge absent'; end if;
 begin perform public.learning_seal_response_review(req,packet,repeat('0',64));
   raise exception 'forged seal worked';
 exception when others then if sqlerrm='forged seal worked' then raise; end if; end;
end $$;

-- Test operator models the server by signing the exact PostgreSQL challenge.
reset role;
update review_seal_test t set signature=encode(extensions.hmac(
  diana_private.learning_response_review_claim(q,t.packet),
  (select key_bytes from diana_private.learning_response_review_seal_key where singleton),'sha256'),'hex')
from public.learning_response_review_requests q where q.id=t.request_id;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; packet jsonb; signature text; begin
 select request_id,review_seal_test.packet,review_seal_test.signature into req,packet,signature from review_seal_test;
 if not public.learning_seal_response_review(req,packet,signature) then raise exception 'seal failed'; end if;
 if public.learning_response_review_access(req)->>'response' is distinct from 'Evidence supports the claim.'
   then raise exception 'owner access unavailable'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; assessment jsonb; begin
 select request_id into req from review_seal_test;
 if public.learning_response_review_access(req)->>'response' is distinct from 'Evidence supports the claim.'
   then raise exception 'reviewer access unavailable'; end if;
 assessment:=jsonb_build_object('id','00000000-0000-4000-8000-000000000071',
  'packetId',repeat('c',64),'packetHash',repeat('d',64),'rubricHash',repeat('e',64),
  'reviewerId','00000000-0000-4000-8000-000000000021','qualificationReference','qualified-1',
  'role','rater','resolves',jsonb_build_array(),'conflictOfInterest',false,
  'reviewedAt',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'criteria',jsonb_build_array(
    jsonb_build_object('criterionId','evidence','score',2,'rationale','Evidence is stated and supports the claim.',
      'evidence',jsonb_build_array(jsonb_build_object('start',0,'end',8,'exactText','Evidence'))),
    jsonb_build_object('criterionId','reasoning','score',2,'rationale','Reasoning follows from this evidence.',
      'evidence',jsonb_build_array(jsonb_build_object('start',0,'end',8,'exactText','Evidence')))));
 begin perform public.learning_submit_response_rating(req,'english',assessment-'reviewedAt');
   raise exception 'missing date rating worked';
 exception when others then if sqlerrm='missing date rating worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',jsonb_set(assessment,'{reviewedAt}','null'::jsonb));
   raise exception 'null date rating worked';
 exception when others then if sqlerrm='null date rating worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',jsonb_set(assessment,'{id}','null'::jsonb));
   raise exception 'null id rating worked';
 exception when others then if sqlerrm='null id rating worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',
   jsonb_set(assessment,'{criteria,1,evidence}','[]'::jsonb));
   raise exception 'positive score without evidence worked';
 exception when others then if sqlerrm='positive score without evidence worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',
   jsonb_set(assessment,'{criteria,0,rationale}',to_jsonb(repeat('😀',1500))));
   raise exception 'non-BMP rationale exceeded UTF-16 limit';
 exception when others then if sqlerrm='non-BMP rationale exceeded UTF-16 limit' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',
   jsonb_set(assessment,'{criteria,0,rationale}',to_jsonb(repeat(chr(9),20))));
   raise exception 'tab-only rationale worked';
 exception when others then if sqlerrm='tab-only rationale worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',
   jsonb_set(assessment,'{criteria,0,rationale}',to_jsonb(repeat(chr(160),20))));
   raise exception 'nonbreaking-space rationale worked';
 exception when others then if sqlerrm='nonbreaking-space rationale worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',
   jsonb_set(assessment,'{reviewedAt}',to_jsonb(to_char((clock_timestamp()+interval '1 minute') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))));
   raise exception 'future review time worked';
 exception when others then if sqlerrm='future review time worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',assessment||'{"poison":true}'::jsonb);
   raise exception 'extra field rating worked';
 exception when others then if sqlerrm='extra field rating worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',
   jsonb_set(assessment,'{criteria,0}',assessment#>'{criteria,0}'||'{"poison":true}'::jsonb));
   raise exception 'extra criterion field worked';
 exception when others then if sqlerrm='extra criterion field worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',
   jsonb_set(assessment,'{criteria,0,evidence,0}',assessment#>'{criteria,0,evidence,0}'||'{"poison":true}'::jsonb));
   raise exception 'extra evidence field worked';
 exception when others then if sqlerrm='extra evidence field worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',jsonb_set(assessment,'{criteria,0,criterionId}','"reasoning"'));
   raise exception 'forged criterion worked';
 exception when others then if sqlerrm='forged criterion worked' then raise; end if; end;
 begin perform public.learning_submit_response_rating(req,'english',jsonb_set(assessment,'{criteria,0,evidence,0,exactText}','"Changed"'));
   raise exception 'forged span worked';
 exception when others then if sqlerrm='forged span worked' then raise; end if; end;
 if public.learning_submit_response_rating(req,'english',assessment) is null then raise exception 'valid rating unavailable'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.learning_response_review_ratings)<>1
   then raise exception 'poison rating consumed submission'; end if;
 begin
   update public.learning_response_review_requests set sealed_packet=sealed_packet||'{"poison":true}'::jsonb;
   raise exception 'sealed packet mutated';
 exception when others then if sqlerrm='sealed packet mutated' then raise; end if; end;
end $$;
update public.learning_problem_records set current_revision=2
where id='00000000-0000-4000-8000-000000000041';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; begin
 select request_id into req from review_seal_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'changed revision access worked';
 exception when others then if sqlerrm='changed revision access worked' then raise; end if; end;
end $$;
reset role;
update public.learning_problem_records set current_revision=1
where id='00000000-0000-4000-8000-000000000041';
update public.learning_editor_access set qualification_ref='changed-qualification'
where user_id='00000000-0000-4000-8000-000000000021';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; begin
 select request_id into req from review_seal_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'changed credential access worked';
 exception when others then if sqlerrm='changed credential access worked' then raise; end if; end;
end $$;
reset role;
update public.learning_editor_access set qualification_ref='qualified-1',revoked_at=clock_timestamp()
where user_id='00000000-0000-4000-8000-000000000021';
set local role authenticated;
do $$ declare req uuid; begin
 select request_id into req from review_seal_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'revoked credential access worked';
 exception when others then if sqlerrm='revoked credential access worked' then raise; end if; end;
end $$;
reset role;
update public.learning_editor_access set revoked_at=null,expires_at=now()-interval '1 second'
where user_id='00000000-0000-4000-8000-000000000021';
set local role authenticated;
do $$ declare req uuid; begin
 select request_id into req from review_seal_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'expired credential access worked';
 exception when others then if sqlerrm='expired credential access worked' then raise; end if; end;
end $$;
reset role;
update public.learning_editor_access set expires_at=now()+interval '30 days'
where user_id='00000000-0000-4000-8000-000000000021';
do $$ declare current_revision bigint; sealed_revision bigint; begin
 select review_credential_revision into current_revision from public.learning_editor_access
 where user_id='00000000-0000-4000-8000-000000000021';
 select (reviewer_credentials->0->>'revision')::bigint into sealed_revision
 from public.learning_response_review_requests where id=(select request_id from review_seal_test);
 if current_revision<=sealed_revision then raise exception 'credential revision did not advance'; end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; begin
 select request_id into req from review_seal_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'restored credential revived old seal';
 exception when others then if sqlerrm='restored credential revived old seal' then raise; end if; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000023';
do $$ declare req uuid; begin
 select request_id into req from review_seal_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'outsider access worked';
 exception when others then if sqlerrm='outsider access worked' then raise; end if; end;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000011';
do $$ declare req uuid; begin
 select request_id into req from review_seal_test;
 if not public.learning_revoke_response_review(req) then raise exception 'owner revoke failed'; end if;
end $$;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ declare req uuid; begin
 select request_id into req from review_seal_test;
 begin perform public.learning_response_review_access(req);
   raise exception 'revoked request access worked';
 exception when others then if sqlerrm='revoked request access worked' then raise; end if; end;
end $$;
reset role;
-- Build a separately signed but expired fixture. The real HTTP route never
-- signs an already expired request; this isolates the database expiry check.
insert into public.learning_response_review_requests(id,owner_id,record_id,revision,subject,reviewer_ids,created_at,expires_at)
values ('00000000-0000-4000-8000-000000000052',
 '00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000041',1,'english',
 array['00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000022']::uuid[],
 now()-interval '3 days',now()-interval '2 days');
do $$ declare req public.learning_response_review_requests%rowtype; packet jsonb; secret bytea; signature text; begin
 select * into req from public.learning_response_review_requests
 where id='00000000-0000-4000-8000-000000000052';
 select key_bytes into secret from diana_private.learning_response_review_seal_key where singleton;
 select review_seal_test.packet into packet from review_seal_test;
 packet:=jsonb_set(packet,'{permission,id}',to_jsonb(req.id::text));
 packet:=jsonb_set(packet,'{permission,consentReference}',to_jsonb(req.id::text));
 packet:=jsonb_set(packet,'{permission,issuedAt}',to_jsonb(req.created_at));
 packet:=jsonb_set(packet,'{permission,expiresAt}',to_jsonb(req.expires_at));
 signature:=encode(extensions.hmac(diana_private.learning_response_review_claim(req,packet),secret,'sha256'),'hex');
 update public.learning_response_review_requests set sealed_packet=packet,packet_seal=signature,
   sealed_at=clock_timestamp(),reviewer_credentials=diana_private.learning_response_review_credentials(req)
 where id=req.id;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000021';
do $$ begin
 begin perform public.learning_response_review_access('00000000-0000-4000-8000-000000000052');
   raise exception 'expired request access worked';
 exception when others then if sqlerrm='expired request access worked' then raise; end if; end;
end $$;
rollback;
