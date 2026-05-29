-- Phase 7 — Slice 6 polish.
-- T2-01: assignment_templates table + 3 seed rows (DBQ, CER, 5-para essay).
-- T2-02: NO new columns; assignments.reading_load already exists since 0006.
-- NOTE: assignment_checklists table added here (was planned for 0008 area but
--       not shipped in prior migrations; required for template checklist seeding).

create table public.assignment_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  kind            text not null,            -- 'essay' | 'lab' | 'problem_set' | 'presentation' | 'test_prep' | 'reading' | 'other'
  checklist_items jsonb not null default '[]'::jsonb,
  rubric_items    jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

alter table public.assignment_templates enable row level security;

-- Global read access — templates are shared across all users.
create policy "assignment_templates: read for any authenticated user"
  on public.assignment_templates
  for select
  using (auth.uid() is not null);

-- Seed rows.

insert into public.assignment_templates (name, kind, checklist_items, rubric_items) values
  (
    'DBQ (Document-Based Question)',
    'essay',
    '[
      {"label": "Thesis takes a clear position on the prompt", "required": true},
      {"label": "Every paragraph uses at least one document as evidence", "required": true},
      {"label": "Outside historical context appears in the intro or conclusion", "required": true},
      {"label": "At least one document is sourced (POV, audience, purpose, or context)", "required": true},
      {"label": "Conclusion ties back to the thesis without restating it word-for-word", "required": false}
    ]'::jsonb,
    '[
      {"criterion": "Thesis", "weight": 1},
      {"criterion": "Contextualization", "weight": 1},
      {"criterion": "Evidence (documents)", "weight": 2},
      {"criterion": "Sourcing", "weight": 1},
      {"criterion": "Complex understanding", "weight": 1}
    ]'::jsonb
  ),
  (
    'CER (Claim-Evidence-Reasoning)',
    'lab',
    '[
      {"label": "Claim answers the question in one sentence", "required": true},
      {"label": "Evidence is specific data from the experiment (numbers + units)", "required": true},
      {"label": "Reasoning links the evidence back to the underlying science principle", "required": true},
      {"label": "Counter-evidence or limitations are acknowledged", "required": false}
    ]'::jsonb,
    '[
      {"criterion": "Claim", "weight": 1},
      {"criterion": "Evidence", "weight": 2},
      {"criterion": "Reasoning", "weight": 2}
    ]'::jsonb
  ),
  (
    '5-Paragraph Essay',
    'essay',
    '[
      {"label": "Intro paragraph ends with a thesis", "required": true},
      {"label": "Three body paragraphs, each opens with a topic sentence", "required": true},
      {"label": "Each body paragraph has at least one piece of evidence", "required": true},
      {"label": "Transitions connect each paragraph to the next", "required": false},
      {"label": "Conclusion echoes the thesis in different words", "required": true}
    ]'::jsonb,
    '[
      {"criterion": "Thesis clarity", "weight": 1},
      {"criterion": "Evidence quality", "weight": 2},
      {"criterion": "Organization", "weight": 1},
      {"criterion": "Mechanics", "weight": 1}
    ]'::jsonb
  );

create index assignment_templates_kind_idx
  on public.assignment_templates (kind);

-- assignment_checklists: per-assignment custom checklist (template-seeded or user-created).
-- This table was referenced in Phase 3/4 planning but not shipped in prior migrations.
create table public.assignment_checklists (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  items           jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);

alter table public.assignment_checklists enable row level security;

create policy "assignment_checklists: owner full access"
  on public.assignment_checklists
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index assignment_checklists_assignment_idx
  on public.assignment_checklists (assignment_id);
