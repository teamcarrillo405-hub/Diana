import Link from "next/link";
import { StudentShell } from "@/components/student-shell/student-shell";
import { CourseReview } from "@/components/learning/course-review";
import { loadProfile } from "@/lib/profile";
import styles from "@/components/student-shell/collection.module.css";
export default async function CourseReviewPage(){
  const profile=await loadProfile();
  return <StudentShell active="More" profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url}}><main id="main-content" className={styles.main}><Link href="/settings">Back to settings</Link><CourseReview/></main></StudentShell>;
}
