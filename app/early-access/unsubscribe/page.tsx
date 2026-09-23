import { EarlyAccessActionStatus } from "../action-status";

export default async function UnsubscribeEarlyAccessPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <><h1 className="text-2xl font-bold">Early Access Preferences</h1><EarlyAccessActionStatus action="unsubscribe" token={token} /></>;
}
