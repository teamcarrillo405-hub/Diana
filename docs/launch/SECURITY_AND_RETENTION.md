# Security and Retention

## OWASP Review Scope

| Area | Diana control |
|------|---------------|
| Broken access control | Supabase RLS on student-owned tables; group collaboration data is membership-scoped. |
| Cryptographic issues | Supabase TLS at transport; profile backup encryption uses browser PBKDF2 and AES-GCM. |
| Injection | Server actions and Edge Functions use zod validation and structured Supabase APIs. |
| Insecure design | AI features are traffic-light gated, minor-safety prompted, and logged. |
| Security misconfiguration | Launch gate requires migration parity and secret verification before production AI rollout. |
| Vulnerable components | Dependency review is part of release gate before GA. |
| Identification/authentication | Supabase Auth owns identity, age gate, and OAuth callback handling. |
| Integrity issues | Student state changes go through server actions and RLS-backed writes. |
| Logging/monitoring | `ai_interactions`, monitoring routes, and `/insights` provide first-party audit surfaces. |
| SSRF | No user-controlled server fetch is added in v2 collaboration/privacy paths. |

## COPPA Deletion Flow

1. Student requests account deletion from `/export`.
2. Diana disables AI immediately by setting profile/class/assignment AI policy state off.
3. `data_deletion_requests` records the request and export offer.
4. A service-role scheduled job calls `purge_due_deletion_requests()` after 30 days.
5. The purge function removes rows with `owner_id` for that student, deletes the profile row, marks the request completed, and records a `data_retention_runs` audit row.

## Operational Requirement

Schedule `select public.purge_due_deletion_requests(now());` daily with service-role credentials. Do not expose this RPC to authenticated browser clients.
