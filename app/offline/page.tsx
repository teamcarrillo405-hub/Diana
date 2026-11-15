import Link from "next/link";
import {StudentShell} from "@/components/student-shell/student-shell";
import {PwaRuntime} from "@/components/pwa-runtime";
import styles from "@/components/student-shell/collection.module.css";
import { OfflineLearningReader } from "@/components/learning/offline-learning-reader";

export default function OfflinePage() {
  return (
    <StudentShell active="Work"><PwaRuntime/><main id="main-content" className={styles.main}>
      <header className={styles.heading}><h1>Saved study packs</h1><Link href="/dashboard">Back to Lobby</Link></header>
      <OfflineLearningReader/>
    </main></StudentShell>
  );
}
