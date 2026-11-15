import {NextResponse} from "next/server";
import {z} from "zod";
import {createLearningClient,learningAccess} from "@/lib/learning-engine/server";
import {documentVersionSchema} from "@/lib/learning-engine/contracts";
export async function GET(request:Request){
  const client=await createLearningClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to view the source."},{status:401});
  if(!await learningAccess("retrieval",user.id))return NextResponse.json({error:"Source review is not enabled."},{status:404});
  const version=z.string().regex(/^[a-f0-9]{64}$/).safeParse(new URL(request.url).searchParams.get("versionId"));
  if(!version.success)return NextResponse.json({error:"Choose a source version."},{status:400});
  const document=await client.from("learning_documents").select("document_id,assignment_id,metadata").eq("id",version.data).eq("owner_id",user.id).maybeSingle();
  if(!document.data||!z.string().uuid().safeParse(document.data.document_id).success)return NextResponse.json({error:"An original upload is unavailable."},{status:404});
  const source=await client.from("assignment_sources").select("storage_key,mime_type").eq("id",document.data.document_id).eq("owner_id",user.id).eq("assignment_id",document.data.assignment_id!).maybeSingle();
  if(!source.data?.storage_key?.startsWith(user.id+"/")||!['application/pdf','image/png','image/jpeg','image/webp'].includes(source.data.mime_type??""))return NextResponse.json({error:"Source preview is unavailable."},{status:404});
  const metadata=documentVersionSchema.parse(document.data.metadata);
  const file=await client.storage.from("note-docs").download(source.data.storage_key);
  if(file.error||!file.data||file.data.size>30_000_000)return NextResponse.json({error:"Original source is unavailable."},{status:503});
  const bytes=await file.data.arrayBuffer();
  if(metadata.sourceAssetHash){
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),byte=>byte.toString(16).padStart(2,"0")).join("");
    if(hash!==metadata.sourceAssetHash)return NextResponse.json({error:"The upload has changed. Prepare its current version before reviewing regions."},{status:409});
  }
  if(new URL(request.url).searchParams.get("content")==="1")return new Response(bytes,{headers:{"Content-Type":source.data.mime_type!,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  return NextResponse.json({url:"/api/learning/source?versionId="+version.data+"&content=1",mime:source.data.mime_type},{headers:{"Cache-Control":"no-store"}});
}
