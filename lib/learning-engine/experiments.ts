import { z } from "zod";
import { sha256 } from "./curriculum";

export const EXPERIMENT_ARMS = ["source_baseline","retrieval_fixed","retrieval_adaptive","without_verifier","without_learner_state"] as const;
export const experimentManifestSchema = z.object({
  id: z.string().uuid(), version: z.literal("high-school-learning-v1"),
  corpusHash: z.string().regex(/^[a-f0-9]{64}$/), codeRevision: z.string().min(7).max(80),
  model: z.string().min(1).max(100), promptVersion: z.string().min(1).max(100),
  arm: z.enum(EXPERIMENT_ARMS), split: z.literal("test"),
  maxOutputTokens: z.number().int().min(100).max(2000),
  maxInputBytes: z.number().int().min(1000).max(32000),
  maxBatchCents: z.number().int().min(1).max(1000),
  monthlyCapCents: z.literal(10000),
  humanReview: z.literal("pending"),
}).strict();
export type ExperimentManifest = z.infer<typeof experimentManifestSchema>;
export type EvaluationCase = {
  id: string;
  subject: "math" | "reading" | "stress";
  stratum: string;
  documentFamily: string;
  templateFamily: string;
  split: "train" | "development" | "test";
  prompt: string;
  source: string;
  expected: { answer: string | null; abstain: boolean };
  provenance: "authored_engineering_fixture";
  humanReviewed: false;
};
export const experimentOutputSchema=z.object({
  caseId:z.string().min(1),manifestId:z.string().uuid(),requestId:z.string().uuid(),model:z.string().min(1),
  output:z.string().min(1),startedAt:z.string().datetime(),completedAt:z.string().datetime(),tokens:z.number().int().nonnegative(),
  actualCents:z.number().int().nonnegative(),providerResponseId:z.string().min(1),synthetic:z.literal(false),
}).passthrough().refine(value=>Date.parse(value.completedAt)>=Date.parse(value.startedAt),"Completion predates start");
export type ExperimentOutput=z.infer<typeof experimentOutputSchema>;

/** Grouped split: no textbook or exercise template family may cross partitions. */
export function validateEvaluationCorpus(cases: EvaluationCase[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const families = new Map<string,string>();
  for (const item of cases) {
    if (ids.has(item.id)) errors.push("Duplicate case: " + item.id);
    ids.add(item.id);
    for (const key of ["document:" + item.documentFamily,"template:" + item.templateFamily]) {
      const split = families.get(key);
      if (split && split !== item.split) errors.push("Split leakage: " + key);
      families.set(key,item.split);
    }
    if (!item.prompt.trim() || !item.source.trim()) errors.push("Empty case: " + item.id);
  }
  return [...new Set(errors)];
}

/** Answer keys and evaluation provenance never enter provider prompts. */
export function experimentInput(item: EvaluationCase, manifest: ExperimentManifest, context?:{
  retrievedSource:string;retrievalMethod:"keyword"|"hybrid";studentResponse:string;verifier:unknown;learnerState:unknown;
}): string {
  if(manifest.arm!=="source_baseline"&&!context)throw new Error("This experiment arm requires an executed retrieval and assessment pipeline.");
  const source = manifest.arm === "source_baseline" ? item.source : context!.retrievedSource;
  const adaptive=manifest.arm==="retrieval_adaptive"||manifest.arm==="without_verifier";
  const content = JSON.stringify({ question: item.prompt, source,studentResponse:context?.studentResponse??"I need help starting.",
    verifier:manifest.arm==="without_verifier"||manifest.arm==="source_baseline"?null:context!.verifier,
    learnerState:adaptive?context!.learnerState:null,
    supportPolicy:adaptive?"Use the supplied support decision. Give the smallest useful hint.":"Give concise, source-grounded feedback.",
    responseFormat:"Return only JSON with answer (string or null), abstain (boolean), feedback (string), and quotes (array of exact source strings). Answer is an evaluation field; feedback is the student-facing guidance.",
  });
  if (new TextEncoder().encode(content).length > manifest.maxInputBytes) throw new Error("Case exceeds the shared input budget.");
  return content;
}

export function summarizeExperiment(cases: EvaluationCase[], outputs: ExperimentOutput[], manifest: ExperimentManifest) {
  const eligible = cases.filter((item) => item.split === "test");
  const expected = new Set(eligible.map((item) => item.id));
  const unique = new Map<string,ExperimentOutput>();
  const errors = validateEvaluationCorpus(cases);
  for (const output of outputs) {
    if (!experimentOutputSchema.safeParse(output).success || !expected.has(output.caseId) || output.manifestId !== manifest.id || output.model !== manifest.model
      || output.synthetic !== false || !output.providerResponseId || !Number.isFinite(output.tokens)
      || output.tokens < 0 || output.actualCents < 0 || !output.output.trim()
      || !Number.isFinite(Date.parse(output.completedAt)) || Date.parse(output.completedAt) < Date.parse(output.startedAt)) {
      errors.push("Invalid provider evidence: " + output.caseId); continue;
    }
    if (unique.has(output.caseId)) errors.push("Duplicate execution: " + output.caseId);
    unique.set(output.caseId,output);
  }
  return {
    status: errors.length ? "invalid" : unique.size !== eligible.length ? "incomplete" : "engineering_complete",
    expected: eligible.length, completed: unique.size,
    actualCents: [...unique.values()].reduce((sum,output) => sum+output.actualCents,0),
    humanReview: "pending", learningGainsEstablished: false, errors,
  };
}

export async function corpusDigest(cases: EvaluationCase[]): Promise<string> {
  return sha256(JSON.stringify([...cases].sort((a,b) => a.id.localeCompare(b.id))));
}
