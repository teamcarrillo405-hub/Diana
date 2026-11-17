import { subjectArtwork } from "@/lib/assignment-navigation";
import styles from "./classes.module.css";

type ClassIdentityProps = {
  name: string;
  teacher?: string | null;
  grade?: { label: string; percent?: number | null } | null;
  gradeDate?: string | null;
  gradeUnavailable?: boolean;
  openCount: number;
  submittedCount?: number;
  heading?: "h1" | "h2";
};

export function ClassIdentity({
  name,
  teacher,
  grade,
  gradeDate,
  gradeUnavailable,
  openCount,
  submittedCount,
  heading: Heading = "h2",
}: ClassIdentityProps) {
  const art = subjectArtwork(name);
  return (
    <div className={styles.identity}>
      <div className={styles.courseArt}>
        <img src={art.startsWith("/assets/landing-10k/subjects/") ? art : "/assets/work/college-classroom-1920.webp"} alt="" />
        <div className={styles.courseTitle}>
          <Heading>{name}</Heading>
          {teacher ? <p>{teacher}</p> : null}
        </div>
      </div>
      <div className={styles.snapshot}>
        <div className={styles.grade}>
          <span>Confirmed grade</span>
          {grade ? (
            <strong>{grade.label}{grade.percent != null && <small>{grade.percent}%</small>}</strong>
          ) : (
            <p className={styles.gradeMessage}>{gradeUnavailable ? "Grade unavailable" : "No grade posted yet"}</p>
          )}
          {grade && gradeDate ? <small>Confirmed {gradeDate}</small> : null}
        </div>
        <dl className={styles.workStats} aria-label="Class work summary">
          <div><dt>Active work</dt><dd>{openCount}</dd></div>
          {submittedCount != null ? <div><dt>Submitted</dt><dd>{submittedCount}</dd></div> : null}
        </dl>
      </div>
    </div>
  );
}
