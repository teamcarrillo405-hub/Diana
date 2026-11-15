import {describe,it,expect,vi} from "vitest";
import catalog from "@/content/curriculum/diana-v1.json";
import {CURRICULUM_GRAPH_VERSION,loadCurriculumGraph,parseCurriculumGraph,validateCurriculumGraph,graphContentDigest,getSkill,listChapterSkills,selectPrerequisites,alignPassageToSkills} from "./curriculum-graph";

const copy=()=>structuredClone(catalog);
describe("versioned curriculum graph",()=>{
  it("loads a content-bound frozen curriculum for every chapter and six reading skills without network calls",async()=>{
    const request=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("No API calls"));
    try{
      const graph=await loadCurriculumGraph();
      expect(graph.version).toBe(CURRICULUM_GRAPH_VERSION);expect(graph.skills).toHaveLength(34);
      for(let chapter=1;chapter<=9;chapter++)expect(listChapterSkills(graph,chapter).length).toBeGreaterThan(0);
      expect(graph.skills.filter(skill=>skill.subject==="reading")).toHaveLength(6);
      expect(graph.skills.every(skill=>skill.review.status==="pending")).toBe(true);
      expect(Object.isFrozen(graph)).toBe(true);expect(Object.isFrozen(graph.skills[0].scaffold.hints)).toBe(true);
      expect(request).not.toHaveBeenCalled();
    }finally{request.mockRestore();}
  });
  it("rejects a prerequisite cycle, broken remediation link and duplicate identities",()=>{
    const cyclic=copy();cyclic.skills[0].prerequisites=["math.inverse_functions"];
    expect(()=>parseCurriculumGraph(cyclic)).toThrow("Prerequisite cycle");
    const broken=copy();broken.skills[0].misconceptions[0].remediationSkillId="math.not_a_skill";
    expect(()=>parseCurriculumGraph(broken)).toThrow("Broken skill link");
    const duplicate=copy();duplicate.skills.push(structuredClone(duplicate.skills[0]));
    expect(()=>parseCurriculumGraph(duplicate)).toThrow("Duplicate skill ID");
    const duplicateMisconception=copy();duplicateMisconception.skills[1].misconceptions[0].id=duplicateMisconception.skills[0].misconceptions[0].id;
    expect(()=>parseCurriculumGraph(duplicateMisconception)).toThrow("Duplicate misconception ID");
  });
  it("rejects unsupported or overstated deterministic verification",()=>{
    const unsupported=copy();unsupported.skills[0].verification={mode:"bounded_exact_result",checker:"equation_value",limits:"Claims every function is verified."};
    expect(()=>parseCurriculumGraph(unsupported)).toThrow("Unsupported deterministic verification claim");
    const broad=copy();broad.skills.find(skill=>skill.id==="math.logarithms")!.verification.limits="Verifies all logarithmic reasoning.";
    expect(()=>parseCurriculumGraph(broad)).toThrow("Verifier limits must match");
  });
  it("detects changed examples and refuses an unlinked new revision",async()=>{
    const changed=copy();changed.skills[0].example.answer="A changed answer that lacks a new digest.";
    await expect(validateCurriculumGraph(changed)).rejects.toThrow("Skill content digest mismatch");
    const revision=copy();revision.skills[0].revision=2;
    expect(()=>parseCurriculumGraph(revision)).toThrow("prior immutable version");
  });
  it("binds reviewed versions to independent trusted receipts rather than self-asserted approval",async()=>{
    const graph=parseCurriculumGraph(copy());
    const receipts=["educator-one","educator-two"].map((reviewerId,index)=>({id:"receipt-"+index,reviewerId,qualificationEvidenceId:"qualification-"+index,skillDigest:graph.skills[0].contentDigest,reviewedAt:"2026-09-25T20:00:00Z"}));
    graph.skills[0].review={status:"approved",receipts};graph.contentDigest=await graphContentDigest(graph);
    await expect(validateCurriculumGraph(graph)).rejects.toThrow("Untrusted educator review receipt");
    expect((await validateCurriculumGraph(graph,{trustedReviewReceipts:receipts})).skills[0].review.status).toBe("approved");
    const fabricated=structuredClone(graph);fabricated.skills[0].review={status:"approved",receipts:receipts.map(receipt=>({...receipt,skillDigest:"0".repeat(64)}))};
    expect(()=>parseCurriculumGraph(fabricated)).toThrow("Review does not match this skill version");
    const relabeled=structuredClone(graph);relabeled.skills[0].review={status:"approved",receipts:receipts.map(receipt=>({...receipt,qualificationEvidenceId:"invented-credential"}))};
    relabeled.contentDigest=await graphContentDigest(relabeled);
    await expect(validateCurriculumGraph(relabeled,{trustedReviewReceipts:receipts})).rejects.toThrow("Untrusted educator review receipt");
  });
  it("orders prerequisites before dependents and uses only explicit satisfied evidence",async()=>{
    const graph=await loadCurriculumGraph();
    expect(selectPrerequisites(graph,"math.inverse_functions").map(skill=>skill.id)).toEqual(["math.functions","math.domain_range","math.composition"]);
    expect(selectPrerequisites(graph,"math.inverse_functions",{satisfiedSkillIds:["math.functions"]}).map(skill=>skill.id)).toEqual(["math.domain_range","math.composition"]);
    expect(()=>selectPrerequisites(graph,"math.unknown")).toThrow("Unknown skill");
    expect(getSkill(graph,"math.unit_circle")?.verification.mode).toBe("bounded_exact_result");
    expect(getSkill(graph,"math.trig_equations")?.verification.mode).toBe("review_required");
  });
  it("reports ambiguous skill alignment and preserves exact source provenance",async()=>{
    const graph=await loadCurriculumGraph();
    const source={versionId:"a".repeat(64),contentHash:"b".repeat(64),page:3,blockId:"c".repeat(64)};
    const result=alignPassageToSkills(graph,{text:"Discuss slope and rate of change, then solve for x in a linear equation.",chapter:2,source});
    expect(result.status).toBe("ambiguous");expect(result.candidates.map(item=>item.skillId)).toContain("math.linear_equations");
    expect(result.provenance).toMatchObject({source,graphVersion:CURRICULUM_GRAPH_VERSION,meaningVerified:false});
    expect(alignPassageToSkills(graph,{text:"Clouds formed over the harbor.",subject:"math"}).status).toBe("no_match");
    expect(alignPassageToSkills(graph,{text:"A trigonometric identity",chapter:2}).status).toBe("no_match");
  });
});
