import Link from "next/link";
import styles from "@/components/student-shell/public.module.css";
export default function AuthLayout({children}:{children:React.ReactNode}) {
  return <div className={styles.root} data-entry-shell><header className={styles.header}><Link className={styles.brand} href="/" aria-label="Diana home"><img src="/screendesign/brand/diana-logo-tight-no-shadow.png" alt="Diana" /></Link><Link href="/trust">Trust</Link></header><main id="main-content" className={styles.main}><section className={styles.form}>{children}</section></main></div>;
}
