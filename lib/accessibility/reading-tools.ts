export type BionicWordParts = {
  prefix: string;
  rest: string;
};

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

export function bionicWordParts(word: string): BionicWordParts {
  const leading = word.match(/^\W*/)?.[0] ?? "";
  const trailing = word.match(/\W*$/)?.[0] ?? "";
  const core = word.slice(leading.length, word.length - trailing.length);

  if (core.length <= 3) {
    return { prefix: word, rest: "" };
  }

  const chars = [...core];
  const firstVowelIdx = chars.findIndex((char, idx) => idx > 0 && VOWELS.has(char.toLowerCase()));
  let vowelGroupEnd = firstVowelIdx;
  while (vowelGroupEnd >= 0 && vowelGroupEnd + 1 < chars.length && VOWELS.has(chars[vowelGroupEnd + 1].toLowerCase())) {
    vowelGroupEnd += 1;
  }
  const syllableishCut =
    firstVowelIdx >= 1
      ? Math.min(core.length - 1, vowelGroupEnd + 1)
      : Math.ceil(core.length * 0.45);
  const cut = Math.max(2, Math.min(core.length - 1, syllableishCut));

  return {
    prefix: `${leading}${core.slice(0, cut)}`,
    rest: `${core.slice(cut)}${trailing}`,
  };
}

export type ReadingLine = {
  id: string;
  text: string;
};

export function splitIntoReadingLines(text: string, targetWords = 14): ReadingLine[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const lines: ReadingLine[] = [];
  paragraphs.forEach((paragraph, paragraphIdx) => {
    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    const chunks = sentences.length > 0 ? sentences : [paragraph];
    chunks.forEach((chunk) => {
      const words = chunk.split(/\s+/).filter(Boolean);
      for (let i = 0; i < words.length; i += targetWords) {
        lines.push({
          id: `${paragraphIdx}-${lines.length}`,
          text: words.slice(i, i + targetWords).join(" "),
        });
      }
    });
  });

  return lines;
}

export function clampReadingIndex(index: number, maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  return Math.min(Math.max(index, 0), maxExclusive - 1);
}
