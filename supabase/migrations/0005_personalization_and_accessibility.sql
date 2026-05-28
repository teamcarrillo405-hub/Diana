-- Address slice 1 gaps from docs/review/slice-1-evidence-review.md:
-- onboarding state, ADHD/dyslexia profile, accessibility prefs, richer
-- assignment metadata for scoring and interrupt-recovery.

alter table public.profiles
  add column onboarded_at timestamptz,
  add column diagnoses text[] not null default '{}',
  add column accommodations text[] not null default '{}',
  add column school_year smallint check (school_year between 9 and 13),
  add column extra_time_pct smallint not null default 0 check (extra_time_pct between 0 and 100),
  add column font_size text not null default 'normal' check (font_size in ('small','normal','large','xlarge')),
  add column line_spacing text not null default 'normal' check (line_spacing in ('compact','normal','loose')),
  add column dyslexia_font boolean not null default false,
  add column reduced_motion boolean not null default false,
  add column high_contrast boolean not null default false,
  add column tts_enabled boolean not null default false;

alter table public.assignments
  add column kind text not null default 'other' check (kind in ('essay','lab','problem_set','presentation','test_prep','reading','other')),
  add column reading_load smallint not null default 1 check (reading_load between 0 and 5),
  add column writing_load smallint not null default 1 check (writing_load between 0 and 5),
  add column last_thought text;
