import { describe, expect, it } from "vitest";
import { buildBlindedRetrievalReview, evaluateRetrievalReviews, validateRetrievalReviewPacket,
  type RetrievalJudgment } from "./retrieval-review";

const now=Date.parse("2026-09-26T12:00:00.000Z"),versionId="a".repeat(64),blockId="b".repeat(64),
  contentHash="c".repeat(64),assetHash="d".repeat(64),candidateId=versionId+":"+blockId;
const sources=[{chapter:2,versionId,contentHash,assetHash}];
const quote="A linear function has a constant rate of change.";
const candidates=[{id:candidateId,chapter:2,page:4,versionId,contentHash,assetHash,
  startOffset:10,endOffset:10+quote.length,quote,readerUrl:"/assets/textbooks/precalculus-2.3/chapter-2.pdf#page=4"}];
const reviewers=["educator-one","educator-two","educator-three"].map(id=>({id,subjects:["math" as const],
  qualificationReference:"credential-"+id,verifiedBy:"trusted-operator",verifiedAt:"2026-09-01T00:00:00.000Z",
  expiresAt:"2026-10-01T00:00:00.000Z",revokedAt:null}));
async function packet(){return buildBlindedRetrievalReview({bookId:"lippman-rasmussen-precalculus-2.3",edition:"2.3",license:"CC BY-SA 4.0",
  queryId:"linear-topic",query:"rate of change",sources,candidates,
  conditions:{lexical:[candidateId],curriculumGraph:[candidateId]},blindSecret:"review-secret-that-is-at-least-32-characters"});}
function review(packetId:string,packetHash:string,index:number,relevance=2):RetrievalJudgment{
  const person=reviewers[index];
  return {id:`11111111-1111-4111-8111-11111111111${index+1}`,packetId,packetHash,reviewerId:person.id,
    qualificationReference:person.qualificationReference,role:index===2?"adjudicator":"rater",
    reviewedAt:index===2?"2026-09-25T11:00:00.000Z":"2026-09-24T11:00:00.000Z",
    conflictOfInterest:false,resolves:[],originalPagesChecked:true,
    questionStatus:relevance===2?"answerable_from_candidates":"not_answerable_from_candidates",
    rationale:"The source passage was compared with its original page and question.",
    ratings:[{candidateId,relevance,supportsAnswer:relevance===2}]};
}

describe("blinded textbook retrieval review",()=>{
  it("keeps method ranks in an operator mapping and binds every quote to a source version",async()=>{
    const built=await packet();
    expect(JSON.stringify(built.packet)).not.toContain("curriculumGraph");
    expect(built.mapping.conditions).toEqual({lexical:[candidateId],curriculumGraph:[candidateId]});
    await expect(validateRetrievalReviewPacket({...built.packet,candidates:[{...candidates[0],quote:"Altered passage"}]},built.mapping)).rejects.toThrow("packet_changed");
    await expect(validateRetrievalReviewPacket(built.packet,{...built.mapping,conditions:{lexical:[],curriculumGraph:[]}})).rejects.toThrow("mapping_changed");
    await expect(buildBlindedRetrievalReview({bookId:"lippman-rasmussen-precalculus-2.3",edition:"2.3",license:"CC BY-SA 4.0",
      queryId:"linear-topic",query:"rate of change",sources,candidates:[{...candidates[0],assetHash:"e".repeat(64)}],
      conditions:{lexical:[candidateId],curriculumGraph:[candidateId]},blindSecret:"review-secret-that-is-at-least-32-characters"})).rejects.toThrow("source_mismatch");
  });
  it("requires two independent current qualified ratings of the exact packet",async()=>{
    const {packet:target,mapping}=await packet();
    const first=review(target.id,target.contentHash,0),second=review(target.id,target.contentHash,1);
    const result=await evaluateRetrievalReviews([target],[mapping],[first,second],reviewers,now);
    expect(result.status).toBe("review_complete");
    expect(result.rows[0]).toMatchObject({status:"agreed",questionStatus:"answerable_from_candidates",
      conditions:{lexical:{returned:1,directlyRelevant:1,supportsAnswer:true}}});
    expect(result.summary).toMatchObject({
      scope:{reviewedQueries:1,operatorSuppliedQueries:0,answerableInPool:1},
      conditions:{lexical:{passagePrecision:1,poolRelativeRecall:1,answerableHit:{count:1,of:1}}},
      paired:{answerability:{graphWins:0,lexicalWins:0,ties:1}},
    });
    expect(result.limits.identityExternallyVerified).toBe(false);
    expect((await evaluateRetrievalReviews([target],[mapping],[first],reviewers,now)).status).toBe("incomplete");
    expect((await evaluateRetrievalReviews([target],[mapping],[first],reviewers,now)).summary).toBeNull();
    const revoked=reviewers.map(item=>item.id===first.reviewerId?{...item,revokedAt:"2026-09-25T10:00:00.000Z"}:item);
    expect((await evaluateRetrievalReviews([target],[mapping],[first,second],revoked,now)).status).toBe("invalid");
  });
  it("reports a paired gain only when reviewed passages support it",async()=>{
    const otherId=versionId+":"+"e".repeat(64),otherQuote="This passage describes a graph without the requested rate.";
    const other={...candidates[0],id:otherId,page:5,startOffset:0,endOffset:otherQuote.length,quote:otherQuote,
      readerUrl:"/assets/textbooks/precalculus-2.3/chapter-2.pdf#page=5"};
    const built=await buildBlindedRetrievalReview({bookId:"lippman-rasmussen-precalculus-2.3",edition:"2.3",license:"CC BY-SA 4.0",
      queryId:"paired-topic",query:"rate of change",queryOrigin:"operator_supplied",sources,candidates:[...candidates,other],
      conditions:{lexical:[otherId],curriculumGraph:[candidateId]},blindSecret:"review-secret-that-is-at-least-32-characters"});
    const ratings=[{candidateId,relevance:2,supportsAnswer:true},{candidateId:otherId,relevance:0,supportsAnswer:false}];
    const first={...review(built.packet.id,built.packet.contentHash,0),ratings};
    const second={...review(built.packet.id,built.packet.contentHash,1),ratings};
    const result=await evaluateRetrievalReviews([built.packet],[built.mapping],[first,second],reviewers,now);
    expect(result.summary).toMatchObject({scope:{reviewedQueries:1,operatorSuppliedQueries:1},
      conditions:{lexical:{passagePrecision:0,poolRelativeRecall:0,topResultRelevant:0,answerableHit:{count:0,of:1}},
        curriculumGraph:{passagePrecision:1,poolRelativeRecall:1,topResultRelevant:1,answerableHit:{count:1,of:1}}},
      paired:{answerability:{graphWins:1,lexicalWins:0,ties:0},topResultRelevance:{graphWins:1,lexicalWins:0,ties:0}}});
  });
  it("keeps disagreement pending until a distinct later adjudicator resolves the two rating IDs",async()=>{
    const {packet:target,mapping}=await packet();
    const first=review(target.id,target.contentHash,0),second=review(target.id,target.contentHash,1,0);
    const pending=await evaluateRetrievalReviews([target],[mapping],[first,second],reviewers,now);
    expect(pending.status).toBe("incomplete");expect(pending.rows[0].status).toBe("disagreement");
    const third={...review(target.id,target.contentHash,2),resolves:[first.id,second.id]};
    const completed=await evaluateRetrievalReviews([target],[mapping],[first,second,third],reviewers,now);
    expect(completed.status).toBe("review_complete");expect(completed.rows[0].status).toBe("adjudicated");
    const unrelated={...third,resolves:[first.id,"11111111-1111-4111-8111-111111111199"]};
    expect((await evaluateRetrievalReviews([target],[mapping],[first,second,unrelated],reviewers,now)).status).toBe("invalid");
  });
});
