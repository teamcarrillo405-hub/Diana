import { chemicalSpeciesAtoms, verifyChemicalEquationBalance } from "@/lib/assignment-help/deterministic-verifiers";
import { verifyCompoundQuantity, type ScienceCheck } from "@/lib/learning-engine/science-checks";

export type ClassroomMolarityInput = {
  amount: string;
  volume: string;
  answer: string;
  significantFigures: number;
};

const MAX_EQUATION_LENGTH = 500;
const MAX_TERMS_PER_SIDE = 32;
const MAX_QUANTITY_LENGTH = 120;
const REACTION_ARROW = /->|→|=/u;
const MEASUREMENT = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,3})?)\s*([A-Za-z].*?)\s*$/u;

type EquationTerm = { species: string; coefficient: number };
type EquationSides = { reactants: EquationTerm[]; products: EquationTerm[]; normalized: string };

function explanation(status: ScienceCheck["status"], guidance: string, observations: string[] = []): ScienceCheck {
  return { status, guidance, observations };
}

function termsOnSide(value: string): EquationTerm[] | null {
  const terms = value.split("+");
  if (terms.length > MAX_TERMS_PER_SIDE) return null;

  const parsed: EquationTerm[] = [];
  for (const term of terms) {
    const match = /^(?:(\d+)\s*)?([A-Za-z0-9()[\]]+?)(\((?:aq|s|l|g)\))?$/u.exec(term.trim());
    if (!match) return null;
    const coefficient = Number(match[1] ?? 1);
    const formula = match[2]!;
    if (!Number.isSafeInteger(coefficient) || coefficient < 1 || !chemicalSpeciesAtoms(formula)) return null;
    parsed.push({ species: formula + (match[3] ?? ""), coefficient });
  }
  return parsed;
}

function parseClassroomEquation(equation: string): EquationSides | null {
  if (equation.length > MAX_EQUATION_LENGTH) return null;
  const normalized = equation.trim().replace(/[₀-₉]/gu, (character) => String(character.charCodeAt(0) - 0x2080));
  // Split only at a single stated arrow. An ionic charge or a second direction is out of scope.
  const sides = normalized.split(REACTION_ARROW);
  if (sides.length !== 2) return null;
  const reactants = termsOnSide(sides[0]!);
  const products = termsOnSide(sides[1]!);
  return reactants && products ? { reactants, products, normalized } : null;
}

function sameSpecies(a: EquationTerm[], b: EquationTerm[]): boolean {
  if (a.length !== b.length) return false;
  const expected = a.map(({ species }) => species).sort();
  const attempted = b.map(({ species }) => species).sort();
  return attempted.every((species, index) => species === expected[index]);
}

function greatestCommonDivisor(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/** Verify a student's coefficients for the neutral formulas and directions already supplied. */
export function checkClassroomBalance(statedEquation: string, attempt: string): ScienceCheck {
  const stated = parseClassroomEquation(statedEquation);
  if (!stated) return explanation("unsupported", "Enter the stated neutral formulas with a single arrow between the two sides.");
  const student = parseClassroomEquation(attempt);
  if (!student) return explanation("unsupported", "Enter both sides of your equation. Use whole-number coefficients in front of the neutral formulas.");

  if (!sameSpecies(stated.reactants, student.reactants) || !sameSpecies(stated.products, student.products)) {
    return explanation("revise", "Keep the stated formulas on their original sides. Change only the coefficients in front of them.");
  }

  const { balanced, verifierResult } = verifyChemicalEquationBalance(student.normalized);
  if (balanced === null) return explanation("unsupported", "Use a shorter equation with supported neutral formulas and whole-number coefficients.");
  if (!balanced) return explanation("revise", "Compare the atom counts on both sides. Adjust a coefficient and check again.", verifierResult.observations);

  const commonFactor = [...student.reactants, ...student.products]
    .map(({ coefficient }) => coefficient)
    .reduce(greatestCommonDivisor);
  if (commonFactor > 1) return explanation("revise", "The atom counts match. Reduce the coefficients to the smallest whole-number ratio.", verifierResult.observations);
  return explanation("matches", "The atom counts match on both sides with the smallest whole-number coefficients.", verifierResult.observations);
}

function measurement(value: string) {
  if (value.length > MAX_QUANTITY_LENGTH) return null;
  const match = MEASUREMENT.exec(value);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isFinite(number) ? { number, digits: match[1]!, unit: match[2]! } : null;
}

/** Check the concentration implied by supplied quantities for a classroom calculation. */
export function checkClassroomMolarity({ amount, volume, answer, significantFigures }: ClassroomMolarityInput): ScienceCheck {
  if (!Number.isInteger(significantFigures) || significantFigures < 1 || significantFigures > 8) {
    return explanation("unsupported", "Choose a significant-figure requirement from 1 through 8.");
  }
  const solute = measurement(amount);
  if (!solute || solute.number < 0 || (solute.unit !== "mol" && solute.unit !== "mmol")) {
    return explanation("unsupported", "Enter a solute amount in mol or mmol. Use zero or a positive value.");
  }
  const solution = measurement(volume);
  if (!solution || solution.number <= 0 || (solution.unit !== "L" && solution.unit !== "mL")) {
    return explanation("unsupported", "Enter a positive solution volume in L or mL.");
  }

  const moles = solute.unit === "mmol" ? solute.number / 1_000 : solute.number;
  const liters = solution.unit === "mL" ? solution.number / 1_000 : solution.number;
  const molarity = moles / liters;
  if (!Number.isFinite(molarity) || (molarity === 0 && solute.number !== 0)) {
    return explanation("unsupported", "These quantities are outside the calculation range. Check the supplied values.");
  }

  const response = measurement(answer);
  const answerGuidance = "Enter your result as a number followed by mol/L or M.";
  if (!response) return explanation("unsupported", answerGuidance);
  const unit = response.unit === "M" ? "mol/L" : response.unit;
  const expected = molarity === 0 ? molarity.toFixed(significantFigures) : molarity.toPrecision(significantFigures);
  const result = verifyCompoundQuantity(`${expected} mol/L`, `${response.digits} ${unit}`, significantFigures);
  if (result.status === "unsupported") return explanation("unsupported", answerGuidance);
  if (result.status === "revise") {
    return { ...result, observations: [...result.observations, "Divide the solute amount in moles by the solution volume in liters."] };
  }
  return { ...result, guidance: "The value, concentration units, and significant figures match the supplied quantities." };
}
