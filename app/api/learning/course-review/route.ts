import { NextResponse } from "next/server";
import { z } from "zod";
import { createLearningClient } from "@/lib/learning-engine/server";
import { loadCourseCatalog } from "@/lib/learning-engine/course-catalog";
import { buildCourseModule, moduleReviewSchema, validateCourseModule } from "@/lib/learning-engine/course-publication";
import type { Json } from "@/lib/supabase/types";

const profileSchema = z.object({ roles:z.array(z.enum(["operator","reviewer"])), subjects:z.array(z.string()), expiresAt:z.string() });
const inputSchema = z.discriminatedUnion("action", [
  z.object({action:z.literal("register"),courseId:z.string().min(1).max(160)}).strict(),
  z.object({action:z.literal("review"),moduleId:z.string().uuid(),checks:moduleReviewSchema,notes:z.string().trim().min(20).max(4000),noConflict:z.literal(true)}).strict(),
  z.object({action:z.enum(["publish","withdraw"]),moduleId:z.string().uuid(),reason:z.string().trim().min(3).max(4000)}).strict(),
]);
async function access(profileOnly=false):Promise<{response:NextResponse}|{client:Awaited<ReturnType<typeof createLearningClient>>;user:{id:string};profile:z.infer<typeof profileSchema>}> {
  const client=await createLearningClient(), {data:{user}}=await client.auth.getUser();
  if(!user) return {response:NextResponse.json({error:"Sign in to open course review."},{status:401})};
  const result=await client.rpc("learning_editor_profile",{});
  if(result.error) return {response:NextResponse.json({error:"Course review is unavailable."},{status:503})};
  const profile=profileSchema.safeParse(result.data);
  if(!profile.success) return {response:NextResponse.json(profileOnly?{profile:null}:{error:"Course review requires a verified educator or publishing account."},{status:profileOnly?200:403})};
  return {client,user,profile:profile.data};
}
const headers={"Cache-Control":"no-store"};
export async function GET(request:Request) {
  const auth=await access(new URL(request.url).searchParams.get("access")==="1"); if("response" in auth) return auth.response;
  if(new URL(request.url).searchParams.get("access")==="1") return NextResponse.json({profile:auth.profile},{headers});
  try {
    const {client,profile}=auth, catalog=await loadCourseCatalog();
    const courses=await Promise.all(catalog.framework.courses.filter(course=>profile.subjects.includes(course.subject)&&catalog.activities.some(activity=>activity.courseId===course.id)).map(async course=>{
      const snapshot=await buildCourseModule(catalog.framework,catalog.activities,course.id);
      return {id:course.id,title:course.title,subject:course.subject,level:course.level,contentHash:snapshot.contentHash};
    }));
    const modules=await client.from("learning_course_modules").select("*").order("created_at",{ascending:false}).limit(100);
    if(modules.error) throw new Error("review_store_unavailable");
    const verified=await Promise.all((modules.data??[]).map(async row=>{
      try { const snapshot=await validateCourseModule(row.payload); return {...row,compatible:snapshot.contentHash===row.content_hash&&courses.some(course=>course.id===row.course_id&&course.contentHash===row.content_hash)}; }
      catch { return {...row,compatible:false}; }
    }));
    const reviews=await client.from("learning_course_reviews").select("*").in("module_id",verified.map(row=>row.id));
    const publications=await client.rpc("learning_course_publications",{p_expected:verified.map(row=>({courseId:row.course_id,contentHash:row.content_hash,payload:row.payload}))});
    if(reviews.error||publications.error) throw new Error("review_store_unavailable");
    return NextResponse.json({profile,courses,modules:verified,reviews:reviews.data,publications:publications.data,limit:100}, {headers});
  } catch { return NextResponse.json({error:"Course review could not load. Please try again."},{status:503,headers}); }
}
export async function POST(request:Request) {
  const auth=await access(); if("response" in auth) return auth.response;
  const parsed=inputSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({error:"Complete the review details."},{status:400,headers});
  const input=parsed.data, {client,profile}=auth;
  try {
    if(input.action==="register") {
      if(!profile.roles.includes("operator")) return NextResponse.json({error:"Publishing access is required."},{status:403,headers});
      const catalog=await loadCourseCatalog(),snapshot=await buildCourseModule(catalog.framework,catalog.activities,input.courseId);
      const result=await client.rpc("learning_register_course",{p_course:input.courseId,p_hash:snapshot.contentHash,p_payload:snapshot.payload as unknown as Json});
      if(result.error) throw new Error("module_registration_unavailable");
      return NextResponse.json({id:result.data},{headers});
    }
    const stored=await client.from("learning_course_modules").select("*").eq("id",input.moduleId).maybeSingle();
    if(stored.error||!stored.data) return NextResponse.json({error:"This course version is unavailable."},{status:404,headers});
    // Withdrawal must also work for incompatible/old versions.
    if(input.action!=="withdraw") {
      const snapshot=await validateCourseModule(stored.data.payload),catalog=await loadCourseCatalog();
      const current=await buildCourseModule(catalog.framework,catalog.activities,stored.data.course_id);
      if(snapshot.contentHash!==stored.data.content_hash||current.contentHash!==snapshot.contentHash) return NextResponse.json({error:"Course content changed. Submit the current version for review."},{status:409,headers});
    }
    const result=input.action==="review"
      ? await client.rpc("learning_review_course",{p_module:input.moduleId,p_checks:input.checks,p_notes:input.notes,p_no_conflict:input.noConflict})
      : await client.rpc("learning_set_course_publication",{p_module:input.moduleId,p_action:input.action,p_reason:input.reason});
    if(result.error) return NextResponse.json({error:"This action requires current access and independent reviews. A recorded review cannot be overwritten."},{status:409,headers});
    return NextResponse.json({saved:true},{headers});
  } catch { return NextResponse.json({error:"The review could not be saved. Your notes are still here."},{status:503,headers}); }
}
