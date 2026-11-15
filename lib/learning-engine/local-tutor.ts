import { z } from "zod";
import { add, multiply, negate, sum, polynomial, parseExpression, checkEquationValue, checkEquivalentExpressions, type AssessmentResult, type Polynomial } from "@/supabase/functions/_shared/learning/algebra";
import { checkAdvancedMath } from "@/supabase/functions/_shared/learning/advanced-math";
import { assessReading } from "@/supabase/functions/_shared/learning/reading";
import { checkChapterMath, chapterCapability, exactNumber, exactSquareRoot, rationalText } from "./chapter-verifier";
import { problemSpecificationSchema, isChapterSpecification, type ProblemSpecification } from "./problem-specification";

export const LOCAL_TUTOR_VERSION = "trusted-specification-tutor-v1";
const versionId = z.string().regex(/^[a-f0-9]{64}$/);
const identity = z.string().min(1).max(200);
export const localTutorInputSchema = z.object({
  exercise: z.object({ id: identity, versionId, skillId: identity, prompt: z.string().min(1).max(12000),
    specification: problemSpecificationSchema, reviewed: z.boolean(), sourceConfirmed: z.boolean() }).strict(),
  attempt: z.object({ problemId: identity, versionId, response: z.string().max(4000), confirmed: z.boolean(),
    assistance: z.enum(["independent", "hinted", "example_assisted", "unverified"]), priorHelpCount: z.number().int().min(0).max(100),
    previousStep: z.string().min(1).max(2000).optional() }).strict(),
  mode: z.enum(["auto", "hint", "check", "related_example", "independent_try"]),
  sourcePages: z.array(z.object({ page: z.number().int().min(1).max(1500), text: z.string().max(20000),
    interpretation: z.enum(["original", "confirmed", "model_extraction"]) }).strict()).max(12).optional(),
}).strict();
export type LocalTutorInput = z.infer<typeof localTutorInputSchema>;
export type LocalTutorReason = "invalid_input" | "problem_mismatch" | "unconfirmed_problem" | "unconfirmed_source" | "unsupported_specification"
  | "unsupported_reading_skill" | "response_required" | "unsupported_response" | "provisional_reference" | "verified_result"
  | "revise_response" | "reading_interpretation_unverified" | "practice_guidance";
export type LocalTutorResult = {
  version: typeof LOCAL_TUTOR_VERSION; status: "help" | "needs_confirmation" | "unsupported" | "needs_review";
  reason: LocalTutorReason; action: "clarify" | "hint" | "check" | "related_example" | "independent_try";
  title: string; guidance: string; nextQuestion: string; steps: string[]; assessment: AssessmentResult | null;
  misconception: { code: "one_sided_equation_change" | "incomplete_solution_set" | "domain_restriction_changed"; evidence: string; qualification: "operational_observation" } | null;
  evidence: { exerciseId: string; versionId: string; specificationKind: string; reviewed: boolean; source: "stored_exercise_specification" } | null;
  provider: { called: false; required: false }; eligibleForKnowledge: false; interpretationVerified: false;
  assistance: "hinted" | "example_assisted" | "unchanged"; checkedLimits: typeof CHECKED_LIMITS; limitations: string[];
  escalation: "confirm_source" | "educator_review" | "unsupported_content" | null;
};
const CHECKED_LIMITS = { responseCharacters: 4000, polynomialDegree: 8, completeRootSetDegree: 2, integerPowerMagnitude: 12,
  sourcePages: 12, sourceCharactersPerPage: 20000, generalProofChecking: false } as const;
const READING_QUESTIONS: Readonly<Record<string, string>> = {
  "reading.central_idea": "What idea connects the details, and which exact sentence supports it?",
  "reading.evidence": "Which exact words support your claim, and how do they connect?",
  "reading.inference": "Which source detail and which reasoning step support your inference?",
  "reading.vocabulary": "What nearby clue suggests the word's meaning in this sentence?",
  "reading.argument": "Which claim, reason, and evidence can you identify in the excerpt?",
  "reading.comparison": "What similarity or difference links two ideas, and what detail supports each?",
};
const result = (): LocalTutorResult => ({ version: LOCAL_TUTOR_VERSION, status: "help", reason: "practice_guidance", action: "hint",
  title: "Take one step", guidance: "", nextQuestion: "", steps: [], assessment: null, misconception: null, evidence: null,
  provider: { called: false, required: false }, eligibleForKnowledge: false, interpretationVerified: false, assistance: "unchanged",
  checkedLimits: CHECKED_LIMITS, limitations: [], escalation: null });
function mathCheck(spec: ProblemSpecification, response: string): AssessmentResult | null {
  if (isChapterSpecification(spec)) return checkChapterMath(spec, response);
  if (spec.kind === "equation_value") return checkEquationValue(spec.equation, response, spec.variable);
  if (spec.kind === "equivalent_expression") return checkEquivalentExpressions(spec.reference, response, spec.variable);
  if (spec.kind === "reading") return null;
  return checkAdvancedMath(spec, response);
}
function capability(spec: ProblemSpecification): string | null {
  if (isChapterSpecification(spec)) return chapterCapability(spec).reason;
  if (spec.kind === "reading") return null;
  if (spec.kind === "geometry_measure" && spec.shape === "right_triangle_hypotenuse") {
    try { const [a, b] = spec.givens.map(exactNumber); exactSquareRoot(add(multiply(a, a), multiply(b, b))); }
    catch { return "This hypotenuse needs an exact radical representation that this controller does not support."; }
  }
  const probe = spec.kind === "rational_expression" || spec.kind === "equivalent_expression" ? spec.reference
    : spec.kind === "linear_system" ? "x=0,y=0" : spec.kind === "geometry_measure" ? "0 " + spec.unit + (/area$/.test(spec.shape) ? "^2" : "")
    : spec.kind === "solution_set" ? "none" : "0";
  const checked = mathCheck(spec, probe);
  return checked?.status === "unsupported" ? checked.limitations.join(" ") : null;
}
function equationParts(text: string, variable: string): [Polynomial, Polynomial] {
  const parts = text.split("=");
  if (parts.length !== 2) throw new Error("An equation is required.");
  return [polynomial(parseExpression(parts[0], variable)), polynomial(parseExpression(parts[1], variable))];
}
const difference = (a: Polynomial, b: Polynomial) => sum(a, b.map(negate));
const samePolynomial = (a: Polynomial, b: Polynomial) => difference(a, b).every(value => value.n === 0n);
function sameLinearSolutions(a: Polynomial, b: Polynomial) {
  return a.length === 2 && b.length === 2 && multiply(a[0], b[1]).n * multiply(b[0], a[1]).d === multiply(b[0], a[1]).n * multiply(a[0], b[1]).d;
}
function observedMisconception(spec: ProblemSpecification, attempt: LocalTutorInput["attempt"], assessment: AssessmentResult | null): LocalTutorResult["misconception"] {
  if (spec.kind === "rational_expression" && assessment?.observations.some(item => item.includes("exclude different values"))) {
    return { code: "domain_restriction_changed", evidence: "The exact expressions have different excluded real values.", qualification: "operational_observation" };
  }
  if (spec.kind === "solution_set" && assessment?.outcome === "revise") {
    const values = attempt.response.trim().replace(/^\{(.*)\}$/s, "$1").split(",").map(value => value.trim()).filter(Boolean);
    if (values.length && values.every(value => checkEquationValue(spec.equation, value, spec.variable).outcome === "supported")) {
      return { code: "incomplete_solution_set", evidence: "The listed values satisfy the equation, but the exact complete-set check requires additional values.", qualification: "operational_observation" };
    }
  }
  if (spec.kind === "equation_value" && attempt.previousStep && attempt.response.includes("=")) {
    try {
      const original = equationParts(spec.equation, spec.variable), before = equationParts(attempt.previousStep, spec.variable), after = equationParts(attempt.response, spec.variable);
      const originalDifference = difference(...original), beforeDifference = difference(...before), afterDifference = difference(...after);
      const oneSideChanged = samePolynomial(before[0], after[0]) !== samePolynomial(before[1], after[1]);
      if (sameLinearSolutions(originalDifference, beforeDifference) && oneSideChanged && !sameLinearSolutions(beforeDifference, afterDifference)) {
        return { code: "one_sided_equation_change", evidence: "The recorded step changed one side and changed the solution of the confirmed linear equation.", qualification: "operational_observation" };
      }
    } catch { /* Unreadable steps cannot support a misconception claim. */ }
  }
  return null;
}
function hint(spec: ProblemSpecification, skillId: string, detailed: boolean): { guidance: string; nextQuestion: string; steps: string[] } {
  let guidance = "Use the confirmed specification to choose one operation.", nextQuestion = "What would you try next?";
  if (spec.kind === "reading") { guidance = detailed ? "Separate what the excerpt states from your own explanation. Keep your claim in your own words." : "Read the selected excerpt once and choose a detail relevant to the question."; nextQuestion = READING_QUESTIONS[skillId]; }
  if (spec.kind === "equation_value") {
    guidance = "Keep the two sides equal by applying the same operation to each side.";
    try {
      const [left, right] = equationParts(spec.equation, spec.variable);
      if (left.length === 2 && right.length === 1 && left[0].n !== 0n) {
        guidance = `The constant term beside ${spec.variable} is ${rationalText(left[0])}. ${detailed ? "Subtract that constant from both sides before dealing with the coefficient." : "Choose an operation that removes that term from both sides."}`;
      } else if (detailed) guidance = "Collect the variable terms on one side, keeping each operation balanced, then isolate the variable.";
    } catch { /* Capability validation already provides the boundary. */ }
    nextQuestion = "What equation remains after your next balanced operation?";
  }
  if (spec.kind === "equivalent_expression") { guidance = detailed ? "Distribute each term, including its sign, and group terms with equal powers. Compare their coefficients." : "Look for a product or like terms you can rewrite without changing the expression."; nextQuestion = "Which terms can you combine, and why?"; }
  if (spec.kind === "rational_expression") { guidance = detailed ? "Record every value that makes an original denominator zero before cancelling any factor. Keep those exclusions." : "Factor the numerator and denominator, then inspect the original denominator."; nextQuestion = "Which values must remain excluded from the original expression?"; }
  if (spec.kind === "solution_set") { guidance = detailed ? "Move all terms to one side. For a factorable quadratic, set each factor equal to zero and check every candidate in the original equation." : "This asks for every real solution, so one working value may not be enough."; nextQuestion = "How will you show your list includes all solutions?"; }
  if (spec.kind === "linear_system") { guidance = detailed ? "Choose a variable to eliminate or isolate. Substitute the candidate pair into both original equations." : "Find a way to remove one variable while preserving both equations."; nextQuestion = "Would substitution or elimination be simpler for these coefficients?"; }
  if (spec.kind === "geometry_measure") {
    const rule = { rectangle_area: "Multiply the given length by the given width.", triangle_area: "Multiply the base by the perpendicular height, then halve that product.", triangle_angle: "Subtract the two given angle measures from 180 degrees.", right_triangle_hypotenuse: "Square each leg, add the squares, then find the positive square root." }[spec.shape];
    guidance = detailed ? rule : "Use the stated measurements, not the appearance of a diagram.";
    nextQuestion = `How does the ${spec.shape.replaceAll("_", " ")} rule use ${spec.givens[0]} and ${spec.givens[1]}? Include ${spec.unit}${/area$/.test(spec.shape) ? "^2" : ""}.`;
  }
  if (spec.kind === "function_value") { guidance = `Replace every ${spec.variable} in ${spec.expression} with (${spec.input}). ${detailed ? "Evaluate powers before products, then add the terms." : "Keep parentheses around the input."}`; nextQuestion = "What expression do you get before simplifying?"; }
  if (spec.kind === "polynomial_domain") { guidance = detailed ? "Check whether the expression has a variable denominator, an even root, or another operation that could restrict a real input." : "A domain lists the allowed inputs. Inspect the operations in this polynomial."; nextQuestion = "Is any real input excluded by an operation in this expression?"; }
  if (spec.kind === "integer_power") { guidance = `Use ${spec.base} as a repeated factor for the magnitude of exponent ${spec.exponent}. ${spec.exponent < 0 ? "A negative exponent takes the reciprocal of the positive power." : spec.exponent === 0 ? "Compare neighboring powers using division by the nonzero base." : "Keep a negative or fractional base in parentheses."}`; nextQuestion = "What product or reciprocal should you evaluate?"; }
  if (spec.kind === "integer_log") { guidance = `Rewrite the logarithm as ${spec.base} raised to an unknown power equals ${spec.argument}.`; nextQuestion = detailed ? "Which integer power of the base gives the argument? You may need a negative exponent." : "What exponential equation represents this logarithm?"; }
  if (spec.kind === "special_angle") { guidance = detailed ? "On the unit circle, cosine is the horizontal coordinate, sine is the vertical coordinate, and tangent is their ratio. Check the quadrant sign and whether the denominator is zero." : `Locate ${spec.degrees} degrees on the unit circle and identify the ${spec.fn} coordinate or ratio.`; nextQuestion = "Which coordinate or ratio do you need, and what sign should it have?"; }
  if (spec.kind === "sinusoid_measure") { guidance = spec.measure === "amplitude" ? "Amplitude is the distance from the midline to a peak. Inspect the magnitude of the outer coefficient." : "A sine or cosine cycle advances its argument by 2*pi. Divide that argument change by the magnitude of the x coefficient."; nextQuestion = spec.measure === "amplitude" ? "Which coefficient changes the vertical distance, and can that distance be negative?" : "What positive x change completes one cycle? Keep pi exact."; }
  if (spec.kind === "named_identity") { guidance = "Relate sine and cosine to the coordinates of a point on a unit circle. Use the circle's equation to combine their squares."; nextQuestion = "What does the squared radius tell you about the sum?"; }
  if (spec.kind === "vector_dot") { guidance = detailed ? `Multiply ${spec.left[0]} by ${spec.right[0]} and ${spec.left[1]} by ${spec.right[1]}, then add the products.` : "Match the first components and the second components. The dot product is a scalar."; nextQuestion = "What two products contribute to the scalar?"; }
  if (spec.kind === "conic_measure") { guidance = spec.measure === "center" ? "Compare each squared factor with (x-h)^2 and (y-k)^2. Pay attention to the sign inside each factor." : "The denominators are squared lengths. Take their positive square roots and keep x-direction then y-direction order."; nextQuestion = spec.measure === "center" ? "What values of x and y make the squared factors zero?" : "Which positive lengths square to the two denominators?"; }
  return { guidance, nextQuestion, steps: [] };
}

function relatedExample(spec: ProblemSpecification): { guidance: string; steps: string[] } {
  // These are explicitly authored examples, never attributed to the student's textbook or an educator.
  if (spec.kind === "reading") return { guidance: "Authored example: A class checks soil moisture, then waters only the dry beds.", steps: ["A possible inference is that the class uses observations to decide where water is needed.", "The action about checking soil moisture supports that explanation. Return to your excerpt and make your own claim."] };
  if (spec.kind === "polynomial_domain") return { guidance: "Authored contrast: g(x)=1/(x-5).", steps: ["A denominator cannot be zero, so this different expression excludes x=5.", "Return to the original polynomial and inspect whether it contains an operation with a similar restriction."] };
  if (spec.kind === "named_identity") return { guidance: "Authored related example: a right triangle has legs 3 and 4.", steps: ["The squares of the legs are 9 and 16.", "Their sum is 25, so the hypotenuse length is 5. Relate this square-sum rule to the unit circle in your question."] };
  for (let k = 2; k <= 12; k++) {
    let guidance = "", steps: string[] = [], answer = "";
    if (spec.kind === "equation_value") { guidance = `Authored example: 2x+3=${2 * k + 3}.`; steps = [`Subtract 3 from both sides: 2x=${2 * k}.`, `Divide both sides by 2: x=${k}.`]; answer = String(k); }
    if (spec.kind === "equivalent_expression") { guidance = `Authored example: expand (x+${k})(x+1).`; answer = `x^2+${k + 1}x+${k}`; steps = [`Distribute to obtain x^2+x+${k}x+${k}.`, `Combine like terms: ${answer}.`]; }
    if (spec.kind === "rational_expression") {
      const reference = `(x^2-${k * k})/(x-${k})`;
      if (mathCheck(spec, reference)?.outcome === "supported") continue;
      guidance = `Authored example: ${reference}.`; answer = `x+${k}`; steps = [`Factor the numerator as (x-${k})(x+${k}); the original denominator excludes x=${k}.`, `Cancel the shared factor to obtain x+${k}, while preserving x≠${k}.`];
    }
    if (spec.kind === "solution_set") { guidance = `Authored example: (x-${k})(x+1)=0.`; answer = `${k},-1`; steps = [`Set the first factor to zero to obtain x=${k}.`, "Set the second factor to zero to obtain x=-1. Check both in the original example."]; }
    if (spec.kind === "linear_system") { guidance = `Authored example: x+y=${k + 1}, x-y=${k - 1}.`; answer = `x=${k},y=1`; steps = [`Add the equations: 2x=${2 * k}, so x=${k}.`, "Substitute to find y=1, then check both equations."]; }
    if (spec.kind === "geometry_measure") {
      if (spec.shape === "triangle_angle") { answer = `${180 - 10 * k - 20} degrees`; guidance = `Authored example: triangle angles ${10 * k} degrees and 20 degrees.`; steps = [`Subtract the given angles from 180 degrees: ${answer}.`]; }
      else if (spec.shape === "right_triangle_hypotenuse") { answer = `${5 * k} ${spec.unit}`; guidance = `Authored example: perpendicular legs ${3 * k} and ${4 * k} ${spec.unit}.`; steps = [`The sum of squared legs is ${25 * k * k}.`, `The positive square root is ${answer}.`]; }
      else { answer = `${spec.shape === "triangle_area" ? k : 2 * k} ${spec.unit}^2`; guidance = `Authored example: ${spec.shape === "triangle_area" ? "triangle with base" : "rectangle with length"} ${k} and ${spec.shape === "triangle_area" ? "perpendicular height" : "width"} 2 ${spec.unit}.`; steps = [`${spec.shape === "triangle_area" ? "Halve" : "Use"} the product ${k}*2 to obtain ${answer}.`]; }
    }
    if (spec.kind === "function_value") { guidance = `Authored example: g(x)=2x+1, find g(${k}).`; answer = String(2 * k + 1); steps = [`Substitute: 2(${k})+1.`, `Multiply then add: ${answer}.`]; }
    if (spec.kind === "integer_power") { guidance = `Authored example: ${k}^2.`; answer = String(k * k); steps = [`Multiply ${k} by itself: ${answer}.`]; }
    if (spec.kind === "integer_log") { guidance = `Authored example: log base 2 of ${2 ** k}.`; answer = String(k); steps = [`The exponential equation is 2^t=${2 ** k}.`, `Multiplying ${k} factors of 2 gives that argument, so t=${k}.`]; }
    if (spec.kind === "special_angle") { guidance = "Authored related example: a right triangle has opposite side 3, adjacent side 4, and hypotenuse 5."; answer = "3/5"; steps = ["Sine is opposite divided by hypotenuse, giving 3/5.", "For your special angle, use the corresponding exact unit-circle coordinate and quadrant sign."]; }
    if (spec.kind === "sinusoid_measure") { guidance = `Authored example: y=${k} sin(2x), x in radians.`; answer = spec.measure === "amplitude" ? String(k) : `${k}*pi`; steps = spec.measure === "amplitude" ? [`The distance from the midline to a peak is |${k}|=${k}.`] : [`For a different example y=sin(2x/${k}), its argument advances by 2*pi when x advances by ${k}*pi.`, `Its period is ${k}*pi.`]; if (spec.measure === "period") guidance = `Authored example: y=sin(2x/${k}), x in radians.`; }
    if (spec.kind === "vector_dot") { guidance = `Authored example: (${k},1) dot (2,3).`; answer = String(2 * k + 3); steps = [`Multiply matching components: ${k}*2 and 1*3.`, `Add the products: ${answer}.`]; }
    if (spec.kind === "conic_measure") { guidance = `Authored example: (x-${k})^2/${k * k}+(y+1)^2/4=1.`; answer = spec.measure === "center" ? `${k},-1` : `${k},2`; steps = spec.measure === "center" ? [`The factors vanish at x=${k} and y=-1, giving center (${answer}).`] : [`Positive square roots of the denominators give x/y semiaxis lengths (${answer}).`]; }
    // Avoid working an example that directly supplies the answer to the student's current task.
    if (guidance && mathCheck(spec, answer)?.outcome !== "supported") return { guidance, steps };
  }
  return { guidance: "A distinct worked example is unavailable within this routine.", steps: ["Return to the source example or ask an educator to choose a suitable comparison."] };
}

/** Pure controller: no network, credentials, persistence, or model calls. Server owns all trusted state. */
export async function runLocalTutor(raw: unknown): Promise<LocalTutorResult> {
  const output = result(), parsed = localTutorInputSchema.safeParse(raw);
  if (!parsed.success) return { ...output, status: "unsupported", reason: "invalid_input", action: "clarify", title: "Check the problem details", guidance: "The stored exercise or current attempt does not match the supported input contract.", escalation: "unsupported_content" };
  const { exercise, attempt, mode, sourcePages } = parsed.data, spec = exercise.specification;
  output.evidence = { exerciseId: exercise.id, versionId: exercise.versionId, specificationKind: spec.kind, reviewed: exercise.reviewed, source: "stored_exercise_specification" };
  if (attempt.problemId !== exercise.id || attempt.versionId !== exercise.versionId) return { ...output, status: "needs_confirmation", reason: "problem_mismatch", action: "clarify", title: "Open the current problem", guidance: "The attempt belongs to a different problem or source version.", escalation: "confirm_source" };
  if (!exercise.sourceConfirmed || !attempt.confirmed) return { ...output, status: "needs_confirmation", reason: !exercise.sourceConfirmed ? "unconfirmed_source" : "unconfirmed_problem", action: "clarify", title: "Confirm the problem", guidance: "Confirm the source and captured symbols before using targeted help.", escalation: "confirm_source" };
  if ((spec.kind === "reading") !== exercise.skillId.startsWith("reading.")) return { ...output, status: "unsupported", reason: "unsupported_specification", action: "clarify", title: "Check the skill", guidance: "The skill and stored specification refer to different subjects.", escalation: "unsupported_content" };
  if (spec.kind === "reading" && !READING_QUESTIONS[exercise.skillId]) return { ...output, status: "unsupported", reason: "unsupported_reading_skill", action: "clarify", title: "Choose a supported reading task", guidance: "This reading skill has no declared local routine.", escalation: "unsupported_content" };
  const unavailable = capability(spec);
  if (unavailable) return { ...output, status: "unsupported", reason: "unsupported_specification", action: "clarify", title: "This needs another method", guidance: unavailable, escalation: "unsupported_content", limitations: [unavailable] };
  if (!exercise.reviewed) { output.status = "needs_review"; output.reason = "provisional_reference"; output.limitations.push("This reference is provisional and has not been approved by a human educator."); output.escalation = "educator_review"; }
  output.limitations.push("Local help and a matching answer do not establish independent understanding or mastery.");
  if (attempt.assistance !== "independent") output.limitations.push("This attempt includes support and is not independent learning evidence.");
  if (attempt.response.trim()) {
    if (spec.kind === "reading") {
      if (!sourcePages?.some(page => page.interpretation !== "model_extraction")) {
        if (mode === "check") return { ...output, status: "needs_confirmation", reason: "unconfirmed_source", action: "clarify", title: "Open the excerpt", guidance: "Exact quote checking needs the original or confirmed excerpt.", escalation: "confirm_source" };
      } else output.assessment = await assessReading({ skillId: exercise.skillId, response: attempt.response, pages: sourcePages });
    } else output.assessment = mathCheck(spec, attempt.response);
  }
  output.misconception = observedMisconception(spec, attempt, output.assessment);
  const action = mode === "auto" ? attempt.priorHelpCount >= 3 ? "independent_try" : attempt.priorHelpCount >= 2 ? "related_example" : "hint" : mode;
  output.action = action;
  if (action === "check") {
    if (!attempt.response.trim()) return { ...output, reason: "response_required", title: "Add your attempt", guidance: "Write your own response before requesting a check.", nextQuestion: "What would you like to check?" };
    output.title = "Check your attempt";
    output.guidance = output.assessment?.claim ?? "This interpretation remains unverified.";
    output.steps = output.assessment?.observations ?? [];
    output.limitations.push(...(output.assessment?.limitations ?? []));
    output.reason = spec.kind === "reading" ? "reading_interpretation_unverified" : output.assessment?.status === "unsupported" ? "unsupported_response" : output.assessment?.outcome === "supported" ? "verified_result" : "revise_response";
    output.nextQuestion = output.assessment?.outcome === "supported" ? "Can you explain your reasoning, then try a different question independently?" : hint(spec, exercise.skillId, true).nextQuestion;
  } else if (action === "related_example") {
    Object.assign(output, relatedExample(spec)); output.title = "Compare a different example"; output.assistance = "example_assisted";
    output.nextQuestion = "Which step from this example can you apply to your original question in your own words?";
  } else if (action === "independent_try") {
    output.title = "Try your next step"; output.guidance = "Return to the original question and write the next step yourself. You can request another hint if you need one.";
    output.nextQuestion = "What can you do without looking at the example?";
    output.limitations.push("A fresh try on a previously assisted problem is still assisted evidence.");
  } else {
    Object.assign(output, hint(spec, exercise.skillId, attempt.priorHelpCount > 0)); output.assistance = "hinted";
    if (output.misconception) output.steps.unshift(output.misconception.evidence);
  }
  return output;
}
