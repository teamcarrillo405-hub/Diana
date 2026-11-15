import { sha256 } from "./curriculum";
import { highSchoolLearningCorpus } from "./evaluation-corpus";

// Independent code-reviewed pins for the current 480 authored engineering cases.
// Update only after inspecting corpus changes and revalidating train/test separation.
export const EXPECTED_HELDOUT_DATA_SHA256 = "64d9d36922ea8c41a5b2e58522f323bcb11a342bb7c35973600a360e18a634c3";
export const EXPECTED_HELDOUT_CORPUS_SHA256 = "eb56f6c4144f101c7af2e4641942ad29dd0054e56d5d56b73b124bcb0ca7d799";

const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
const template = (value: string) => normalize(value).replace(/\p{N}+/gu, "#");
export async function textFingerprints(value: string) {
  return { exact: await sha256(normalize(value)), template: await sha256(template(value)) };
}

function shingles(value: string) {
  const words = template(value).split(" ").filter(Boolean);
  const width = words.length < 5 ? 1 : 3;
  return new Set(Array.from({ length: Math.max(0, words.length - width + 1) }, (_, index) => words.slice(index, index + width).join(" ")));
}

export function nearDuplicateText(left: string, right: string) {
  if (template(left) === template(right)) return true;
  const first = shingles(left), second = shingles(right);
  if (!first.size || !second.size) return false;
  const shared = [...first].filter((piece) => second.has(piece)).length;
  return shared / (first.size + second.size - shared) >= 0.8;
}

export function extractTrainingQuestion(userContent: string) {
  try {
    const parsed = JSON.parse(userContent) as unknown;
    if (parsed && typeof parsed === "object" && "question" in parsed && typeof parsed.question === "string") return parsed.question;
  } catch { /* A plain question is valid. */ }
  return userContent;
}

export async function buildLocalLoraHeldout() {
  const corpus = highSchoolLearningCorpus();
  const cases = await Promise.all(corpus.map(async (item) => {
    const promptFingerprints = await textFingerprints(item.prompt);
    const sourceFingerprints = await textFingerprints(item.source);
    return {
      id: item.id, documentFamily: item.documentFamily, templateFamily: item.templateFamily,
      provenance: item.provenance, prompt: item.prompt, source: item.source, expected: item.expected,
      promptFingerprints, sourceFingerprints,
      messages: [
        { role: "system", content: "You are Diana. Give the smallest useful, source-grounded tutoring response. If the source is insufficient, ask for confirmation or abstain. Return only JSON with answer (string or null), abstain (boolean), feedback (string), and quotes (array of exact source strings)." },
        { role: "user", content: JSON.stringify({ question: item.prompt, source: item.source, studentResponse: "I need help starting." }) },
      ],
    };
  }));
  const jsonl = cases.map((item) => JSON.stringify(item)).join("\n");
  const dataSha256 = await sha256(jsonl), corpusSha256 = await sha256(JSON.stringify(corpus));
  if (dataSha256 !== EXPECTED_HELDOUT_DATA_SHA256 || corpusSha256 !== EXPECTED_HELDOUT_CORPUS_SHA256) {
    throw new Error("The authored held-out corpus changed without a reviewed digest update.");
  }
  return { cases, jsonl, dataSha256, corpusSha256 };
}
