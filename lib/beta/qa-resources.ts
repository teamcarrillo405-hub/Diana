import { validateBetaRunId } from "./run-id";
import type { BetaQaResource } from "./surface-contracts";

export function getBetaQaRunId(runIdInput: string): string {
  return validateBetaRunId(runIdInput);
}

export function getBetaQaResourceNamespace(runIdInput: string): string {
  return `diana-qa-${getBetaQaRunId(runIdInput)}`;
}

export function createBetaQaResources(runIdInput: string): BetaQaResource[] {
  const namespace = getBetaQaResourceNamespace(runIdInput);
  return [
    { kind: "namespace", id: namespace, disposable: true },
    { kind: "student", id: `${namespace}-student`, disposable: true },
    { kind: "course", id: `${namespace}-course`, disposable: true },
    { kind: "assignment", id: `${namespace}-assignment`, disposable: true },
    { kind: "submission", id: `${namespace}-submission`, disposable: true },
    { kind: "browser-profile", id: `${namespace}-browser`, disposable: true },
  ];
}
