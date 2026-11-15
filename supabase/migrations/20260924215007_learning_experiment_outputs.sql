BEGIN;
CREATE TABLE public.learning_experiment_outputs (
  request_id uuid PRIMARY KEY REFERENCES public.learning_experiment_reservations(id),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_hash text NOT NULL,
  manifest jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_experiment_outputs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_experiment_outputs FROM anon,authenticated;
GRANT ALL ON public.learning_experiment_outputs TO service_role;
COMMIT;
