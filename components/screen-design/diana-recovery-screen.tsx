import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

import styles from "@/components/student-shell/recovery.module.css";
import { DianaWordmark } from "./primitives";

type DianaRecoveryScreenProps = {
  eyebrow: string;
  title: string;
  message: string;
  backHref: string;
  backLabel: string;
  onRetry?: () => void;
};

export function DianaRecoveryScreen({
  eyebrow,
  title,
  message,
  backHref,
  backLabel,
  onRetry,
}: DianaRecoveryScreenProps) {
  return (
    <div className={styles.root}>
      <main id="main-content" className="diana-recovery-screen__panel" role="alert" aria-live="assertive">
        <DianaWordmark tight tone="light" className="diana-recovery-screen__brand" />
        <p className="diana-recovery-screen__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="diana-recovery-screen__message">{message}</p>
        <div className="diana-recovery-screen__actions">
          {onRetry ? (
            <button type="button" className="diana-recovery-screen__action diana-recovery-screen__action--primary" onClick={onRetry}>
              <RefreshCw size={17} aria-hidden="true" />
              Refresh page
            </button>
          ) : null}
          <Link className="diana-recovery-screen__action" href={backHref}>
            <ArrowLeft size={17} aria-hidden="true" />
            {backLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}
