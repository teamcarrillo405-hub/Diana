import { PublicPageFrame } from "@/components/marketing/public-page-frame";
import { EarlyAccessActionStatus } from "@/app/early-access/action-status";

export default async function ConfirmEarlyAccessPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <PublicPageFrame title="Confirm your email"><EarlyAccessActionStatus action="confirm" token={token} /></PublicPageFrame>;
}
