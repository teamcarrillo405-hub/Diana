import {afterEach,describe,expect,it,vi} from "vitest";
import {courseActivity} from "@/lib/learning-engine/course-catalog";
import {packetForDeliveredReview} from "@/lib/learning-engine/response-review-delivery";

const mocks=vi.hoisted(()=>({client:vi.fn(),access:vi.fn(),readProblem:vi.fn()}));
vi.mock("@/lib/learning-engine/server",()=>({createLearningClient:mocks.client,learningAccess:mocks.access}));
vi.mock("@/lib/learning-engine/problem-store",()=>({readProblem:mocks.readProblem}));

afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();mocks.client.mockReset();mocks.access.mockReset();mocks.readProblem.mockReset();});

describe("sealed educator response review delivery",()=>{
  it("returns only browser-safe invitation choices and strips educator IDs from request lists",async()=>{
    vi.stubEnv("DIANA_RESPONSE_REVIEW_ENABLED","true");
    vi.stubEnv("DIANA_RESPONSE_REVIEW_SEAL_KEY_HEX","ab".repeat(32));
    vi.stubEnv("DIANA_RESPONSE_REVIEW_BLINDING_KEY","synthetic-review-blinding-secret-32-characters");
    const owner="00000000-0000-4000-8000-000000000011";
    const educator="00000000-0000-4000-8000-000000000021";
    const otherEducator="00000000-0000-4000-8000-000000000022";
    const invitationId="00000000-0000-4000-8000-000000000031";
    const expiresAt=new Date(Date.now()+86_400_000).toISOString();
    const rpc=vi.fn(async(name:string,args?:Record<string,unknown>)=>{
      if(name==="learning_response_review_seal_ready")return {data:true,error:null};
      if(name==="learning_list_response_review_invitations"){
        expect(["owner","reviewer"]).toContain(args?.p_role);
        return {data:[{id:invitationId,displayLabel:"English educator",subject:"english",expiresAt,acceptedAt:args?.p_role==="owner"?new Date().toISOString():null}],error:null};
      }
      if(name==="learning_list_response_reviews")return {data:[{id:"00000000-0000-4000-8000-000000000051",reviewerIds:[educator,otherEducator],nested:{reviewerId:otherEducator},status:"pending"}],error:null};
      throw new Error("unexpected_rpc:"+name);
    });
    mocks.client.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:owner}}})},rpc});
    mocks.access.mockResolvedValue(true);
    vi.resetModules();const {GET}=await import("./route");
    const choice=await GET(new Request("http://localhost/api/learning/response-review?invitations=1&role=owner"));
    expect(choice!.status).toBe(200);
    expect(await choice!.json()).toEqual({invitations:[{id:invitationId,displayLabel:"English educator",subject:"english",expiresAt,acceptedAt:expect.any(String)}]});
    const reviewerChoice=await GET(new Request("http://localhost/api/learning/response-review?invitations=1&role=reviewer"));
    expect(reviewerChoice!.status).toBe(200);
    expect(await reviewerChoice!.json()).toEqual({invitations:[{id:invitationId,displayLabel:"English educator",subject:"english",expiresAt,acceptedAt:null}]});
    const requests=await GET(new Request("http://localhost/api/learning/response-review?role=owner"));
    expect(requests!.status).toBe(200);
    const list=await requests!.json();
    expect(list.requests[0]).toMatchObject({status:"pending",nested:{}});
    expect(JSON.stringify(list)).not.toContain(otherEducator);
    expect(JSON.stringify(list)).not.toContain(educator);
  });
  it("lets an educator accept only their own opaque invitation through the database",async()=>{
    vi.stubEnv("DIANA_RESPONSE_REVIEW_ENABLED","true");
    vi.stubEnv("DIANA_RESPONSE_REVIEW_SEAL_KEY_HEX","ab".repeat(32));
    vi.stubEnv("DIANA_RESPONSE_REVIEW_BLINDING_KEY","synthetic-review-blinding-secret-32-characters");
    const invitationId="00000000-0000-4000-8000-000000000031";
    const rpc=vi.fn(async(name:string,args?:Record<string,unknown>)=>{
      if(name==="learning_response_review_seal_ready")return {data:true,error:null};
      if(name==="learning_accept_response_review_invitation"){
        expect(args).toEqual({p_invitation:invitationId});
        return {data:true,error:null};
      }
      throw new Error("unexpected_rpc:"+name);
    });
    mocks.client.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"00000000-0000-4000-8000-000000000021"}}})},rpc});
    mocks.access.mockResolvedValue(true);
    vi.resetModules();const {POST}=await import("./route");
    const accepted=await POST(new Request("http://localhost/api/learning/response-review",{method:"POST",headers:{origin:"http://localhost","content-type":"application/json"},body:JSON.stringify({action:"accept",invitationId})}));
    expect(accepted!.status).toBe(200);
    expect(await accepted!.json()).toEqual({accepted:true});
  });
  it("signs only a server-built adult consent packet before returning a request ID",async()=>{
    vi.stubEnv("DIANA_RESPONSE_REVIEW_ENABLED","true");
    vi.stubEnv("DIANA_RESPONSE_REVIEW_SEAL_KEY_HEX","ab".repeat(32));
    vi.stubEnv("DIANA_RESPONSE_REVIEW_BLINDING_KEY","synthetic-review-blinding-secret-32-characters");
    const activity=await courseActivity("course-practice-v2:english-high-school:compare");
    const owner="00000000-0000-4000-8000-000000000011";
    const reviewers=["00000000-0000-4000-8000-000000000021","00000000-0000-4000-8000-000000000022"];
    const invitations=["00000000-0000-4000-8000-000000000031","00000000-0000-4000-8000-000000000032"];
    const recordId="00000000-0000-4000-8000-000000000041";
    const requestId="00000000-0000-4000-8000-000000000051";
    const response="The passages offer two explanations for the visitor increase.";
    mocks.readProblem.mockResolvedValue({revision:1,scope:{assignmentId:null,exerciseId:activity.id},
      exerciseVersionId:activity.versionId,
      observations:[{id:"response",text:response,contentHash:"a".repeat(64),confirmedHash:"a".repeat(64)}]});
    const delivered={id:requestId,recordId,revision:1,reviewerIds:reviewers,invitationIds:invitations,
      issuedAt:new Date(Date.now()-60_000).toISOString(),expiresAt:new Date(Date.now()+86_400_000).toISOString(),
      revokedAt:null,subject:"english",exerciseId:activity.id,activityVersionId:activity.versionId,
      response,modality:"typed",supportCount:0};
    const rpc=vi.fn(async(name:string,args?:Record<string,unknown>):Promise<{data:unknown,error:null}>=>{
      if(name==="learning_response_review_seal_ready")return {data:true,error:null};
      if(name==="learning_request_response_review_by_invitations"){
        expect(args).toEqual({p_record:recordId,p_revision:1,p_invitations:invitations});
        return {data:requestId,error:null};
      }
      if(name==="learning_response_review_draft")return {data:delivered,error:null};
      if(name==="learning_response_review_seal_challenge")return {data:Buffer.from("db-canonical-challenge").toString("base64"),error:null};
      if(name==="learning_seal_response_review"){
        expect(args?.p_packet).toMatchObject({response,activityVersionId:activity.versionId,permission:{invitationIds:invitations,reviewerIds:reviewers}});
        expect(args?.p_signature).toMatch(/^[a-f0-9]{64}$/);
        return {data:true,error:null};
      }
      throw new Error("unexpected_rpc:"+name);
    });
    mocks.client.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:owner}}})},rpc});
    mocks.access.mockResolvedValue(true);
    vi.resetModules();
    const {POST}=await import("./route");
    const rawIds=await POST(new Request("http://localhost/api/learning/response-review",{
      method:"POST",headers:{origin:"http://localhost","content-type":"application/json"},
      body:JSON.stringify({action:"request",recordId,revision:1,reviewerIds:reviewers,consent:true})}));
    expect(rawIds!.status).toBe(400);
    const result=await POST(new Request("http://localhost/api/learning/response-review",{
      method:"POST",headers:{origin:"http://localhost","content-type":"application/json"},
      body:JSON.stringify({action:"request",recordId,revision:1,invitationIds:invitations,consent:true})}));
    expect(result!.status).toBe(200);
    expect(await result!.json()).toEqual({requestId});
    expect(rpc.mock.calls.map(([name])=>name)).toEqual([
      "learning_response_review_seal_ready","learning_response_review_seal_ready","learning_request_response_review_by_invitations",
      "learning_response_review_draft","learning_response_review_seal_challenge",
      "learning_seal_response_review"]);
  });
  it("lets a named reviewer read the packet without calling owner-only rating RPCs",async()=>{
    const secret="synthetic-review-blinding-secret-32-characters";
    vi.stubEnv("DIANA_RESPONSE_REVIEW_ENABLED","true");
    vi.stubEnv("DIANA_RESPONSE_REVIEW_SEAL_KEY_HEX","ab".repeat(32));
    vi.stubEnv("DIANA_RESPONSE_REVIEW_BLINDING_KEY",secret);
    const activity=await courseActivity("course-practice-v2:english-high-school:compare");
    const reviewer="00000000-0000-4000-8000-000000000021";
    const delivered={id:"00000000-0000-4000-8000-000000000051",
      recordId:"00000000-0000-4000-8000-000000000041",revision:1,
      reviewerIds:[reviewer,"00000000-0000-4000-8000-000000000022"],
      invitationIds:["00000000-0000-4000-8000-000000000031","00000000-0000-4000-8000-000000000032"],
      issuedAt:new Date(Date.now()-60_000).toISOString(),
      expiresAt:new Date(Date.now()+86_400_000).toISOString(),revokedAt:null,
      subject:"english" as const,exerciseId:activity.id,activityVersionId:activity.versionId,
      response:"The shuttle may help, but the exhibit is another explanation.",
      modality:"typed" as const,supportCount:0};
    const sealedPacket=await packetForDeliveredReview(activity,delivered,secret);
    const rpc=vi.fn(async(name:string):Promise<{data:unknown,error:null}>=>{
      if(name==="learning_response_review_seal_ready")return {data:true,error:null};
      if(name==="learning_response_review_access")return {data:{...delivered,sealedPacket},error:null};
      if(name==="learning_editor_profile")return {data:{subjects:["english"]},error:null};
      throw new Error("owner_only_rpc_called:"+name);
    });
    let ownerRecord:{id:string}|null=null;
    const client={auth:{getUser:vi.fn(async()=>({data:{user:{id:reviewer}}}))},rpc,
      from:vi.fn(()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:ownerRecord,error:null})})})})}))};
    mocks.client.mockResolvedValue(client);mocks.access.mockResolvedValue(true);
    vi.resetModules();
    const {GET}=await import("./route");
    const result=await GET(new Request("http://localhost/api/learning/response-review?id="+delivered.id));
    expect(result!.status).toBe(200);
    const body=await result!.json();
    expect(body).toMatchObject({owner:false,report:null,packet:{id:sealedPacket.id}});
    expect(JSON.stringify(body)).not.toContain(delivered.reviewerIds[1]);
    expect(body.packet.permission).not.toHaveProperty("reviewerIds");
    expect(body.packet.permission).not.toHaveProperty("invitationIds");
    expect(rpc.mock.calls.map(([name])=>name)).toEqual([
      "learning_response_review_seal_ready","learning_response_review_access","learning_editor_profile"]);

    // The same sealed packet may be viewed by its owner with a valid stored
    // rating. This exercises the report parser after a direct RPC write.
    const owner="00000000-0000-4000-8000-000000000011";
    client.auth.getUser.mockResolvedValue({data:{user:{id:owner}}});
    ownerRecord={id:delivered.recordId};
    const reviewedAt=new Date().toISOString();
    const rating={id:"00000000-0000-4000-8000-000000000071",packetId:sealedPacket.id,
      packetHash:sealedPacket.contentHash,rubricHash:sealedPacket.rubricHash,reviewerId:reviewer,
      qualificationReference:"qualified-1",role:"rater",reviewedAt,conflictOfInterest:false,
      resolves:[],criteria:sealedPacket.rubric.criteria.map(item=>({criterionId:item.id,score:2,
        rationale:"The response connects a stated detail to its claim.",
        evidence:[{start:0,end:3,exactText:delivered.response.slice(0,3)}]}))};
    const registry=delivered.reviewerIds.map((id,index)=>({id,subjects:["english"],
      qualificationReference:"qualified-"+(index+1),verifiedBy:"operator",
      verifiedAt:new Date(Date.now()-86_400_000).toISOString(),
      expiresAt:new Date(Date.now()+86_400_000).toISOString(),revokedAt:null}));
    rpc.mockImplementation(async(name:string)=>{
      if(name==="learning_response_review_seal_ready")return {data:true,error:null};
      if(name==="learning_response_review_access")return {data:{...delivered,sealedPacket},error:null};
      if(name==="learning_editor_profile")return {data:{subjects:[]},error:null};
      if(name==="learning_response_review_ratings")return {data:[rating],error:null};
      if(name==="learning_response_review_registry")return {data:registry,error:null};
      throw new Error("unexpected_rpc:"+name);
    });
    const ownerResult=await GET(new Request("http://localhost/api/learning/response-review?id="+delivered.id));
    expect(ownerResult!.status).toBe(200);
    const ownerBody=await ownerResult!.json();
    expect(ownerBody).toMatchObject({owner:true,report:{status:"incomplete",errors:[]}});
    expect(JSON.stringify(ownerBody)).not.toContain(delivered.reviewerIds[1]);
  });
  it("builds a bound rating from the current reviewer credential and rejects altered evidence",async()=>{
    const secret="synthetic-review-blinding-secret-32-characters";
    vi.stubEnv("DIANA_RESPONSE_REVIEW_ENABLED","true");
    vi.stubEnv("DIANA_RESPONSE_REVIEW_SEAL_KEY_HEX","ab".repeat(32));
    vi.stubEnv("DIANA_RESPONSE_REVIEW_BLINDING_KEY",secret);
    const activity=await courseActivity("course-practice-v2:english-high-school:compare");
    const reviewer="00000000-0000-4000-8000-000000000021";
    const delivered={id:"00000000-0000-4000-8000-000000000051",
      recordId:"00000000-0000-4000-8000-000000000041",revision:1,
      reviewerIds:[reviewer,"00000000-0000-4000-8000-000000000022"],
      invitationIds:["00000000-0000-4000-8000-000000000031","00000000-0000-4000-8000-000000000032"],
      issuedAt:new Date(Date.now()-60_000).toISOString(),expiresAt:new Date(Date.now()+86_400_000).toISOString(),revokedAt:null,
      subject:"english" as const,exerciseId:activity.id,activityVersionId:activity.versionId,
      response:"The shuttle may help, but the exhibit is another explanation.",modality:"typed" as const,supportCount:0};
    const sealedPacket=await packetForDeliveredReview(activity,delivered,secret);
    let credentialReviewer=reviewer;
    const rpc=vi.fn(async(name:string,args?:Record<string,unknown>)=>{
      if(name==="learning_response_review_seal_ready")return {data:true,error:null};
      if(name==="learning_response_review_access")return {data:{...delivered,sealedPacket},error:null};
      if(name==="learning_editor_profile")return {data:{reviewerId:credentialReviewer,qualificationReference:"verified-educator-1",roles:["reviewer"],subjects:["english"]},error:null};
      if(name==="learning_submit_response_rating"){
        expect(args?.p_request).toBe(delivered.id);
        expect(args?.p_subject).toBe("english");
        const assessment=args?.p_assessment as Record<string,unknown>;
        expect(assessment).toMatchObject({packetId:sealedPacket.id,packetHash:sealedPacket.contentHash,
          rubricHash:sealedPacket.rubricHash,reviewerId:reviewer,qualificationReference:"verified-educator-1",
          role:"rater",conflictOfInterest:false,resolves:[]});
        expect(assessment.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(Number.isFinite(Date.parse(String(assessment.reviewedAt)))).toBe(true);
        return {data:"00000000-0000-4000-8000-000000000071",error:null};
      }
      throw new Error("unexpected_rpc:"+name);
    });
    mocks.client.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:reviewer}}})},rpc,
      from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})})})});
    mocks.access.mockResolvedValue(true);
    vi.resetModules();const {POST}=await import("./route");
    const criteria=sealedPacket.rubric.criteria.map(item=>({criterionId:item.id,score:2,
      rationale:"A specific response detail supports this descriptor.",
      evidence:[{start:0,end:3,exactText:"The"}]}));
    const post=(body:unknown)=>POST(new Request("http://localhost/api/learning/response-review",{
      method:"POST",headers:{origin:"http://localhost","content-type":"application/json"},body:JSON.stringify(body)}));
    const draft={action:"rateDraft",requestId:delivered.id,noConflict:true,criteria};
    for(const altered of [
      {...draft,reviewerId:delivered.reviewerIds[1]},
      {...draft,criteria:criteria.map((row,index)=>index===0?{...row,evidence:[{start:0,end:3,exactText:"Bad"}]}:row)},
      {...draft,criteria:criteria.map((row,index)=>index===0?{...row,evidence:[]}:row)},
      {...draft,criteria:[criteria[0],criteria[0],criteria[2]]},
    ])expect((await post(altered))?.status).not.toBe(200);
    expect(rpc.mock.calls.filter(([name])=>name==="learning_submit_response_rating")).toHaveLength(0);
    credentialReviewer=delivered.reviewerIds[1];
    expect((await post(draft))?.status).toBe(404);
    credentialReviewer=reviewer;
    const response=await post(draft);
    expect(response?.status).toBe(200);
    expect(await response!.json()).toEqual({ratingId:"00000000-0000-4000-8000-000000000071"});
  });
});
