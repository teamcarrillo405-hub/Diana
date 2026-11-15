import { describe, expect, it } from "vitest";
import { loadCourseCatalog } from "./course-catalog";
import { packetForDeliveredReview } from "./response-review-delivery";
import { validateResponsePacket } from "./response-assessment";

const secret="synthetic-review-blinding-key-over-32-characters";
async function fixture(){
  const catalog=await loadCourseCatalog(),activity=catalog.activities.find(item=>item.method.kind==="reading_evidence")!;
  return {activity,review:{id:"00000000-0000-4000-8000-000000000011",recordId:"00000000-0000-4000-8000-000000000012",revision:2,
    reviewerIds:["00000000-0000-4000-8000-000000000013","00000000-0000-4000-8000-000000000014"],
    invitationIds:["00000000-0000-4000-8000-000000000023","00000000-0000-4000-8000-000000000024"],
    issuedAt:"2026-09-25T00:00:00+00:00",expiresAt:"2099-10-01T00:00:00+00:00",revokedAt:null,
    exerciseId:activity.id,activityVersionId:activity.versionId,subject:activity.subject,response:"The first source supports a limited claim; the second raises a sampling concern.",
    modality:"typed",supportCount:1}};
}
describe("consented response review packet",()=>{
  it("binds the actual authored activity, rubric, recipient permission and answer without notebook metadata",async()=>{
    const {activity,review}=await fixture(),packet=await packetForDeliveredReview(activity,review,secret);
    expect(await validateResponsePacket(packet)).toEqual(packet);
    expect(packet.permission).toMatchObject({provenance:"consented_student",consentReference:review.id,reviewerIds:review.reviewerIds,invitationIds:review.invitationIds});
    expect(JSON.stringify(packet)).not.toContain(review.recordId);
    expect(packet.rubric.automaticScoring).toBe(false);
  });
  it("refuses revoked permission, changed course version and weak blinding",async()=>{
    const {activity,review}=await fixture();
    await expect(packetForDeliveredReview(activity,{...review,revokedAt:"2026-09-26T00:00:00Z"},secret)).rejects.toThrow();
    await expect(packetForDeliveredReview(activity,{...review,activityVersionId:"0".repeat(64)},secret)).rejects.toThrow();
    await expect(packetForDeliveredReview(activity,review,"weak")).rejects.toThrow("blinding_secret");
  });
});
