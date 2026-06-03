"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  COMPETITIVE_BENCHMARK_SCENARIOS,
  scoreCompetitiveBenchmark,
  type BenchmarkObservation,
} from "@/lib/benchmark/competitive";
import {
  scoreTeenProxySession,
  type TeenProxyObservation,
} from "@/lib/teen-testing/protocol";
import type { Json } from "@/lib/supabase/types";

const BenchmarkObservationInput = z.object({
  scenarioId: z.enum([
    "start_tired_focused",
    "math_first_step",
    "notes_to_cards_practice",
    "direct_answer_redirect",
    "authorship_proof",
    "generic_chat_comparison",
  ]),
  timeToFirstActionSeconds: z.number().nonnegative().nullable(),
  successfulNextMove: z.boolean(),
  sourceAnchorVisible: z.boolean(),
  finalWorkConfusion: z.boolean(),
  artifactCreated: z.boolean(),
  recallRecorded: z.boolean(),
  studentPreferredDiana: z.boolean(),
  teenNativeRating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});

const TeenObservationInput = z.object({
  taskId: z.enum([
    "start_tired_focused",
    "math_first_step",
    "notes_to_study",
    "direct_answer_refusal",
    "authorship_proof",
    "generic_chat_comparison",
  ]),
  completed: z.boolean(),
  understoodNextStep: z.boolean(),
  createdStudyArtifact: z.boolean().optional(),
  sawAuthorshipProof: z.boolean().optional(),
  interpretedAsDoingWork: z.boolean().optional(),
  describedAsTeenNative: z.boolean().optional(),
  fasterThanGenericChat: z.boolean().optional(),
});

export async function recordCompetitiveBenchmarkRun(input: {
  runLabel?: string;
  observations: z.input<typeof BenchmarkObservationInput>[];
}): Promise<{ ok: true; passed: boolean } | { ok: false; error: string }> {
  const parsed = z.object({
    runLabel: z.string().trim().max(120).optional(),
    observations: z.array(BenchmarkObservationInput).min(1).max(24),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check benchmark observations." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save benchmark results." };

  const observations = parsed.data.observations as BenchmarkObservation[];
  const score = scoreCompetitiveBenchmark(observations);
  const rows = observations.map((observation) => {
    const scenario = COMPETITIVE_BENCHMARK_SCENARIOS.find((item) => item.id === observation.scenarioId);
    return {
      owner_id: user.id,
      run_label: parsed.data.runLabel ?? "competitive benchmark",
      scenario_id: observation.scenarioId,
      competitor_pattern: scenario?.targetCompetitorPattern ?? "Diana benchmark",
      observations: observation as unknown as Json,
      score: score as unknown as Json,
      passed: score.passesProofGate,
    };
  });

  const { error } = await supabase.from("competitive_benchmark_runs").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, passed: score.passesProofGate };
}

export async function recordTeenTestObservation(input: {
  sessionLabel?: string;
  observations: z.input<typeof TeenObservationInput>[];
}): Promise<{ ok: true; passed: boolean } | { ok: false; error: string }> {
  const parsed = z.object({
    sessionLabel: z.string().trim().max(120).optional(),
    observations: z.array(TeenObservationInput).min(1).max(24),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check teen-test observations." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save teen-test results." };

  const observations = parsed.data.observations as TeenProxyObservation[];
  const score = scoreTeenProxySession(observations);
  const rows = observations.map((observation) => ({
    owner_id: user.id,
    session_label: parsed.data.sessionLabel ?? "teen proxy test",
    task_id: observation.taskId,
    observation: observation as unknown as Json,
    score: score as unknown as Json,
    no_pii: true,
  }));

  const { error } = await supabase.from("teen_test_observations").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, passed: score.passesAggressiveBar };
}
