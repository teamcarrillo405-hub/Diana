const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "class",
  "could",
  "from",
  "have",
  "homework",
  "into",
  "notes",
  "that",
  "their",
  "there",
  "they",
  "this",
  "with",
  "would",
]);

export function normalizeNoteTags(tags: string[], maxTags = 8): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags) {
    const cleaned = tag
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (cleaned.length < 2 || cleaned.length > 32 || seen.has(cleaned)) continue;
    seen.add(cleaned);
    normalized.push(cleaned);
    if (normalized.length >= maxTags) break;
  }

  return normalized;
}

export function suggestTagsFromText(text: string, maxTags = 6): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? []) {
    const word = raw.replace(/^-|-$/g, "");
    if (STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return normalizeNoteTags(
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([word]) => word),
    maxTags,
  );
}
