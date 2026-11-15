import {beforeAll,describe,expect,it} from "vitest";
import {loadCourseCatalog} from "./course-catalog";
import {startActivitySession,runActivitySession} from "./activity-session";
import {buildResponsePacket,evaluateResponseAssessments,responseTextHash,validateResponsePacket,type ResponsePacket,type ResponseAssessment} from "./response-assessment";
import {responseRubric,versionResponseRubric} from "./response-rubric";
import type {VersionedActivity} from "./course-activities";

const now=Date.parse("2026-09-26T12:00:00Z"), response="The observations support a limited claim because other explanations remain possible.";
let packet:ResponsePacket,activity:VersionedActivity;
const registry=["reviewer-a","reviewer-b","reviewer-c"].map(id=>({id,subjects:["reading","english","science","history"],qualificationReference:"qualification:"+id,verifiedBy:"study-operator",verifiedAt:"2026-09-01T00:00:00Z",expiresAt:"2026-10-01T00:00:00Z",revokedAt:null}));
function rating(reviewer:number,score=2,role:ResponseAssessment["role"]="rater"):ResponseAssessment{return {id:`00000000-0000-4000-8000-00000000000${reviewer}`,packetId:packet.id,packetHash:packet.contentHash,rubricHash:packet.rubricHash,reviewerId:registry[reviewer-1].id,qualificationReference:registry[reviewer-1].qualificationReference,role,reviewedAt:"2026-09-26T10:00:00Z",conflictOfInterest:false,resolves:[],criteria:packet.rubric.criteria.map(value=>({criterionId:value.id,score,rationale:"The response qualifies the claim using its stated observations.",evidence:[{start:0,end:16,exactText:response.slice(0,16)}]}))};}
async function evaluate(reviews:unknown[],people:unknown[]=registry,permissions:unknown[]=[packet.permission]){return evaluateResponseAssessments([packet],reviews,people,permissions,now);}
beforeAll(async()=>{
  activity=(await loadCourseCatalog()).activities.find(value=>value.method.kind==="writing_revision")!;
  const initial=await startActivitySession("00000000-0000-4000-8000-000000000101",{classId:"00000000-0000-4000-8000-000000000102",assignmentId:null,exerciseId:activity.id},activity);
  const {state}=await runActivitySession(initial,initial,activity,{expectedRevision:1,mode:"save",response,confirmed:true,modality:"typed"});
  packet=await buildResponsePacket(activity,state,{id:"synthetic-response-permission",scope:"response_assessment",responseHash:await responseTextHash(response),activityVersionId:activity.versionId,provenance:"authored_synthetic",rightsReference:"original-engineering-fixture",consentReference:null,issuedBy:"fixture-operator",issuedAt:"2026-09-20T00:00:00Z",expiresAt:"2026-10-01T00:00:00Z",revokedAt:null,reviewerIds:registry.map(value=>value.id)},"synthetic-blinding-secret-32-characters",now);
});
describe("versioned response assessment",()=>{
  it("offers guides for interpretation without changing exact mathematics",async()=>{
    const catalog=await loadCourseCatalog();
    expect(responseRubric(catalog.activities.find(value=>value.method.kind==="math_exact")!)).toBeNull();
    const rubric=await versionResponseRubric(activity);
    expect(rubric.rubric.automaticScoring).toBe(false);
    expect((await versionResponseRubric({...activity,method:{kind:"writing_revision",criteria:["Changed first criterion","Changed second criterion"]}})).hash).not.toBe(rubric.hash);
  });
  it("binds exact response, rubric and source snapshots",async()=>{
    await expect(validateResponsePacket({...packet,response:response+"!"})).rejects.toThrow("assessment_packet_changed");
    await expect(validateResponsePacket({...packet,rubric:{...packet.rubric,taskCriteria:["Changed criterion","Another criterion"]}})).rejects.toThrow("assessment_packet_changed");
  });
  it("requires independent agreement and never promotes mastery or training",async()=>{
    const result=await evaluate([rating(1),rating(2)]);
    expect(result.status).toBe("review_complete");expect(result.agreement.exactRate).toBe(1);
    expect(result.eligibleForKnowledge).toBe(false);expect(result.trainingEligible).toBe(false);
    expect((await evaluate([rating(1)])).status).toBe("incomplete");
  });
  it("requires exact response spans and all named criteria",async()=>{
    const changed=rating(1);changed.criteria[0].evidence[0].exactText="Unrelated text";
    const result=await evaluate([changed,rating(2)]);expect(result.errors).toContain("assessment_span_changed");expect(result.rows[0].criteria).toBeNull();
    const duplicate=rating(1);duplicate.criteria[1].criterionId=duplicate.criteria[0].criterionId;
    expect((await evaluate([duplicate,rating(2)])).errors).toContain("assessment_criteria_incomplete");
  });
  it("refreshes credentials, subject access and consent on every report",async()=>{
    expect((await evaluate([rating(1),rating(2)],[{...registry[0],revokedAt:"2026-09-26T11:00:00Z"},...registry.slice(1)])).status).toBe("invalid");
    expect((await evaluate([rating(1),rating(2)],[{...registry[0],subjects:["math"]},...registry.slice(1)])).status).toBe("invalid");
    expect((await evaluate([rating(1),rating(2)],registry,[])).status).toBe("invalid");
    expect((await evaluate([rating(1),rating(2)],registry,[{...packet.permission,revokedAt:"2026-09-26T11:00:00Z"}])).errors).toContain("review_permission_changed");
  });
  it("rejects self-verification, duplicate reviewers and future ratings",async()=>{
    expect((await evaluate([rating(1),rating(2)],[{...registry[0],verifiedBy:registry[0].id},...registry.slice(1)])).status).toBe("invalid");
    expect((await evaluate([rating(1),{...rating(1),id:rating(2).id}])).errors).toContain("duplicate_assessment");
    expect((await evaluate([{...rating(1),reviewedAt:"2027-01-01T00:00:00Z"},rating(2)])).status).toBe("invalid");
  });
  it("requires a third reviewer and exact prior assessment IDs to adjudicate",async()=>{
    const a=rating(1),b=rating(2,3),c={...rating(3,2,"adjudicator"),resolves:[a.id,b.id],reviewedAt:"2026-09-26T11:00:00Z"};
    expect((await evaluate([a,b])).rows[0].status).toBe("disagreement");
    expect((await evaluate([a,b,c])).rows[0].status).toBe("adjudicated");
    expect((await evaluate([a,b,{...c,resolves:[a.id,a.id]}])).status).toBe("invalid");
    expect((await evaluate([a,b,{...c,reviewerId:a.reviewerId,qualificationReference:a.qualificationReference}])).status).toBe("invalid");
  });
  it("keeps unobserved criteria pending",async()=>{
    const a=rating(1);a.criteria[0].score=null;
    expect((await evaluate([a,rating(2)])).status).toBe("incomplete");
  });
});
