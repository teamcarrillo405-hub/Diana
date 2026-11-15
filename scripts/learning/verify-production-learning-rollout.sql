-- Read-only catalog verification after the two approved September 27 rollouts.
-- Does not inspect student content, signing key values, or provider credentials.
begin read only;
select c.relname, c.relrowsecurity,
  has_table_privilege('anon',c.oid,'SELECT') as anon_select,
  has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select,
  has_table_privilege('service_role',c.oid,'SELECT') as service_select,
  has_table_privilege('service_role',c.oid,'INSERT,UPDATE,DELETE') as service_direct_write
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='learning_experiment_provider_receipts';

select n.nspname, p.proname, p.prosecdef, p.proconfig,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname='public' and p.proname in
  ('learning_recognition_provenance_ready','learning_start_experiment_provider',
   'learning_record_experiment_usage','learning_record_experiment_output_state'))
  or (n.nspname='diana_private' and p.proname='verify_learning_recognition_revision')
order by n.nspname,p.proname;

select t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) as definition
from pg_trigger t
where t.tgrelid='public.learning_problem_revisions'::regclass
  and t.tgname='learning_recognition_provenance_guard' and not t.tgisinternal;

select has_schema_privilege('anon','diana_private','USAGE') as anon_private_usage,
  has_schema_privilege('authenticated','diana_private','USAGE') as authenticated_private_usage,
  has_table_privilege('anon','diana_private.learning_recognition_key','SELECT') as anon_key_read,
  has_table_privilege('authenticated','diana_private.learning_recognition_key','SELECT') as authenticated_key_read;
rollback;
