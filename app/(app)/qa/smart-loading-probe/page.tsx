import { notFound } from "next/navigation";

import { waitForScreenDesignSuspenseGate } from "@/lib/qa/screendesign-suspense-gate";

// This QA route suspends until the browser test releases its gate, so it cannot be prerendered.
export const dynamic = "force-dynamic";

export default async function SmartLoadingProbePage() {
  if (process.env.QA_CREATE_USER !== "true") notFound();

  await waitForScreenDesignSuspenseGate("smart-loading");

  return (
    <main aria-label="Smart loading resolved">
      <h1>Your next view is ready</h1>
    </main>
  );
}
