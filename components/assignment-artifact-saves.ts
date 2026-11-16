import { createContext } from "react";

type FlushArtifact = () => Promise<boolean>;

export function createAssignmentArtifactSaves() {
  const queued = new Set<FlushArtifact>();
  const explicit = new Set<Promise<boolean>>();
  return {
    register(flush: FlushArtifact) {
      queued.add(flush);
      return () => { queued.delete(flush); };
    },
    track<T extends { ok: boolean }>(request: Promise<T>): Promise<T> {
      const status = request.then(({ ok }) => ok, () => false);
      explicit.add(status);
      void status.then(() => explicit.delete(status));
      return request;
    },
    async flush(): Promise<boolean> {
      const saves = [...explicit, ...[...queued].map((flush) => flush())];
      const results = await Promise.allSettled(saves);
      return results.every((save) => save.status === "fulfilled" && save.value);
    },
  };
}

export const AssignmentArtifactSavesContext = createContext<ReturnType<typeof createAssignmentArtifactSaves> | null>(null);
