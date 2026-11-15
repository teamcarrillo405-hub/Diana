export type ReadingObservation={claim:string;page:number;startOffset:number;endOffset:number;quote:string};
/** Exact text existence only. This cannot validate the interpretation of a quote. */
export function validateReadingObservations(observations:ReadingObservation[],pages:Array<{page:number;text:string}>):boolean{
  return observations.every(observation=>{
    const page=pages.find(candidate=>candidate.page===observation.page);
    return !!page&&Number.isSafeInteger(observation.startOffset)&&Number.isSafeInteger(observation.endOffset)
      && observation.startOffset>=0&&observation.endOffset>observation.startOffset
      && page.text.slice(observation.startOffset,observation.endOffset)===observation.quote;
  });
}
