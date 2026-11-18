import { resolveBillingCheckoutUrl } from "@/lib/billing/checkout";
import { loadProfile } from "@/lib/profile";
import { AccountAccess } from "./account-access";

export default async function UpgradePage() {
  const profile = await loadProfile();
  return <AccountAccess billingEnabled={Boolean(resolveBillingCheckoutUrl())} profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url,photoOffsetX:profile?.photo_offset_x,photoOffsetY:profile?.photo_offset_y}} />;
}
