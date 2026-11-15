import {describe,it,expect} from "vitest";
import {structureDocument,validateDocumentAnchor} from "./curriculum";
import {retrieveCurriculum} from "./retrieval";
import {learningEnabled} from "./contracts";
import {estimateSkill,chooseSupport} from "./learner";
import {checkEquationValue} from "./algebra";

const owner="00000000-0000-4000-8000-000000000001";
const assignment="00000000-0000-4000-8000-000000000002";
const metadata={ownerId:owner,documentId:"book",assignmentId:assignment,classId:null,title:"Algebra",edition:"1",subject:"math" as const,instructionRights:"owner_provided" as const};
describe("curriculum evidence",()=>{
  it("preserves original offsets and changes identities across editions and owners",async()=>{
    const pages=[{page:1,pageLabel:"p. 8",text:"# Chapter 1\n\n1. Solve 3x+5=20.\n2. Find the area of the rectangle.",interpretation:"original" as const}];
    const document=await structureDocument(metadata,pages);
    expect(document.chunks.length).toBeGreaterThanOrEqual(2);
    for(const chunk of document.chunks)expect(validateDocumentAnchor(chunk.anchors[0],document)).toBe(true);
    expect(retrieveCurriculum("problem 2",document.chunks,{ownerId:owner,assignmentId:assignment,classId:null,versionIds:[document.version.id],problemNumber:"2"}).chunks[0].problemNumber).toBe("2");
    expect(validateDocumentAnchor({...document.chunks[0].anchors[0],exactText:"invented quote"},document)).toBe(false);
    expect((await structureDocument({...metadata,edition:"2"},pages)).version.id).not.toBe(document.version.id);
    expect((await structureDocument({...metadata,ownerId:assignment},pages)).version.id).not.toBe(document.version.id);
  });
  it("excludes unconfirmed OCR and other owners before both rankings",async()=>{
    const document=await structureDocument(metadata,[{page:1,pageLabel:"p1",text:"The area of a rectangle is length times width.",interpretation:"original"}]);
    const uncertain=await structureDocument({...metadata,documentId:"scan"},[{page:1,pageLabel:"p1",text:"Uncertain scanned geometry",interpretation:"model_extraction"}]);
    expect(uncertain.chunks).toEqual([]);
    const foreign={...document.chunks[0],id:"f".repeat(64),ownerId:assignment};
    const scope={ownerId:owner,assignmentId:assignment,classId:null,versionIds:[document.version.id]};
    expect(retrieveCurriculum("rectangle area",[foreign,...document.chunks],scope,[foreign.id]).chunks.map(chunk=>chunk.ownerId)).toEqual([owner]);
    expect(retrieveCurriculum("unrelated vocabulary",document.chunks,scope).status).toBe("no_evidence");
  });
  it("requires both feature and exact owner enrollment",()=>{
    expect(learningEnabled("retrieval",owner,{DIANA_LEARNING_RETRIEVAL_ENABLED:"true"})).toBe(false);
    expect(learningEnabled("retrieval",owner,{DIANA_LEARNING_RETRIEVAL_ENABLED:"true",DIANA_LEARNING_OWNER_IDS:owner})).toBe(true);
  });
});
describe("learner evidence separation",()=>{
  it("counts first independent attempts once and excludes hinted retries",()=>{
    const attempt={id:owner,assignmentId:assignment,problemId:"p1",skillId:"math.linear_equations",revision:1,
      subject:"math" as const,input:"2",assistance:"independent" as const,modality:"typed" as const,confirmed:true,documentVersionIds:[]};
    const assessment={...checkEquationValue("x=2","2"),eligibleForKnowledge:true};
    const event={attempt,assessment,recordedAt:"2026-09-24T00:00:00Z"};
    const retry={...event,attempt:{...attempt,revision:2,assistance:"hinted" as const}};
    expect(estimateSkill(attempt.skillId,[event,event,retry])).toMatchObject({independentCount:1,supportedCount:1,confidence:"insufficient"});
    expect(estimateSkill(attempt.skillId,[{...event,attempt:{...attempt,assistance:"hinted"}},retry])).toMatchObject({independentCount:0});
  });
  it("does not infer knowledge from no data or unsupported assistance",()=>{
    expect(estimateSkill("math.linear_equations",[])).toMatchObject({confidence:"insufficient",independentCount:0,estimate:0.5});
    expect(chooseSupport({confirmed:false,hasEvidence:true,assessment:null,priorSupport:0}).action).toBe("clarify");
    expect(chooseSupport({confirmed:true,hasEvidence:true,assessment:null,priorSupport:0}).action).toBe("orient");
  });
});
