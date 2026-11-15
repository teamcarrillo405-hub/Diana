import { z } from "zod";
import { courseContentHash } from "./course-framework";
import { responseReviewerSchema } from "./response-assessment";
import { PRECALCULUS_BOOK, textbookAssetPath } from "./textbook-catalog";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const candidateId = z.string().regex(/^[a-f0-9]{64}:[a-f0-9]{64}$/);
const candidateSchema = z.object({
  id: candidateId, chapter: z.number().int().min(1).max(9), page: z.number().int().min(1).max(1500),
  versionId: digest, contentHash: digest, assetHash: digest,
  startOffset: z.number().int().nonnegative(), endOffset: z.number().int().positive(),
  quote: z.string().min(1).max(12000), readerUrl: z.string().startsWith("/assets/textbooks/").max(500),
}).strict();
export const retrievalReviewPacketSchema = z.object({
  version: z.literal("textbook-retrieval-review-v1"), id: digest, contentHash: digest,
  bookId: z.literal(PRECALCULUS_BOOK.id), edition: z.literal(PRECALCULUS_BOOK.edition), license: z.literal(PRECALCULUS_BOOK.license),
  queryId: z.string().min(1).max(160), query: z.string().min(1).max(1000),
  queryOrigin: z.enum(["visible_engineering_probe","operator_supplied"]).optional(),
  candidates: z.array(candidateSchema).max(12),
}).strict();
export type RetrievalReviewPacket = z.infer<typeof retrievalReviewPacketSchema>;
export const retrievalReviewMappingSchema = z.object({
  packetId: digest, packetHash: digest, mappingHash: digest,
  conditions: z.object({ lexical: z.array(candidateId).max(6), curriculumGraph: z.array(candidateId).max(6) }).strict(),
}).strict();
export type RetrievalReviewMapping = z.infer<typeof retrievalReviewMappingSchema>;
const sourceSchema = z.object({chapter:z.number().int().min(1).max(9),versionId:digest,contentHash:digest,assetHash:digest}).strict();
export const retrievalJudgmentSchema = z.object({
  id: z.string().uuid(), packetId: digest, packetHash: digest,
  reviewerId: z.string().min(1).max(200), qualificationReference: z.string().min(1).max(200),
  role: z.enum(["rater", "adjudicator"]), reviewedAt: z.string().datetime(),
  conflictOfInterest: z.boolean(), resolves: z.array(z.string().uuid()).max(2),
  originalPagesChecked: z.boolean(),
  questionStatus: z.enum(["answerable_from_candidates", "not_answerable_from_candidates", "source_conflict", "figure_or_table_needed"]),
  rationale: z.string().trim().min(20).max(3000),
  ratings: z.array(z.object({candidateId, relevance:z.number().int().min(0).max(2), supportsAnswer:z.boolean()}).strict()).max(12),
}).strict();
export type RetrievalJudgment = z.infer<typeof retrievalJudgmentSchema>;

async function packetHash(packet: Omit<RetrievalReviewPacket,"id"|"contentHash">) { return courseContentHash(packet); }
async function mappingHash(mapping: Omit<RetrievalReviewMapping,"mappingHash">) { return courseContentHash(mapping); }
function unique(values: readonly string[]) { return new Set(values).size === values.length; }

/** Candidate pages come from the pinned public index. Rankings stay in the operator-only mapping. */
export async function buildBlindedRetrievalReview(input: {
  bookId:string;edition:string;license:string;queryId:string;query:string;
  queryOrigin?:"visible_engineering_probe"|"operator_supplied";
  sources:unknown[];candidates:unknown[];
  conditions:{lexical:string[];curriculumGraph:string[]};blindSecret:string;
}):Promise<{packet:RetrievalReviewPacket;mapping:RetrievalReviewMapping}> {
  if(input.blindSecret.length<32)throw new Error("review_blinding_secret_required");
  if(input.bookId!==PRECALCULUS_BOOK.id||input.edition!==PRECALCULUS_BOOK.edition||input.license!==PRECALCULUS_BOOK.license)throw new Error("review_book_rights_mismatch");
  const sources=input.sources.map(value=>sourceSchema.parse(value));
  if(!unique(sources.map(value=>value.versionId))||!unique(sources.map(value=>String(value.chapter))))throw new Error("duplicate_review_source");
  const candidates=input.candidates.map(value=>candidateSchema.parse(value));
  if(candidates.length>12||!unique(candidates.map(value=>value.id)))throw new Error("duplicate_or_excess_review_candidate");
  for(const candidate of candidates){
    const source=sources.find(value=>value.chapter===candidate.chapter);
    if(!source||source.versionId!==candidate.versionId||source.contentHash!==candidate.contentHash||
      source.assetHash!==candidate.assetHash||!candidate.id.startsWith(candidate.versionId+":")||
      candidate.endOffset-candidate.startOffset!==candidate.quote.length||
      candidate.readerUrl!==textbookAssetPath(candidate.chapter)+"#page="+candidate.page)throw new Error("review_candidate_source_mismatch");
  }
  const ids=new Set(candidates.map(value=>value.id));
  const conditions=z.object({lexical:z.array(candidateId).max(6),curriculumGraph:z.array(candidateId).max(6)}).strict().parse(input.conditions);
  if(Object.values(conditions).some(ranking=>!unique(ranking)||ranking.some(id=>!ids.has(id))))throw new Error("review_ranking_outside_packet");
  const blinded=await Promise.all(candidates.map(async candidate=>({candidate,sortKey:await courseContentHash({secret:input.blindSecret,id:candidate.id})})));
  blinded.sort((a,b)=>a.sortKey.localeCompare(b.sortKey));
  const payload={version:"textbook-retrieval-review-v1" as const,bookId:input.bookId,edition:input.edition,license:input.license,
    queryId:input.queryId,query:input.query,queryOrigin:input.queryOrigin??"visible_engineering_probe" as const,
    candidates:blinded.map(value=>value.candidate)};
  const contentHash=await packetHash(payload),packet=retrievalReviewPacketSchema.parse({...payload,contentHash,
    id:await courseContentHash({secret:input.blindSecret,contentHash})});
  const mappingPayload={packetId:packet.id,packetHash:packet.contentHash,conditions};
  const mapping=retrievalReviewMappingSchema.parse({...mappingPayload,mappingHash:await mappingHash(mappingPayload)});
  return {packet,mapping};
}

export async function validateRetrievalReviewPacket(raw:unknown,rawMapping:unknown){
  const packet=retrievalReviewPacketSchema.parse(raw),mapping=retrievalReviewMappingSchema.parse(rawMapping);
  const {id:_id,contentHash:_contentHash,...payload}=packet;
  if(packet.contentHash!==await packetHash(payload)||mapping.packetId!==packet.id||mapping.packetHash!==packet.contentHash){
    throw new Error("retrieval_review_packet_changed");
  }
  const {mappingHash:_,...mappingPayload}=mapping;
  if(mapping.mappingHash!==await mappingHash(mappingPayload)||!unique(packet.candidates.map(value=>value.id))||
    Object.values(mapping.conditions).some(ranking=>!unique(ranking)||ranking.some(id=>!packet.candidates.some(candidate=>candidate.id===id)))){
    throw new Error("retrieval_review_mapping_changed");
  }
  return {packet,mapping};
}

function ratingSignature(review:RetrievalJudgment){
  return JSON.stringify({questionStatus:review.questionStatus,ratings:[...review.ratings]
    .sort((a,b)=>a.candidateId.localeCompare(b.candidateId)).map(value=>[value.candidateId,value.relevance,value.supportsAnswer])});
}
/** Identity references require external operator verification; no review is manufactured by this function. */
export async function evaluateRetrievalReviews(rawPackets:unknown[],rawMappings:unknown[],rawReviews:unknown[],rawRegistry:unknown[],now=Date.now()){
  if(rawPackets.length>500||rawMappings.length>500||rawReviews.length>1500||rawRegistry.length>1000)throw new Error("retrieval_review_batch_limit");
  const mappings=rawMappings.map(value=>retrievalReviewMappingSchema.parse(value));
  const pairs=await Promise.all(rawPackets.map(async value=>{
    const packet=retrievalReviewPacketSchema.parse(value),mapping=mappings.find(item=>item.packetId===packet.id);
    if(!mapping)throw new Error("retrieval_review_mapping_missing");
    return validateRetrievalReviewPacket(packet,mapping);
  }));
  const reviews=rawReviews.map(value=>retrievalJudgmentSchema.parse(value));
  const registry=rawRegistry.map(value=>responseReviewerSchema.parse(value));
  const errors:string[]=[];
  if(!unique(pairs.map(value=>value.packet.id))||!unique(mappings.map(value=>value.packetId))||pairs.length!==mappings.length)errors.push("duplicate_or_unmatched_packet");
  if(!unique(registry.map(value=>value.id)))errors.push("duplicate_reviewer_identity");
  if(!unique(reviews.map(value=>value.id))||!unique(reviews.map(value=>value.packetId+":"+value.reviewerId)))errors.push("duplicate_review");
  for(const review of reviews){
    const packet=pairs.find(value=>value.packet.id===review.packetId)?.packet;
    const person=registry.find(value=>value.id===review.reviewerId);
    if(!packet||packet.contentHash!==review.packetHash){errors.push("review_packet_mismatch");continue;}
    if(!person||!person.subjects.includes("math")||person.qualificationReference!==review.qualificationReference||
      person.revokedAt||person.verifiedBy===person.id||Date.parse(person.verifiedAt)>Date.parse(review.reviewedAt)||
      Date.parse(person.expiresAt)<=now||Date.parse(review.reviewedAt)>now||review.conflictOfInterest||
      !review.originalPagesChecked)errors.push("reviewer_or_page_check_ineligible");
    if(!unique(review.ratings.map(value=>value.candidateId))||review.ratings.length!==packet.candidates.length||
      review.ratings.some(value=>!packet.candidates.some(candidate=>candidate.id===value.candidateId)||
        value.supportsAnswer&&value.relevance!==2))errors.push("review_ratings_incomplete");
    if(review.questionStatus==="answerable_from_candidates"&&!review.ratings.some(value=>value.supportsAnswer)||
      review.questionStatus!=="answerable_from_candidates"&&review.ratings.some(value=>value.supportsAnswer))errors.push("review_answerability_conflict");
    if(review.role==="rater"&&review.resolves.length)errors.push("rater_cannot_adjudicate");
  }
  const rows=pairs.map(({packet,mapping})=>{
    const ratings=reviews.filter(value=>value.packetId===packet.id&&value.role==="rater");
    const adjudicators=reviews.filter(value=>value.packetId===packet.id&&value.role==="adjudicator");
    if(ratings.length>2||adjudicators.length>1)errors.push("excess_reviewers");
    const complete=ratings.length===2&&ratings[0].reviewerId!==ratings[1].reviewerId;
    const agreed=complete&&ratingSignature(ratings[0])===ratingSignature(ratings[1]);
    const adjudicator=adjudicators[0];
    const resolved=complete&&!agreed&&!!adjudicator&&adjudicator.reviewerId!==ratings[0].reviewerId&&
      adjudicator.reviewerId!==ratings[1].reviewerId&&adjudicator.resolves.length===2&&
      ratings.every(value=>adjudicator.resolves.includes(value.id)&&Date.parse(value.reviewedAt)<=Date.parse(adjudicator.reviewedAt));
    if(adjudicator&&!resolved)errors.push("adjudication_not_independent_or_bound");
    const final=agreed?ratings[0]:resolved?adjudicator:null;
    const byId=new Map(final?.ratings.map(value=>[value.candidateId,value])??[]);
    const conditions=final?Object.fromEntries(Object.entries(mapping.conditions).map(([name,ids])=>[name,{
      returned:ids.length,directlyRelevant:ids.filter(id=>byId.get(id)?.relevance===2).length,
      topResultRelevant:ids.length>0&&byId.get(ids[0])?.relevance===2,
      supportsAnswer:ids.some(id=>byId.get(id)?.supportsAnswer===true),
    }])) as Record<"lexical"|"curriculumGraph",{returned:number;directlyRelevant:number;topResultRelevant:boolean;supportsAnswer:boolean}>:null;
    return {packetId:packet.id,queryId:packet.queryId,queryOrigin:packet.queryOrigin??"visible_engineering_probe",
      status:agreed?"agreed":resolved?"adjudicated":complete?"disagreement":"pending",
      questionStatus:final?.questionStatus??null,
      pooledDirectlyRelevant:final?.ratings.filter(value=>value.relevance===2).length??null,conditions};
  });
  const status=errors.length?"invalid":!rows.length||rows.some(row=>!row.conditions)?"incomplete":"review_complete";
  const completeRows=rows.filter(row=>row.conditions!==null);
  const summary=status!=="review_complete"?null:{
    scope:{reviewedQueries:completeRows.length,operatorSuppliedQueries:completeRows.filter(row=>row.queryOrigin==="operator_supplied").length,
      answerableInPool:completeRows.filter(row=>row.questionStatus==="answerable_from_candidates").length,
      notAnswerableInPool:completeRows.filter(row=>row.questionStatus==="not_answerable_from_candidates").length},
    conditions:Object.fromEntries((["lexical","curriculumGraph"] as const).map(name=>{
      const selected=completeRows.map(row=>({row,condition:row.conditions![name]}));
      const returned=selected.reduce((sum,item)=>sum+item.condition.returned,0);
      const relevant=selected.reduce((sum,item)=>sum+item.condition.directlyRelevant,0);
      const pool=completeRows.reduce((sum,row)=>sum+(row.pooledDirectlyRelevant??0),0);
      const answerable=selected.filter(item=>item.row.questionStatus==="answerable_from_candidates");
      const unanswerable=selected.filter(item=>item.row.questionStatus==="not_answerable_from_candidates");
      return [name,{returnedPassages:returned,directlyRelevantPassages:relevant,
        passagePrecision:returned?relevant/returned:null,poolRelativeRecall:pool?relevant/pool:null,
        topResultRelevant: selected.filter(item=>item.condition.topResultRelevant).length,
        answerableHit:{count:answerable.filter(item=>item.condition.supportsAnswer).length,of:answerable.length},
        cleanAbstention:{count:unanswerable.filter(item=>item.condition.returned===0).length,of:unanswerable.length}}];
    })) as Record<"lexical"|"curriculumGraph",unknown>,
    paired:{answerability:{graphWins:completeRows.filter(row=>row.conditions!.curriculumGraph.supportsAnswer&&!row.conditions!.lexical.supportsAnswer).length,
      lexicalWins:completeRows.filter(row=>row.conditions!.lexical.supportsAnswer&&!row.conditions!.curriculumGraph.supportsAnswer).length,
      ties:completeRows.filter(row=>row.conditions!.lexical.supportsAnswer===row.conditions!.curriculumGraph.supportsAnswer).length},
      topResultRelevance:{graphWins:completeRows.filter(row=>row.conditions!.curriculumGraph.topResultRelevant&&!row.conditions!.lexical.topResultRelevant).length,
        lexicalWins:completeRows.filter(row=>row.conditions!.lexical.topResultRelevant&&!row.conditions!.curriculumGraph.topResultRelevant).length,
        ties:completeRows.filter(row=>row.conditions!.lexical.topResultRelevant===row.conditions!.curriculumGraph.topResultRelevant).length}},
  };
  return {status,
    errors:[...new Set(errors)],rows:errors.length?rows.map(row=>({...row,status:"invalid",questionStatus:null,pooledDirectlyRelevant:null,conditions:null})):rows,summary,
    limits:{identityExternallyVerified:false,passagePoolExhaustive:false,studentLearningMeasured:false,
      note:"Precision and pool-relative recall use only pooled candidate passages. No full-book recall, educator identity, or student learning outcome is established. The operator must verify real reviewer identities, qualifications, book rights and original-page inspections."}};
}
