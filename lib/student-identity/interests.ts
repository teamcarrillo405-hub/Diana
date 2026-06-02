export const INTEREST_OPTIONS = [
  { id: "gaming", label: "Gaming", category: "media" },
  { id: "music", label: "Music", category: "media" },
  { id: "sports", label: "Sports", category: "movement" },
  { id: "fashion", label: "Fashion", category: "creative" },
  { id: "coding", label: "Coding", category: "technology" },
  { id: "art", label: "Art", category: "creative" },
  { id: "film", label: "Movies and shows", category: "media" },
  { id: "animals", label: "Animal science", category: "science" },
  { id: "cars", label: "Cars", category: "technology" },
  { id: "cooking", label: "Cooking", category: "life" },
  { id: "space", label: "Space", category: "science" },
  { id: "business", label: "Business", category: "life" },
] as const;

export type InterestId = (typeof INTEREST_OPTIONS)[number]["id"];

const LABEL_BY_ID: ReadonlyMap<string, string> = new Map(
  INTEREST_OPTIONS.map((item) => [item.id, item.label]),
);
const VALID_IDS: ReadonlySet<string> = new Set(INTEREST_OPTIONS.map((item) => item.id));

export function normalizeInterestIds(ids: readonly string[] | null | undefined): InterestId[] {
  const out: InterestId[] = [];
  for (const id of ids ?? []) {
    if (!VALID_IDS.has(id)) continue;
    if (out.includes(id as InterestId)) continue;
    out.push(id as InterestId);
    if (out.length === 5) break;
  }
  return out;
}

export function labelsForInterests(ids: readonly string[] | null | undefined): string[] {
  return normalizeInterestIds(ids)
    .map((id) => LABEL_BY_ID.get(id))
    .filter((label): label is string => Boolean(label));
}
