# Diana Operational Alerts Runbook

This runbook covers aggregate production signals only. Do not paste student
content, user identifiers, assignment identifiers, provider payloads, or access
tokens into alerts, tickets, chat, or incident notes.

The example Prometheus rules intentionally set every `owner_status` label to
`unassigned`. That is a truthful deployment blocker, not an owner assignment.
Routing is ready only after a human approves a named on-call rotation and tests
the receiver.

## Ownership and routing template

Copy one record per alert into the operating team's controlled configuration.
Leave `owner_status` as `unassigned` until every required field is complete.

```yaml
alert: DianaReadinessFailure
owner_status: unassigned # allowed: unassigned, assigned
owner: ""                # required only when owner_status is assigned
backup_owner: ""         # required only when owner_status is assigned
receiver: ""             # Alertmanager receiver name
escalation_receiver: ""
approved_by: ""
approved_at: ""          # ISO 8601
receiver_tested_at: ""   # ISO 8601
runbook_path: docs/operations/operational-alerts-runbook.md#readiness-failure
```

Do not change `owner_status` to `assigned` from a team guess, repository
membership, or an unverified paging alias. A valid assignment needs a named
rotation, backup rotation, approval, and a successful receiver test.

## Common first response

1. Acknowledge the alert and record its exact labels, start time, and current
   aggregate values.
2. Confirm the metrics endpoints are reachable with the backend bearer token.
3. Check whether a deployment, database change, scheduler change, or worker
   rollout overlaps the alert start.
4. Preserve ledger rows and aggregate metrics. Do not delete or rewrite evidence.
5. Escalate before any action that can repeat an external submission or purge
   retained data.

## Readiness failure

Signal: `diana_operational_readiness == 0` for 2 minutes.

Check `/api/readiness` and the per-check metrics for configuration, auth,
database, and storage. If configuration is the failing check, compare runtime
environment names without printing values. If a dependency is failing, stop
rollouts and follow the recovery verification in
`docs/launch/DISASTER_RECOVERY_RUNBOOK.md`. Recovery requires a fresh 200 from
`/api/readiness`, not only a healthy process.

## Operational metrics incomplete

Signal: any `diana_operational_metrics_source_available` series is 0 for 5
minutes.

Verify the service-role environment is present, the cron health RPC exists, and
the Prometheus bearer token matches `WORKER_API_TOKEN`. A 200 scrape with a
source value of 0 is intentionally unhealthy. Do not silence readiness, cron,
or submission alerts merely because their source is unavailable.

## Cron success stale

Signal: an expected job has no recorded success, or its last success age exceeds
the per-job `diana_cron_stale_after_seconds` metric for 5 minutes.

Compare `vercel.json` schedule to `cron_job_runs`. Check recent failed or partial
runs and safe `error_code` values. Trigger a manual run only through the normal
authenticated cron path and only when the job is idempotent. Confirm a new
`succeeded` ledger row before resolving the alert.

## Cron run stuck

Signal: a job has a running ledger row older than its per-job
`diana_cron_stuck_after_seconds` metric for 5 minutes.

Check whether the scheduler request is still active and whether the run has a
newer replacement. Do not edit the running row to successful. If the process is
gone, preserve the stale row, investigate the underlying operation, and use a
fresh authenticated run as recovery evidence.

## Retry signal

Signal: `diana_cron_retry_signaled_24h > 0` for 5 minutes.

Identify the job from labels, review aggregate retry counts in the ledger, and
check the dependent service. A retry signal is not proof of data loss. Keep the
alert open until the job records a clean success and the underlying retry queue
is draining.

## Dead-letter signal

Signal: `diana_cron_dead_letter_signaled_24h > 0` for 2 minutes.

Treat dead letters as durable recovery work. Capture the job name, safe error
code, count, and age. Follow the job-specific recovery procedure. Never replay
an external submission from a dead letter without reconciliation evidence that
the first attempt was not accepted.

## Worker queue backlog

Signal: more than 50 queued jobs for 10 minutes.

Check replica readiness, claim latency, rate limits, and queue age. Follow the
worker rollback procedure in `docs/operations/diana-worker-production-runbook.md`.
Keep workers running while the queue drains. Confirm both queue count and oldest
age return below threshold.

## Worker queue age

Signal: oldest queued age exceeds 5 minutes for 5 minutes.

An old item can be hidden by a modest queue count, so inspect claim health and
worker capacity even when backlog is below 50. Confirm the oldest age decreases
after recovery.

## Worker running age

Signal: oldest running age exceeds 10 minutes for 5 minutes.

Check lease recovery, worker process health, and completion endpoint errors.
Do not mark a lease complete manually. Use the existing lease-recovery behavior
and verify the item is reclaimed or safely finalized.

## Worker running lease backlog

Signal: more than 20 running leases for 10 minutes.

Compare the running count with worker replica health and the oldest running age.
Use lease recovery for expired work and verify active work continues to report
heartbeats. Do not complete or delete leases directly in the database.

## Worker retries

Signal: more than 20 retries in the 15-minute metrics window for 10 minutes.

Correlate retries with rate limits, dependency availability, and running age.
If retry volume grows with backlog, stop cohort expansion and use the worker
rollback procedure.

## Worker errors

Signal: one or more aggregate worker errors for 5 minutes.

Review safe operational error codes and worker logs. Do not enable tenant-level
Prometheus labels during incident response. Resolve only after the error window
clears and a deployed-worker canary succeeds.

## Worker tenant errors

Signal: one or more tenants have worker errors for 5 minutes.

Use the aggregate count to start triage, then inspect privacy-safe operational
events in the protected backend. Do not add tenant identifiers to Prometheus
labels. Confirm the affected tenant count returns to zero after the canary.

## Ambiguous submission backlog

Signals: more than 5 `confirmation_pending` receipts for 10 minutes, or the
oldest receipt is more than 15 minutes old for 10 minutes.

Pause submission rollout expansion. Use receipt reconciliation to determine
whether the external system accepted each operation. Do not retry the provider
write from the alert path. Escalate for controlled reconciliation, then verify
both aggregate count and oldest age return below threshold.

## External monitoring prerequisites

- Prometheus Operator CRDs and a Prometheus instance that selects the example
  `ServiceMonitor` and `PrometheusRule` resources.
- A Kubernetes Service labeled `app.kubernetes.io/name: diana-web` in the
  `production` namespace, with both metrics paths reachable over HTTPS.
- A `diana-worker-metrics-token` Secret whose token matches the application
  `WORKER_API_TOKEN`.
- Alertmanager receivers, inhibition rules, and paging routes. The repository
  example does not assign or configure an owner.
- Published runbook URLs or monitoring UI support for repository-relative
  `runbook_path` annotations.
- The `20260731205000_cron_run_observability.sql` migration applied and all
  scheduled routes running through the cron ledger wrapper.
- Retention for Prometheus and `cron_job_runs` sufficient for incident review.
