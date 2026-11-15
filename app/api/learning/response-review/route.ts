import { NextResponse } from "next/server";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Json } from "@/lib/supabase/types";
import { createLearningClient, learningAccess } from "@/lib/learning-engine/server";
import { readProblem } from "@/lib/learning-engine/problem-store";
import { courseActivity } from "@/lib/learning-engine/course-catalog";
import { versionResponseRubric } from "@/lib/learning-engine/response-rubric";
import { packetForDeliveredReview, deliveredReviewSchema } from "@/lib/learning-engine/response-review-delivery";
import { responseAssessmentSchema, responsePacketSchema, validateResponsePacket, evaluateResponseAssessments } from "@/lib/learning-engine/response-assessment";

const uuid=z.string().uuid(), headers={"Cache-Control":"no-store"};
// External key provisioning and an explicit rollout decision are still required.
// The default remains a 503, including when the database migration is present.
const SEALED_DELIVERY_ENABLED=process.env.DIANA_RESPONSE_REVIEW_ENABLED==="true";
const securityHold=()=>NextResponse.json({error:"Educator response review is not available yet."},{status:503,headers});
function sealKey(){
  const encoded=process.env.DIANA_RESPONSE_REVIEW_SEAL_KEY_HEX??"";
  if(!/^[a-f0-9]{64,128}$/.test(encoded)||encoded.length%2)return null;
  return Buffer.from(encoded,"hex");
}
async function sealReady(client:Awaited<ReturnType<typeof createLearningClient>>){
  const key=sealKey();
  if(!key||(process.env.DIANA_RESPONSE_REVIEW_BLINDING_KEY??"").length<32)return false;
  const challenge=randomBytes(16).toString("hex");
  const signature=createHmac("sha256",key).update(challenge,"utf8").digest("hex");
  const result=await client.rpc("learning_response_review_seal_ready",{p_challenge:challenge,p_signature:signature});
  return !result.error&&result.data===true;
}
const input=z.discriminatedUnion("action",[
  z.object({action:z.literal("request"),recordId:uuid,revision:z.number().int().positive(),invitationIds:z.tuple([uuid,uuid]),consent:z.literal(true)}).strict(),
  z.object({action:z.literal("accept"),invitationId:uuid}).strict(),
  z.object({action:z.literal("revoke"),requestId:uuid}).strict(),
  z.object({action:z.literal("rateDraft"),requestId:uuid,noConflict:z.literal(true),criteria:responseAssessmentSchema.shape.criteria}).strict(),
]);
async function readBoundedJson(request:Request){
  const reader=request.body?.getReader();if(!reader)return null;
  const chunks:Uint8Array[]=[];let size=0;
  try{
    for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;
      if(size>32768){await reader.cancel();throw new Error("review_body_limit");}chunks.push(part.value);}
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function access(){
  const client=await createLearningClient(),{data:{user}}=await client.auth.getUser();
  if(!user)return {response:NextResponse.json({error:"Sign in to review."},{status:401,headers})};
  if(!await learningAccess("assessment",user.id,client))return {response:NextResponse.json({error:"Review is unavailable for this account."},{status:404,headers})};
  return {client,user};
}
async function packet(client:Awaited<ReturnType<typeof createLearningClient>>,requestId:string){
  // SQL checks the live consent, owner age, revision, reviewer identity and expiry before returning any answer.
  const row=await client.rpc("learning_response_review_access",{p_request:requestId});
  if(row.error)throw new Error("review_access_denied");
  const raw=z.object({sealedPacket:responsePacketSchema}).passthrough().parse(row.data);
  const {sealedPacket,...deliveredFields}=raw;
  const delivered=deliveredReviewSchema.parse(deliveredFields),activity=await courseActivity(delivered.exerciseId);
  const profile=await client.rpc("learning_editor_profile",{});
  const parsed=z.object({subjects:z.array(z.string())}).safeParse(profile.data);
  // Owners may inspect their own request. Reviewers must have the actual subject.
  const {data:{user}}=await client.auth.getUser();
  const owner=await client.from("learning_problem_records").select("owner_id").eq("id",delivered.recordId).eq("owner_id",user?.id??"").maybeSingle();
  if(!owner.data && (!parsed.success||!parsed.data.subjects.includes(activity.subject)))throw new Error("review_access_denied");
  const secret=process.env.DIANA_RESPONSE_REVIEW_BLINDING_KEY??"";
  const rebuilt=await packetForDeliveredReview(activity,delivered,secret);
  await validateResponsePacket(sealedPacket);
  if(rebuilt.id!==sealedPacket.id||rebuilt.contentHash!==sealedPacket.contentHash||
    rebuilt.rubricHash!==sealedPacket.rubricHash)throw new Error("review_packet_changed");
  return {delivered,activity,packet:sealedPacket};
}
function unavailable(){return NextResponse.json({error:"Review is unavailable or its permission has changed."},{status:404,headers});}
const invitationChoice=z.object({
  id:uuid,displayLabel:z.string().trim().min(1).max(80).refine(label=>!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(label)),
  subject:z.enum(["reading","english","science","history"]),
  expiresAt:z.string().datetime({offset:true}),acceptedAt:z.string().datetime({offset:true}).nullable(),
}).strict();
/** Keep the full sealed packet in server memory; its identity bindings do not belong in browser DTOs. */
function browserReviewDTO(value:unknown):unknown{
  if(Array.isArray(value))return value.map(browserReviewDTO);
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([key])=>
    !["reviewerIds","reviewerId","invitationIds","verifiedBy"].includes(key)).map(([key,item])=>[key,browserReviewDTO(item)]));
  return value;
}

export async function GET(request:Request){
  if(!SEALED_DELIVERY_ENABLED)return securityHold();
  const auth=await access();if("response" in auth)return auth.response;
  if(!await sealReady(auth.client))return securityHold();
  const url=new URL(request.url),id=uuid.safeParse(url.searchParams.get("id"));
  if(url.searchParams.has("invitations")){
    const role=url.searchParams.get("role");
    if(url.searchParams.get("invitations")!=="1"||url.searchParams.has("id")||(role!=="owner"&&role!=="reviewer"))return NextResponse.json({error:"Choose an invitation view."},{status:400,headers});
    const result=await auth.client.rpc("learning_list_response_review_invitations",{p_role:role});
    if(result.error)return unavailable();
    const invitations=z.array(invitationChoice).max(100).safeParse(result.data);
    return invitations.success?NextResponse.json({invitations:invitations.data},{headers}):unavailable();
  }
  if(!id.success){
    const role=url.searchParams.get("role");if(role!=="owner"&&role!=="reviewer")return NextResponse.json({error:"Choose a review."},{status:400,headers});
    const result=await auth.client.rpc("learning_list_response_reviews",{p_role:role});
    return result.error?unavailable():NextResponse.json({requests:browserReviewDTO(result.data)},{headers});
  }
  try{
    const item=await packet(auth.client,id.data);
    const ownerResult=await auth.client.from("learning_problem_records").select("id").eq("id",item.delivered.recordId).eq("owner_id",auth.user.id).maybeSingle();
    const owner=!!ownerResult.data;
    if(!owner)return NextResponse.json({requestId:id.data,packet:browserReviewDTO(item.packet),report:null,owner:false},{headers});
    const ratings=await auth.client.rpc("learning_response_review_ratings",{p_request:id.data});
    const registry=await auth.client.rpc("learning_response_review_registry",{p_request:id.data});
    if(ratings.error||registry.error)throw new Error("review_report_unavailable");
    const reviewers=z.array(z.object({id:uuid,subjects:z.array(z.string()),qualificationReference:z.string(),verifiedBy:z.string(),verifiedAt:z.string(),expiresAt:z.string(),revokedAt:z.string().nullable()}).strict()).parse(registry.data);
    const currentRegistry=reviewers.map(person=>({...person,verifiedAt:new Date(person.verifiedAt).toISOString(),expiresAt:new Date(person.expiresAt).toISOString(),revokedAt:person.revokedAt?new Date(person.revokedAt).toISOString():null}));
    const report=await evaluateResponseAssessments([item.packet],z.array(responseAssessmentSchema).parse(ratings.data),currentRegistry,[item.packet.permission]);
    return NextResponse.json({requestId:id.data,packet:browserReviewDTO(item.packet),report:browserReviewDTO(report),owner},{headers});
  }catch{return unavailable();}
}
export async function POST(request:Request){
  if(!SEALED_DELIVERY_ENABLED)return securityHold();
  const origin=request.headers.get("origin");
  if(!origin||origin!==new URL(request.url).origin)return NextResponse.json({error:"Review request origin is unavailable."},{status:403,headers});
  if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get("content-type")??""))return NextResponse.json({error:"Review request format is unavailable."},{status:415,headers});
  const contentLength=Number(request.headers.get("content-length")??0);
  if(!Number.isFinite(contentLength)||contentLength>32768)return NextResponse.json({error:"Review request is too large."},{status:413,headers});
  let body:unknown;
  try{body=await readBoundedJson(request);}catch(error){return NextResponse.json({error:error instanceof Error&&error.message==="review_body_limit"?"Review request is too large.":"Complete the review request."},{status:error instanceof Error&&error.message==="review_body_limit"?413:400,headers});}
  const auth=await access();if("response" in auth)return auth.response;
  if(!await sealReady(auth.client))return securityHold();
  const parsed=input.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:"Complete the review request."},{status:400,headers});
  const value=parsed.data;
  try{
    if(value.action==="accept"){
      const accepted=await auth.client.rpc("learning_accept_response_review_invitation",{p_invitation:value.invitationId});
      return accepted.error||accepted.data!==true?unavailable():NextResponse.json({accepted:true},{headers});
    }
    if(value.action==="request"){
      if(value.invitationIds[0]===value.invitationIds[1])return NextResponse.json({error:"Choose two independent educators."},{status:400,headers});
      const state=await readProblem(auth.client,auth.user.id,value.recordId,value.revision);
      if(!state||state.revision!==value.revision||state.scope.assignmentId!==null)return unavailable();
      const activity=await courseActivity(state.scope.exerciseId);
      if(state.exerciseVersionId!==activity.versionId||activity.sources.some(source=>source.authorship!=="diana_authored")||
        !state.observations.some(item=>item.id==="response"&&item.confirmedHash===item.contentHash&&item.text.trim()))return unavailable();
      await versionResponseRubric(activity);
      const saved=await auth.client.rpc("learning_request_response_review_by_invitations",{p_record:value.recordId,p_revision:value.revision,p_invitations:value.invitationIds});
      if(saved.error||typeof saved.data!=="string")return unavailable();
      try{
        const draft=await auth.client.rpc("learning_response_review_draft",{p_request:saved.data});
        if(draft.error)throw new Error("review_draft_unavailable");
        const delivered=deliveredReviewSchema.parse(draft.data);
        const prepared=await packetForDeliveredReview(activity,delivered,process.env.DIANA_RESPONSE_REVIEW_BLINDING_KEY??"");
        const challenge=await auth.client.rpc("learning_response_review_seal_challenge",{p_request:saved.data,p_packet:prepared as unknown as Json});
        if(challenge.error||typeof challenge.data!=="string")throw new Error("review_seal_challenge_unavailable");
        const key=sealKey();if(!key)throw new Error("review_seal_key_unavailable");
        const signature=createHmac("sha256",key).update(Buffer.from(challenge.data,"base64")).digest("hex");
        const sealed=await auth.client.rpc("learning_seal_response_review",{p_request:saved.data,p_packet:prepared as unknown as Json,p_signature:signature});
        if(sealed.error||sealed.data!==true)throw new Error("review_seal_unavailable");
        return NextResponse.json({requestId:saved.data},{headers});
      }catch{
        // Clear an unusable draft. The partial unique index permits retry.
        await auth.client.rpc("learning_revoke_response_review",{p_request:saved.data});
        return unavailable();
      }
    }
    if(value.action==="revoke"){
      const result=await auth.client.rpc("learning_revoke_response_review",{p_request:value.requestId});
      return result.error||!result.data?unavailable():NextResponse.json({revoked:true},{headers});
    }
    const item=await packet(auth.client,value.requestId);
    const profile=await auth.client.rpc("learning_editor_profile",{});
    const credential=z.object({reviewerId:uuid,qualificationReference:z.string().trim().min(1).max(300),roles:z.array(z.string()),subjects:z.array(z.string())}).safeParse(profile.data);
    if(profile.error||!credential.success||credential.data.reviewerId!==auth.user.id||
      !credential.data.roles.includes("reviewer")||!credential.data.subjects.includes(item.activity.subject))return unavailable();
    const expected=item.packet.rubric.criteria.map(criterion=>criterion.id);
    if(value.criteria.length!==expected.length||new Set(value.criteria.map(criterion=>criterion.criterionId)).size!==expected.length||
      value.criteria.some(criterion=>!expected.includes(criterion.criterionId)||criterion.score===null||
        (criterion.score>0&&!criterion.evidence.length)||criterion.evidence.some(span=>
          span.end<=span.start||span.end>item.packet.response.length||item.packet.response.slice(span.start,span.end)!==span.exactText)))return unavailable();
    const assessment=responseAssessmentSchema.parse({
      id:randomUUID(),packetId:item.packet.id,packetHash:item.packet.contentHash,rubricHash:item.packet.rubricHash,
      reviewerId:auth.user.id,qualificationReference:credential.data.qualificationReference,role:"rater",
      reviewedAt:new Date().toISOString(),conflictOfInterest:false,resolves:[],criteria:value.criteria,
    });
    const saved=await auth.client.rpc("learning_submit_response_rating",{p_request:value.requestId,p_subject:item.activity.subject,p_assessment:assessment as unknown as Json});
    return saved.error?unavailable():NextResponse.json({ratingId:saved.data},{headers});
  }catch{return unavailable();}
}
