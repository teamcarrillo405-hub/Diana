import { PublicPageFrame } from "@/components/marketing/public-page-frame";
import { EarlyAccessActionStatus } from "@/app/early-access/action-status";

export default async function UnsubscribeEarlyAccessPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <PublicPageFrame title="Email preferences"><EarlyAccessActionStatus action="unsubscribe" token={token} /></PublicPageFrame>;
}
