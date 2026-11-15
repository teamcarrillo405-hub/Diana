import {describe,it,expect,vi} from "vitest";
import {drainIngestion} from "./ingestion-runner";
describe("independent ingestion pass",()=>{
  it("checkpoints before moving to the next batch and respects its bound",async()=>{
    let progress=0;
    const result=await drainIngestion({authorized:async()=>true,pending:async()=>["job-a"],advance:async()=>({status:++progress<3?"queued":"ready",busy:false}),maxSteps:2,maxDurationMs:1000});
    expect(result.steps).toBe(2);expect(progress).toBe(2);expect(result.status).toBe("bounded_pass_complete");
  });
  it("continues after a busy or paused job without retrying it in the same pass",async()=>{
    const advance=vi.fn(async(id:string)=>{if(id==="paused")throw new Error("storage unavailable");return {status:id==="busy"?"extracting":"ready",busy:id==="busy"};});
    const result=await drainIngestion({authorized:async()=>true,pending:async()=>["busy","paused","ready"],advance,maxSteps:10,maxDurationMs:1000});
    expect(result.results.map(value=>value.status)).toEqual(["busy","paused","ready"]);expect(advance).toHaveBeenCalledTimes(3);
  });
  it("honors revoked access between queue read and claim",async()=>{
    let checks=0;const advance=vi.fn();
    const result=await drainIngestion({authorized:async()=>++checks===1,pending:async()=>["job"],advance,maxSteps:10,maxDurationMs:1000});
    expect(result.status).toBe("authorization_unavailable");expect(advance).not.toHaveBeenCalled();
  });
  it("stops at the time budget without claiming another job",async()=>{
    let now=0;const advance=vi.fn(async()=>{now+=1000;return {status:"queued",busy:false};});
    const result=await drainIngestion({authorized:async()=>true,pending:async()=>["job"],advance,maxSteps:10,maxDurationMs:1000,now:()=>now});
    expect(result.steps).toBe(1);
  });
  it("does not claim after a slow authorization consumes the remaining pass budget",async()=>{
    let now=0,checks=0;const advance=vi.fn();
    const result=await drainIngestion({authorized:async()=>{if(++checks===2)now=1000;return true;},
      pending:async()=>["job"],advance,maxSteps:10,maxDurationMs:1000,now:()=>now});
    expect(result).toMatchObject({status:"bounded_pass_complete",steps:0});
    expect(advance).not.toHaveBeenCalled();
  });
});
