import {AssignmentMaterialPage} from "@/components/learning/assignment-material-page";

export default async function MaterialPage({params,searchParams}:{params:Promise<{assignmentId:string}>;searchParams:Promise<{source?:string}>}){
  const {assignmentId}=await params;
  const {source}=await searchParams;
  return AssignmentMaterialPage({assignmentId,sourceId:source});
}
