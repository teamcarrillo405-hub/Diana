-- Original rubric and syllabus files remain private course material. Parsed
-- text stays separate so the student can retain the teacher's source file.
alter table public.rubrics
  add column if not exists storage_bucket text,
  add column if not exists storage_key text,
  add column if not exists mime_type text,
  add column if not exists original_filename text;

alter table public.class_syllabi
  add column if not exists source_kind text not null default 'paste'
    check (source_kind in ('paste', 'upload')),
  add column if not exists storage_bucket text,
  add column if not exists storage_key text,
  add column if not exists mime_type text,
  add column if not exists original_filename text;

create index if not exists rubrics_storage_key_idx
  on public.rubrics(storage_key)
  where storage_key is not null;
create index if not exists class_syllabi_storage_key_idx
  on public.class_syllabi(storage_key)
  where storage_key is not null;
