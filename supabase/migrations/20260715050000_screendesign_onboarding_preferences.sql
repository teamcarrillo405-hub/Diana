-- Store ScreenDesign onboarding answers without overloading legacy profile fields.
-- Both preferences are nullable so existing profiles and skipped questions remain valid.

alter table public.profiles
  add column if not exists learning_hurdle text
    check (
      learning_hurdle in (
        'time_management',
        'exam_stress',
        'complex_concepts',
        'staying_consistent'
      )
    ),
  add column if not exists study_schedule_preference text
    check (
      study_schedule_preference in (
        'morning',
        'after_practice',
        'late_night'
      )
    );

comment on column public.profiles.learning_hurdle is
  'Student-selected learning hurdle from ScreenDesign onboarding.';
comment on column public.profiles.study_schedule_preference is
  'Student-selected study schedule preference from ScreenDesign onboarding.';
