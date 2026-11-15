import { add, multiply, rational, polynomial, parseExpression, type Rational, type AssessmentResult } from "@/supabase/functions/_shared/learning/algebra";
import type { ChapterSpecification } from "./problem-specification";

export const CHAPTER_VERIFIER_VERSION = "bounded-chapter-exact-v1";
const same = (a: Rational, b: Rational) => a.n === b.n && a.d === b.d;
const one = rational(1n);
export function exactNumber(text: string): Rational {
  const p = polynomial(parseExpression(text));
  if (p.length !== 1) throw new Error("Use an exact rational number.");
  return p[0];
}
export function rationalText(value: Rational): string { return value.d === 1n ? String(value.n) : value.n + "/" + value.d; }
function power(base: Rational, exponent: number): Rational {
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 12) throw new Error("Only bounded integer powers are supported.");
  if (base.n === 0n && exponent <= 0) throw new Error("A zero base needs a positive exponent.");
  let result = one;
  for (let i = 0; i < Math.abs(exponent); i++) result = multiply(result, base);
  return exponent < 0 ? rational(result.d, result.n) : result;
}
const TRIG: Readonly<Record<string, string>> = {
  "sin:0": "0", "sin:30": "1/2", "sin:90": "1", "sin:150": "1/2", "sin:180": "0", "sin:210": "-1/2", "sin:270": "-1", "sin:330": "-1/2", "sin:360": "0",
  "cos:0": "1", "cos:60": "1/2", "cos:90": "0", "cos:120": "-1/2", "cos:180": "-1", "cos:240": "-1/2", "cos:270": "0", "cos:300": "1/2", "cos:360": "1",
  "tan:0": "0", "tan:45": "1", "tan:90": "undefined", "tan:135": "-1", "tan:180": "0", "tan:225": "1", "tan:270": "undefined", "tan:315": "-1", "tan:360": "0",
};
export function exactSquareRoot(value: Rational): Rational {
  function root(n: bigint) {
    if (n < 0n) throw new Error("Semiaxis lengths must be real.");
    if (n < 2n) return n;
    let x = n, y = (x + 1n) / 2n;
    while (y < x) { x = y; y = (x + n / x) / 2n; }
    if (x * x !== n) throw new Error("This semiaxis requires an unsupported radical.");
    return x;
  }
  return rational(root(value.n), root(value.d));
}
type Expected = { kind: "number"; value: Rational } | { kind: "pair"; value: [Rational, Rational] } | { kind: "pi"; value: Rational } | { kind: "all_real" } | { kind: "undefined" };
/** Computes expected values internally. The tutor never returns these as an answer key. */
function expected(spec: ChapterSpecification): Expected {
  if (spec.kind === "function_value") {
    const coefficients = polynomial(parseExpression(spec.expression, spec.variable)), x = exactNumber(spec.input);
    let value = rational(0n);
    for (let i = coefficients.length - 1; i >= 0; i--) value = add(multiply(value, x), coefficients[i]);
    return { kind: "number", value };
  }
  if (spec.kind === "polynomial_domain") { polynomial(parseExpression(spec.expression, spec.variable)); return { kind: "all_real" }; }
  if (spec.kind === "integer_power") return { kind: "number", value: power(exactNumber(spec.base), spec.exponent) };
  if (spec.kind === "integer_log") {
    const base = exactNumber(spec.base), argument = exactNumber(spec.argument);
    if (base.n <= 0n || same(base, one) || argument.n <= 0n) throw new Error("Real logarithms require a positive base other than one and a positive argument.");
    for (let exponent = -12; exponent <= 12; exponent++) if (same(power(base, exponent), argument)) return { kind: "number", value: rational(BigInt(exponent)) };
    throw new Error("This logarithm has no supported integer result between -12 and 12.");
  }
  if (spec.kind === "special_angle") {
    const value = TRIG[spec.fn + ":" + spec.degrees];
    if (value === undefined) throw new Error("This angle is outside the declared rational-value special-angle table.");
    return value === "undefined" ? { kind: "undefined" } : { kind: "number", value: exactNumber(value) };
  }
  if (spec.kind === "sinusoid_measure") {
    const a = exactNumber(spec.coefficient), b = exactNumber(spec.frequency);
    if (a.n === 0n || b.n === 0n) throw new Error("A constant function has no unique fundamental period.");
    return spec.measure === "amplitude" ? { kind: "number", value: rational(a.n < 0n ? -a.n : a.n, a.d) }
      : { kind: "pi", value: rational(2n * b.d, b.n < 0n ? -b.n : b.n) };
  }
  if (spec.kind === "named_identity") return { kind: "number", value: one };
  if (spec.kind === "vector_dot") return { kind: "number", value: add(multiply(exactNumber(spec.left[0]), exactNumber(spec.right[0])), multiply(exactNumber(spec.left[1]), exactNumber(spec.right[1]))) };
  const x = exactNumber(spec.denominatorX), y = exactNumber(spec.denominatorY);
  if (x.n <= 0n || y.n <= 0n) throw new Error("Canonical conic denominators must be positive.");
  return { kind: "pair", value: spec.measure === "center" ? [exactNumber(spec.center[0]), exactNumber(spec.center[1])] : [exactSquareRoot(x), exactSquareRoot(y)] };
}
export function chapterCapability(spec: ChapterSpecification): { supported: boolean; reason: string | null } {
  try { expected(spec); return { supported: true, reason: null }; } catch (error) { return { supported: false, reason: error instanceof Error ? error.message : "Unsupported mathematical specification." }; }
}
export function checkChapterMath(spec: ChapterSpecification, input: string): AssessmentResult {
  const base = { checkedInput: input.slice(0, 4000), verifierVersion: CHAPTER_VERIFIER_VERSION, eligibleForKnowledge: false,
    limitations: ["This checks the stated exact result, not understanding, strategy, or a general proof."] };
  try {
    if (!input.trim() || input.length > 4000) throw new Error("Enter a bounded response.");
    const target = expected(spec);
    let supported = false;
    if (target.kind === "all_real") supported = /^(?:all real(?: numbers)?|real numbers|R|ℝ|\(-(?:infinity|∞),\s*(?:infinity|∞)\))$/i.test(input.trim());
    else if (target.kind === "undefined") supported = /^undefined$/i.test(input.trim());
    else if (target.kind === "pair") {
      const values = input.trim().replace(/^\((.*)\)$/s, "$1").split(",");
      if (values.length !== 2) throw new Error("Enter two exact values in x, y order.");
      supported = values.every((value, i) => same(exactNumber(value.trim()), target.value[i]));
    } else if (target.kind === "pi") {
      if (!/(?:pi|π)/i.test(input)) throw new Error("Use an exact multiple of pi for the period.");
      const p = polynomial(parseExpression(input.replace(/pi|π/gi, "x")));
      supported = p.length === 2 && p[0].n === 0n && same(p[1], target.value);
    } else supported = same(exactNumber(input), target.value);
    return { ...base, status: "supported", outcome: supported ? "supported" : "revise",
      claim: supported ? "The exact calculation supports this result." : "The exact calculation does not support this response.",
      observations: [supported ? "This value matches the calculation in the question." : "Recheck the operation or representation named in the question."] };
  } catch (error) {
    return { ...base, status: "unsupported", outcome: "unknown", claim: "This response needs another check.", observations: [],
      limitations: [...base.limitations, error instanceof Error ? error.message : "Unsupported response."] };
  }
}
