import { redirect, notFound } from "next/navigation";
import { currentStudentDestination } from "@/lib/student-route-policy";
export default async function PromotedPreview({params}:{params:Promise<{screen:string}>}) {
 const {screen}=await params;
 const destination=currentStudentDestination(`/landing-3d/remaining-concept-review/${screen}`);
 if (!destination) notFound();
 redirect(destination);
}
