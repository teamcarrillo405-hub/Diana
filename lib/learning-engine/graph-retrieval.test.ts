import {describe,it,expect} from "vitest";
import {loadCurriculumGraph} from "./curriculum-graph";
import {rerankGraphPassages,type GraphPassage} from "./graph-retrieval";
const source={versionId:"a".repeat(64),contentHash:"b".repeat(64),page:1,blockId:"c".repeat(64)};
const passage=(id:string,text:string,extra:Partial<GraphPassage>={}):GraphPassage=>({id,text,source,scope:"reference",chapter:2,subject:"math",...extra});
describe("graph-aware passage ranking",()=>{
  it("uses a selected skill to resolve a real lexical tie while preserving the exact quotation",async()=>{
    const graph=await loadCurriculumGraph();
    const passages=[passage("a","A linear function describes an input-output relationship."),passage("b","A linear equation can be solved by balancing both sides.")];
    expect(rerankGraphPassages(graph,"linear",passages).map(item=>item.id)).toEqual(["a","b"]);
    const ranked=rerankGraphPassages(graph,"linear",passages,{selectedSkillId:"math.linear_equations"});
    expect(ranked.map(item=>item.id)).toEqual(["b","a"]);expect(ranked[0].graph.relation).toBe("target");
    expect(ranked[0].text).toBe(passages[1].text);expect(ranked[0].source).toEqual(source);
  });
  it("keeps a stronger direct text match ahead of a weaker skill-aligned passage",async()=>{
    const graph=await loadCurriculumGraph();
    const ranked=rerankGraphPassages(graph,"linear equation",[
      passage("direct","A linear function uses a rule. Its equation describes output.",{lexicalScore:3}),
      passage("tagged","A linear equation can be solved by balancing both sides.",{lexicalScore:2.5}),
    ],{selectedSkillId:"math.linear_equations"});
    expect(ranked.map(item=>item.id)).toEqual(["direct","tagged"]);
    expect(ranked[0].score).toBe(3);
    expect(ranked[1].graph.boost).toBeGreaterThan(ranked[0].graph.boost);
  });
  it("never introduces a tag-only passage with no direct query-word overlap",async()=>{
    const graph=await loadCurriculumGraph();
    const ranked=rerankGraphPassages(graph,"linear",[passage("unrelated","A trigonometric identity connects sine and cosine.",{chapter:7})],{selectedSkillId:"math.trig_identities"});
    expect(ranked).toEqual([]);
  });
  it("does not infer a teaching skill from an unrestricted book-wide query",async()=>{
    const graph=await loadCurriculumGraph();
    const passages=[passage("page-one","A function has a domain and range.",{lexicalScore:2}),
      passage("page-two","A linear function has a domain and range.",{lexicalScore:2})];
    const ranked=rerankGraphPassages(graph,"function domain range",passages);
    expect(ranked.map(item=>item.id)).toEqual(["page-one","page-two"]);
    expect(ranked.every(item=>item.graph.targetSkillId===null&&item.graph.boost===0)).toBe(true);
  });
  it("keeps authorized assignment evidence ahead of a boosted public reference",async()=>{
    const graph=await loadCurriculumGraph();
    const ranked=rerankGraphPassages(graph,"linear",[
      passage("reference","A linear equation balances both sides."),passage("assignment","Your assignment includes linear tasks.",{scope:"assignment"}),
    ],{selectedSkillId:"math.linear_equations"});
    expect(ranked.map(item=>item.id)).toEqual(["assignment","reference"]);
  });
  it("uses prerequisite relationships only on directly relevant, unambiguous passages",async()=>{
    const graph=await loadCurriculumGraph();
    const ranked=rerankGraphPassages(graph,"polynomial",[passage("p","A polynomial can be written as a sum of powers.",{chapter:3})],{selectedSkillId:"math.quadratics"});
    expect(ranked[0].graph).toMatchObject({relation:"prerequisite",boost:0.25,targetSkillId:"math.quadratics"});
    expect(ranked[0].graph.alignment.provenance.meaningVerified).toBe(false);
  });
  it("retains chapter boundaries and rejects invalid scores instead of hiding them",async()=>{
    const graph=await loadCurriculumGraph();
    expect(rerankGraphPassages(graph,"linear",[passage("p","A linear equation.")],{chapter:3})).toEqual([]);
    expect(()=>rerankGraphPassages(graph,"linear",[passage("p","A linear equation.",{lexicalScore:Infinity})])).toThrow("Invalid lexical relevance");
    expect(()=>rerankGraphPassages(graph,"linear",[passage("p","A linear equation.")],{chapter:7,selectedSkillId:"math.linear_equations"})).toThrow("outside the chosen chapter");
  });
  it("does not let an ineligible duplicate hide the eligible exact passage",async()=>{
    const graph=await loadCurriculumGraph();
    const ranked=rerankGraphPassages(graph,"linear",[
      passage("same","A linear equation.",{chapter:7}),
      passage("same","A linear equation.",{chapter:2}),
    ],{chapter:2});
    expect(ranked).toHaveLength(1);
    expect(ranked[0].chapter).toBe(2);
  });
});
