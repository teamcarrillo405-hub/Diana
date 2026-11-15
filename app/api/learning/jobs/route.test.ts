import {beforeEach,describe,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({user:{id:"00000000-0000-4000-8000-000000000001"} as {id:string}|null,enabled:true,assignment:{id:"assignment"} as {id:string}|null,eq:vi.fn(),advance:vi.fn(),select:vi.fn()}));
vi.mock("@/lib/learning-engine/ingestion",()=>({advancePdf:mocks.advance}));
vi.mock("@/lib/learning-engine/server",()=>({learningAccess:async()=>mocks.enabled,createLearningClient:async()=>({auth:{getUser:async()=>({data:{user:mocks.user}})},from:()=>{const query={select:(...args:unknown[])=>{mocks.select(...args);return query;},eq:(...args:unknown[])=>{mocks.eq(...args);return query;},maybeSingle:async()=>({data:mocks.assignment,error:null}),order:()=>query,limit:async()=>({data:[],error:null})};return query;}})}));
import {GET,POST} from "./route";
const assignmentId="00000000-0000-4000-8000-000000000002";
beforeEach(()=>{vi.clearAllMocks();mocks.user={id:"00000000-0000-4000-8000-000000000001"};mocks.enabled=true;mocks.assignment={id:assignmentId};});
describe("preparation operation scope",()=>{
  it("requires an owned assignment and never returns page content or lease tokens",async()=>{
    const request=new Request("http://localhost/api/learning/jobs?assignmentId="+assignmentId);
    expect((await GET(request)).status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith("owner_id",mocks.user!.id);
    expect(mocks.select.mock.calls.flat().flatMap(value=>String(value).split(","))).not.toEqual(expect.arrayContaining(["lease_token","pages"]));
    mocks.assignment=null;expect((await GET(request)).status).toBe(404);
    mocks.user=null;expect((await GET(request)).status).toBe(401);
  });
  it("does not accept a client owner or unbounded batch request",async()=>{
    const response=await POST(new Request("http://localhost/api/learning/jobs",{method:"POST",body:JSON.stringify({jobId:assignmentId,ownerId:assignmentId})}));
    expect(response.status).toBe(400);expect(mocks.advance).not.toHaveBeenCalled();
  });
});
