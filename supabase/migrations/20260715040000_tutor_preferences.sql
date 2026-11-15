-- ScreenDesign tutor gallery and personalization preferences.
-- These settings shape presentation only. Safety, authorship, and class AI policy remain server enforced.

alter table public.profiles
  add column if not exists tutor_persona text not null default 'diana'
    check (tutor_persona in ('diana', 'xavier', 'maya')),
  add column if not exists tutor_style text not null default 'socratic'
    check (tutor_style in ('socratic', 'supportive', 'direct')),
  add column if not exists tutor_complexity text not null default 'balanced'
    check (tutor_complexity in ('simple', 'balanced', 'advanced'));

comment on column public.profiles.tutor_persona is
  'Student-selected tutor presentation. Does not change AI safety or authorship policy.';
comment on column public.profiles.tutor_style is
  'Preferred explanation style used by the study-buddy presentation layer.';
comment on column public.profiles.tutor_complexity is
  'Preferred explanation complexity, bounded by age and class context.';
