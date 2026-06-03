-- Phase 35: 5-bar study helper telemetry.
-- Records lightweight mode choices without mixing them into AI audit logs.

alter table public.task_signals
  drop constraint if exists task_signals_kind_check;

alter table public.task_signals
  add constraint task_signals_kind_check
  check (kind in (
    'energy',
    'completed',
    'dismissed',
    'started',
    'context_switch',
    'overwhelmed',
    'mood_checkin',
    'activity_log',
    'sleep_log',
    'study_helper_event'
  ));
