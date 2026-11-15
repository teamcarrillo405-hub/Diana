import {AssignmentMaterialPage} from "@/components/learning/assignment-material-page";
import {z} from "zod";
import {notFound} from "next/navigation";

export default async function ClassMaterialPage({params,searchParams}:{
  params:Promise<{id:string;assignmentId:string}>;searchParams:Promise<{source?:string;version?:string;page?:string}>;
}){
  const {id,assignmentId}=await params;
  const input=z.object({source:z.string().optional(),version:z.string().regex(/^[a-f0-9]{64}$/).optional(),page:z.coerce.number().int().min(1).max(1500).optional()}).safeParse(await searchParams);
  if(!input.success)notFound();
  return AssignmentMaterialPage({assignmentId,classId:id,sourceId:input.data.source,versionId:input.data.version,page:input.data.page});
}
