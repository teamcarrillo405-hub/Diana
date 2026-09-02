begin;

create or replace function public.save_practice_attempt(
  p_artifact_id uuid,
  p_assignment_id uuid,
  p_attempt_number integer,
  p_completed boolean,
  p_result jsonb,
  p_responses jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_id_value uuid;
  response_row jsonb;
  v_artifact_source_type text;
  v_artifact_source_id uuid;
begin
  if auth.uid() is null
     or p_attempt_number < 1
     or jsonb_typeof(p_result) <> 'object'
     or jsonb_typeof(p_responses) <> 'array' then
    return null;
  end if;

  select artifact.source_type, artifact.source_id
    into v_artifact_source_type, v_artifact_source_id
  from public.study_artifacts artifact
  where artifact.id = p_artifact_id
    and artifact.owner_id = auth.uid();

  if v_artifact_source_type is null then
    return null;
  end if;

  if v_artifact_source_type = 'assignment' then
    if p_assignment_id is distinct from v_artifact_source_id
       or not exists (
         select 1
         from public.assignments assignment
         where assignment.id = p_assignment_id
           and assignment.owner_id = auth.uid()
       ) then
      return null;
    end if;
  elsif v_artifact_source_type = 'note' then
    if not exists (
      select 1
      from public.notes note
      where note.id = v_artifact_source_id
        and note.owner_id = auth.uid()
        and (
          p_assignment_id is null
          or note.assignment_id = p_assignment_id
        )
    ) then
      return null;
    end if;

    if p_assignment_id is not null
       and not exists (
         select 1
         from public.assignments assignment
         where assignment.id = p_assignment_id
           and assignment.owner_id = auth.uid()
       ) then
      return null;
    end if;
  else
    return null;
  end if;

  insert into public.practice_attempts (
    owner_id, artifact_id, assignment_id, attempt_number, status,
    score, points_earned, points_possible, result, completed_at
  ) values (
    auth.uid(), p_artifact_id, p_assignment_id, p_attempt_number,
    case when p_completed then 'completed' else 'in_progress' end,
    nullif(p_result ->> 'percentage', '')::numeric,
    coalesce((p_result ->> 'pointsEarned')::integer, 0),
    coalesce((p_result ->> 'pointsPossible')::integer, 0),
    p_result,
    case when p_completed then now() else null end
  )
  on conflict (owner_id, artifact_id, attempt_number) do update
    set assignment_id = excluded.assignment_id,
        status = excluded.status,
        score = excluded.score,
        points_earned = excluded.points_earned,
        points_possible = excluded.points_possible,
        result = excluded.result,
        completed_at = coalesce(public.practice_attempts.completed_at, excluded.completed_at),
        updated_at = now()
  returning id into attempt_id_value;

  for response_row in select value from jsonb_array_elements(p_responses)
  loop
    if coalesce(response_row ->> 'response', '') <> '' then
      insert into public.practice_responses (
        attempt_id, question_index, response, result_category, scored,
        points_earned, explanation, source_anchor
      ) values (
        attempt_id_value,
        (response_row ->> 'questionIndex')::integer,
        response_row ->> 'response',
        response_row ->> 'category',
        coalesce((response_row ->> 'scored')::boolean, false),
        nullif(response_row ->> 'pointsEarned', '')::integer,
        coalesce(response_row ->> 'explanation', ''),
        coalesce(response_row ->> 'sourceAnchor', '')
      )
      on conflict (attempt_id, question_index) do update
        set response = excluded.response,
            result_category = excluded.result_category,
            scored = excluded.scored,
            points_earned = excluded.points_earned,
            explanation = excluded.explanation,
            source_anchor = excluded.source_anchor,
            answered_at = now();
    end if;
  end loop;

  return attempt_id_value;
end;
$$;

revoke all on function public.save_practice_attempt(uuid, uuid, integer, boolean, jsonb, jsonb) from public;
grant execute on function public.save_practice_attempt(uuid, uuid, integer, boolean, jsonb, jsonb) to authenticated;

comment on function public.save_practice_attempt(uuid, uuid, integer, boolean, jsonb, jsonb) is
  'Persists student practice attempts only when the artifact and optional assignment belong to the caller and match the artifact source.';

commit;