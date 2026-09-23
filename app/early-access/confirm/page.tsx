import { EarlyAccessActionStatus } from "../action-status";

export default async function ConfirmEarlyAccessPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <><h1 className="text-2xl font-bold">Confirm Early Access</h1><EarlyAccessActionStatus action="confirm" token={token} /></>;
}
