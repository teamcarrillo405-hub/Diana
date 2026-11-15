import {describe,it,expect} from "vitest";
import {validateReadingObservations} from "@/supabase/functions/_shared/learning/evidence";
import {approvedCorpusHash,approvedInputHashes} from "@/supabase/functions/_shared/learning/approved-fixtures";
import {highSchoolLearningCorpus} from "./evaluation-corpus";
import {corpusDigest,experimentInput,EXPERIMENT_ARMS,type ExperimentManifest} from "./experiments";
import {evaluationContext} from "./evaluation-pipeline";
import {sha256} from "./curriculum";

describe("reading source boundaries",()=>{
  it("rejects invented, shifted and cross-page quotations",()=>{
    const pages=[{page:8,text:"Rain changed the garden."}];
    const observation={claim:"A provisional interpretation",page:8,startOffset:0,endOffset:4,quote:"Rain"};
    expect(validateReadingObservations([observation],pages)).toBe(true);
    for(const change of [{quote:"Sun"},{page:9},{startOffset:1},{endOffset:5},{startOffset:-1}]){
      expect(validateReadingObservations([{...observation,...change}],pages)).toBe(false);
    }
    expect(validateReadingObservations([],pages)).toBe(true);
  });
  it("pins every remotely accepted benchmark input to authored fixtures",async()=>{
    const corpus=highSchoolLearningCorpus();
    expect(await corpusDigest(corpus)).toBe(approvedCorpusHash);
    expect(Object.keys(approvedInputHashes)).toHaveLength(corpus.length*EXPERIMENT_ARMS.length);
    for(const item of corpus){
      const context=await evaluationContext(item);
      for(const arm of EXPERIMENT_ARMS){
        const manifest={arm,maxInputBytes:32000} as ExperimentManifest;
        const input=experimentInput(item,manifest,context);
        expect(await sha256(input)).toBe(approvedInputHashes[item.id+":"+arm]);
      }
    }
  });
});
