import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { createLearningClient, learningAccess } from "@/lib/learning-engine/server";
import { loadProfile } from "@/lib/profile";
import { StudentShell } from "@/components/student-shell/student-shell";
import { MaterialPractice } from "@/components/learning/material-practice";
import { effectiveAiMode } from "@/supabase/functions/_shared/auth-policy";
import styles from "@/components/student-shell/collection.module.css";
export default async function MaterialPracticePage({ params, searchParams }: {
    params: Promise<{
        id: string;
        assignmentId: string;
    }>;
    searchParams: Promise<{
        version?: string;
        page?: string;
        sessionId?: string;
    }>;
}) {
    const { id, assignmentId } = await params, input = z.object({ version: z.string().regex(/^[a-f0-9]{64}$/), page: z.coerce.number().int().min(1).max(1500).default(1), sessionId: z.string().uuid().optional() }).safeParse(await searchParams);
    if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(assignmentId).success || !input.success)
        notFound();
    const client = await createLearningClient(), { data: { user } } = await client.auth.getUser();
    if (!user)
        redirect("/login");
    const [assignment, course, profile, assessment, retrieval] = await Promise.all([
        client.from("assignments").select("class_id,ai_mode_override").eq("id", assignmentId).eq("owner_id", user.id).maybeSingle(),
        client.from("classes").select("ai_mode").eq("id", id).eq("owner_id", user.id).maybeSingle(), loadProfile(), learningAccess("assessment", user.id), learningAccess("retrieval", user.id),
    ]);
    if (!assignment.data || assignment.data.class_id !== id || !course.data)
        notFound();
    const enabled = assessment && retrieval && effectiveAiMode(assignment.data.ai_mode_override, course.data.ai_mode) === "green";
    return <StudentShell active="Classes" profile={{ displayName: profile?.display_name, photoUrl: profile?.photo_url }}><main id="main-content" className={styles.main}><header className={styles.heading}><h1>Practice from your material</h1></header>{enabled ? <MaterialPractice classId={id} assignmentId={assignmentId} versionId={input.data.version} initialPage={input.data.page} initialSessionId={input.data.sessionId}/> : <p>Practice is unavailable for this assignment. <Link href={`/classes/${id}/materials/${assignmentId}`}>Return to your material</Link>.</p>}</main></StudentShell>;
}
