import {describe,it,expect,vi} from "vitest";
import {structureDocument} from "./curriculum";
import {PUBLIC_TEXTBOOK_SCOPE} from "./textbook-catalog";
import {rankTextbookPassages} from "./textbook-search";
import {rankGraphTextbookPassages} from "./textbook-graph";

async function chapter(number:number,texts:string[]){
  const document=await structureDocument({...PUBLIC_TEXTBOOK_SCOPE,documentId:"test-chapter-"+number,title:"Reference",edition:"test",subject:"math",instructionRights:"licensed"},
    texts.map((text,index)=>({page:index+1,pageLabel:String(index+1),text,interpretation:"original" as const})));
  return {number,versionId:document.version.id,chunks:document.chunks};
}

describe("graph-aware textbook retrieval adapter",()=>{
  it("reranks beyond the original six while preserving exact anchors and making no API calls",async()=>{
    const request=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("No hosted APIs"));
    try{
      const source=await chapter(2,[...Array.from({length:6},(_,index)=>`A linear function example on this page uses input ${index}.`),"A linear equation can be solved by balancing both sides."]);
      const lexical=rankTextbookPassages("linear",[source]);
      expect(lexical.every(candidate=>candidate.anchor.location.page<7)).toBe(true);
      const ranked=await rankGraphTextbookPassages("linear",[source],{selectedSkillId:"math.linear_equations"});
      expect(ranked).toHaveLength(6);expect(ranked[0].anchor.location.page).toBe(7);
      const original=rankTextbookPassages("linear",[source],24).find(candidate=>candidate.anchor.location.page===7)!;
      expect(ranked[0].chunk).toBe(original.chunk);expect(ranked[0].anchor).toBe(original.anchor);expect(ranked[0].score).toBe(original.score);
      expect(ranked[0].graph).toMatchObject({relation:"target",boost:0.75,targetSkillId:"math.linear_equations"});
      expect(ranked[0].graph.alignment.provenance.source).toMatchObject({versionId:original.anchor.versionId,contentHash:original.anchor.contentHash,blockId:original.anchor.blockId});
      expect(request).not.toHaveBeenCalled();
    }finally{request.mockRestore();}
  });
  it("never admits private scope, version-mismatched or tag-only candidates",async()=>{
    const source=await chapter(2,["A linear equation connects expressions."]);
    const privateSource={...source,chunks:source.chunks.map(chunk=>({...chunk,ownerId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}))};
    const stale={...source,versionId:"f".repeat(64)};
    const unrelated=await chapter(7,["A trigonometric identity connects sine and cosine."]);
    expect(await rankGraphTextbookPassages("linear",[privateSource,stale,unrelated],{selectedSkillId:"math.trig_identities"})).toEqual([]);
  });
  it("applies the selected chapter before candidate limiting and rejects invalid selections",async()=>{
    const first=await chapter(2,["A linear equation connects expressions."]);
    const other=await chapter(3,["A polynomial equation can have several solutions."]);
    const ranked=await rankGraphTextbookPassages("equation",[first,other],{chapter:3});
    expect(ranked).toHaveLength(1);expect(ranked[0].chapter).toBe(3);
    await expect(rankGraphTextbookPassages("equation",[first],{chapter:10})).rejects.toThrow("Choose a chapter");
    await expect(rankGraphTextbookPassages("equation",[first],{selectedSkillId:"math.unknown"})).rejects.toThrow("Unknown selected skill");
  });
  it("does not present a generic overlap as evidence for an unrelated question",async()=>{
    const source=await chapter(2,["The author explains a linear function and its rate of change."]);
    expect(rankTextbookPassages("What is the author's private home address?",[source])).toEqual([]);
    expect(rankTextbookPassages("linear function",[source])).toHaveLength(1);
    expect(rankTextbookPassages("linear",[source])).toHaveLength(1);
  });
});
