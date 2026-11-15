import { DianaWordmark } from "./primitives";
import styles from "@/components/student-shell/recovery.module.css";
export function SmartLoading({label}:{readonly label:string}) {
  return <div className={styles.root}><main id="main-content" className={styles.loading} aria-busy="true" aria-label="Loading"><DianaWordmark tight tone="light" /><span className={styles.indicator} aria-hidden="true" /><p role="status" aria-live="polite" aria-atomic="true">{label}</p></main></div>;
}
