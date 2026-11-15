import { problemSpecificationSchema, type ProblemSpecification } from "./problem-specification";

export const CHAPTER_PRACTICE_VERSION = "authored-chapter-practice-v1";
export const CHAPTER_VARIANT_COUNTS: Readonly<Record<number, number>> = { 1: 7, 2: 7, 3: 7, 4: 7, 5: 6, 6: 7, 7: 1, 8: 7, 9: 7 };
export type ChapterPractice = { id: string; chapter: number; skillId: string; prompt: string; specification: ProblemSpecification;
  provenance: "authored_engineering_practice"; reviewed: false; templateFamily: string };

/** Authored examples, not copied textbook solutions. No answer key or educator approval is returned. */
export function createChapterPractice(chapter: number, seed = 0): ChapterPractice[] {
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 9 || !Number.isInteger(seed) || seed < 0 || seed >= CHAPTER_VARIANT_COUNTS[chapter]) {
    throw new Error("Choose chapter 1–9 and one of its declared finite practice variants.");
  }
  const n = 2 + seed % 7, m = n + 1;
  const make = (name: string, skillId: string, prompt: string, specification: unknown): ChapterPractice => ({
    id: `${CHAPTER_PRACTICE_VERSION}:${chapter}:${seed}:${name}`, chapter, skillId, prompt,
    specification: problemSpecificationSchema.parse(specification), provenance: "authored_engineering_practice", reviewed: false,
    templateFamily: `${CHAPTER_PRACTICE_VERSION}:${chapter}:${name}`,
  });
  switch (chapter) {
    case 1: return [
      make("value", "math.functions", `For f(x)=${n}x^2+1, find f(${m}).`, { kind: "function_value", expression: `${n}x^2+1`, input: String(m) }),
      make("domain", "math.domain_range", `State the real domain of f(x)=${n}x^2+1.`, { kind: "polynomial_domain", expression: `${n}x^2+1` }),
    ];
    case 2: return [make("linear", "math.linear_equations", `Find a value of x satisfying ${n}x+3=${n * m + 3}.`,
      { kind: "equation_value", equation: `${n}x+3=${n * m + 3}`, solutionSetComplete: false })];
    case 3: return [make("roots", "math.quadratics", `Find every real solution of (x-${n})(x+${m})=0. Enter each value once.`,
      { kind: "solution_set", equation: `(x-${n})(x+${m})=0` })];
    case 4: return [
      make("power", "math.exponential_functions", `Evaluate ${n}^3 exactly.`, { kind: "integer_power", base: String(n), exponent: 3 }),
      make("log", "math.logarithms", `Find log base ${n} of ${n ** 3}.`, { kind: "integer_log", base: String(n), argument: String(n ** 3) }),
    ];
    case 5: {
      const choices = [{ fn: "sin", degrees: 30 }, { fn: "cos", degrees: 60 }, { fn: "tan", degrees: 45 },
        { fn: "sin", degrees: 270 }, { fn: "cos", degrees: 180 }, { fn: "tan", degrees: 135 }] as const;
      const selected = choices[seed % choices.length];
      return [make("angle", "math.unit_circle", `Find ${selected.fn}(${selected.degrees} degrees) exactly.`, { kind: "special_angle", ...selected })];
    }
    case 6: return [
      make("amplitude", "math.sinusoidal_functions", `For y=-${n} sin(${m}x), with x in radians, find the amplitude.`,
        { kind: "sinusoid_measure", coefficient: String(-n), frequency: String(m), measure: "amplitude" }),
      make("period", "math.sinusoidal_functions", `For y=-${n} sin(${m}x), with x in radians, find the period as an exact multiple of pi.`,
        { kind: "sinusoid_measure", coefficient: String(-n), frequency: String(m), measure: "period" }),
    ];
    case 7: return [make("identity", "math.trig_identities", "For any real angle theta, evaluate sin(theta)^2+cos(theta)^2 using the Pythagorean identity.",
      { kind: "named_identity", identity: "sin_squared_plus_cos_squared" })];
    case 8: return [make("dot", "math.vectors", `Find the dot product of (${n}, 2) and (3, ${m}).`,
      { kind: "vector_dot", left: [String(n), "2"], right: ["3", String(m)] })];
    case 9: return [
      make("center", "math.conics", `Find the center (h, k) of (x-${n})^2/9+(y+${m})^2/16=1.`,
        { kind: "conic_measure", shape: "ellipse", center: [String(n), String(-m)], denominatorX: "9", denominatorY: "16", measure: "center" }),
      make("semiaxes", "math.conics", `For (x-${n})^2/9+(y+${m})^2/16=1, give the x-direction then y-direction semiaxis lengths.`,
        { kind: "conic_measure", shape: "ellipse", center: [String(n), String(-m)], denominatorX: "9", denominatorY: "16", measure: "semiaxes" }),
    ];
    default: return [];
  }
}

/** Content-bound versions let the API reject a stale attempt after a template changes. */
export async function loadChapterPractice(chapter: number, variant = 0): Promise<Array<ChapterPractice & { versionId: string }>> {
  return Promise.all(createChapterPractice(chapter, variant).map(async exercise => {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({ version: CHAPTER_PRACTICE_VERSION, exercise })));
    const versionId = Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
    return { ...exercise, versionId };
  }));
}
