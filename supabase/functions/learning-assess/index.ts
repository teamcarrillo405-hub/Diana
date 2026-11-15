import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@3.23.8";
import { withStudentSecurity } from "../_shared/student-handler.ts";
import { requireStudentContext } from "../_shared/student-auth.ts";
import { checkEquationValue, checkEquivalentExpressions, VERIFIER_VERSION, type AssessmentResult } from "../_shared/learning/algebra.ts";
import { assessReading } from "../_shared/learning/reading.ts";
import { learningAccess,learningBody } from "../_shared/learning/rollout.ts";
import {checkAdvancedMath} from "../_shared/learning/advanced-math.ts";

const attemptSchema = z.object({
  sessionId:z.string().uuid().optional(),
  id: z.string().uuid(), assignmentId: z.string().uuid(), problemId: z.string().min(1).max(200),
  skillId: z.string().min(1).max(200), revision: z.number().int().min(1).max(10000),
  subject: z.enum(["math", "reading"]), input: z.string().min(1).max(4000),
  assistance: z.enum(["independent", "hinted", "example_assisted", "unverified"]),
  modality: z.enum(["typed", "handwriting", "voice"]), confirmed: z.boolean(),
  documentVersionIds: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(12),
}).strict();
const specificationSchema = z.discriminatedUnion("kind", [
  z.object({kind:z.literal("solution_set"),equation:z.string().max(2000),variable:z.string().regex(/^[a-z]$/i).default("x")}).strict(),
  z.object({kind:z.literal("rational_expression"),reference:z.string().max(1000),variable:z.string().regex(/^[a-z]$/i).default("x")}).strict(),
  z.object({kind:z.literal("linear_system"),equations:z.tuple([z.object({x:z.string().max(100),y:z.string().max(100),constant:z.string().max(100)}).strict(),z.object({x:z.string().max(100),y:z.string().max(100),constant:z.string().max(100)}).strict()])}).strict(),
  z.object({kind:z.literal("geometry_measure"),shape:z.enum(["rectangle_area","triangle_area","triangle_angle","right_triangle_hypotenuse"]),givens:z.tuple([z.string().max(100),z.string().max(100)]),unit:z.enum(["cm","m","degrees"])}).strict(),
  z.object({ kind: z.literal("equivalent_expression"), reference: z.string().max(1000), variable: z.string().regex(/^[a-z]$/i).default("x") }).strict(),
  z.object({ kind: z.literal("equation_value"), equation: z.string().max(2000), variable: z.string().regex(/^[a-z]$/i).default("x"), solutionSetComplete: z.literal(false) }).strict(),
  z.object({ kind: z.literal("reading"), rubric: z.array(z.string().max(500)).min(1).max(10) }).strict(),
]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(withStudentSecurity("learning-assess", async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const parsed = attemptSchema.safeParse(await learningBody(request));
  if (!parsed.success) return json({ error: "The attempt needs a problem and revision." }, 400);
  const attempt = parsed.data;
  const auth = await requireStudentContext(request, { assignmentId: attempt.assignmentId, requireAiGreen: true });
  if (auth instanceof Response) return auth;
  if (!await learningAccess("assessment",auth.ownerId,auth.userClient)) {
    return json({ error: "Learning assessment is not enabled for this account." }, 404);
  }
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(attempt)));
  const hash = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const existing = await auth.serviceClient.from("learning_attempts").select("payload_hash,assessment")
    .eq("id", attempt.id).eq("owner_id", auth.ownerId).maybeSingle();
  if (existing.error) return json({ error: "Attempt storage is unavailable." }, 503);
  if (existing.data) return existing.data.payload_hash === hash
    ? json({ ok: true, replayed: true, assessment: existing.data.assessment })
    : json({ error: "This attempt ID already belongs to another revision." }, 409);
  const exercise = await auth.serviceClient.from("learning_exercises").select("*")
    .eq("id", attempt.problemId).eq("owner_id", auth.ownerId).eq("assignment_id", attempt.assignmentId).maybeSingle();
  if (exercise.error) return json({ error: "Problem access could not be checked." }, 503);
  if (!exercise.data || exercise.data.skill_id !== attempt.skillId || !attempt.documentVersionIds.includes(exercise.data.version_id)) {
    return json({ error: "Open the current source version for this problem." }, 409);
  }
  const specification = specificationSchema.safeParse(exercise.data.specification);
  if (!specification.success) return json({ error: "This problem needs a supported assessment." }, 422);
  let assessment: AssessmentResult = {
    status: attempt.confirmed ? "inconclusive" : "needs_confirmation", outcome: "unknown",
    claim: "This attempt has not been independently verified.", checkedInput: attempt.input,
    verifierVersion: VERIFIER_VERSION, observations: [], limitations: [], eligibleForKnowledge: false,
  };
  if (!attempt.confirmed) assessment.limitations.push("Confirm the captured work before assessment.");
  else if (["solution_set","rational_expression","linear_system","geometry_measure"].includes(specification.data.kind) && attempt.subject === "math"
    && specification.data.kind !== "equation_value" && specification.data.kind !== "equivalent_expression" && specification.data.kind !== "reading") {
    assessment = checkAdvancedMath(specification.data, attempt.input);
  }
  else if (specification.data.kind === "equivalent_expression" && attempt.subject === "math") {
    assessment = checkEquivalentExpressions(specification.data.reference, attempt.input, specification.data.variable);
  } else if (specification.data.kind === "equation_value" && attempt.subject === "math") {
    assessment = checkEquationValue(specification.data.equation, attempt.input, specification.data.variable);
  } else if (specification.data.kind === "reading" && attempt.subject === "reading") {
    const document = await auth.serviceClient.from("learning_documents").select("pages")
      .eq("id",exercise.data.version_id).eq("owner_id",auth.ownerId).eq("assignment_id",attempt.assignmentId).maybeSingle();
    if (document.error || !document.data) return json({ error: "Source access could not be checked." },503);
    try {
      assessment = await assessReading({
        skillId: attempt.skillId, response: attempt.input, pages: document.data.pages,
      });
    } catch (error) {
      if (error instanceof Response) return error;
      assessment.limitations.push("Reading feedback is unavailable right now.");
    }
  } else {
    assessment.limitations.push("Interpretive reading assessment remains provisional until a reviewed evaluator is available.");
  }
  // Self-reported independence is not enough to create trusted mastery evidence.
  // The atomic writer checks reviewed references, first attempts, one-use sessions
  // and recorded in-app help. It cannot rule out assistance outside Diana.
  assessment.eligibleForKnowledge = false;
  if(attempt.sessionId)assessment.limitations.push("Independent evidence covers this first in-app attempt only; outside assistance cannot be ruled out.");
  if (!exercise.data.reviewed) assessment.limitations.push("The reference specification still needs educator review.");
  const saved = await auth.serviceClient.rpc("learning_record_attempt", {
    p_owner: auth.ownerId, p_attempt: attempt, p_hash: hash, p_assessment: assessment,
  });
  if (saved.error) return json({ error: saved.error.code === "23505"
    ? "A revision is already saved. Keep this draft and reopen the problem." : "The attempt could not be saved." }, saved.error.code === "23505" ? 409 : 503);
  return json({ ok: true, assessment: saved.data?.assessment ?? assessment, replayed: saved.data?.replayed === true });
}));
