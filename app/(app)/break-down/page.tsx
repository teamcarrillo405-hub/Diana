import { ListChecks } from "lucide-react";
import { BreakDownClient } from "./break-down-client";
import { PageShell } from "../page-shell";

export default function Page() {
  return (
    <PageShell
      active="Work"
      eyebrow="Task break-down"
      title="Turn a big prompt into the next visible move."
      subtitle="Built for the moment when the assignment is real but the first move is hard to see."
      accent="var(--gl-cyan)"
      icon={ListChecks}
      titleMaxWidth="28ch"
    >
      <BreakDownClient />
    </PageShell>
  );
}
