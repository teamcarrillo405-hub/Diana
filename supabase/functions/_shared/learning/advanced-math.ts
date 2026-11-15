import { add, multiply, negate, rational, sum, product, polynomial, parseExpression, type Expression, type Polynomial, type Rational, type AssessmentResult } from "./algebra.ts";

export const ADVANCED_VERIFIER_VERSION = "exact-domain-systems-v1";
export type AdvancedSpecification =
  | { kind: "solution_set"; equation: string; variable?: string }
  | { kind: "rational_expression"; reference: string; variable?: string }
  | { kind: "linear_system"; equations: [{ x: string; y: string; constant: string }, { x: string; y: string; constant: string }] }
  | { kind: "geometry_measure"; shape: "rectangle_area" | "triangle_area" | "triangle_angle" | "right_triangle_hypotenuse"; givens: [string, string]; unit: "cm" | "m" | "degrees" };
const zero = rational(0n), one = rational(1n);
const key = (value: Rational) => value.n + "/" + value.d;
const divide = (a: Rational, b: Rational) => multiply(a, rational(b.d, b.n));
const equal = (a: Rational, b: Rational) => a.n === b.n && a.d === b.d;
function numeric(input: string): Rational {
  const value = polynomial(parseExpression(input));
  if (value.length !== 1) throw new Error("Use an exact numeric value.");
  return value[0];
}
function sqrtInteger(value: bigint): bigint | null {
  if (value < 0n) return null;
  if (value < 2n) return value;
  let x = value, y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + value / x) / 2n; }
  return x * x === value ? x : null;
}
/** Complete real root sets only where exact rational roots can be established. */
function roots(coefficients: Polynomial): Rational[] | "all" {
  if (coefficients.length === 1) return coefficients[0].n === 0n ? "all" : [];
  if (coefficients.length === 2) return [divide(negate(coefficients[0]), coefficients[1])];
  if (coefficients.length !== 3) throw new Error("Complete sets above degree two need another checker.");
  const [c, b, a] = coefficients;
  const discriminant = add(multiply(b, b), negate(multiply(rational(4n), multiply(a, c))));
  if (discriminant.n < 0n) return [];
  const n = sqrtInteger(discriminant.n), d = sqrtInteger(discriminant.d);
  if (n === null || d === null) throw new Error("Irrational roots need an exact radical checker.");
  const delta = rational(n, d), denominator = multiply(rational(2n), a);
  const values = [divide(add(negate(b), delta), denominator), divide(add(negate(b), negate(delta)), denominator)];
  return [...new Map(values.map(value => [key(value), value])).values()];
}
type Fraction = { numerator: Polynomial; denominator: Polynomial; exclusions: Polynomial[] };
function fraction(node: Expression): Fraction {
  if (node.kind === "number" || node.kind === "variable") return { numerator: polynomial(node), denominator: [one], exclusions: [] };
  if (node.kind === "negate") { const value = fraction(node.child); return { ...value, numerator: value.numerator.map(negate) }; }
  const a = fraction(node.left), b = fraction(node.right);
  const exclusions = [...a.exclusions, ...b.exclusions];
  if (node.op === "+" || node.op === "-") return {
    numerator: sum(product(a.numerator, b.denominator), product(b.numerator, a.denominator).map(value => node.op === "-" ? negate(value) : value)),
    denominator: product(a.denominator, b.denominator), exclusions,
  };
  if (node.op === "*") return { numerator: product(a.numerator, b.numerator), denominator: product(a.denominator, b.denominator), exclusions };
  if (node.op === "/") return { numerator: product(a.numerator, b.denominator), denominator: product(a.denominator, b.numerator), exclusions: [...exclusions, b.numerator] };
  const exponent = polynomial(node.right);
  if (exponent.length !== 1 || exponent[0].d !== 1n || exponent[0].n < 0n || exponent[0].n > 8n) throw new Error("Use bounded nonnegative powers.");
  // Keep holes from the original expression, even when a factor cancels or power is zero.
  if (exponent[0].n === 0n) {
    if (a.numerator.every(value => value.n === 0n)) throw new Error("Zero to zero needs clarification.");
    exclusions.push(a.numerator);
  }
  let numerator = [one], denominator = [one];
  for (let i = 0n; i < exponent[0].n; i++) { numerator = product(numerator, a.numerator); denominator = product(denominator, a.denominator); }
  return { numerator, denominator, exclusions };
}
function domain(value: Fraction): string[] {
  const excluded = [...value.exclusions, value.denominator].flatMap(item => {
    const result = roots(item);
    if (result === "all") throw new Error("The expression is undefined everywhere.");
    return result.map(key);
  });
  return [...new Set(excluded)].sort();
}
function checked(input: string, supports: boolean, claim: string, observations: string[] = []): AssessmentResult {
  return { status: "supported", outcome: supports ? "supported" : "revise", checkedInput: input, verifierVersion: ADVANCED_VERIFIER_VERSION,
    claim: supports ? claim : "The exact check does not support this response.", observations,
    limitations: ["This verifies the stated result only; it does not establish understanding."], eligibleForKnowledge: false };
}
export function checkAdvancedMath(specification: AdvancedSpecification, input: string): AssessmentResult {
  try {
    if (input.length > 4000) throw new Error("Response exceeds the check limit.");
    if (specification.kind === "solution_set") {
      if (specification.equation.length > 2000) throw new Error("Equation exceeds the check limit.");
      const sides = specification.equation.split("=");
      if (sides.length !== 2) throw new Error("Use a single equation.");
      const expected = roots(sum(polynomial(parseExpression(sides[0], specification.variable)), polynomial(parseExpression(sides[1], specification.variable)).map(negate)));
      if (expected === "all") return checked(input, /^all real(?: numbers)?$/i.test(input.trim()), "Every real number satisfies this polynomial equation.");
      const cleaned = input.trim().replace(/^\{(.*)\}$/s, "$1").trim();
      const actual = /^(?:none|no real solutions|empty|∅)?$/i.test(cleaned) ? [] : cleaned.split(",").map(value => numeric(value.trim()));
      if (actual.length > 8 || new Set(actual.map(key)).size !== actual.length) throw new Error("List each solution once.");
      return checked(input, expected.map(key).sort().join(",") === actual.map(key).sort().join(","), "The complete real solution set is supported.");
    }
    if (specification.kind === "rational_expression") {
      const reference = fraction(parseExpression(specification.reference, specification.variable));
      const candidate = fraction(parseExpression(input, specification.variable));
      const referenceDomain = domain(reference), candidateDomain = domain(candidate);
      const identity = sum(product(reference.numerator, candidate.denominator), product(candidate.numerator, reference.denominator).map(negate)).every(value => value.n === 0n);
      const sameDomain = referenceDomain.join(",") === candidateDomain.join(",");
      return checked(input, identity && sameDomain, "The rational expressions agree and have the same real domain.",
        !sameDomain ? ["The expressions exclude different values. Keep the original domain restrictions."] : []);
    }
    if (specification.kind === "linear_system") {
      const [a, b] = specification.equations.map(row => ({ x: numeric(row.x), y: numeric(row.y), constant: numeric(row.constant) }));
      const determinant = add(multiply(a.x, b.y), negate(multiply(b.x, a.y)));
      if (equal(determinant, zero)) throw new Error("This system has no unique solution; a set-based system checker is needed.");
      const parsed = /^\s*x\s*=\s*([^,;]+)[,;]\s*y\s*=\s*([^,;]+)\s*$/i.exec(input);
      if (!parsed) throw new Error("Use x = value, y = value.");
      const x = numeric(parsed[1]), y = numeric(parsed[2]);
      return checked(input, [a, b].every(row => equal(add(multiply(row.x, x), multiply(row.y, y)), row.constant)), "This ordered pair is the unique solution of both linear equations.");
    }
    const [a, b] = specification.givens.map(numeric);
    if (a.n <= 0n || b.n <= 0n) throw new Error("Geometry dimensions must be positive.");
    const area = specification.shape === "rectangle_area" || specification.shape === "triangle_area";
    if ((specification.shape === "triangle_angle") !== (specification.unit === "degrees")) throw new Error("Use matching measurement units.");
    const unit = specification.unit + (area ? "^2" : "");
    if (!input.trim().endsWith(unit)) throw new Error("Include the units: " + unit + ".");
    const value = numeric(input.trim().slice(0, -unit.length).trim());
    let supports = false;
    if (specification.shape === "triangle_angle") {
      const expected = add(rational(180n), negate(add(a, b)));
      if (expected.n <= 0n) throw new Error("These angles do not form a triangle.");
      supports = equal(expected, value);
    } else if (specification.shape === "right_triangle_hypotenuse") supports = value.n > 0n && equal(multiply(value, value), add(multiply(a, a), multiply(b, b)));
    else supports = equal(multiply(multiply(a, b), specification.shape === "triangle_area" ? rational(1n, 2n) : one), value);
    return checked(input, supports, "The measurement and units follow from the stated givens.", ["Diagram appearance is not used to infer measurements."]);
  } catch (error) {
    return { status: "unsupported", outcome: "unknown", checkedInput: input.slice(0, 4000), verifierVersion: ADVANCED_VERIFIER_VERSION,
      claim: "This response needs another check.", observations: [], limitations: [error instanceof Error ? error.message : "Unsupported specification."], eligibleForKnowledge: false };
  }
}
