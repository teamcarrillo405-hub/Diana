BEGIN;
CREATE FUNCTION public.learning_list_exercises(p_assignment uuid,p_versions text[])
RETURNS TABLE(id text,version_id text,skill_id text,prompt text,reviewed boolean,next_revision integer,practice_check jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT e.id,e.version_id,e.skill_id,e.prompt,e.reviewed,
    (SELECT coalesce(max(a.revision),0)+1 FROM public.learning_attempts a WHERE a.owner_id=auth.uid() AND a.problem_id=e.id AND a.assignment_id=e.assignment_id),
    CASE WHEN e.specification->>'kind'='equation_value' AND coalesce(e.specification->>'variable','x')='x'
      THEN jsonb_build_object('kind','equation_value','reference',e.specification->>'equation')
      WHEN e.specification->>'kind'='reading'
      THEN jsonb_build_object('kind','reading','rubric',e.specification->'rubric')
      ELSE NULL END
  FROM public.learning_exercises e
  JOIN public.assignments a ON a.id=e.assignment_id AND a.owner_id=e.owner_id
  WHERE e.owner_id=auth.uid() AND e.assignment_id=p_assignment AND e.version_id=ANY(p_versions)
  ORDER BY e.id LIMIT 30;
$$;
REVOKE ALL ON FUNCTION public.learning_list_exercises(uuid,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.learning_list_exercises(uuid,text[]) TO authenticated;
COMMIT;
