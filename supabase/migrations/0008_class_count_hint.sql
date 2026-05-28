-- Phase 2 GAP-02: capture estimated class load during onboarding. Used
-- later for "Sunday-night cliff" detection (deferred) and for personalizing
-- the dashboard density when 6+ classes are reported.

alter table public.profiles
  add column class_count_hint smallint check (class_count_hint between 1 and 8);
