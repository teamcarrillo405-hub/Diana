import { ArrowLeft } from "lucide-react";

import { StudentShell } from "@/components/student-shell/student-shell";
import { PwaRuntime } from "@/components/pwa-runtime";
import { OfflineLearningReader } from "@/components/learning/offline-learning-reader";
import { WORK_RETURN_PATH } from "@/lib/assignment-navigation";
import styles from "../(app)/quick-add/intake.module.css";

export default function OfflinePage() {
  return (
    <StudentShell active="Work" scene="work" mode="focus" showAdd={false} className={styles.room}>
      <PwaRuntime />
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <a href={WORK_RETURN_PATH} className={styles.back}><ArrowLeft size={17} aria-hidden="true" />Back to Work</a>
        <header className={styles.heading}>
          <h1>Saved study packs</h1>
          <p>Open saved packs here. Reconnect to return to your assignments.</p>
        </header>
        <OfflineLearningReader />
      </main>
    </StudentShell>
  );
}
