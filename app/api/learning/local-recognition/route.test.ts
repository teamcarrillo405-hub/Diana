import {beforeEach,describe,expect,it,vi} from "vitest";
import {tmpdir} from "node:os";
import {join} from "node:path";

const mocks=vi.hoisted(()=>({user:{id:"student"} as {id:string}|null,allowed:true,dbReady:true,run:vi.fn()}));
vi.mock("@/lib/learning-engine/server",()=>({
  createLearningClient:async()=>({auth:{getUser:async()=>({data:{user:mocks.user}})},rpc:async()=>({data:mocks.dbReady,error:null})}),
  learningAccess:async()=>mocks.allowed,
}));
vi.mock("@/lib/learning-engine/local-recognition-runner",()=>({runLocalRecognition:mocks.run}));
import {GET,POST} from "./route";

const address="http://localhost/api/learning/local-recognition";
function upload(bytes:Uint8Array=new Uint8Array([82,73,70,70])){
  const body=new FormData();body.set("kind","speech");body.set("asset",new File([bytes],"sample.wav",{type:"audio/wav"}));
  return new Request(address,{method:"POST",body,headers:{Origin:"http://localhost"}});
}
beforeEach(()=>{
  vi.clearAllMocks();mocks.user={id:"student"};mocks.allowed=true;mocks.dbReady=true;
  process.env.DIANA_LOCAL_RECOGNITION_ENABLED="1";
  process.env.DIANA_RECOGNITION_PYTHON=join(tmpdir(),"diana-recognition-missing-fixture","python");
  process.env.DIANA_RECOGNITION_SPEECH_MANIFEST=join(tmpdir(),"diana-recognition-missing-fixture","speech.json");
  process.env.DIANA_RECOGNITION_PROVENANCE_KEY="12".repeat(32);
  delete process.env.VERCEL;
  mocks.run.mockResolvedValue({version:"recognition-draft-v1",contentHash:"a".repeat(64),text:"a spoken answer",confirmedHash:null,
    recognition:{version:"local-recognition-v1",kind:"speech",assetHash:"b".repeat(64),fileManifestHash:"c".repeat(64),modelId:"fixture",revision:"1".repeat(40),text:"a spoken answer",elapsedMs:42,device:"cpu",confidence:null,networkUsed:false}});
});

describe("opt-in local recognition boundary",()=>{
  it("is disabled by default and never calls a model",async()=>{
    delete process.env.DIANA_LOCAL_RECOGNITION_ENABLED;
    expect((await GET(new Request(address))).status).toBe(503);
    expect((await POST(upload())).status).toBe(503);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("requires a session and the learning capability",async()=>{
    mocks.user=null;expect((await POST(upload())).status).toBe(401);
    mocks.user={id:"student"};mocks.allowed=false;expect((await POST(upload())).status).toBe(503);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("rejects nonlocal and cross-origin requests",async()=>{
    expect((await POST(new Request("https://example.org/api/learning/local-recognition",{method:"POST",body:new FormData()}))).status).toBe(503);
    const foreign=upload();foreign.headers.set("Origin","https://example.org");
    expect((await POST(foreign)).status).toBe(503);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("returns only an unconfirmed draft for a bounded file",async()=>{
    const response=await POST(upload());expect(response.status).toBe(200);
    const result=await response.json();expect(result.draft.confirmedHash).toBeNull();
    expect(result.proof).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(mocks.run).toHaveBeenCalledWith(expect.objectContaining({mime:"audio/wav",asset:expect.any(Uint8Array)}));
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("does not advertise model paths that are configured but missing",async()=>{
    const response=await GET(new Request(address));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({available:false,speech:false,handwritingLine:false});
  });
  it("does not advertise recognition without a separate provenance signing key",async()=>{
    delete process.env.DIANA_RECOGNITION_PROVENANCE_KEY;
    expect((await GET(new Request(address))).status).toBe(503);
    expect((await POST(upload())).status).toBe(503);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("stays disabled until the database has the same signing key",async()=>{
    mocks.dbReady=false;
    expect((await GET(new Request(address))).status).toBe(503);
    expect((await POST(upload())).status).toBe(503);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("rejects oversized files and missing model configuration before invocation",async()=>{
    expect((await POST(upload(new Uint8Array(5_000_001)))).status).not.toBe(200);
    delete process.env.DIANA_RECOGNITION_SPEECH_MANIFEST;
    expect((await POST(upload())).status).toBe(503);
    expect(mocks.run).not.toHaveBeenCalled();
  });
});
