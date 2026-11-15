import {it,expect} from "vitest";
import {emptyProblemState,reviseProblemState} from "./problem-state";
import {validateProblemSources} from "./problem-sources";
it("checks exact quotations, owner-authorized versions and bounded PDF regions",async()=>{
  const source={id:"a".repeat(64),pages:[{page:1,pageLabel:"1",text:"x + 2 = 7",interpretation:"original"}]};
  const state=await reviseProblemState(emptyProblemState("00000000-0000-4000-8000-000000000001",{classId:"00000000-0000-4000-8000-000000000002",assignmentId:null,exerciseId:"e"}),{expectedRevision:1,put:[{id:"prompt",field:"prompt",role:"problem_statement",text:"x + 2 = 7",modality:"pdf_region",provenance:"native_pdf",source:{versionId:source.id,page:1,startOffset:0,endOffset:9}}]});
  expect(()=>validateProblemSources(state,[source])).not.toThrow();
  expect(()=>validateProblemSources(state,[])).toThrow("source_unavailable");
  expect(()=>validateProblemSources(state,[{...source,pages:[{...source.pages[0],text:"x - 2 = 7"}]}])).toThrow("source_text_changed");
  expect(()=>validateProblemSources(state,[{...source,pages:[{...source.pages[0],interpretation:"model_extraction"}]}])).toThrow("source_text_changed");
});
