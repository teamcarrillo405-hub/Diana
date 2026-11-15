-- Transactional synthetic identities and content. No educator qualification is asserted.
begin;
do $$
declare actor uuid:=gen_random_uuid(); reviewer_one uuid:=gen_random_uuid(); reviewer_two uuid:=gen_random_uuid(); module_id uuid; snapshot jsonb;
begin
 insert into auth.users(id,email,raw_user_meta_data) values(actor,'course-operator-'||actor||'@example.invalid','{"date_of_birth":"1990-01-01"}'),(reviewer_one,'course-rater-'||reviewer_one||'@example.invalid','{"date_of_birth":"1990-01-01"}'),(reviewer_two,'course-rater-'||reviewer_two||'@example.invalid','{"date_of_birth":"1990-01-01"}');
 insert into public.learning_editor_access(user_id,roles,subjects,qualification_ref,verified_by,expires_at) values
 (actor,array['operator','reviewer'],array['science'],'synthetic-only-operator','contract-test',now()+interval '1 hour'),
 (reviewer_one,array['reviewer'],array['science'],'synthetic-only-rater-1','contract-test',now()+interval '1 hour'),
 (reviewer_two,array['reviewer'],array['science'],'synthetic-only-rater-2','contract-test',now()+interval '1 hour');
 snapshot:='{"version":"course-module-v1","courseId":"contract-test","framework":{"courses":[{"id":"contract-test","subject":"science"}]},"activities":[{}]}'::jsonb;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 module_id:=public.learning_register_course('contract-test',repeat('a',64),snapshot);
 if module_id<>public.learning_register_course('contract-test',repeat('a',64),snapshot) then raise exception 'idempotent registration'; end if;
 begin perform public.learning_register_course('contract-test',repeat('a',64),snapshot||'{"changed":true}'::jsonb);raise exception 'expected conflict';exception when raise_exception then if sqlerrm<>'module_hash_conflict' then raise; end if;end;
 begin perform public.learning_set_course_publication(module_id,'publish','contract test');raise exception 'expected missing review';exception when raise_exception then if sqlerrm<>'current_independent_approval_required' then raise; end if;end;
 begin perform public.learning_review_course(module_id,'{"accuracy":true,"sourceRights":true,"instruction":true,"accessibility":true,"safety":true}','Synthetic test only, not an educator approval.',true);raise exception 'expected self review denied';exception when raise_exception then if sqlerrm<>'independent_review_required' then raise; end if;end;
 perform set_config('request.jwt.claim.sub',reviewer_one::text,true);
 begin perform public.learning_set_course_publication(module_id,'publish','contract test');raise exception 'expected role denied';exception when raise_exception then if sqlerrm<>'publication_access_denied' then raise; end if;end;
 begin perform public.learning_review_course(module_id,'{"accuracy":true}','Synthetic test only, not an educator approval.',true);raise exception 'expected missing criteria';exception when raise_exception then if sqlerrm<>'complete_review_required' then raise; end if;end;
 perform public.learning_review_course(module_id,'{"accuracy":true,"sourceRights":true,"instruction":true,"accessibility":true,"safety":true}','Synthetic test only, not an educator approval.',true);
 begin perform public.learning_review_course(module_id,'{"accuracy":true,"sourceRights":true,"instruction":true,"accessibility":true,"safety":true}','Synthetic test only, not an educator approval.',true);raise exception 'expected duplicate';exception when unique_violation then null;end;
 perform set_config('request.jwt.claim.sub',reviewer_two::text,true);
 perform public.learning_review_course(module_id,'{"accuracy":true,"sourceRights":true,"instruction":true,"accessibility":true,"safety":true}','Synthetic test only, not an educator approval.',true);
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform public.learning_set_course_publication(module_id,'publish','Synthetic publication check');
 if public.learning_course_publications(jsonb_build_array(jsonb_build_object('courseId','contract-test','contentHash',repeat('a',64),'payload',snapshot)))#>>'{0,status}'<>'published' then raise exception 'publication unavailable'; end if;
 if public.learning_course_publications(jsonb_build_array(jsonb_build_object('courseId','contract-test','contentHash',repeat('a',64),'payload',snapshot||'{"changed":true}'::jsonb)))#>>'{0,status}'<>'suspended' then raise exception 'forged hash accepted'; end if;
 update public.learning_editor_access set revoked_at=now() where user_id=reviewer_two;
 if public.learning_course_publications(jsonb_build_array(jsonb_build_object('courseId','contract-test','contentHash',repeat('a',64),'payload',snapshot)))#>>'{0,status}'<>'suspended' then raise exception 'revoked approval accepted'; end if;
 perform public.learning_set_course_publication(module_id,'withdraw','Synthetic withdrawal check');
 if public.learning_course_publications(jsonb_build_array(jsonb_build_object('courseId','contract-test','contentHash',repeat('a',64),'payload',snapshot)))#>>'{0,status}'<>'withdrawn' then raise exception 'withdrawal unavailable'; end if;
 if (select count(*) from learning_course_events where actor_id=actor)<3 then raise exception 'missing audit trail'; end if;
 perform set_config('test.module',module_id::text,true);
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 if public.learning_editor_profile() is not null then raise exception 'unregistered editor'; end if;
end; $$;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.learning_course_modules where id=current_setting('test.module')::uuid) then raise exception 'student can read answers'; end if;
 begin insert into public.learning_editor_access(user_id,roles,subjects,qualification_ref,verified_by,expires_at) values(auth.uid(),array['operator'],array['science'],'untrusted','untrusted',now()+interval '1 hour');raise exception 'student granted editor';exception when insufficient_privilege then null;end;
 begin update public.learning_course_modules set status='published';raise exception 'student published directly';exception when insufficient_privilege then null;end;
end; $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.learning_register_course(text,text,jsonb)','execute') or has_function_privilege('authenticated','public.learning_course_reviews_current(uuid)','execute') then raise exception 'unexpected RPC grants';end if;
end; $$;
rollback;
