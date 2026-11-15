import { z } from "zod";

const numberText = z.string().trim().min(1).max(100);
const variable = z.string().regex(/^[a-z]$/i).default("x");
const pair = z.tuple([numberText, numberText]);
/** Specifications are constructed from owned stored exercises by the server, never trusted from a browser claim. */
export const problemSpecificationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("equation_value"), equation: z.string().min(1).max(2000), variable, solutionSetComplete: z.literal(false) }).strict(),
  z.object({ kind: z.literal("equivalent_expression"), reference: z.string().min(1).max(1000), variable }).strict(),
  z.object({ kind: z.literal("solution_set"), equation: z.string().min(1).max(2000), variable }).strict(),
  z.object({ kind: z.literal("rational_expression"), reference: z.string().min(1).max(1000), variable }).strict(),
  z.object({ kind: z.literal("linear_system"), equations: z.tuple([
    z.object({ x: numberText, y: numberText, constant: numberText }).strict(),
    z.object({ x: numberText, y: numberText, constant: numberText }).strict(),
  ]) }).strict(),
  z.object({ kind: z.literal("geometry_measure"), shape: z.enum(["rectangle_area", "triangle_area", "triangle_angle", "right_triangle_hypotenuse"]), givens: pair, unit: z.enum(["cm", "m", "degrees"]) }).strict(),
  z.object({ kind: z.literal("reading"), rubric: z.array(z.string().min(1).max(500)).min(1).max(10) }).strict(),
  z.object({ kind: z.literal("function_value"), expression: z.string().min(1).max(1000), variable, input: numberText }).strict(),
  z.object({ kind: z.literal("polynomial_domain"), expression: z.string().min(1).max(1000), variable }).strict(),
  z.object({ kind: z.literal("integer_power"), base: numberText, exponent: z.number().int().min(-12).max(12) }).strict(),
  z.object({ kind: z.literal("integer_log"), base: numberText, argument: numberText }).strict(),
  z.object({ kind: z.literal("special_angle"), fn: z.enum(["sin", "cos", "tan"]), degrees: z.number().int().min(0).max(360) }).strict(),
  z.object({ kind: z.literal("sinusoid_measure"), coefficient: numberText, frequency: numberText, measure: z.enum(["amplitude", "period"]) }).strict(),
  z.object({ kind: z.literal("named_identity"), identity: z.literal("sin_squared_plus_cos_squared") }).strict(),
  z.object({ kind: z.literal("vector_dot"), left: pair, right: pair }).strict(),
  z.object({ kind: z.literal("conic_measure"), shape: z.enum(["ellipse", "hyperbola"]), center: pair, denominatorX: numberText, denominatorY: numberText, measure: z.enum(["center", "semiaxes"]) }).strict(),
]);
export type ProblemSpecification = z.infer<typeof problemSpecificationSchema>;
export type ChapterSpecification = Extract<ProblemSpecification, { kind: "function_value" | "polynomial_domain" | "integer_power" | "integer_log" | "special_angle" | "sinusoid_measure" | "named_identity" | "vector_dot" | "conic_measure" }>;
export const CHAPTER_KINDS = new Set<ProblemSpecification["kind"]>(["function_value", "polynomial_domain", "integer_power", "integer_log", "special_angle", "sinusoid_measure", "named_identity", "vector_dot", "conic_measure"]);
export function isChapterSpecification(spec: ProblemSpecification): spec is ChapterSpecification { return CHAPTER_KINDS.has(spec.kind); }

export const LOCAL_SKILL_COVERAGE = [
  { chapter: 1, skillId: "math.functions", kinds: ["function_value"], bounds: "One-variable polynomials of degree at most eight, exact rational input." },
  { chapter: 1, skillId: "math.domain_range", kinds: ["polynomial_domain"], bounds: "All-real domain of a polynomial only; not range or arbitrary function domains." },
  { chapter: 2, skillId: "math.linear_equations", kinds: ["equation_value"], bounds: "Exact rational candidate values; no graph or modeling interpretation." },
  { chapter: 2, skillId: "math.systems", kinds: ["linear_system"], bounds: "Two linear equations with a unique solution; rational coefficients." },
  { chapter: 3, skillId: "math.polynomials", kinds: ["equivalent_expression"], bounds: "Polynomial identities through degree eight." },
  { chapter: 3, skillId: "math.quadratics", kinds: ["solution_set"], bounds: "Complete real solution sets through degree two with rational roots." },
  { chapter: 3, skillId: "math.rational_expressions", kinds: ["rational_expression"], bounds: "Exact identities and domain exclusions when denominator roots are supported." },
  { chapter: 4, skillId: "math.exponential_functions", kinds: ["integer_power"], bounds: "Rational base raised to an integer from -12 through 12; not general exponential equations." },
  { chapter: 4, skillId: "math.logarithms", kinds: ["integer_log"], bounds: "Real valid base, positive argument, integer result from -12 through 12." },
  { chapter: 5, skillId: "math.unit_circle", kinds: ["special_angle"], bounds: "Declared rational-value sin/cos/tan special angles in degrees; no general or radical-valued trig." },
  { chapter: 5, skillId: "math.geometry_measurement", kinds: ["geometry_measure"], bounds: "Explicit rectangle/triangle area, triangle angle, and rational right-triangle hypotenuse with units." },
  { chapter: 6, skillId: "math.sinusoidal_functions", kinds: ["sinusoid_measure"], bounds: "Nonconstant a*sin(b*x) or a*cos(b*x), radian input; amplitude and period as rational multiple of pi." },
  { chapter: 7, skillId: "math.trig_identities", kinds: ["named_identity"], bounds: "Value of the named sin-squared plus cos-squared identity only; no arbitrary identity proof." },
  { chapter: 8, skillId: "math.vectors", kinds: ["vector_dot"], bounds: "Two-dimensional rational dot products only." },
  { chapter: 9, skillId: "math.conics", kinds: ["conic_measure"], bounds: "Center and rational x/y semiaxis lengths from canonical ellipse/hyperbola specifications." },
] as const;
export const UNSUPPORTED_LOCAL_TOPICS = ["general_graph_interpretation", "proofs", "irrational_or_complex_root_sets", "general_exponential_or_log_equations", "radical_trig_values", "general_trig_identities_or_equations", "inverse_trig", "non_right_triangle_laws", "polar_or_parametric_equations", "general_nonlinear_systems", "reading_interpretation_grading"] as const;
