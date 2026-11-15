import type { AssessmentResult } from "./algebra.ts";

type ReadingPage = { page: number; text: string; interpretation: "original" | "confirmed" | "model_extraction" };

const QUESTIONS: Readonly<Record<string,string>> = {
  "reading.central_idea": "What is the main idea, and which sentence best supports it?",
  "reading.evidence": "How does the quoted passage support your point?",
  "reading.inference": "Which words in the passage led you to that inference?",
  "reading.vocabulary": "Which nearby words help explain the meaning in this context?",
  "reading.argument": "What reason connects the author's evidence to the claim?",
  "reading.comparison": "Which detail supports each of the two ideas you are comparing? Explain a similarity or difference.",
};

/** Exact source checking only. This module performs no network or model calls. */
export async function assessReading(input: {
  skillId: string; response: string; pages: unknown;
}): Promise<AssessmentResult> {
  const assessment:AssessmentResult = {
    status:"inconclusive", outcome:"unknown", claim:"Quoted text was checked against your source.",
    checkedInput:input.response, verifierVersion:"reading-source-local-v2",
    observations:[], limitations:["This checks whether quoted words appear in the source. It does not grade your interpretation."],
    eligibleForKnowledge:false,
  };
  const pages:ReadingPage[] = Array.isArray(input.pages) ? input.pages.filter((value):value is ReadingPage =>
    !!value && typeof value==="object" && Number.isSafeInteger(value.page) && value.page>0
    && typeof value.text==="string" && (value.interpretation==="original" || value.interpretation==="confirmed")) : [];
  if(!pages.length){
    assessment.claim="Confirm the source text before checking quotes.";
    assessment.observations.push(assessment.claim);
    return assessment;
  }
  const quotes=[...input.response.matchAll(/"([^"\n]{3,600})"|“([^”\n]{3,600})”/gu)]
    .map(match=>match[1]??match[2]).slice(0,4);
  for(const quote of quotes){
    const page=pages.find(item=>item.text.includes(quote));
    const display=quote.length>300?quote.slice(0,297)+"…":quote;
    assessment.observations.push(page
      ? 'Quote found on page '+page.page+': "'+display+'". Explain how it supports your point.'
      : 'This quote does not exactly match the confirmed source: "'+display+'". Check the wording or mark it as a paraphrase.');
  }
  if(!quotes.length)assessment.observations.push("No direct quote was marked. If you use one, put the exact source words in quotation marks.");
  assessment.observations.push(QUESTIONS[input.skillId]??"Which part of the source supports your explanation?");
  return assessment;
}
