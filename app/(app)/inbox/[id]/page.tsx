import { redirect } from "next/navigation";
export default async function LegacyCapture({ params }: { params: Promise<{id:string}> }) { const {id} = await params; redirect(`/assignments/captures/${encodeURIComponent(id)}`); }
