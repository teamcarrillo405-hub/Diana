import { validatePeHealthPrompt } from "@/lib/course-mode/safety";

export type DesignAlternative = {
  id: string;
  name: string;
  evidence: string;
};

export type EngineeringTest = {
  id: string;
  method: string;
  result: string;
  revision: string;
};

export type DesignNotebook = {
  problem: string;
  stakeholders: string;
  criteria: string[];
  constraints: string[];
  alternatives: DesignAlternative[];
  selectedAlternative: string;
  selectionReason: string;
  tests: EngineeringTest[];
};

export type DataLabRow = {
  id: string;
  label: string;
  value: string;
  unit: string;
  uncertainty: string;
  observation: string;
};

export type PerformanceLogEntry = {
  id: string;
  occurredOn: string;
  focus: string;
  durationMinutes: number | null;
  evidence: string;
  reflection: string;
  verifiedByTeacher: boolean;
};

export function validateDesignNotebook(notebook: DesignNotebook): string[] {
  return [
    !notebook.problem.trim() ? "Define the problem." : "",
    notebook.criteria.filter((item) => item.trim()).length === 0 ? "Record at least one success criterion." : "",
    notebook.constraints.filter((item) => item.trim()).length === 0 ? "Record at least one constraint." : "",
    notebook.alternatives.filter((item) => item.name.trim()).length < 2 ? "Compare at least two alternatives." : "",
    notebook.selectedAlternative.trim() && !notebook.selectionReason.trim() ? "Explain why the selected alternative fits the evidence." : "",
  ].filter(Boolean);
}

export function validateDataLabRows(rows: readonly DataLabRow[]): string[] {
  const issues: string[] = [];
  rows.forEach((row, index) => {
    if (!row.label.trim() && !row.value.trim() && !row.observation.trim()) return;
    if (!row.label.trim()) issues.push(`Row ${index + 1} needs a measurement or observation label.`);
    if (row.value.trim() && !row.unit.trim()) issues.push(`Row ${index + 1} needs a unit.`);
    if (row.uncertainty.trim() && !/^\d+(?:\.\d+)?$/u.test(row.uncertainty.trim())) {
      issues.push(`Row ${index + 1} uncertainty must be a non-negative number.`);
    }
  });
  return issues;
}

export function validatePerformanceEntry(
  entry: PerformanceLogEntry,
  subject: "performance" | "pe" | "health",
): string[] {
  const issues = [
    !entry.occurredOn ? "Choose the practice date." : "",
    !entry.focus.trim() ? "Name the skill, knowledge, or recovery focus." : "",
    entry.durationMinutes !== null && entry.durationMinutes <= 0 ? "Duration must be positive when included." : "",
  ].filter(Boolean);
  if (subject === "pe" || subject === "health") {
    const dignity = validatePeHealthPrompt(entry.focus);
    if (!dignity.allowed && dignity.reason) issues.push(dignity.reason);
  }
  return issues;
}

export function completedProcedureCount(
  approvedSteps: readonly string[],
  completedIndexes: readonly number[],
): number {
  const valid = new Set(
    completedIndexes.filter((index) => Number.isInteger(index) && index >= 0 && index < approvedSteps.length),
  );
  return valid.size;
}
