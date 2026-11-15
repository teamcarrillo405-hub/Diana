BEGIN;
CREATE TABLE public.learning_rollout_cohorts (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled_features text[] NOT NULL DEFAULT '{}' CHECK (enabled_features <@ ARRAY['retrieval','assessment','offline']::text[]),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_rollout_cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY learning_cohort_read ON public.learning_rollout_cohorts FOR SELECT TO authenticated USING(owner_id=auth.uid());
REVOKE ALL ON public.learning_rollout_cohorts FROM anon,authenticated;
GRANT SELECT ON public.learning_rollout_cohorts TO authenticated;
GRANT ALL ON public.learning_rollout_cohorts TO service_role;
COMMIT;
