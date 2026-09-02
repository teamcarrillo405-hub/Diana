import type { AssignmentDraftState } from "@/lib/assignment-workspace-contracts";

export type AssignmentProblemDraftPatch = Partial<Record<"answer" | "work" | "workInk", string>>;

export type AssignmentDraftSnapshot = {
  state: AssignmentDraftState;
  error: string;
  pendingProblemIds: string[];
};

type Listener = (snapshot: AssignmentDraftSnapshot) => void;

export class AssignmentDraftCoordinator {
  private readonly pending = new Map<string, AssignmentProblemDraftPatch>();
  private state: AssignmentDraftState = "idle";
  private error = "";
  private pendingRetryError = "";
  private listener: Listener | null = null;

  subscribe(listener: Listener): () => void {
    this.listener = listener;
    listener(this.snapshot());
    return () => {
      if (this.listener === listener) this.listener = null;
    };
  }

  queue(problemId: string, patch: AssignmentProblemDraftPatch): AssignmentProblemDraftPatch {
    const next = { ...this.pending.get(problemId), ...patch };
    this.pending.set(problemId, next);
    this.update(
      this.pendingRetryError ? "retryable_error" : "saving",
      this.pendingRetryError,
    );
    return next;
  }

  recover(problemId: string, patch: AssignmentProblemDraftPatch): void {
    if (Object.keys(patch).length === 0) return;
    this.pending.set(problemId, { ...this.pending.get(problemId), ...patch });
    this.pendingRetryError = "";
    this.update("local_only");
  }

  take(problemId: string): AssignmentProblemDraftPatch | null {
    const patch = this.pending.get(problemId);
    if (!patch) return null;
    this.pending.delete(problemId);
    this.emit();
    return { ...patch };
  }

  restore(problemId: string, patch: AssignmentProblemDraftPatch): void {
    this.pending.set(problemId, { ...patch, ...this.pending.get(problemId) });
    this.emit();
  }

  get(problemId: string): AssignmentProblemDraftPatch | null {
    const patch = this.pending.get(problemId);
    return patch ? { ...patch } : null;
  }

  problemIds(): string[] {
    return [...this.pending.keys()];
  }

  hasPending(): boolean {
    return this.pending.size > 0;
  }

  syncing(): void {
    if (this.pendingRetryError && this.pending.size > 0) {
      this.update("retryable_error", this.pendingRetryError);
      return;
    }
    this.pendingRetryError = "";
    this.update("saving");
  }

  synced(): void {
    if (this.pendingRetryError && this.pending.size > 0) {
      this.update("retryable_error", this.pendingRetryError);
      return;
    }
    if (this.pending.size === 0) this.pendingRetryError = "";
    this.update(this.pending.size > 0 ? "saving" : "synced");
  }

  localOnly(): void {
    this.pendingRetryError = "";
    this.update("local_only");
  }

  retryableError(error: string): void {
    this.pendingRetryError = error;
    this.update("retryable_error", error);
  }

  sessionExpired(error = "Sign in again to sync this work."): void {
    this.pendingRetryError = "";
    this.update("session_expired", error);
  }

  idle(): void {
    this.pendingRetryError = "";
    this.update("idle");
  }

  snapshot(): AssignmentDraftSnapshot {
    return {
      state: this.state,
      error: this.error,
      pendingProblemIds: this.problemIds(),
    };
  }

  private update(state: AssignmentDraftState, error = ""): void {
    this.state = state;
    this.error = error;
    this.emit();
  }

  private emit(): void {
    this.listener?.(this.snapshot());
  }
}

export function assignmentDraftLabel(state: AssignmentDraftState): string {
  if (state === "saving") return "Saving";
  if (state === "synced") return "Saved";
  if (state === "local_only") return "Saved on this device";
  if (state === "retryable_error") return "Save needs attention";
  if (state === "session_expired") return "Sign in to sync";
  return "";
}
