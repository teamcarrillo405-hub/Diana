-- Grade-delivery receipts are mutated only through owner-scoped RPCs.
-- RLS does not protect TRUNCATE, so remove every direct write privilege.

revoke insert, update, delete, truncate
on table public.lms_grade_sync_receipts
from public, anon, authenticated;
