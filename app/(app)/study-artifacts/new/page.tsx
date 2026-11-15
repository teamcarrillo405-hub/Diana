import { redirect } from "next/navigation";
export default async function NewPracticeQuizPage({searchParams}:{searchParams:Promise<{source?:string}>}) {
 const {source}=await searchParams;
 redirect(source ? `/study?source=${encodeURIComponent(source)}` : "/study");
}
