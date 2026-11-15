-- Cache auth.uid() once per statement in straightforward RLS policies. This
-- keeps the policy predicate identical while avoiding one auth lookup per row.

set lock_timeout = '5s';
set statement_timeout = '60s';

do $$
declare
  policy_record record;
  optimized_qual text;
  optimized_check text;
  alter_statement text;
begin
  for policy_record in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        (
          coalesce(qual, '') like '%auth.uid()%'
          and coalesce(qual, '') !~* 'select[[:space:]]+auth[.]uid[(][)]'
        )
        or (
          coalesce(with_check, '') like '%auth.uid()%'
          and coalesce(with_check, '') !~* 'select[[:space:]]+auth[.]uid[(][)]'
        )
      )
  loop
    optimized_qual := policy_record.qual;
    optimized_check := policy_record.with_check;

    if optimized_qual is not null
      and optimized_qual !~* 'select[[:space:]]+auth[.]uid[(][)]' then
      optimized_qual := replace(
        optimized_qual,
        'auth.uid()',
        '(select auth.uid())'
      );
    end if;

    if optimized_check is not null
      and optimized_check !~* 'select[[:space:]]+auth[.]uid[(][)]' then
      optimized_check := replace(
        optimized_check,
        'auth.uid()',
        '(select auth.uid())'
      );
    end if;

    alter_statement := format(
      'alter policy %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
    if optimized_qual is not null then
      alter_statement := alter_statement || format(' using (%s)', optimized_qual);
    end if;
    if optimized_check is not null then
      alter_statement := alter_statement || format(
        ' with check (%s)',
        optimized_check
      );
    end if;

    execute alter_statement;
  end loop;
end;
$$;
