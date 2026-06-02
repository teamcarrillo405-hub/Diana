import { describe, expect, it } from "vitest";
import {
  fallbackHistoryScaffold,
  parseHistoryScaffoldResponse,
  parseMapAnnotationResponse,
} from "./scaffold";

describe("parseHistoryScaffoldResponse", () => {
  it("parses HAPP fields and source cards", () => {
    const result = parseHistoryScaffoldResponse(
      '{"title":"Source","cards":[{"label":"Observe","prompt":"What stands out?","sentenceFrame":"I notice...","evidenceHint":"quote"}],"happ":[{"key":"audience","prompt":"Who reads it?","evidenceHint":"publication"}],"checkPrompt":"Choose evidence."}',
      "happ",
    );
    expect(result.cards[0]?.label).toBe("Observe");
    expect(result.happ[0]?.key).toBe("audience");
    expect(result.checkPrompt).toBe("Choose evidence.");
  });

  it("falls back for non-json DBQ output", () => {
    const result = parseHistoryScaffoldResponse("make an outline", "dbq");
    expect(result.dbqOutline.map((item) => item.label)).toContain("Intro");
  });

  it("keeps cause and effect links", () => {
    const result = parseHistoryScaffoldResponse(
      '{"causeEffect":[{"cause":"tax policy","effect":"protest","connector":"sparked"}]}',
      "cause_effect",
    );
    expect(result.causeEffect[0]).toMatchObject({ cause: "tax policy", effect: "protest" });
  });
});

describe("fallbackHistoryScaffold", () => {
  it("creates current event bridge prompts", () => {
    const result = fallbackHistoryScaffold("current_events");
    expect(result.currentConnections[0]?.bridgeQuestion).toContain("tradeoff");
  });
});

describe("parseMapAnnotationResponse", () => {
  it("normalizes map annotation percentages", () => {
    const result = parseMapAnnotationResponse(
      '{"title":"Map","annotations":[{"label":"Region","x":140,"y":-2,"prompt":"Why here?"}],"quizPrompt":"Label it."}',
    );
    expect(result.annotations[0]?.x).toBe(100);
    expect(result.annotations[0]?.y).toBe(0);
  });
});
