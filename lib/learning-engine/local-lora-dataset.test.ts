import { describe, expect, it } from "vitest";
import { prepareLocalLoraDataset } from "./local-lora-dataset";
import { trainingContentHash, type TrainingExample } from "./training";
import { sha256 } from "./curriculum";

const example: TrainingExample = {
  id: "tutor-approved-1", documentFamily: "owned-calculus-not-heldout", templateFamily: "owned-hint-1", split: "train",
  provenanceId: "owned-source-1", rights: "licensed_for_training", containsStudentData: false,
  consentReceipt: null, humanReview: "approved", reviewerId: "qualified-reviewer-1",
  sourceText: "For x squared, the power rule gives a derivative with coefficient two.",
  messages: [{ role: "system", content: "Give a small, source-grounded hint." },
    { role: "user", content: JSON.stringify({ question: "Find the derivative of x squared.", source: "For x squared, the power rule gives a derivative with coefficient two." }) }, { role: "assistant", content: "Start with the power rule." }],
};

describe("local LoRA dataset preparation", () => {
  it("blocks absent review evidence and held-out family collisions", async () => {
    expect((await prepareLocalLoraDataset([example], [])).status).toBe("blocked");
    expect((await prepareLocalLoraDataset([{ ...example, documentFamily: "math.linear_equations.source" }], [])).status).toBe("blocked");
  });
  it("binds exact export bytes and source families to a manifest", async () => {
    const contentHash = await trainingContentHash(example);
    const receipt = (scope: "training_rights" | "educator_review") => ({
      id: scope, exampleId: example.id, contentHash, scope, issuedBy: example.reviewerId!,
      issuedAt: "2026-09-01T00:00:00.000Z", expiresAt: null, revokedAt: null,
    });
    const prepared = await prepareLocalLoraDataset([example], [receipt("training_rights"), receipt("educator_review")], Date.parse("2026-09-26T00:00:00Z"));
    expect(prepared.status).toBe("ready_for_local_research");
    if (prepared.status !== "ready_for_local_research") return;
    expect(prepared.manifest.dataSha256).toBe(await sha256(prepared.jsonl));
    expect(prepared.manifest.documentFamilies).toEqual([example.documentFamily]);
    expect(prepared.manifest.templateFamilies).toEqual([example.templateFamily]);
    expect(prepared.manifest.modelId).toBe("Qwen/Qwen3-4B-Instruct-2507");
    expect(prepared.manifest.heldOutEvaluationSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(prepared.manifest.trainingPromptFingerprints).toHaveLength(1);
    expect(prepared.manifest.trainingSourceFingerprints).toHaveLength(1);
  });
  it("rejects relabeled held-out prompts and sources even with valid receipts", async () => {
    const copied: TrainingExample = { ...example, id: "relabelled", documentFamily: "claimed-other-document",
      templateFamily: "claimed-other-template", sourceText: "To solve a linear equation, apply the same operation to both sides.",
      messages: [example.messages[0], { role: "user", content: JSON.stringify({ question: "Solve 9x+3=39.", source: "To solve a linear equation, apply the same operation to both sides." }) }, example.messages[2]] };
    const contentHash = await trainingContentHash(copied);
    const receipts = (["training_rights", "educator_review"] as const).map((scope) => ({
      id: scope, exampleId: copied.id, contentHash, scope, issuedBy: copied.reviewerId!,
      issuedAt: "2026-09-01T00:00:00.000Z", expiresAt: null, revokedAt: null,
    }));
    const prepared = await prepareLocalLoraDataset([copied], receipts, Date.parse("2026-09-26T00:00:00Z"));
    expect(prepared.status).toBe("blocked");
    expect(prepared.rejected[0].reasons).toEqual(expect.arrayContaining(["held_out_prompt_overlap", "held_out_source_overlap"]));
  });
  it("rejects hidden previousProblem fields in a source-bound user payload", async () => {
    const hidden: TrainingExample = { ...example, id: "hidden-heldout",
      messages: [example.messages[0], { role: "user", content: JSON.stringify({
        question: "Find the derivative of x squared.", source: example.sourceText,
        previousProblem: "Solve 9x+3=39.", safeContext: "A long unrelated passage ".repeat(30),
      }) }, example.messages[2]] };
    const contentHash = await trainingContentHash(hidden);
    const receipts = (["training_rights", "educator_review"] as const).map((scope) => ({
      id: scope, exampleId: hidden.id, contentHash, scope, issuedBy: hidden.reviewerId!,
      issuedAt: "2026-09-01T00:00:00.000Z", expiresAt: null, revokedAt: null,
    }));
    const prepared = await prepareLocalLoraDataset([hidden], receipts, Date.parse("2026-09-26T00:00:00Z"));
    expect(prepared.status).toBe("blocked");
    expect(prepared.rejected[0].reasons).toContain("local_training_source_not_bound");
  });
});
