import Link from "next/link";
import styles from "./campus-wordmark.module.css";

export function CampusWordmark({ className = "", compact = false, href, light = true }: { className?: string; compact?: boolean; href?: string; light?: boolean }) {
  const classes = `${styles.wordmark} ${className}`;
  const mark = <span className={classes} data-compact={compact || undefined} data-light={light || undefined}>Diana</span>;
  return href ? <Link href={href} className={styles.link} aria-label="Diana">{mark}</Link> : mark;
}
