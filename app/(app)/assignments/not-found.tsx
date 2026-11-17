import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { StudentShell } from "@/components/student-shell/student-shell";
import { WORK_RETURN_PATH } from "@/lib/assignment-navigation";
import styles from "../quick-add/intake.module.css";

export default function WorkNotFound() {
  return (
    <StudentShell active="Work" className={styles.room}>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <header className={styles.heading}><h1>Work unavailable</h1></header>
        <section className={`${styles.panel} ${styles.notice}`}>
          <p>Open Work to choose an available assignment or capture.</p>
          <Link href={WORK_RETURN_PATH} className={styles.primary}><ArrowLeft size={18} aria-hidden="true" />Back to Work</Link>
        </section>
      </main>
    </StudentShell>
  );
}
