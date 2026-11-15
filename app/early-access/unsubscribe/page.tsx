import { EarlyAccessActionStatus } from "@/app/early-access/action-status";

export default async function UnsubscribeEarlyAccessPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="dpl-action-page"><h1>Early Access Preferences</h1><EarlyAccessActionStatus action="unsubscribe" token={token} /></main>;
}
