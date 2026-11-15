import "server-only";
import {z} from "zod";
import {createLearningClient} from "./server";
import {extractPdfBatch} from "./pdf";
import {structureDocument} from "./curriculum";
import {sourcePageSchema} from "./source-layout";
import {documentSubjectSchema,type DocumentVersion} from "./contracts";
import type {Json} from "@/lib/supabase/types";
type Client=Awaited<ReturnType<typeof createLearningClient>>;
async function sourceBytes(client:Client,ownerId:string,assignmentId:string,sourceId:string){
  const source=await client.from("assignment_sources").select("storage_key,mime_type,title").eq("id",sourceId).eq("owner_id",ownerId).eq("assignment_id",assignmentId).maybeSingle();
  if(source.error||source.data?.mime_type!=="application/pdf"||!source.data.storage_key?.startsWith(ownerId+"/"))throw new Error("The PDF source is unavailable.");
  const file=await client.storage.from("note-docs").download(source.data.storage_key);
  if(file.error||!file.data||file.data.size>30_000_000)throw new Error("Choose an available PDF smaller than 30 MB.");
  const bytes=new Uint8Array(await file.data.arrayBuffer());
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
  return {bytes,hash,title:source.data.title??"Assignment material"};
}
export async function enqueuePdf(input:{ownerId:string;assignmentId:string;sourceId:string;subject:DocumentVersion["subject"]}){
  const client=await createLearningClient();
  const source=await sourceBytes(client,input.ownerId,input.assignmentId,input.sourceId);
  const result=await client.rpc("learning_enqueue_ingestion",{p_assignment:input.assignmentId,p_source:input.sourceId,p_hash:source.hash,p_subject:input.subject});
  if(result.error)throw new Error("PDF preparation is unavailable.");
  return {jobId:result.data,status:"queued" as const};
}
const jobSchema=z.object({id:z.string().uuid(),owner_id:z.string().uuid(),assignment_id:z.string().uuid(),source_id:z.string().uuid(),
  content_hash:z.string(),subject:documentSubjectSchema,cursor:z.number().int().nonnegative(),total_pages:z.number().int().nullable(),
  pages:z.array(sourcePageSchema),lease_token:z.string().uuid()});
export async function advancePdf(jobId:string,ownerId:string,existingClient?:Client){
  const client=existingClient??await createLearningClient();
  const claim=await client.rpc("learning_claim_ingestion",{p_job:jobId});
  if(claim.error)throw new Error("PDF preparation could not resume.");
  if(!claim.data){
    const row=await client.from("learning_ingestion_jobs").select("state,cursor,total_pages,version_id").eq("id",jobId).eq("owner_id",ownerId).maybeSingle();
    if(!row.data)throw new Error("Preparation not found.");
    return {jobId,status:row.data.state,pageCount:row.data.cursor,totalPages:row.data.total_pages,versionId:row.data.version_id,busy:row.data.state==="extracting"};
  }
  const job=jobSchema.parse(claim.data);
  if(job.owner_id!==ownerId)throw new Error("Source owner mismatch.");
  try{
    const source=await sourceBytes(client,ownerId,job.assignment_id,job.source_id);
    if(source.hash!==job.content_hash){
      await client.rpc("learning_fail_ingestion",{p_job:jobId,p_token:job.lease_token,p_code:"source_changed"});
      throw new Error("The original PDF changed. Prepare the new source again.");
    }
    if(job.total_pages===null||job.cursor<job.total_pages){
      const batch=await extractPdfBatch(source.bytes,job.cursor+1,10);
      const saved=await client.rpc("learning_checkpoint_ingestion",{p_job:jobId,p_token:job.lease_token,p_pages:JSON.parse(JSON.stringify(batch.pages)) as Json,p_total:batch.totalPages});
      if(saved.error||!saved.data)throw new Error("This page batch could not be saved. Resume preparation.");
      return {jobId,status:"queued",pageCount:job.cursor+batch.pages.length,totalPages:batch.totalPages,versionId:null,busy:false};
    }
    const assignment=await client.from("assignments").select("class_id").eq("id",job.assignment_id).eq("owner_id",ownerId).single();
    if(assignment.error)throw new Error("Assignment is unavailable.");
    const document=await structureDocument({ownerId,assignmentId:job.assignment_id,classId:assignment.data.class_id,documentId:job.source_id,
      title:source.title,edition:"Current assignment source",subject:job.subject,instructionRights:"owner_provided",sourceAssetHash:source.hash},job.pages);
    const stored=await client.rpc("learning_store_document",{p_document:JSON.parse(JSON.stringify(document)) as Json});
    if(stored.error)throw new Error("Material could not be indexed.");
    const completed=await client.rpc("learning_finish_ingestion",{p_job:jobId,p_token:job.lease_token,p_version:document.version.id});
    if(completed.error||!completed.data)throw new Error("Preparation needs to resume.");
    return {jobId,status:document.blocks.some(block=>block.needsConfirmation)?"needs_confirmation":"ready",pageCount:job.cursor,totalPages:job.total_pages,versionId:document.version.id,busy:false};
  }catch(error){
    await client.rpc("learning_fail_ingestion",{p_job:jobId,p_token:job.lease_token,p_code:"extraction_unavailable"});
    throw error;
  }
}
