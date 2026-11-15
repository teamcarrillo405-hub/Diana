import {describe,it,expect} from "vitest";
import {scoreMedia,type MediaCase} from "./media-evaluation";
import {correctRegion,sourcePageSchema} from "./source-layout";
describe("media evidence",()=>{
  it("tracks missing runs, byte mismatches and exact extraction errors",()=>{
    const item:MediaCase={id:"one",documentFamily:"family",split:"test",assetPath:"one.pdf",assetHash:"a".repeat(64),mime:"application/pdf",provenance:"authored_synthetic",rightsReceipt:"authored",humanReview:"pending",reviewerIds:[],expectedText:"x = 8",regions:[]};
    expect(scoreMedia([item],[]).status).toBe("incomplete");
    const output={caseId:"one",assetHash:item.assetHash,engineVersion:"test",observedText:"x = 3",confidence:0.9,regions:[]};
    expect(scoreMedia([item],[output]).rows[0].characterErrorRate).toBe(0.2);
    expect(scoreMedia([item],[output]).calibrationBins.every(bin=>bin.count===0)).toBe(true);
    expect(scoreMedia([item],[{...output,assetHash:"b".repeat(64)}]).status).toBe("invalid");
    expect(scoreMedia([item],[output,output]).status).toBe("invalid");
  });
  it("rebases later spans without silently confirming other regions",()=>{
    const region={kind:"text" as const,box:{x:0,y:0,width:0.5,height:0.2},provenance:"model_extraction" as const,confirmed:false};
    const page=sourcePageSchema.parse({page:1,pageLabel:"one",text:"x = 3; y = 5",interpretation:"model_extraction",regions:[{...region,id:"x",startOffset:0,endOffset:5},{...region,id:"y",startOffset:7,endOffset:12}]});
    const corrected=correctRegion(page,"x","x = 18");
    expect(corrected.text).toBe("x = 18; y = 5");
    expect(corrected.regions![1]).toMatchObject({startOffset:8,endOffset:13,confirmed:false});
    expect(corrected.interpretation).toBe("model_extraction");
    expect(corrected.regions![0].confirmed).toBe(true);
  });
});
