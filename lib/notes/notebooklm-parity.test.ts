import { describe, expect, it } from "vitest";
import {
  dianaCurrentNotebookLmParityEvidence,
  scoreNotebookLmParity,
} from "./notebooklm-parity";

describe("NotebookLM parity scoring", () => {
  it("scores Diana's native notes stack against the NotebookLM-style target", () => {
    const result = scoreNotebookLmParity(dianaCurrentNotebookLmParityEvidence);

    expect(result.possible).toBe(100);
    expect(result.score).toBe(100);
    expect(result.grade).toBe("launch-ready");
    expect(result.features.find((feature) => feature.id === "source_grounded_chat")?.status).toBe("ready");
    expect(result.features.find((feature) => feature.id === "audio_readout")?.status).toBe("ready");
  });

  it("keeps citation grounding as a high-weight requirement", () => {
    const result = scoreNotebookLmParity({
      ...dianaCurrentNotebookLmParityEvidence,
      citation_context: "absent",
    });

    expect(result.score).toBe(88);
    expect(result.grade).toBe("close");
  });
});
