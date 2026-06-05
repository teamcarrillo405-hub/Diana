export type LanguageToolReplacement = {
  value: string;
};

export type LanguageToolMatch = {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements: LanguageToolReplacement[];
  rule?: {
    id?: string;
    category?: {
      id?: string;
      name?: string;
    };
  };
};

export type LanguageToolResponse = {
  matches: LanguageToolMatch[];
};

export type DianaWritingMechanicsSuggestion = {
  message: string;
  excerpt: string;
  replacements: string[];
  sourceAnchor: string;
  studentAction: string;
};

export function buildLanguageToolBody(text: string, language = "en-US"): URLSearchParams {
  const body = new URLSearchParams();
  body.set("text", text);
  body.set("language", language);
  return body;
}

export function normalizeLanguageToolMatches(
  text: string,
  response: LanguageToolResponse,
): DianaWritingMechanicsSuggestion[] {
  return response.matches.slice(0, 8).map((match) => {
    const excerpt = text.slice(match.offset, match.offset + match.length);
    return {
      message: match.shortMessage || match.message,
      excerpt,
      replacements: match.replacements.slice(0, 4).map((replacement) => replacement.value),
      sourceAnchor: excerpt ? `Student draft: "${excerpt}"` : "Student draft",
      studentAction: "Review the suggestion and choose whether it fits your sentence.",
    };
  });
}

export async function checkLanguageToolText(input: {
  text: string;
  endpoint: string;
  language?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; suggestions: DianaWritingMechanicsSuggestion[] } | { ok: false; error: string }> {
  if (input.text.trim().length < 2) return { ok: false, error: "Add a sentence to check first." };
  const fetcher = input.fetchImpl ?? fetch;
  const response = await fetcher(input.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildLanguageToolBody(input.text, input.language),
  });
  if (!response.ok) return { ok: false, error: "Writing mechanics check is not connected right now." };
  const data = (await response.json()) as LanguageToolResponse;
  return { ok: true, suggestions: normalizeLanguageToolMatches(input.text, data) };
}
