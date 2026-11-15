import { subjectArtwork } from "@/lib/assignment-navigation";
import styles from "./classes.module.css";

export function ClassIdentity({ name, teacher, grade, openCount, submittedCount, heading = "h2" }: { name: string; teacher?: string | null; grade?: { label: string; percent?: number | null } | null; openCount: number; submittedCount?: number; heading?: "h1" | "h2" }) {
  const Heading = heading;
  return <div className={styles.identity}>
    <div className={styles.courseArt}><img src={subjectArtwork(name)} alt="" /><div className={styles.courseTitle}><Heading>{name}</Heading>{teacher && <p>{teacher}</p>}</div></div>
    <aside className={styles.snapshot} aria-label="Class progress">
      <div className={styles.grade}><span>Confirmed grade</span><strong>{grade?.label ?? "Not yet"}{grade?.percent != null && <small>{grade.percent}%</small>}</strong></div>
      <div className={styles.workStats}><div><strong>{openCount}</strong><span>Active assignments</span></div>{submittedCount != null && <div><strong>{submittedCount}</strong><span>Submitted</span></div>}</div>
    </aside>
  </div>;
}
