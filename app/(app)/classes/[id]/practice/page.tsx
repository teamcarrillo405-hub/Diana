import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { learningAccess } from "@/lib/learning-engine/server";
import { StudentShell } from "@/components/student-shell/student-shell";
import { CoursePractice } from "@/components/learning/course-practice";
import { practiceCourseForClass, practiceLevelForClass, practiceSubjectForClass } from "@/lib/learning-engine/course-domains";
import styles from "@/components/student-shell/collection.module.css";
export default async function ClassPracticePage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params, client = await createClient(), { data: { user } } = await client.auth.getUser();
    if (!user)
        redirect("/login");
    const course = await client.from("classes").select("name,ai_mode,subject_category").eq("id", id).eq("owner_id", user.id).maybeSingle();
    if (!course.data)
        notFound();
    const [profile, enabled] = await Promise.all([loadProfile(), learningAccess("assessment", user.id)]);
    return <StudentShell active="Classes" profile={{ displayName: profile?.display_name, photoUrl: profile?.photo_url }}><main id="main-content" className={styles.main}><Link href={`/classes/${id}?materials=1`}>{course.data.name} / Materials</Link><header className={styles.heading}><h1>Guided practice</h1></header>{enabled && course.data.ai_mode === "green" ? <CoursePractice classId={id} initialSubject={practiceSubjectForClass(course.data.subject_category, course.data.name)} initialLevel={practiceLevelForClass(course.data.subject_category, course.data.name, profile?.school_year ? `${profile.school_year}th` : null)} initialCourseId={practiceCourseForClass(course.data.subject_category, course.data.name)}/> : <p>Guided practice is not available for this class. Your original materials remain available.</p>}</main></StudentShell>;
}
