import { EarlyAccessActionStatus } from "@/app/early-access/action-status";

export default async function ConfirmEarlyAccessPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="dpl-action-page"><h1>Confirm Early Access</h1><EarlyAccessActionStatus action="confirm" token={token} /></main>;
}
