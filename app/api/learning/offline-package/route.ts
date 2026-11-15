import { NextResponse } from "next/server";
import { z } from "zod";
import { createLearningClient,learningAccess } from "@/lib/learning-engine/server";
import { chunkSchema } from "@/lib/learning-engine/contracts";
import { packageHash,offlinePackageSchema,offlineExerciseSchema } from "@/lib/learning-engine/offline-package";

export async function POST(request:Request){
  const client=await createLearningClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to save a study pack."},{status:401});
  if(!await learningAccess("offline",user.id))return NextResponse.json({error:"Study packs are not enabled for this account."},{status:404});
  const input=z.object({assignmentId:z.string().uuid(),deviceId:z.string().uuid(),versionIds:z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(6)}).strict().safeParse(await request.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"Choose material for this device."},{status:400});
  const assignment=await client.from("assignments").select("title,class_id").eq("id",input.data.assignmentId).eq("owner_id",user.id).maybeSingle();
  if(!assignment.data)return NextResponse.json({error:"Assignment not found."},{status:404});
  const documents=await client.from("learning_documents").select("id").in("id",input.data.versionIds).eq("owner_id",user.id).eq("assignment_id",input.data.assignmentId);
  if(documents.error||documents.data.length!==input.data.versionIds.length)return NextResponse.json({error:"Material access could not be checked."},{status:403});
  const rows=await client.from("learning_chunks").select("payload").eq("owner_id",user.id).in("version_id",input.data.versionIds).order("id").limit(61);
  if(rows.error)return NextResponse.json({error:"Study pack is unavailable."},{status:503});
  if(!rows.data.length||rows.data.length>60)return NextResponse.json({error:"Choose a smaller unit with confirmed source text."},{status:422});
  const chunks=rows.data.map(row=>chunkSchema.parse(row.payload)).sort((a,b)=>a.versionId.localeCompare(b.versionId)||a.anchors[0].location.page-b.anchors[0].location.page||a.anchors[0].location.startOffset-b.anchors[0].location.startOffset);
  const practice=await client.rpc("learning_list_exercises",{p_assignment:input.data.assignmentId,p_versions:input.data.versionIds});
  if(practice.error)return NextResponse.json({error:"Practice could not be included in this study pack."},{status:503});
  const exercises=practice.data.flatMap(item=>{
    const chunk=chunks.find(chunk=>item.id.startsWith(chunk.id));
    const checked=offlineExerciseSchema.safeParse({id:item.id,prompt:item.prompt,skillId:item.skill_id,check:item.practice_check,
      label:chunk?.problemNumber?"Problem "+chunk.problemNumber:item.skill_id.replace(/^reading\./,"").replaceAll("_"," ")});
    return checked.success?[checked.data]:[];
  }).sort((a,b)=>a.label!.localeCompare(b.label!,undefined,{numeric:true}));
  const now=Date.now();
  const content={version:"offline-learning-v1" as const,id:crypto.randomUUID(),ownerId:user.id,deviceId:input.data.deviceId,
    assignmentId:input.data.assignmentId,classId:assignment.data.class_id,title:assignment.data.title,
    createdAt:new Date(now).toISOString(),expiresAt:new Date(now+7*86400000).toISOString(),chunks,exercises};
  const bundle=offlinePackageSchema.parse({...content,hash:await packageHash(content)});
  return NextResponse.json({ok:true,package:bundle},{headers:{"Cache-Control":"no-store"}});
}
