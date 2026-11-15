import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
/** The common security wrapper authenticates and injects ownerId. Domain schemas
 * remain strict and derive their owner solely from requireStudentContext. */
export async function learningBody(request:Request):Promise<unknown>{
  const value:unknown=await request.json().catch(()=>null);
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  return Object.fromEntries(Object.entries(value).filter(([key])=>key!=="ownerId"));
}
export async function learningAccess(feature:"retrieval"|"assessment"|"offline",ownerId:string,client:SupabaseClient):Promise<boolean>{
  const flag=Deno.env.get("DIANA_LEARNING_"+feature.toUpperCase()+"_ENABLED");
  if(flag==="false")return false;
  if(flag==="true"&&(Deno.env.get("DIANA_LEARNING_OWNER_IDS")??"").split(",").map(id=>id.trim()).includes(ownerId))return true;
  const row=await client.from("learning_rollout_cohorts").select("enabled_features").eq("owner_id",ownerId).maybeSingle();
  return !row.error&&Array.isArray(row.data?.enabled_features)&&row.data.enabled_features.includes(feature);
}
