import { resolveBillingCheckoutUrl } from "@/lib/billing/checkout";
import { UpgradeScreen } from "./upgrade-screen";

export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ view?: string; status?: string; sdState?: string }> }) {
  const { view, status, sdState } = await searchParams;
  const billingEnabled = resolveBillingCheckoutUrl() !== null;
  const communityView = view === "community" || sdState === "view=community";

  return (
    <UpgradeScreen
      view={communityView ? "community" : "standard"}
      billingEnabled={billingEnabled}
      billingUnavailable={status === "unavailable"}
    />
  );
}
