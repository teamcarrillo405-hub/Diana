-- Phase 4 F19: reading font picker preference
-- Values: 'system' | 'lexend' | 'atkinson' | 'opendyslexic'
alter table public.profiles
  add column reading_font text not null default 'system'
    check (reading_font in ('system', 'lexend', 'atkinson', 'opendyslexic'));
