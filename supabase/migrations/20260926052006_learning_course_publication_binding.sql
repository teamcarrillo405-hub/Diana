-- Compare the server's exact current snapshot inside the database. A caller-supplied
-- hash alone must not label different course content as educator-approved.
drop function public.learning_course_publications();
create function public.learning_course_publications(p_expected jsonb) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then return '[]'::jsonb; end if;
 if jsonb_typeof(p_expected) is distinct from 'array' or jsonb_array_length(p_expected)>1000 or octet_length(p_expected::text)>10000000 then raise exception 'invalid_publication_manifest'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('course_id',m.course_id,'content_hash',m.content_hash,'status',
   case when m.payload is distinct from e.value->'payload' then 'suspended'
   when m.status='published' and learning_course_reviews_current(m.id) is distinct from true then 'suspended' else m.status end)),'[]'::jsonb)
 from learning_course_modules m join jsonb_array_elements(p_expected) e(value)
 on m.course_id=e.value->>'courseId' and m.content_hash=e.value->>'contentHash');
end; $$;
revoke all on function public.learning_course_publications(jsonb) from public,anon,authenticated;
grant execute on function public.learning_course_publications(jsonb) to authenticated;
