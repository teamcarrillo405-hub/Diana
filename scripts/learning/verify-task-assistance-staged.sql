-- READ ONLY postflight. Expected: enforced=false, all privilege checks true.
SELECT enforced,installed_at FROM public.learning_task_assistance_control WHERE singleton;
SELECT
  NOT has_function_privilege('service_role','public.learning_activate_task_assistance()','EXECUTE') AS activation_operator_only,
  NOT has_function_privilege('service_role','public.learning_register_task(uuid,uuid,uuid,text,text,text,text,text)','EXECUTE') AS generic_registration_internal,
  NOT has_function_privilege('service_role','public.learning_task_reference(text)','EXECUTE') AS reference_internal,
  NOT has_function_privilege('service_role','public.learning_task_can_start(uuid,uuid,text)','EXECUTE') AS eligibility_internal,
  NOT has_function_privilege('service_role','public.learning_start_independent_pre_task_v1(uuid,uuid,text)','EXECUTE') AS previous_start_internal,
  NOT has_function_privilege('service_role','public.learning_record_attempt_pre_task_v1(uuid,jsonb,text,jsonb)','EXECUTE') AS previous_record_internal,
  has_function_privilege('service_role','public.learning_start_independent(uuid,uuid,text)','EXECUTE') AS current_start_service,
  has_function_privilege('service_role','public.learning_record_attempt(uuid,jsonb,text,jsonb)','EXECUTE') AS current_record_service,
  has_function_privilege('authenticated','public.learning_register_worksheet_task(uuid,uuid,text)','EXECUTE') AS worksheet_wrapper_authenticated,
  has_function_privilege('authenticated','public.learning_begin_assignment_assistance(uuid,uuid,text,text,text,uuid)','EXECUTE') AS assignment_help_authenticated,
  NOT has_table_privilege('service_role','public.learning_transfer_authorizations','INSERT,UPDATE,DELETE') AS review_operator_only,
  NOT has_table_privilege('authenticated','public.learning_assignment_assistance','INSERT,UPDATE,DELETE') AS no_direct_student_ledger_write,
  NOT has_table_privilege('service_role','public.learning_assignment_assistance','INSERT,UPDATE,DELETE') AS no_direct_runtime_ledger_write;
