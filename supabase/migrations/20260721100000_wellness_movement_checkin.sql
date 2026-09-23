alter table public.sleep_logs
  add column if not exists movement_20_min boolean;
