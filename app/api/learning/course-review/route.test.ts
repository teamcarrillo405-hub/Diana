import {beforeEach,describe,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({user:{id:"user"} as {id:string}|null,profile:null as unknown,rpc:vi.fn(),from:vi.fn()}));
vi.mock("@/lib/learning-engine/server",()=>({createLearningClient:async()=>({auth:{getUser:async()=>({data:{user:mocks.user}})},rpc:mocks.rpc,from:mocks.from})}));
import {GET,POST} from "./route";
beforeEach(()=>{vi.clearAllMocks();mocks.user={id:"user"};mocks.profile=null;mocks.rpc.mockImplementation(async(name:string)=>name==="learning_editor_profile"?{data:mocks.profile,error:null}:{data:null,error:null});});
describe("educator review API authorization",()=>{
  it("does not expose prompts or answer keys to ordinary students",async()=>{
    const response=await GET(new Request("http://localhost/api/learning/course-review"));
    expect(response.status).toBe(403);expect(mocks.from).not.toHaveBeenCalled();
    expect(await (await GET(new Request("http://localhost/api/learning/course-review?access=1"))).json()).toEqual({profile:null});
    mocks.user=null;expect((await GET(new Request("http://localhost/api/learning/course-review"))).status).toBe(401);
  });
  it("does not accept client-authored modules or forged review identity",async()=>{
    mocks.profile={roles:["operator"],subjects:["science"],expiresAt:"2026-10-01T00:00:00Z"};
    for(const body of [{action:"register",courseId:"science-middle-school",payload:{}},{action:"review",moduleId:crypto.randomUUID(),reviewerId:"forged",notes:"Enough notes to request a review",checks:{},noConflict:true}]){
      const response=await POST(new Request("http://localhost/api/learning/course-review",{method:"POST",body:JSON.stringify(body)}));expect(response.status).toBe(400);
    }
    expect(mocks.rpc.mock.calls.every(call=>call[0]==="learning_editor_profile")).toBe(true);
  });
});
