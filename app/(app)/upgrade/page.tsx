import { resolveBillingCheckoutUrl } from "@/lib/billing/checkout";
import { UpgradeScreen } from "./upgrade-screen";

export default function UpgradePage() {
  const billingEnabled = Boolean(resolveBillingCheckoutUrl());
  return <UpgradeScreen view="standard" billingEnabled={billingEnabled} billingUnavailable={!billingEnabled} />;
}
