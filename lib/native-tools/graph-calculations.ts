import { add, multiply, negate, rational, type Rational } from "@/supabase/functions/_shared/learning/algebra";
import { exactPolynomialValue, graphPolynomialCoefficients } from "./graphing";

export type GraphCalculationValue = string | number;
export type GraphCalculationAttempt = { value: string; unit?: string };
export type GraphCalculationCheck = {
  status: "needs_attempt" | "matches" | "revise" | "unsupported";
  message: string;
  exactValue?: string;
  unit?: string;
};

export type PolynomialCalculation = { expression: string } & (
  | { operation: "tangent_slope"; x: GraphCalculationValue }
  | { operation: "signed_area"; from: GraphCalculationValue; to: GraphCalculationValue }
);

export const MOTION_DISTANCE_UNITS = ["m", "cm", "km", "ft"] as const;
export const MOTION_TIME_UNITS = ["s", "min", "h"] as const;
export type MotionGraphCalculation = {
  graph: "position_time" | "velocity_time";
  operation: "average_slope" | "signed_area";
  points: readonly { x: GraphCalculationValue; y: GraphCalculationValue }[];
  from: GraphCalculationValue;
  to: GraphCalculationValue;
  distanceUnit: (typeof MOTION_DISTANCE_UNITS)[number];
  timeUnit: (typeof MOTION_TIME_UNITS)[number];
};

type ExactPoint = { x: Rational; y: Rational };
const ZERO = rational(0n);
const HALF = rational(1n, 2n);
const MAX_COORDINATE = 1_000_000n;
const MAX_MOTION_POINTS = 200;

function decimal(text: string): Rational | null {
  const match = /^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:e([+-]?\d{1,2}))?$/iu.exec(text);
  if (!match) return null;
  const [, sign, digits, exponent = "0"] = match;
  const [whole, fraction = ""] = digits.split(".");
  const places = fraction.length - Number(exponent);
  const coefficient = BigInt(`${whole || "0"}${fraction}`) * (sign === "-" ? -1n : 1n);
  return places < 0 ? rational(coefficient * 10n ** BigInt(-places)) : rational(coefficient, 10n ** BigInt(places));
}

function divide(left: Rational, right: Rational): Rational {
  return rational(left.n * right.d, left.d * right.n);
}

function boundedValue(input: GraphCalculationValue): Rational | null {
  const text = String(input).trim().replaceAll("−", "-");
  if (!text || text.length > 48) return null;
  const [numerator, denominator, extra] = text.split(/\s*\/\s*/u);
  if (extra !== undefined) return null;
  const top = decimal(numerator);
  if (!top || denominator === undefined) return top;
  const bottom = decimal(denominator);
  return bottom?.n ? divide(top, bottom) : null;
}

function withinGraph(input: GraphCalculationValue): Rational | null {
  const value = boundedValue(input);
  if (!value || value.n > MAX_COORDINATE * value.d || value.n < -MAX_COORDINATE * value.d) return null;
  return value;
}

function difference(left: Rational, right: Rational): Rational { return add(left, negate(right)); }

function compare(left: Rational, right: Rational): number {
  const comparison = left.n * right.d - right.n * left.d;
  return comparison < 0n ? -1 : comparison > 0n ? 1 : 0;
}

function unavailable(message: string): GraphCalculationCheck { return { status: "unsupported", message }; }

function missingAttempt(): GraphCalculationCheck {
  return { status: "needs_attempt", message: "Enter your result before Diana checks it." };
}

function checkExact(expected: Rational, attempt: GraphCalculationAttempt, guidance: string, unit?: string): GraphCalculationCheck {
  let actual: Rational | null;
  try { actual = boundedValue(attempt.value); }
  catch { actual = null; }
  if (!actual) return { status: "revise", message: "Enter a number, fraction, or decimal for the result." };
  if (unit && attempt.unit?.trim().toLowerCase().replaceAll(/\s+/gu, "").replaceAll("²", "^2") !== unit.replaceAll("²", "^2")) {
    return { status: "revise", message: `Enter the result in ${unit}, using the graph's units.`, unit };
  }
  if (compare(expected, actual) !== 0) return { status: "revise", message: guidance, ...(unit ? { unit } : {}) };
  const exactValue = expected.d === 1n ? String(expected.n) : `${expected.n}/${expected.d}`;
  return {
    status: "matches",
    message: "The exact calculation matches your result.",
    exactValue,
    ...(unit ? { unit } : {}),
  };
}

export function checkPolynomialCalculation(input: PolynomialCalculation, attempt: GraphCalculationAttempt): GraphCalculationCheck {
  if (!attempt.value.trim()) return missingAttempt();
  try {
    const coefficients = graphPolynomialCoefficients(input.expression);
    if (!coefficients) return unavailable("This check needs a polynomial in x with rational coefficients.");
    if (input.operation === "tangent_slope") {
      const x = withinGraph(input.x);
      if (!x) return unavailable("Enter a finite x-value for the tangent slope.");
      const derivative = coefficients.slice(1).map((coefficient, index) => multiply(coefficient, rational(BigInt(index + 1))));
      const value = exactPolynomialValue(derivative, x);
      return value ? checkExact(value, attempt, "Apply the power rule to each term, then substitute the given x-value.")
        : unavailable("This slope is outside the calculation bounds.");
    }
    const from = withinGraph(input.from);
    const to = withinGraph(input.to);
    if (!from || !to || compare(from, to) >= 0) return unavailable("Enter a finite interval with the lower bound first.");
    const primitive = [ZERO, ...coefficients.map((coefficient, index) => divide(coefficient, rational(BigInt(index + 1))))];
    const lower = exactPolynomialValue(primitive, from);
    const upper = exactPolynomialValue(primitive, to);
    return lower && upper ? checkExact(difference(upper, lower), attempt, "Evaluate the antiderivative at both bounds, then subtract the lower value. Use a fraction for a repeating decimal.")
      : unavailable("This signed area is outside the calculation bounds.");
  } catch {
    return unavailable("These values are outside the exact calculation bounds.");
  }
}

function motionPoints(points: MotionGraphCalculation["points"]): ExactPoint[] | null {
  if (points.length < 2 || points.length > MAX_MOTION_POINTS) return null;
  const exact: ExactPoint[] = [];
  for (const point of points) {
    const x = withinGraph(point.x);
    const y = withinGraph(point.y);
    if (!x || !y) return null;
    exact.push({ x, y });
  }
  exact.sort((left, right) => compare(left.x, right.x));
  return exact.some((point, index) => index > 0 && compare(point.x, exact[index - 1].x) === 0) ? null : exact;
}

function linearReading(points: ExactPoint[], time: Rational): Rational {
  const upper = points.findIndex((point) => compare(point.x, time) >= 0);
  const right = points[upper];
  if (upper === 0 || compare(right.x, time) === 0) return right.y;
  const left = points[upper - 1];
  const fraction = divide(difference(time, left.x), difference(right.x, left.x));
  return add(left.y, multiply(fraction, difference(right.y, left.y)));
}

export function checkMotionGraphCalculation(input: MotionGraphCalculation, attempt: GraphCalculationAttempt): GraphCalculationCheck {
  if (!attempt.value.trim()) return missingAttempt();
  if (!MOTION_DISTANCE_UNITS.includes(input.distanceUnit) || !MOTION_TIME_UNITS.includes(input.timeUnit)) {
    return unavailable("Choose the distance and time units printed on the graph.");
  }
  if (input.operation === "signed_area" && input.graph !== "velocity_time") {
    return unavailable("Use a velocity–time graph to check signed displacement.");
  }
  try {
    const from = withinGraph(input.from);
    const to = withinGraph(input.to);
    const points = motionPoints(input.points);
    if (!points) return unavailable("Enter at least two finite measurements with distinct times.");
    if (!from || !to || compare(from, to) >= 0 || compare(from, points[0].x) < 0 || compare(to, points[points.length - 1].x) > 0) {
      return unavailable("Choose an increasing time interval inside the supplied measurements.");
    }
    const start = linearReading(points, from);
    const end = linearReading(points, to);
    if (input.operation === "average_slope") {
      const axis = input.graph === "position_time" ? "position" : "velocity";
      const slope = divide(difference(end, start), difference(to, from));
      const unit = `${input.distanceUnit}/${input.timeUnit}${input.graph === "velocity_time" ? "²" : ""}`;
      return checkExact(slope, attempt, `Subtract the starting ${axis} from the ending ${axis}, then divide by the elapsed time.`, unit);
    }
    const segmentPoints = [{ x: from, y: start }, ...points.filter((point) => compare(point.x, from) > 0 && compare(point.x, to) < 0), { x: to, y: end }];
    let area = ZERO;
    for (let index = 1; index < segmentPoints.length; index++) {
      const left = segmentPoints[index - 1];
      const right = segmentPoints[index];
      const trapezoid = multiply(multiply(add(left.y, right.y), HALF), difference(right.x, left.x));
      area = add(area, trapezoid);
    }
    return checkExact(area, attempt, "Add the signed areas of the straight segments. A segment below zero contributes negative displacement.", input.distanceUnit);
  } catch {
    return unavailable("These measurements are outside the exact calculation bounds.");
  }
}
