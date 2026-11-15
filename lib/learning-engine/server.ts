import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import type { Json } from "@/lib/supabase/types";
import type { AssignmentHomeworkKernel } from "@/lib/assignment-help/server-understanding";
import type { LearningDatabase } from "./database";
import { chunkSchema, documentVersionSchema, blockSchema, RETRIEVAL_VERSION, EMBEDDING_DIMENSIONS, learningEnabled, learningAttemptSchema,assessmentSchema,type RetrievalResult, type SourcePage, type DocumentVersion } from "./contracts";
import { structureDocument, validateDocumentAnchor } from "./curriculum";
import { retrieveCurriculum, lexicalDirectiveFallback } from "./retrieval";
import { renderCurriculumPromptContext } from "./curriculum-prompt-context";
import { extractNativePdf } from "./pdf";
import {chooseSupport,estimateSkill,type AssessedAttempt} from "./learner";
import { operationalPolicyDecision } from "./policy-runtime";
import { sourcePageSchema } from "./source-layout";
import {referenceBookSelectionSchema,retrieveTextbookForTutor,textbookTutorPromptContext,type ReferenceBookSelection,type ReferenceEvidence} from "./textbook-tutor";

export async function createLearningClient() {
  const jar = await cookies();
  return createServerClient<LearningDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => { try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Server components cannot set cookies. */ } },
    } },
  );
}

export async function learningAccess(feature:"retrieval"|"assessment"|"offline",ownerId:string,existingClient?:Awaited<ReturnType<typeof createLearningClient>>):Promise<boolean>{
  if(process.env["DIANA_LEARNING_"+feature.toUpperCase()+"_ENABLED"]==="false")return false;
  if(learningEnabled(feature,ownerId,process.env))return true;
  const client=existingClient??await createLearningClient();
  const row=await client.from("learning_rollout_cohorts").select("enabled_features").eq("owner_id",ownerId).maybeSingle();
  return !row.error&&!!row.data?.enabled_features.includes(feature);
}

const pagesSchema = z.array(sourcePageSchema).max(1500);

export async function indexAssignmentSource(input: {
  ownerId: string; kernel: AssignmentHomeworkKernel; sourceId: string; subject: DocumentVersion["subject"];
}) {
  const client = await createLearningClient();
  const problems = input.sourceId === "assignment-problems" ? await client.from("assignment_problems")
    .select("id,owner_id,assignment_id,problem_number,problem_text,source,unit_type").eq("owner_id",input.ownerId)
    .eq("assignment_id",input.kernel.assignment.id).order("problem_number") : null;
  if (problems?.error) throw new Error("Worksheet questions are unavailable.");
  // Keep the owned worksheet UUID beside its page at construction, never recover it from a label.
  const taskBinding = await import("./task-binding");
  const worksheetIndex = problems ? await taskBinding.buildWorksheetTaskIndex(input.ownerId,input.kernel.assignment.id,problems.data??[]) : null;
  const problemPages:SourcePage[] = worksheetIndex?.pages??[];
  const assignmentText=input.sourceId==="assignment-directions" ? input.kernel.assignment.description
    : input.sourceId==="assignment-rubric" ? input.kernel.assignment.rubric_text
    : input.sourceId==="assignment-problems" ? problemPages.map(page=>page.text).join("\n\n") : null;
  const source = assignmentText ? {
    id:input.sourceId,title:input.sourceId==="assignment-problems"?"Worksheet questions":input.sourceId==="assignment-directions"?"Assignment directions":"Assignment rubric",
    extracted_text:assignmentText,source_type:input.sourceId==="assignment-directions"?"instructions":"rubric",
    source_location:"Assignment",import_status:"imported",
  } : input.kernel.sources.find((item) => item.id === input.sourceId);
  if (!source?.extracted_text?.trim() || source.import_status === "failed" || source.import_status === "extracting") {
    throw new Error("The source is not ready to index.");
  }
  const original = source.source_type === "instructions" || source.source_type === "rubric" || source.source_type === "extracted_text";
  const stored = assignmentText ? {data:null} : await client.from("assignment_sources").select("storage_key,mime_type")
    .eq("id", input.sourceId).eq("owner_id", input.ownerId).eq("assignment_id", input.kernel.assignment.id).maybeSingle();
  let pages: SourcePage[] = [{
    page: 1, pageLabel: (source.source_location || "Source text").slice(0, 120),
    text: source.extracted_text, interpretation: original ? "original" as const : "model_extraction" as const,
  }];
  if(problemPages.length) pages=problemPages;
  if (stored.data?.mime_type === "application/pdf" && stored.data.storage_key?.startsWith(input.ownerId + "/")) {
    const file = await client.storage.from("note-docs").download(stored.data.storage_key);
    if (file.error || !file.data) throw new Error("The original PDF is unavailable.");
    if (file.data.size > 30_000_000) throw new Error("Choose a PDF smaller than 30 MB.");
    pages = await extractNativePdf(new Uint8Array(await file.data.arrayBuffer()));
  }
  const document = await structureDocument({
    documentId: input.sourceId, ownerId: input.ownerId,
    assignmentId: input.kernel.assignment.id, classId: input.kernel.assignment.class_id,
    title: source.title || "Assignment material", edition: "Current assignment source",
    subject: input.subject, instructionRights: "owner_provided",
  }, pages);
  const saved = await client.rpc("learning_store_document", { p_document: JSON.parse(JSON.stringify(document)) as Json });
  if (saved.error) throw new Error("The learning index is not available yet.");
  if(worksheetIndex)await taskBinding.persistWorksheetTaskOrigins(client as unknown as import("./task-binding").TaskBindingClient,
    document,worksheetIndex,process.env.DIANA_DURABLE_TASK_BINDING_ENABLED==="true");
  return { versionId: document.version.id, blockCount: document.blocks.length, chunkCount: document.chunks.length,
    status: pages.some((page) => page.interpretation === "model_extraction") ? "needs_confirmation" as const : "ready" as const };
}

export type AssignmentRetrievalResult=RetrievalResult&{references?:ReferenceEvidence};
/** Internal server/test seam. Never accepted from a request body. */
export type AssignmentRetrievalRuntime = {
  client?: Awaited<ReturnType<typeof createLearningClient>>;
  observe?: (stage: 'documents' | 'lexical_query' | 'candidates' | 'validated', payload: unknown) => void;
};
export async function retrieveForAssignment(input: {
  ownerId: string; assignmentId: string; classId: string | null; query: string; versionIds?: string[];
  referenceBook?:ReferenceBookSelection;
  allowSemanticFallback?:boolean;
}, runtime: AssignmentRetrievalRuntime = {}): Promise<AssignmentRetrievalResult> {
  const unavailable: RetrievalResult = { version: RETRIEVAL_VERSION, status: "index_unavailable", method: "keyword", chunks: [] };
  try {
    const client = runtime.client ?? await createLearningClient();
    const selection=input.referenceBook?referenceBookSelectionSchema.safeParse(input.referenceBook):null;
    if(selection&&!selection.success)return unavailable;
    if(selection?.success){
      const assignment=await client.from("assignments").select("id,class_id").eq("id",input.assignmentId).eq("owner_id",input.ownerId).maybeSingle();
      if(assignment.error||!assignment.data||assignment.data.class_id!==input.classId)return unavailable;
    }
    let referencePromise:Promise<ReferenceEvidence>|undefined;
    const withReference=async(result:RetrievalResult):Promise<AssignmentRetrievalResult>=>{
      if(!selection?.success)return result;
      referencePromise??=retrieveTextbookForTutor(input.query,selection.data);
      const references=await referencePromise;
      return {...result,status:result.status==="no_evidence"&&references.status==="matched"?"matched":result.status,references};
    };
    // Select the most recently indexed version of each source, unless the caller
    // explicitly pins a version. Every query is still assignment/owner scoped.
    const documents = await client.from("learning_documents").select("*")
      .eq("owner_id", input.ownerId).eq("assignment_id", input.assignmentId)
      .order("created_at", { ascending: false }).limit(100);
    if (documents.error) return unavailable;
    const seen = new Set<string>();
    const selected = (documents.data ?? []).filter((document) => {
      if (input.versionIds?.length) return input.versionIds.includes(document.id);
      if (seen.has(document.document_id)) return false;
      seen.add(document.document_id); return true;
    }).slice(0, 12);
    runtime.observe?.('documents', selected);
    // A caller may pin versions, but two editions of one source cannot become
    // one evidence set without an explicit comparison task and conflict review.
    if (new Set(selected.map(document => document.document_id)).size !== selected.length) {
      return { ...unavailable, status: "source_conflict" };
    }
    if (!selected.length) return withReference({ ...unavailable, status: "no_evidence" });
    const versionIds = selected.map((document) => document.id);
    const problemNumber=/\bproblem\s+(\d+[a-z]?)/i.exec(input.query)?.[1]??null;
    const searchInput = {
      p_assignment: input.assignmentId, p_versions: versionIds, p_query: input.query,
    };
    // Exact and lexical lookups are sufficient for ordinary source questions.
    // Do not put a model call on this path unless validated local evidence is absent.
    const [initialLexical,exact]=await Promise.all([client.rpc("learning_search", searchInput),problemNumber?client.from("learning_chunks").select("payload").eq("owner_id",input.ownerId)
      .in("version_id",versionIds).eq("payload->>problemNumber",problemNumber).limit(6):Promise.resolve({data:[],error:null})]);
    let lexical = initialLexical;
    runtime.observe?.('lexical_query', { query: input.query, kind: 'original', returnedRows: lexical.data?.length ?? null });
    if (lexical.error || exact.error) return unavailable;
    const fallbackQuery = !lexical.data.length ? lexicalDirectiveFallback(input.query) : null;
    if (fallbackQuery) {
      lexical = await client.rpc('learning_search', { ...searchInput, p_query: fallbackQuery });
      runtime.observe?.('lexical_query', { query: fallbackQuery, kind: 'directives_removed_and_terms_retained', returnedRows: lexical.data?.length ?? null });
      if (lexical.error) return unavailable;
    }
    const validateAndRank = async (rows: Array<{payload:Json;lexical_rank:number|null;semantic_rank:number|null}>): Promise<RetrievalResult> => {
      const candidates = [...new Map([...rows,...(exact.data??[])].map((row) => chunkSchema.safeParse(row.payload))
        .flatMap((parsed) => parsed.success ? [[parsed.data.id,parsed.data] as const] : [])).values()]
        .filter(chunk => chunk.ownerId === input.ownerId && versionIds.includes(chunk.versionId)
          && chunk.assignmentId === input.assignmentId);
      runtime.observe?.('candidates', { rows, exact: exact.data ?? [], candidates });
      if (!candidates.length) return {...unavailable,status:"no_evidence"};
      const blocks = await client.from("learning_blocks").select("payload").eq("owner_id", input.ownerId).in("id", candidates.flatMap((chunk) => chunk.anchors.map((anchor) => anchor.blockId)));
      if (blocks.error) return unavailable;
      const parsedBlocks = (blocks.data ?? []).map((row) => blockSchema.parse(row.payload));
      const valid = candidates.filter((chunk) => {
        const document = selected.find((item) => item.id === chunk.versionId);
        if (!document) return false;
        const version = documentVersionSchema.parse(document.metadata);
        if (version.ownerId !== input.ownerId || version.assignmentId !== input.assignmentId) return false;
        return chunk.anchors.every((anchor) => validateDocumentAnchor(anchor, {
          version, pages: pagesSchema.parse(document.pages), blocks: parsedBlocks, chunks: candidates,
        }));
      });
      const rankedIds = (rank: "lexical_rank" | "semantic_rank") => rows.filter((row) => row[rank] !== null)
        .sort((a, b) => (a[rank] ?? Infinity) - (b[rank] ?? Infinity))
        .flatMap(row => {const parsed=chunkSchema.safeParse(row.payload);return parsed.success?[parsed.data.id]:[];});
      runtime.observe?.('validated', { blocks: parsedBlocks, valid, lexicalIds: rankedIds('lexical_rank'), semanticIds: rankedIds('semantic_rank') });
      return retrieveCurriculum(input.query, valid, {
        ownerId: input.ownerId, assignmentId: input.assignmentId, classId: input.classId, versionIds, problemNumber,
      }, rankedIds("semantic_rank"), rankedIds("lexical_rank"));
    };
    const localResult = await validateAndRank(lexical.data);
    if (localResult.status === "index_unavailable") return localResult;
    const withLocalReference=await withReference(localResult);
    if (withLocalReference.status === "matched") return withLocalReference;
    if (input.allowSemanticFallback === false) return withLocalReference;
    const embedded = await client.functions.invoke("learning-embed", {
      body: { assignmentId: input.assignmentId, operation: "query", query: input.query, requestId: crypto.randomUUID() },
    }).catch(() => null);
    const vector = z.object({ ok: z.literal(true), embedding: z.array(z.number().finite()).length(EMBEDDING_DIMENSIONS) }).safeParse(embedded?.data);
    if (!vector.success) return withLocalReference;
    const semantic = await client.rpc("learning_search", {...searchInput,p_embedding:JSON.stringify(vector.data.embedding)});
    if (semantic.error) return unavailable;
    return withReference(await validateAndRank(semantic.data));
  } catch { return unavailable; }
}

export function curriculumPromptContext(result: AssignmentRetrievalResult): string {
  return renderCurriculumPromptContext(result, result.references ? textbookTutorPromptContext(result.references) : "");
}

export async function tutorLearningContext(input:{ownerId:string;assignmentId:string;hasEvidence:boolean;priorSupport:number;problemId?:string}){
  const client=await createLearningClient();
  const rows=await client.from("learning_attempts").select("payload,assessment,created_at").eq("owner_id",input.ownerId)
    .eq("assignment_id",input.assignmentId).order("created_at",{ascending:false}).limit(100);
  const events:AssessedAttempt[]=(rows.data??[]).flatMap(row=>{
    const attempt=learningAttemptSchema.safeParse(row.payload);
    const assessment=assessmentSchema.safeParse(row.assessment);
    return attempt.success&&assessment.success&&attempt.data.assignmentId===input.assignmentId?[{attempt:attempt.data,assessment:assessment.data,recordedAt:row.created_at}]:[];
  });
  // Assignment-wide history does not identify the problem currently being discussed.
  // Only an explicitly selected problem with owned stored attempts may supply feedback.
  const problemEvents=input.problemId?events.filter(event=>event.attempt.problemId===input.problemId):[];
  const latest=problemEvents[0];
  const supportInput={confirmed:latest?.attempt.confirmed??true,hasEvidence:input.hasEvidence,assessment:latest?.assessment??null,priorSupport:latest?input.priorSupport:0};
  const support=chooseSupport(supportInput);
  const skillEstimates=[...new Set(events.map(event=>event.attempt.skillId))].map(skill=>estimateSkill(skill,events));
  const activeSkill=latest?skillEstimates.find(skill=>skill.skillId===latest.attempt.skillId):null;
  const policy=await operationalPolicyDecision({confirmed:supportInput.confirmed,hasEvidence:input.hasEvidence,supported:latest?.assessment.outcome==="supported",hasAssessment:!!latest,priorSupport:supportInput.priorSupport},
    {independentSuccessRate:activeSkill&&activeSkill.independentCount>0?activeSkill.supportedCount/activeSkill.independentCount:null,independentAttempts:activeSkill?.independentCount??0,sessionsSincePractice:0});
  if(policy.source==="reviewed_learned_policy"){
    support.action=policy.action;
    support.reason=policy.action==="hint"?"Offer one next step while keeping the student's answer open.":policy.action==="related_example"?"Use a different example, then return to the original problem.":"Offer a fresh attempt or clarification without making a mastery claim.";
  }
  return {
    support,
    supportPolicy:{source:policy.source,artifactHash:policy.artifactHash},
    supportScope:latest?"active_problem" as const:"assignment_context" as const,
    skillEstimates,
    evidenceStatus:rows.error?"unavailable" as const:events.length?"recorded" as const:"no_attempts" as const,
  };
}
