import {sourcePageSchema} from "./source-layout";
import type {ProblemState} from "./problem-state";

export type ProblemSource={id:string;assetHash?:string;pages:unknown};
/** Source locators are validated against an already authorized immutable version. */
export function validateProblemSources(state:ProblemState,sources:ProblemSource[]){
  for(const observation of state.observations){
    if(!observation.source)continue;
    const source=sources.find(item=>item.id===observation.source!.versionId);
    if(!source)throw new Error("source_unavailable");
    const pages=sourcePageSchema.array().parse(source.pages);
    const location=observation.source,page=pages.find(item=>item.page===location.page);
    if(!page||location.endOffset>page.text.length)throw new Error("source_span_unavailable");
    if(location.assetHash!==undefined&&location.assetHash!==source.assetHash)throw new Error("source_asset_changed");
    if(location.regionId&&!page.regions?.some(item=>item.id===location.regionId&&item.startOffset<=location.startOffset&&item.endOffset>=location.endOffset))throw new Error("source_region_changed");
    if(observation.provenance==="native_pdf"&&(page.interpretation!=="original"||page.text.slice(location.startOffset,location.endOffset)!==observation.text))throw new Error("source_text_changed");
  }
}
