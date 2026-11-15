import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withStudentSecurity } from "../_shared/student-handler.ts";
import { requireStudentContext } from "../_shared/student-auth.ts";
import { learningBody } from "../_shared/learning/rollout.ts";
import { runSafeBudgetedAiCall, logInteraction } from "../_shared/safety.ts";
import { APPROVED_HYBRID_PLAN } from "../_shared/learning/hybrid-approved-fixtures.ts";
import { createHybridExperimentHandler } from "../_shared/learning/hybrid-experiment-handler.ts";

Deno.serve(withStudentSecurity("hybrid-learning-experiment", createHybridExperimentHandler({
  plan: APPROVED_HYBRID_PLAN,
  env: name => Deno.env.get(name),
  authenticate: requireStudentContext,
  readBody: learningBody,
  guard: runSafeBudgetedAiCall,
  fetch,
  logInteraction,
})));
