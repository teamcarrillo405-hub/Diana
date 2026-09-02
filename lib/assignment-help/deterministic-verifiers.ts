import type { TutorVerifierResult } from "@/lib/ai/tutor-response-evidence";

export type NumericInput = number | string;

export type NumericEquivalenceOptions = {
  absoluteTolerance?: number;
  relativeTolerance?: number;
};

export type NumericEquivalenceVerification = {
  equivalent: boolean | null;
  expectedValue: number | null;
  actualValue: number | null;
  absoluteDifference: number | null;
  verifierResult: TutorVerifierResult;
};

export type QuantityVerificationInput = NumericEquivalenceOptions & {
  expected: string;
  actual: string;
  requiredSignificantFigures?: number;
};

export type QuantityVerification = {
  numericallyEquivalent: boolean | null;
  unitsEquivalent: boolean | null;
  requiredSignificantFigures: number | null;
  actualSignificantFigures: number | null;
  verifierResult: TutorVerifierResult;
};

export type ChemicalEquationVerification = {
  balanced: boolean | null;
  leftCounts: Record<string, number>;
  rightCounts: Record<string, number>;
  verifierResult: TutorVerifierResult;
};

export const SUPPORTED_CODE_TEST_RUNNERS = [
  "vitest",
  "jest",
  "node:test",
  "pytest",
] as const;

export type SupportedCodeTestRunner = (typeof SUPPORTED_CODE_TEST_RUNNERS)[number];

export type CodeTestObservation = {
  runner: string;
  provenance: "local_test_runner" | "sandbox_test_runner" | "model_reported";
  executed: boolean;
  exitCode: number | null;
  passedTests: number;
  failedTests: number;
  skippedTests?: number;
};

export type CodeTestVerification = {
  supported: boolean;
  accepted: boolean;
  verifierResult: TutorVerifierResult;
};

type ParsedQuantity = {
  value: number;
  numericToken: string;
  unitText: string;
  significantFigures: number;
};

type UnitDefinition = {
  dimension: "length" | "mass" | "time" | "volume";
  factorToBase: number;
  canonical: string;
};

type UnitComparison = {
  equivalent: boolean | null;
  expectedFactor: number;
  actualFactor: number;
  observation: string;
  limitation: string | null;
};

type ElementCounts = Map<string, number>;

const DEFAULT_ABSOLUTE_TOLERANCE = 1e-9;
const DEFAULT_RELATIVE_TOLERANCE = 1e-9;
const MAX_RELATIVE_TOLERANCE = 0.1;
const MAX_ABSOLUTE_TOLERANCE = 1e12;
const MAX_CHEMICAL_EQUATION_CHARS = 500;
const MAX_CHEMICAL_TERMS_PER_SIDE = 32;
const MAX_CHEMICAL_FORMULA_CHARS = 120;
const MAX_CHEMICAL_MULTIPLIER = 1_000_000;

const CHEMICAL_ELEMENT_SYMBOLS = new Set(
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" "),
);

const UNIT_DEFINITIONS: Record<string, UnitDefinition> = {
  m: { dimension: "length", factorToBase: 1, canonical: "m" },
  cm: { dimension: "length", factorToBase: 0.01, canonical: "cm" },
  mm: { dimension: "length", factorToBase: 0.001, canonical: "mm" },
  km: { dimension: "length", factorToBase: 1_000, canonical: "km" },
  kg: { dimension: "mass", factorToBase: 1, canonical: "kg" },
  g: { dimension: "mass", factorToBase: 0.001, canonical: "g" },
  mg: { dimension: "mass", factorToBase: 0.000_001, canonical: "mg" },
  s: { dimension: "time", factorToBase: 1, canonical: "s" },
  min: { dimension: "time", factorToBase: 60, canonical: "min" },
  h: { dimension: "time", factorToBase: 3_600, canonical: "h" },
  L: { dimension: "volume", factorToBase: 1, canonical: "L" },
  mL: { dimension: "volume", factorToBase: 0.001, canonical: "mL" },
};

const UNIT_ALIASES: Record<string, keyof typeof UNIT_DEFINITIONS> = {
  meter: "m",
  meters: "m",
  metre: "m",
  metres: "m",
  centimeter: "cm",
  centimeters: "cm",
  centimetre: "cm",
  centimetres: "cm",
  millimeter: "mm",
  millimeters: "mm",
  millimetre: "mm",
  millimetres: "mm",
  kilometer: "km",
  kilometers: "km",
  kilometre: "km",
  kilometres: "km",
  kilogram: "kg",
  kilograms: "kg",
  gram: "g",
  grams: "g",
  milligram: "mg",
  milligrams: "mg",
  second: "s",
  seconds: "s",
  sec: "s",
  minute: "min",
  minutes: "min",
  hour: "h",
  hours: "h",
  liter: "L",
  liters: "L",
  litre: "L",
  litres: "L",
  l: "L",
  milliliter: "mL",
  milliliters: "mL",
  millilitre: "mL",
  millilitres: "mL",
  ml: "mL",
};

export function verifyNumericEquivalence(
  expected: NumericInput,
  actual: NumericInput,
  options: NumericEquivalenceOptions = {},
): NumericEquivalenceVerification {
  const expectedValue = parseNumericValue(expected);
  const actualValue = parseNumericValue(actual);
  if (expectedValue === null || actualValue === null) {
    return {
      equivalent: null,
      expectedValue,
      actualValue,
      absoluteDifference: null,
      verifierResult: verifierResult(
        "numeric_equivalence",
        "inconclusive",
        "A numeric value could not be parsed deterministically.",
        [],
        ["Supported forms are finite numbers, decimals, scientific notation, fractions, and percentages."],
      ),
    };
  }

  const absoluteTolerance = boundedTolerance(
    options.absoluteTolerance,
    DEFAULT_ABSOLUTE_TOLERANCE,
    MAX_ABSOLUTE_TOLERANCE,
  );
  const relativeTolerance = boundedTolerance(
    options.relativeTolerance,
    DEFAULT_RELATIVE_TOLERANCE,
    MAX_RELATIVE_TOLERANCE,
  );
  const absoluteDifference = Math.abs(expectedValue - actualValue);
  const scale = Math.max(Math.abs(expectedValue), Math.abs(actualValue));
  const tolerance = Math.max(absoluteTolerance, relativeTolerance * scale);
  const equivalent = absoluteDifference <= tolerance;

  return {
    equivalent,
    expectedValue,
    actualValue,
    absoluteDifference,
    verifierResult: verifierResult(
      "numeric_equivalence",
      equivalent ? "passed" : "not_passed",
      equivalent
        ? "The numeric values are equivalent within the configured tolerance."
        : "The numeric values are outside the configured tolerance.",
      [
        `Absolute difference: ${absoluteDifference}`,
        `Allowed tolerance: ${tolerance}`,
      ],
      ["Numeric equivalence does not validate the reasoning or method used to obtain the value."],
    ),
  };
}

export function verifyUnitsAndSignificantFigures(
  input: QuantityVerificationInput,
): QuantityVerification {
  const expected = parseQuantity(input.expected);
  const actual = parseQuantity(input.actual);
  if (!expected || !actual) {
    return quantityResult(
      null,
      null,
      null,
      actual?.significantFigures ?? null,
      "inconclusive",
      "A quantity could not be parsed deterministically.",
      [],
      ["Quantities must use a finite decimal or scientific-notation value followed by an optional unit."],
    );
  }

  const requiredSignificantFigures = normalizeRequiredSignificantFigures(
    input.requiredSignificantFigures,
    expected.significantFigures,
  );
  if (requiredSignificantFigures === null) {
    return quantityResult(
      null,
      null,
      null,
      actual.significantFigures,
      "inconclusive",
      "The significant-figure requirement is outside the supported range.",
      [],
      ["Significant-figure requirements must be whole numbers from 1 through 15."],
    );
  }

  const unitComparison = compareUnits(expected.unitText, actual.unitText);
  if (unitComparison.equivalent === null) {
    return quantityResult(
      null,
      null,
      requiredSignificantFigures,
      actual.significantFigures,
      "inconclusive",
      "The unit conversion is not in the deterministic conversion table.",
      [unitComparison.observation],
      [unitComparison.limitation ?? "Unsupported unit conversions require another verifier."],
    );
  }
  if (!unitComparison.equivalent) {
    return quantityResult(
      null,
      false,
      requiredSignificantFigures,
      actual.significantFigures,
      "not_passed",
      "The quantities use incompatible units.",
      [unitComparison.observation],
      ["Compound-unit dimensional analysis is outside this bounded unit checker."],
    );
  }

  const numericCheck = verifyNumericEquivalence(
    expected.value * unitComparison.expectedFactor,
    actual.value * unitComparison.actualFactor,
    input,
  );
  const numericallyEquivalent = numericCheck.equivalent;
  const significantFiguresMatch = actual.significantFigures === requiredSignificantFigures;
  const passed = numericallyEquivalent === true && significantFiguresMatch;
  const observations = [
    unitComparison.observation,
    `Required significant figures: ${requiredSignificantFigures}`,
    `Observed significant figures: ${actual.significantFigures}`,
    ...numericCheck.verifierResult.observations,
  ];

  return quantityResult(
    numericallyEquivalent,
    true,
    requiredSignificantFigures,
    actual.significantFigures,
    passed ? "passed" : "not_passed",
    passed
      ? "The value, units, and significant figures satisfy the deterministic check."
      : "The value or significant figures do not satisfy the deterministic check.",
    observations,
    [
      ...(unitComparison.limitation ? [unitComparison.limitation] : []),
      "The conversion table covers common single units only; compound units and offset temperatures require another verifier.",
    ],
  );
}

export function countSignificantFigures(value: string): number | null {
  const quantity = parseQuantity(value);
  return quantity?.significantFigures ?? null;
}

export function verifyChemicalEquationBalance(
  equation: string,
): ChemicalEquationVerification {
  const parsed = parseChemicalEquation(equation);
  const limitations = [
    "This verifier checks atom counts only; charge, reaction conditions, state labels, and chemical plausibility need separate review.",
  ];
  if (!parsed) {
    return {
      balanced: null,
      leftCounts: {},
      rightCounts: {},
      verifierResult: verifierResult(
        "chemical_equation_balance",
        "inconclusive",
        "The chemical equation is outside the supported deterministic grammar.",
        [],
        [
          ...limitations,
          "Supported formulas use element symbols, whole-number coefficients and subscripts, parentheses or brackets, and a single reaction arrow.",
        ],
      ),
    };
  }

  const elements = [...new Set([...parsed.left.keys(), ...parsed.right.keys()])].sort();
  const imbalances = elements.filter((element) =>
    (parsed.left.get(element) ?? 0) !== (parsed.right.get(element) ?? 0)
  );
  const balanced = imbalances.length === 0;

  return {
    balanced,
    leftCounts: countsRecord(parsed.left),
    rightCounts: countsRecord(parsed.right),
    verifierResult: verifierResult(
      "chemical_equation_balance",
      balanced ? "passed" : "not_passed",
      balanced
        ? "Each parsed element has the same atom count on both sides."
        : "One or more parsed elements have different atom counts across the equation.",
      balanced
        ? elements.map((element) => `${element}: ${parsed.left.get(element) ?? 0} on each side`)
        : imbalances.slice(0, 12).map((element) =>
          `${element}: left ${parsed.left.get(element) ?? 0}, right ${parsed.right.get(element) ?? 0}`
        ),
      limitations,
    ),
  };
}

export function verifySupportedCodeTestResult(
  observation: CodeTestObservation,
): CodeTestVerification {
  const runner = observation.runner.trim().toLocaleLowerCase("en-US");
  const runnerSupported = SUPPORTED_CODE_TEST_RUNNERS.includes(runner as SupportedCodeTestRunner);
  const trustedProvenance = observation.provenance === "local_test_runner" ||
    observation.provenance === "sandbox_test_runner";
  const supported = runnerSupported && trustedProvenance;
  const counts = [
    nonnegativeInteger(observation.passedTests),
    nonnegativeInteger(observation.failedTests),
    nonnegativeInteger(observation.skippedTests ?? 0),
  ];

  if (!runnerSupported) {
    return codeTestResult(
      false,
      false,
      "inconclusive",
      "The test runner is not in the supported evidence allowlist.",
      [],
      [`Supported runners: ${SUPPORTED_CODE_TEST_RUNNERS.join(", ")}.`],
    );
  }
  if (!trustedProvenance) {
    return codeTestResult(
      false,
      false,
      "inconclusive",
      "A model-reported test summary is not accepted as executed test evidence.",
      [],
      ["Test evidence must come from a local or sandbox test-runner observation."],
    );
  }
  if (!observation.executed) {
    return codeTestResult(
      supported,
      false,
      "not_run",
      "The supported test runner was not executed.",
      [],
      ["No code behavior claim can be supported until the test command runs."],
    );
  }
  if (!Number.isInteger(observation.exitCode) || counts.some((count) => count === null)) {
    return codeTestResult(
      supported,
      false,
      "inconclusive",
      "The observed test result is missing a valid exit code or test count.",
      [],
      ["Exit codes and test counts must come directly from the supported runner."],
    );
  }

  const [passedTests, failedTests, skippedTests] = counts as [number, number, number];
  const observations = [
    `Runner: ${runner}`,
    `Exit code: ${observation.exitCode}`,
    `Passed tests: ${passedTests}`,
    `Tests needing attention: ${failedTests}`,
    `Skipped tests: ${skippedTests}`,
  ];
  if (observation.exitCode !== 0 || failedTests > 0) {
    return codeTestResult(
      supported,
      false,
      "not_passed",
      "The observed test run did not pass.",
      observations,
      ["The runner output must be reviewed before claiming the tested behavior is supported."],
    );
  }
  if (passedTests === 0) {
    return codeTestResult(
      supported,
      false,
      "inconclusive",
      "The runner completed without an observed passing test.",
      observations,
      ["A zero-test run does not support a code behavior claim."],
    );
  }

  return codeTestResult(
    supported,
    true,
    "passed",
    "The supported runner completed with observed passing tests and no test failures.",
    observations,
    ["Passing observed tests supports only the behavior those tests exercise."],
  );
}

function parseNumericValue(value: NumericInput): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 128) return null;

  if (normalized.endsWith("%")) {
    const percentageValue = parsePlainNumber(normalized.slice(0, -1).trim());
    return percentageValue === null ? null : percentageValue / 100;
  }

  const fraction = normalized.match(/^(.+?)\s*\/\s*(.+)$/u);
  if (fraction) {
    const numerator = parsePlainNumber(fraction[1]);
    const denominator = parsePlainNumber(fraction[2]);
    if (numerator === null || denominator === null || denominator === 0) return null;
    const result = numerator / denominator;
    return Number.isFinite(result) ? result : null;
  }

  return parsePlainNumber(normalized);
}

function parsePlainNumber(value: string): number | null {
  const normalized = value.trim();
  const pattern = /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u;
  if (!pattern.test(normalized)) return null;
  const parsed = Number(normalized.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseQuantity(value: string): ParsedQuantity | null {
  const normalized = value.trim();
  if (!normalized || normalized.length > 200) return null;
  const match = normalized.match(
    /^([+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*)$/u,
  );
  if (!match) return null;
  const parsedValue = parsePlainNumber(match[1]);
  const significantFigures = significantFiguresForToken(match[1]);
  if (parsedValue === null || significantFigures === null) return null;
  return {
    value: parsedValue,
    numericToken: match[1],
    unitText: normalizeUnitIdentity(match[2]),
    significantFigures,
  };
}

function significantFiguresForToken(value: string): number | null {
  const normalized = value.replaceAll(",", "").replace(/^[+-]/u, "");
  const [mantissa, exponent, ...extra] = normalized.split(/[eE]/u);
  if (!mantissa || extra.length > 0 || (exponent !== undefined && !/^[+-]?\d+$/u.test(exponent))) {
    return null;
  }
  const hasDecimal = mantissa.includes(".");
  const digits = mantissa.replace(".", "");
  if (!/^\d+$/u.test(digits)) return null;
  const firstNonZero = digits.search(/[1-9]/u);
  if (firstNonZero < 0) {
    if (!hasDecimal) return 1;
    const fractionalDigits = mantissa.split(".")[1]?.length ?? 0;
    return Math.max(1, fractionalDigits);
  }

  let significant = digits.slice(firstNonZero);
  if (!hasDecimal && exponent === undefined) significant = significant.replace(/0+$/u, "");
  return Math.max(1, significant.length);
}

function compareUnits(expectedUnit: string, actualUnit: string): UnitComparison {
  if (!expectedUnit && !actualUnit) {
    return {
      equivalent: true,
      expectedFactor: 1,
      actualFactor: 1,
      observation: "Both quantities are unitless.",
      limitation: null,
    };
  }
  if (!expectedUnit || !actualUnit) {
    return {
      equivalent: false,
      expectedFactor: 1,
      actualFactor: 1,
      observation: `Expected unit: ${expectedUnit || "unitless"}; observed unit: ${actualUnit || "unitless"}.`,
      limitation: null,
    };
  }

  const expectedDefinition = unitDefinitionFor(expectedUnit);
  const actualDefinition = unitDefinitionFor(actualUnit);
  if (expectedDefinition && actualDefinition) {
    const compatible = expectedDefinition.dimension === actualDefinition.dimension;
    return {
      equivalent: compatible,
      expectedFactor: expectedDefinition.factorToBase,
      actualFactor: actualDefinition.factorToBase,
      observation: compatible
        ? `Compatible units: ${expectedDefinition.canonical} and ${actualDefinition.canonical}.`
        : `Incompatible unit dimensions: ${expectedDefinition.dimension} and ${actualDefinition.dimension}.`,
      limitation: null,
    };
  }

  if (!expectedDefinition && !actualDefinition && expectedUnit === actualUnit) {
    return {
      equivalent: true,
      expectedFactor: 1,
      actualFactor: 1,
      observation: `The exact custom unit matches: ${expectedUnit}.`,
      limitation: "The custom unit is compared textually and is not dimensionally interpreted.",
    };
  }

  return {
    equivalent: null,
    expectedFactor: 1,
    actualFactor: 1,
    observation: `Expected unit: ${expectedUnit}; observed unit: ${actualUnit}.`,
    limitation: "At least one unit is outside the bounded conversion table.",
  };
}

function unitDefinitionFor(unit: string): UnitDefinition | null {
  if (unit in UNIT_DEFINITIONS) return UNIT_DEFINITIONS[unit];
  const alias = UNIT_ALIASES[unit.toLocaleLowerCase("en-US")];
  return alias ? UNIT_DEFINITIONS[alias] : null;
}

function normalizeUnitIdentity(value: string): string {
  return value
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/\s*([*/^])\s*/gu, "$1");
}

function normalizeRequiredSignificantFigures(
  value: number | undefined,
  fallback: number,
): number | null {
  if (value === undefined) return fallback;
  return Number.isInteger(value) && value >= 1 && value <= 15 ? value : null;
}

function parseChemicalEquation(
  equation: string,
): { left: ElementCounts; right: ElementCounts } | null {
  const normalized = equation.trim();
  if (!normalized || normalized.length > MAX_CHEMICAL_EQUATION_CHARS) return null;
  const arrowPattern = /<=>|<->|->|=>|=|\u2192|\u21cc/gu;
  const arrows = [...normalized.matchAll(arrowPattern)];
  if (arrows.length !== 1 || arrows[0].index === undefined) return null;
  const arrow = arrows[0][0];
  const leftText = normalized.slice(0, arrows[0].index).trim();
  const rightText = normalized.slice(arrows[0].index + arrow.length).trim();
  const left = parseChemicalSide(leftText);
  const right = parseChemicalSide(rightText);
  return left && right ? { left, right } : null;
}

function parseChemicalSide(side: string): ElementCounts | null {
  const terms = side.split(/\s*\+\s*/u);
  if (
    terms.length === 0 ||
    terms.length > MAX_CHEMICAL_TERMS_PER_SIDE ||
    terms.some((term) => !term.trim())
  ) return null;

  const total: ElementCounts = new Map();
  for (const term of terms) {
    const parsed = parseChemicalTerm(term);
    if (!parsed) return null;
    if (!mergeCounts(total, parsed.counts, parsed.coefficient)) return null;
  }
  return total.size > 0 ? total : null;
}

function parseChemicalTerm(
  term: string,
): { coefficient: number; counts: ElementCounts } | null {
  let normalized = term.trim().replace(/\((?:aq|s|l|g)\)$/iu, "");
  let coefficient = 1;
  const coefficientMatch = normalized.match(/^(\d+)\s*(?=[A-Z[(])/u);
  if (coefficientMatch) {
    coefficient = Number(coefficientMatch[1]);
    normalized = normalized.slice(coefficientMatch[0].length);
  }
  if (
    !Number.isInteger(coefficient) ||
    coefficient <= 0 ||
    coefficient > MAX_CHEMICAL_MULTIPLIER ||
    !normalized ||
    normalized.length > MAX_CHEMICAL_FORMULA_CHARS ||
    /\s/u.test(normalized)
  ) return null;

  const hydrateParts = normalized.split(/[.\u00b7]/u);
  if (hydrateParts.some((part) => !part)) return null;
  const counts: ElementCounts = new Map();
  for (const [index, hydratePart] of hydrateParts.entries()) {
    let part = hydratePart;
    let multiplier = 1;
    if (index > 0) {
      const multiplierMatch = part.match(/^(\d+)(?=[A-Z[(])/u);
      if (multiplierMatch) {
        multiplier = Number(multiplierMatch[1]);
        part = part.slice(multiplierMatch[1].length);
      }
    }
    if (
      !Number.isInteger(multiplier) ||
      multiplier <= 0 ||
      multiplier > MAX_CHEMICAL_MULTIPLIER
    ) return null;
    const partCounts = parseFormula(part);
    if (!partCounts || !mergeCounts(counts, partCounts, multiplier)) return null;
  }
  return counts.size > 0 ? { coefficient, counts } : null;
}

function parseFormula(formula: string): ElementCounts | null {
  let index = 0;

  const parseGroup = (closing: ")" | "]" | null): ElementCounts | null => {
    const counts: ElementCounts = new Map();
    while (index < formula.length) {
      const character = formula[index];
      if (character === ")" || character === "]") {
        if (character !== closing || counts.size === 0) return null;
        index += 1;
        return counts;
      }
      if (character === "(" || character === "[") {
        index += 1;
        const nested = parseGroup(character === "(" ? ")" : "]");
        if (!nested) return null;
        const multiplier = parseChemicalNumber(formula, () => index, (next) => { index = next; });
        if (multiplier === null || !mergeCounts(counts, nested, multiplier)) return null;
        continue;
      }
      if (!/[A-Z]/u.test(character)) return null;

      let element = character;
      index += 1;
      if (index < formula.length && /[a-z]/u.test(formula[index])) {
        element += formula[index];
        index += 1;
      }
      if (!CHEMICAL_ELEMENT_SYMBOLS.has(element)) return null;
      const multiplier = parseChemicalNumber(formula, () => index, (next) => { index = next; });
      if (multiplier === null || !addCount(counts, element, multiplier)) return null;
    }
    return closing === null && counts.size > 0 ? counts : null;
  };

  const counts = parseGroup(null);
  return counts && index === formula.length ? counts : null;
}

function parseChemicalNumber(
  formula: string,
  getIndex: () => number,
  setIndex: (index: number) => void,
): number | null {
  let index = getIndex();
  const start = index;
  while (index < formula.length && /\d/u.test(formula[index])) index += 1;
  setIndex(index);
  if (index === start) return 1;
  const value = Number(formula.slice(start, index));
  return Number.isInteger(value) && value > 0 && value <= MAX_CHEMICAL_MULTIPLIER
    ? value
    : null;
}

function addCount(counts: ElementCounts, element: string, amount: number): boolean {
  const total = (counts.get(element) ?? 0) + amount;
  if (!Number.isSafeInteger(total) || total > Number.MAX_SAFE_INTEGER) return false;
  counts.set(element, total);
  return true;
}

function mergeCounts(target: ElementCounts, source: ElementCounts, multiplier: number): boolean {
  for (const [element, count] of source) {
    if (!addCount(target, element, count * multiplier)) return false;
  }
  return true;
}

function countsRecord(counts: ElementCounts): Record<string, number> {
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function boundedTolerance(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(maximum, value))
    : fallback;
}

function nonnegativeInteger(value: number): number | null {
  return Number.isInteger(value) && value >= 0 && value <= 1_000_000 ? value : null;
}

function verifierResult(
  verifier: TutorVerifierResult["verifier"],
  status: TutorVerifierResult["status"],
  summary: string,
  observations: string[],
  limitations: string[],
): TutorVerifierResult {
  return { verifier, status, summary, observations, limitations };
}

function quantityResult(
  numericallyEquivalent: boolean | null,
  unitsEquivalent: boolean | null,
  requiredSignificantFigures: number | null,
  actualSignificantFigures: number | null,
  status: TutorVerifierResult["status"],
  summary: string,
  observations: string[],
  limitations: string[],
): QuantityVerification {
  return {
    numericallyEquivalent,
    unitsEquivalent,
    requiredSignificantFigures,
    actualSignificantFigures,
    verifierResult: verifierResult(
      "units_and_significant_figures",
      status,
      summary,
      observations,
      limitations,
    ),
  };
}

function codeTestResult(
  supported: boolean,
  accepted: boolean,
  status: TutorVerifierResult["status"],
  summary: string,
  observations: string[],
  limitations: string[],
): CodeTestVerification {
  return {
    supported,
    accepted,
    verifierResult: verifierResult(
      "code_test_result",
      status,
      summary,
      observations,
      limitations,
    ),
  };
}
