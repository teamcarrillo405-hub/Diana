import { notFound } from "next/navigation";

import { waitForScreenDesignSuspenseGate } from "@/lib/qa/screendesign-suspense-gate";

export default async function SmartLoadingProbePage() {
  if (process.env.QA_CREATE_USER !== "true") notFound();

  await waitForScreenDesignSuspenseGate("smart-loading");

  return (
    <main aria-label="Smart loading resolved">
      <h1>Your next view is ready</h1>
    </main>
  );
}
