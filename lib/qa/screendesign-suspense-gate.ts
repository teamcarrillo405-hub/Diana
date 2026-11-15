interface ScreenDesignSuspenseGate {
  released: boolean;
  waiters: Set<() => void>;
}

const globalWithGates = globalThis as typeof globalThis & {
  __dianaScreenDesignSuspenseGates?: Map<string, ScreenDesignSuspenseGate>;
};

const gates =
  globalWithGates.__dianaScreenDesignSuspenseGates ??
  (globalWithGates.__dianaScreenDesignSuspenseGates = new Map());

const gateFor = (gateId: string): ScreenDesignSuspenseGate => {
  const existing = gates.get(gateId);
  if (existing) return existing;

  const created = { released: false, waiters: new Set<() => void>() };
  gates.set(gateId, created);
  return created;
};

export async function waitForScreenDesignSuspenseGate(gateId: string): Promise<void> {
  const gate = gateFor(gateId);
  if (gate.released) return;
  await new Promise<void>((resolve) => gate.waiters.add(resolve));
}

export function releaseScreenDesignSuspenseGate(gateId: string): void {
  const gate = gateFor(gateId);
  gate.released = true;
  for (const resolve of gate.waiters) resolve();
  gate.waiters.clear();
}

export function resetScreenDesignSuspenseGate(gateId: string): void {
  gates.delete(gateId);
}
