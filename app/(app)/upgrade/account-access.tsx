import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ShieldCheck } from "lucide-react";
import { StudentShell } from "@/components/student-shell/student-shell";
import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { DEFAULT_LANDING_PAGE_CONFIG } from "@/lib/landing-page/config";
import styles from "./account-access.module.css";

export function AccountAccess({ billingEnabled, profile }: { billingEnabled: boolean; profile?: StudentNavigationProfile }) {
  const icons = [BookOpen, CalendarDays, ShieldCheck];
  return <StudentShell active="More" scene="services" mode="scenic" profile={profile}>
    <main id="main-content" className={styles.main}>
      <Link href="/more" className={styles.back}><ArrowLeft size={18} aria-hidden="true" />Back to More</Link>
      <header className={styles.heading}><p>Student services</p><h1>Your Diana access</h1><p>Manage access and keep your learning tools together.</p></header>
      <div className={styles.layout}>
        <section className={styles.benefits} aria-label="Diana learning tools">
          {DEFAULT_LANDING_PAGE_CONFIG.standard.benefits.map((benefit, index) => {
            const Icon = icons[index] ?? BookOpen;
            return <article key={benefit.id}><Icon size={24} aria-hidden="true" /><div><h2>{benefit.title}</h2><p>{benefit.body}</p></div></article>;
          })}
        </section>
        <section className={styles.panel} aria-labelledby="access-title">
          <h2 id="access-title">Account access</h2>
          <p>{billingEnabled ? "Continue to secure checkout to review the available access options before choosing." : "Checkout is not available right now. Your current account access has not changed."}</p>
          <Link className={styles.primary} href={billingEnabled ? "/api/billing/checkout" : "/settings"}>{billingEnabled ? "Continue to secure checkout" : "Manage access in Settings"}<ArrowRight size={18} aria-hidden="true" /></Link>
          <div className={styles.controls}><h3>Account controls</h3><p>Your privacy, connected accounts, and school colors stay in Settings.</p><Link href="/settings">Open Settings</Link></div>
        </section>
      </div>
    </main>
  </StudentShell>;
}
