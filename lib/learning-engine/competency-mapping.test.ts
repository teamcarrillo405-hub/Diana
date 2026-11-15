import {describe,it,expect} from "vitest";
import {structureDocument} from "./curriculum";
import {loadCourseCatalog} from "./course-catalog";
import {suggestSourceCompetencies} from "./competency-mapping";
const id="00000000-0000-4000-8000-000000000001";
describe("source competency proposals",()=>{
  async function fixture(){return structureDocument({ownerId:id,assignmentId:id,classId:id,documentId:"sample",title:"Measured motion",edition:"1",subject:"science",instructionRights:"owner_provided"},[{page:1,pageLabel:"1",interpretation:"original",text:"A measured quantity uses compatible units and stated precision. Represent the measurement with its units."}]);}
  it("pins lexical suggestions to exact confirmed source evidence without approval",async()=>{
    const document=await fixture(),framework=(await loadCourseCatalog()).framework;
    const result=await suggestSourceCompetencies(framework,document.version,document.blocks,document.pages);
    expect(result.automaticallyApproved).toBe(false);expect(result.providerCalled).toBe(false);
    const suggestion=result.suggestions.find(row=>row.skillId==="science.measurement")!;
    expect(suggestion.status).toBe("proposed");expect(suggestion.anchor.contentHash).toBe(document.version.contentHash);
    expect(suggestion.matchedTerms).toContain("units");
    const changed=structuredClone(framework);changed.competencies.find(row=>row.id==="science.measurement")!.revision++;
    expect((await suggestSourceCompetencies(changed,document.version,document.blocks,document.pages)).suggestions.find(row=>row.skillId===suggestion.skillId)?.mappingHash).not.toBe(suggestion.mappingHash);
  });
  it("rejects changed spans, other versions, unconfirmed text and unsupported subject guesses",async()=>{
    const document=await fixture(),framework=(await loadCourseCatalog()).framework;
    for(const blocks of [document.blocks.map(row=>({...row,text:"Unrelated source text"})),document.blocks.map(row=>({...row,versionId:"a".repeat(64)})),document.blocks.map(row=>({...row,needsConfirmation:true}))])expect((await suggestSourceCompetencies(framework,document.version,blocks,document.pages)).suggestions).toEqual([]);
    expect((await suggestSourceCompetencies(framework,{...document.version,subject:"computing"},document.blocks,document.pages)).suggestions).toEqual([]);
  });
  it("does not map an ordinary both-sides instruction to absolute values or systems",async()=>{
    const document=await structureDocument({ownerId:id,assignmentId:id,classId:id,documentId:"equations",title:"Equations",edition:"1",subject:"math",instructionRights:"owner_provided"},[{page:1,pageLabel:"1",interpretation:"original",text:"Chapter 1 Equations\n\n1. Solve 3x + 5 = 20. Explain the operation used on both sides."}]);
    const result=await suggestSourceCompetencies((await loadCourseCatalog()).framework,document.version,document.blocks,document.pages);
    expect(result.suggestions.every(item=>!item.title.includes("Absolute")&&!item.title.includes("Systems"))).toBe(true);
    expect(result.suggestions.some(item=>item.title==="Linear equations")).toBe(true);
  });
});
