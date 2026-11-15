import { sha256 } from "./curriculum";
import { highSchoolLearningCorpus } from "./evaluation-corpus";
import { buildTrainingExport, trainingExampleSchema, trainingReceiptSchema } from "./training";
import { buildLocalLoraHeldout, extractTrainingQuestion, nearDuplicateText, textFingerprints } from "./local-lora-evaluation";

export const LOCAL_LORA_MODEL = "Qwen/Qwen3-4B-Instruct-2507" as const;

/** A manifest binds local adapter training to the exact gated export. It is not a model approval. */
export async function prepareLocalLoraDataset(rawExamples: unknown[], rawReceipts: unknown[], now = Date.now()) {
  const heldOut = highSchoolLearningCorpus();
  const result = await buildTrainingExport(rawExamples, heldOut, rawReceipts, now);
  if (result.status !== "ready_for_capability_review" || !result.jsonl || !result.hash || result.accepted === 0) {
    return { status: "blocked" as const, rejected: result.rejected };
  }
  const examples = rawExamples.map((value) => trainingExampleSchema.parse(value));
  const receipts = rawReceipts.map((value) => trainingReceiptSchema.parse(value));
  const heldoutBundle = await buildLocalLoraHeldout();
  const leakage = examples.flatMap((example) => {
    const userContent = example.messages.filter((message) => message.role === "user").at(-1)?.content ?? "";
    const question = extractTrainingQuestion(userContent);
    const reasons: string[] = [];
    if (!example.sourceText?.trim()) reasons.push("local_training_source_text_missing");
    if (!question.trim()) reasons.push("local_training_question_missing");
    try {
      const parsed = JSON.parse(userContent) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !("source" in parsed)
          || parsed.source !== example.sourceText || !("question" in parsed) || typeof parsed.question !== "string"
          || Object.keys(parsed).some((key) => !["question", "source", "studentResponse"].includes(key))
          || ("studentResponse" in parsed && typeof parsed.studentResponse !== "string")) {
        reasons.push("local_training_source_not_bound");
      }
    } catch { reasons.push("local_training_source_not_bound"); }
    if (heldOut.some((item) => nearDuplicateText(question, item.prompt))) reasons.push("held_out_prompt_overlap");
    if (example.sourceText && heldOut.some((item) => nearDuplicateText(example.sourceText!, item.source))) reasons.push("held_out_source_overlap");
    return reasons.length ? [{ id: example.id, reasons }] : [];
  });
  if (leakage.length) return { status: "blocked" as const, rejected: leakage };
  const trainingPromptFingerprints = await Promise.all(examples.map((example) => textFingerprints(
    extractTrainingQuestion(example.messages.filter((message) => message.role === "user").at(-1)!.content))));
  const trainingSourceFingerprints = await Promise.all(examples.map((example) => textFingerprints(example.sourceText!)));
  // Preserve the reviewed source beside the exact conversation consumed by training.
  // The private runner independently checks these bytes against the signed manifest.
  const jsonl = examples.map((example) => JSON.stringify({ messages: example.messages, sourceText: example.sourceText })).join("\n");
  const distinct = (items: string[]) => [...new Set(items)].sort();
  const manifest = {
    version: "diana-local-lora-dataset-v1" as const,
    modelId: LOCAL_LORA_MODEL,
    createdAt: new Date(now).toISOString(),
    dataSha256: await sha256(jsonl),
    exampleCount: examples.length,
    candidateSha256: await sha256(JSON.stringify(examples)),
    evidenceSha256: await sha256(JSON.stringify(receipts)),
    heldOutCorpusSha256: heldoutBundle.corpusSha256,
    heldOutEvaluationSha256: heldoutBundle.dataSha256,
    trainingPromptFingerprints, trainingSourceFingerprints,
    documentFamilies: distinct(examples.map((example) => example.documentFamily)),
    templateFamilies: distinct(examples.map((example) => example.templateFamily)),
    qualification: "Export gates only. Operator must authenticate rights, consent and educator receipts; model is not trained or approved.",
  };
  return { status: "ready_for_local_research" as const, jsonl, manifest, rejected: [] as typeof result.rejected };
}
