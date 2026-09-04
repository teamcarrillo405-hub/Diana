begin;

-- The retention ledger is written only by the scheduled deletion worker. RLS
-- blocks rows without policies, but explicit grants prevent a future policy
-- change from accidentally exposing deletion-audit metadata to client roles.
revoke all on table public.data_retention_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.data_retention_runs to service_role;

commit;
