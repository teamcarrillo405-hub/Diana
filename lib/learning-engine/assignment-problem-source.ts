import type { SourcePage } from "./contracts";

/** A review of student work never confirms OCR or imported problem text. */
export function assignmentProblemSourceState(source: string, unitType = "problem"): {
  interpretation: SourcePage["interpretation"];
  description: string;
} {
  if (unitType !== "problem") return {
    interpretation: "model_extraction",
    description: "This is a generated work step from assignment context, not a verified source passage or answer key.",
  };
  if (source === "manual") return {
    interpretation: "original",
    description: "Entered by the student. The selected problem is not an answer key.",
  };
  if (source === "student_confirmed_source") return {
    interpretation: "confirmed",
    description: "The student confirmed this imported problem text against the source. The selected problem is not an answer key.",
  };
  return {
    interpretation: "model_extraction",
    description: "Imported problem text still needs confirmation against the original source. Reviewing work does not confirm source text.",
  };
}
