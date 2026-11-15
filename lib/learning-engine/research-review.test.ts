import {describe,it,expect} from "vitest";
import {buildReviewPackets,adjudicatePackets,comparePairedScores,type EducatorReview} from "./research-review";
import {highSchoolLearningCorpus} from "./evaluation-corpus";
import {buildTrainingExport,trainingContentHash,type TrainingExample} from "./training";
import {allocateStudy,summarizeStudy,type StudyProtocol} from "./study-protocol";
import {sha256} from "./curriculum";
const uuid="00000000-0000-4000-8000-000000000001";
describe("research evidence controls",()=>{
  it("blinds models and requires independent raters before adjudication",async()=>{
    const item=highSchoolLearningCorpus()[0];
    const {packets,operatorMapping}=await buildReviewPackets([item],[{caseId:item.id,manifestId:uuid,requestId:uuid,model:"secret-model",output:"A response",startedAt:"2026-09-01T00:00:00Z",completedAt:"2026-09-01T00:00:01Z",tokens:5,actualCents:1,providerResponseId:"response-id",synthetic:false}],"s".repeat(32));
    expect(JSON.stringify(packets)).not.toContain("secret-model");expect(operatorMapping[0].model).toBe("secret-model");
    const review:EducatorReview={packetId:packets[0].id,outputHash:packets[0].outputHash,reviewerId:"educator1",rubricVersion:"educator-rubric-v1",role:"rater",scores:{correctness:3,sourceSupport:3,instructionQuality:2,appropriateHelp:3,safety:3},notes:"Independent review notes.",reviewedAt:"2026-09-02T00:00:00Z",conflictOfInterest:false};
    expect(adjudicatePackets(packets,[review]).status).toBe("incomplete");
    expect(adjudicatePackets(packets,[review,review]).status).toBe("invalid");
    const second={...review,reviewerId:"educator2",scores:{...review.scores,correctness:1}};
    expect(adjudicatePackets(packets,[review,second]).rows[0].status).toBe("disagreement");
    expect(adjudicatePackets(packets,[review,second,{...review,reviewerId:"educator3",role:"adjudicator"}]).status).toBe("review_complete");
  });
  it("clusters comparisons by document family and keeps small samples inconclusive",()=>{
    const rows=Array.from({length:30},(_,index)=>({caseId:String(index),documentFamily:"d"+Math.floor(index/5),stratum:"algebra",baseline:0.5,candidate:0.7}));
    expect(comparePairedScores(rows).interval95?.[0]).toBeCloseTo(0.2);
    expect(comparePairedScores(rows.slice(0,5)).interval95).toBeNull();
    expect(()=>comparePairedScores([...rows,rows[0]])).toThrow("unique");
  });
  it("binds training evidence to the exact reviewed content and observes revocations",async()=>{
    const example:TrainingExample={id:"one",documentFamily:"one",templateFamily:"one",split:"train",provenanceId:"original-source",rights:"public_domain",containsStudentData:false,consentReceipt:null,humanReview:"approved",reviewerId:"educator1",messages:[{role:"system",content:"Tutor."},{role:"user",content:"Compute 2+2."},{role:"assistant",content:"4"}]};
    const contentHash=await trainingContentHash(example);
    const receipts=(["training_rights","educator_review"] as const).map(scope=>({id:scope,exampleId:example.id,contentHash,scope,issuedBy:"educator1",issuedAt:"2026-09-01T00:00:00Z",expiresAt:null,revokedAt:null}));
    expect((await buildTrainingExport([example],[],receipts)).status).toBe("ready_for_capability_review");
    expect((await buildTrainingExport([{...example,messages:[...example.messages.slice(0,2),{role:"assistant",content:"5"}]}],[],receipts)).jsonl).toBeNull();
    expect((await buildTrainingExport([example],[],receipts.map(receipt=>({...receipt,revokedAt:"2026-09-02T00:00:00Z"})))).jsonl).toBeNull();
  });
  it("allocates from a committed seed and does not equate a partial study with gains",async()=>{
    const secret="a".repeat(32);
    const protocol:StudyProtocol={id:uuid,version:"learning-study-v1",registeredAt:"2026-09-01T00:00:00Z",primaryOutcome:"delayed_independent_transfer",retentionWindowDays:[7,14],minimumPerArm:20,plannedParticipants:40,assessmentVersion:"educator-v1",allocationSeedCommitment:await sha256(secret),educatorApprovalId:"review1",consentProtocolId:"consent1"};
    const participants=Array.from({length:40},(_,index)=>({id:"00000000-0000-4000-8000-"+String(index).padStart(12,"0"),stratum:"algebra1",consentReceipt:"receipt"+index,enrolledAt:"2026-09-02T00:00:00Z",withdrawn:false}));
    const assigned=await allocateStudy(protocol,participants,secret);
    expect(assigned.allocation.filter(item=>item.arm==="adaptive")).toHaveLength(20);
    expect(await allocateStudy(protocol,[...participants].reverse(),secret)).toEqual(assigned);
    expect(await summarizeStudy(protocol,assigned.allocation,participants,[])).toMatchObject({status:"insufficient_observations",learningGainsEstablished:false,attritionRequiresReview:true});
  });
});
