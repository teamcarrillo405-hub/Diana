// lib/tts/tts-utils.ts
// Pure TTS utility functions extracted for unit testability.
// NO dependency on window, SpeechSynthesis, or React.

export type WordOffset = {
  word: string;
  start: number;
  length: number;
};

/**
 * Split a string into words with their character offsets.
 * "Hello world" → [{word:"Hello",start:0,length:5},{word:"world",start:6,length:5}]
 */
export function splitWordsWithOffsets(text: string): WordOffset[] {
  const result: WordOffset[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    result.push({ word: m[0], start: m.index, length: m[0].length });
  }
  return result;
}

/**
 * Estimate milliseconds per word at the given rate multiplier.
 * Baseline: ~150 WPM at 1× = 400ms/word.
 */
export function estimateMsPerWord(rate: number): number {
  return Math.round(400 / rate);
}

/**
 * Schedule one setTimeout per word to advance highlightedWordIdx.
 * Used as fallback when the boundary event does not fire (Firefox, Chrome Android).
 * @param words   Result of splitWordsWithOffsets
 * @param rate    SpeechSynthesisUtterance.rate (1.0 = normal speed)
 * @param onWord  Called with word index as each word is reached
 * @param timersRef MutableRefObject<ReturnType<typeof setTimeout>[]> to allow cleanup
 */
export function scheduleFallbackTimers(
  words: WordOffset[],
  rate: number,
  onWord: (idx: number) => void,
  timersRef: { current: ReturnType<typeof setTimeout>[] },
): void {
  const msPerWord = estimateMsPerWord(rate);
  let elapsed = 300; // lead-in for speech start
  for (let i = 0; i < words.length; i++) {
    const idx = i;
    const t = setTimeout(() => onWord(idx), elapsed);
    timersRef.current.push(t);
    elapsed += msPerWord;
  }
}

/**
 * Safe cancel for SpeechSynthesis.
 * Chrome bug #458247: cancel() while paused leaves synthesis in bad state.
 * Always resume() before cancel() if paused.
 *
 * Pass in the speechSynthesis object so tests can mock it.
 */
export function safeCancel(synth: { paused: boolean; resume(): void; cancel(): void }): void {
  if (synth.paused) synth.resume();
  synth.cancel();
}
