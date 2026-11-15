import {beforeEach,describe,it,expect,vi} from "vitest";
const mocks=vi.hoisted(()=>({user:{id:"00000000-0000-4000-8000-000000000002"} as {id:string}|null,enabled:true,course:{id:"00000000-0000-4000-8000-000000000003",ai_mode:"green",ai_policy:"yellow"} as {id:string;ai_mode:string;ai_policy:string}|null,read:vi.fn(),save:vi.fn(),select:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/learning-engine/server",()=>({learningAccess:async()=>mocks.enabled,createLearningClient:async()=>({auth:{getUser:async()=>({data:{user:mocks.user}})},from:()=>({select:(...args:unknown[])=>{mocks.select(...args);const query={eq:()=>query,maybeSingle:async()=>({data:mocks.course,error:null})};return query;}})})}));
vi.mock("@/lib/learning-engine/problem-store",()=>({readProblem:mocks.read,saveProblem:mocks.save}));
import {POST} from "./route";
import {loadChapterPractice} from "@/lib/learning-engine/chapter-practice";
import {startChapterSession} from "@/lib/learning-engine/chapter-session";
const id="00000000-0000-4000-8000-000000000004",classId="00000000-0000-4000-8000-000000000003",requestId="00000000-0000-4000-8000-000000000005";
const request=(body:unknown)=>new Request("http://localhost/api/learning/chapter-practice",{method:"POST",body:JSON.stringify(body),headers:{"Content-Type":"application/json"}});
beforeEach(()=>{vi.clearAllMocks();mocks.user={id:"00000000-0000-4000-8000-000000000002"};mocks.enabled=true;mocks.course={id:classId,ai_mode:"green",ai_policy:"yellow"};mocks.read.mockResolvedValue(null);mocks.save.mockResolvedValue(undefined);});
describe("chapter practice trust boundary",()=>{
  it("requires authentication and enrollment",async()=>{
    mocks.user=null;expect((await POST(request({}))).status).toBe(401);
    mocks.user={id:classId};mocks.enabled=false;expect((await POST(request({}))).status).toBe(404);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects client specifications and educator-review claims",async()=>{
    const [exercise]=await loadChapterPractice(2);
    for(const forged of [{specification:{equation:"x=7"}},{reviewed:true}]){
      expect((await POST(request({action:"start",id,requestId,classId,exerciseId:exercise.id,...forged}))).status).toBe(400);
    }
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("loads the owned class and canonical ai_mode before starting",async()=>{
    const [exercise]=await loadChapterPractice(2),body={action:"start",id,requestId,classId,exerciseId:exercise.id};
    mocks.course=null;expect((await POST(request(body))).status).toBe(404);
    mocks.course={id:classId,ai_mode:"yellow",ai_policy:"green"};expect((await POST(request(body))).status).toBe(403);
    mocks.course={id:classId,ai_mode:"green",ai_policy:"yellow"};const response=await POST(request(body));
    expect(response.status).toBe(200);expect(mocks.select).toHaveBeenCalledWith("id,ai_mode");
    const result=await response.json();expect(result.state.exerciseVersionId).toBe(exercise.versionId);
    expect(result.state).not.toHaveProperty("specification");
  });
  it("recomputes checks from catalog data and reaches the idempotent historical save",async()=>{
    const [exercise]=await loadChapterPractice(2),state=await startChapterSession(id,classId,exercise.id);mocks.read.mockResolvedValue(state);
    const body={action:"respond",id,requestId,expectedRevision:1,mode:"check",response:"3",confirmed:true,modality:"typed"};
    const first=await POST(request(body));expect(first.status).toBe(200);
    expect((await first.json()).feedback.assessment.outcome).toBe("supported");
    expect(mocks.read).toHaveBeenCalledWith(expect.anything(),mocks.user!.id,id,1);
    mocks.save.mockRejectedValueOnce(new Error("revision_conflict"));expect((await POST(request(body))).status).toBe(409);
  });
  it("does not reuse an existing record for another class or exercise",async()=>{
    const [exercise]=await loadChapterPractice(2),state=await startChapterSession(id,classId,exercise.id);mocks.read.mockResolvedValue({...state,scope:{...state.scope,classId:"00000000-0000-4000-8000-000000000099"}});
    expect((await POST(request({action:"start",id,requestId,classId,exerciseId:exercise.id}))).status).toBe(409);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
