import {afterEach,describe,it,expect,vi} from "vitest";
import {loadChapterPractice} from "./chapter-practice";
import {runChapterSession,startChapterSession} from "./chapter-session";
import {observationHash} from "./problem-state";
const record="00000000-0000-4000-8000-000000000001",course="00000000-0000-4000-8000-000000000002";
const answers=["19","3","2,-3","8","1/2","2","1","12","2,-3"];
afterEach(()=>vi.unstubAllGlobals());
describe("saved chapter practice controller",()=>{
  it("checks known arithmetic in all nine chapters with network unavailable",async()=>{
    const fetch=vi.fn(()=>{throw new Error("network unavailable");});vi.stubGlobal("fetch",fetch);
    for(let chapter=1;chapter<=9;chapter++){
      const [exercise]=await loadChapterPractice(chapter,0),state=await startChapterSession(record,course,exercise.id);
      const result=await runChapterSession(state,{expectedRevision:1,mode:"check",response:answers[chapter-1],confirmed:true,modality:"typed"});
      expect(result.feedback.assessment?.outcome,exercise.prompt).toBe("supported");
      expect(result.feedback.eligibleForKnowledge).toBe(false);
      expect(result.state.revision).toBe(2);
      expect(result.feedback.provider.called).toBe(false);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it("preserves hints across saves and produces deterministic replay state",async()=>{
    const [exercise]=await loadChapterPractice(2,0),state=await startChapterSession(record,course,exercise.id);
    const input={expectedRevision:1,mode:"hint" as const,response:"",confirmed:true,modality:"typed" as const};
    const first=await runChapterSession(state,input),replayed=await runChapterSession(state,input);
    expect(first).toEqual(replayed);expect(first.state.supportCount).toBe(1);
    const second=await runChapterSession(first.state,{...input,expectedRevision:2});
    expect(second.feedback.guidance).not.toBe(first.feedback.guidance);
    expect(second.state.supportCount).toBe(2);
  });
  it("rejects changed trusted exercise content and unconfirmed spoken work",async()=>{
    const [exercise]=await loadChapterPractice(2,0),state=await startChapterSession(record,course,exercise.id);
    const input={expectedRevision:1,mode:"check" as const,response:"3",confirmed:false,modality:"voice" as const};
    const unconfirmed=await runChapterSession(state,input);
    expect(unconfirmed.feedback.status).toBe("needs_confirmation");
    expect(unconfirmed.feedback.assessment).toBeNull();
    await expect(runChapterSession({...state,exerciseVersionId:"a".repeat(64)},input)).rejects.toThrow("problem_mismatch");
    await expect(runChapterSession({...state,observations:[{...state.observations[0],text:"changed"}]},input)).rejects.toThrow("problem_mismatch");
  });
  it("does not check conflicting interpretations or bypass stale revisions",async()=>{
    const [exercise]=await loadChapterPractice(2,0),state=await startChapterSession(record,course,exercise.id);
    const conflicting={id:"photo",field:"prompt",role:"problem_statement" as const,modality:"photo" as const,provenance:"machine_interpretation" as const,text:"Solve 2x+3=11."};
    const hash=await observationHash(conflicting);
    const result=await runChapterSession({...state,observations:[...state.observations,{...conflicting,contentHash:hash,confirmedHash:hash}]},{expectedRevision:1,mode:"check",response:"3",confirmed:true,modality:"typed"});
    expect(result.readiness.status).toBe("conflict");expect(result.feedback.assessment).toBeNull();
    await expect(runChapterSession(state,{expectedRevision:2,mode:"hint",response:"",confirmed:true,modality:"typed"})).rejects.toThrow("revision_conflict");
  });
});
