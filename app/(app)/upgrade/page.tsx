import Link from "next/link";
import { Check, ShieldCheck, Sparkles } from "lucide-react";

import { resolveBillingCheckoutUrl } from "@/lib/billing/checkout";
import { PageShell } from "../page-shell";

const FEATURES = [
  "Unlimited class, assignment, note, and calendar organization",
  "Guided study tools that preserve student authorship",
  "Private progress, portfolio, export, and sharing controls",
  "Accessibility, recovery, and AI-policy controls",
];

export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ view?: string; status?: string }> }) {
  const { view, status } = await searchParams;
  const billingEnabled = resolveBillingCheckoutUrl() !== null;
  const communityView = view === "community";

  return (
    <PageShell active="More" eyebrow={communityView ? "Student access" : "Diana access"} title={communityView ? "Built for focused students" : "Choose your access"} subtitle="Diana will never pretend a purchase worked. Checkout appears only after the billing provider, webhook, and account entitlement are live." icon={Sparkles}>
      {status === "unavailable" ? <div className="sd-panel sd-panel-pad" style={{ marginBottom: "1rem", borderColor: "rgb(251 191 36 / .35)" }}><p className="sd-subtitle">Secure checkout is not configured yet. Your current access has not changed.</p></div> : null}
      <div className="sd-upgrade-grid">
        <section className="sd-panel sd-panel-raised sd-upgrade-card">
          <div><p className="sd-kicker">Current access</p><h2>{billingEnabled ? "Diana Pro" : "Diana preview"}</h2><p>{billingEnabled ? "Billing is enabled for this account." : "All current learning tools remain available while billing is being configured."}</p></div>
          <ul>{FEATURES.map((feature) => <li key={feature}><Check size={17} aria-hidden="true" />{feature}</li>)}</ul>
          {billingEnabled ? (
            <Link href="/api/billing/checkout" className="sd-button sd-button-primary">Continue to secure checkout</Link>
          ) : (
            <Link href="/settings" className="sd-button">Manage access settings</Link>
          )}
        </section>

        <aside className="sd-panel sd-panel-pad sd-grid">
          <ShieldCheck size={24} color="var(--diana-teal)" aria-hidden="true" />
          <h2 className="sd-section-title">What is protected</h2>
          <p className="sd-subtitle">No payment form is shown until server-side entitlement and webhook verification exist. Student data and AI history are never used as checkout proof.</p>
          <div className="sd-chip">Billing capability: {billingEnabled ? "ready" : "not enabled"}</div>
        </aside>
      </div>
    </PageShell>
  );
}
