import {describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({client:vi.fn()}));
vi.mock("@/lib/learning-engine/server",()=>({createLearningClient:mocks.client,learningAccess:vi.fn()}));
vi.mock("@/lib/learning-engine/problem-store",()=>({readProblem:vi.fn()}));
import {GET,POST} from "./route";

describe("unsealed educator response review hold",()=>{
  it("does not read any private record or reviewer registry even with a reviewer request",async()=>{
    const result=await GET(new Request("http://localhost/api/learning/response-review?id=00000000-0000-4000-8000-000000000011"));
    expect(result?.status).toBe(503);
    expect(await result!.json()).toEqual({error:"Educator response review is not available yet."});
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("does not accept a consent or forged rating while the seal is absent",async()=>{
    for(const body of [{action:"request",consent:true},{action:"rate",assessment:{packetId:"forged"}}]){
      const result=await POST(new Request("http://localhost/api/learning/response-review",{
        method:"POST",headers:{"content-type":"application/json","origin":"http://localhost"},body:JSON.stringify(body)}));
      expect(result?.status).toBe(503);
    }
    expect(mocks.client).not.toHaveBeenCalled();
  });
});
