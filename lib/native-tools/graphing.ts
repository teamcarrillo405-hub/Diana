import { add, multiply, negate, polynomial, rational, sum, type Expression, type Polynomial, type Rational } from "@/supabase/functions/_shared/learning/algebra";

export type GraphPoint = { x: number; y: number };
export type GraphRange = { min: number; max: number; step?: number };
export type GraphSolutionPoint = GraphPoint & {
  precision: "exact" | "approximate";
  exactX?: string;
  exactY?: string;
};
export type GraphCheckResult = {
  status: "matches" | "no_match" | "overlap" | "indeterminate" | "invalid";
  points: GraphSolutionPoint[];
  limited?: true;
};

export const DEFAULT_GRAPH_RANGE: Readonly<Required<GraphRange>> = { min: -10, max: 10, step: 0.25 };
const MAX_SAMPLES = 2000;
const SOLVER_INTERVALS = 800;
const MAX_CHECK_POINTS = 50;
const ZERO = rational(0n);
const GRAPH_FUNCTIONS = {
  abs: Math.abs, cos: Math.cos, exp: Math.exp, log: Math.log,
  sin: Math.sin, sqrt: Math.sqrt, tan: Math.tan,
};

type GraphFunction = keyof typeof GRAPH_FUNCTIONS;
type Operator = "+" | "-" | "*" | "/" | "^";
type GraphNode = { type: "number"; text: string; value: number }
  | { type: "variable" }
  | { type: "apply"; fn: GraphFunction | "negate"; argument: GraphNode }
  | { type: "binary"; operator: Operator; left: GraphNode; right: GraphNode };

type GraphRoot = { x: number; exact?: Rational };
type GraphCut = { expression: GraphNode; kind: "division" | "tan" | "log" | "sqrt"; roots: GraphRoot[] };
type ParsedGraph = { tree: GraphNode; cuts: GraphCut[]; polynomial: Polynomial | null };

function isGraphFunction(token: string | undefined): token is GraphFunction {
  return Boolean(token && Object.hasOwn(GRAPH_FUNCTIONS, token));
}

function tokenize(expression: string): string[] | null {
  if (expression.length > 512) return null;
  const normalized = expression.toLowerCase().trim()
    .replace(/^(?:y|[a-z]\s*\(\s*x\s*\))\s*=\s*/u, "")
    .replaceAll("−", "-").replaceAll(/[×·]/gu, "*").replaceAll("÷", "/")
    .replaceAll("π", "pi").replaceAll("²", "^2").replaceAll("³", "^3");
  const tokens = normalized.match(/\s+|(?:\d+(?:\.\d*)?|\.\d+)|pi|sin|cos|tan|sqrt|abs|log|exp|[ex()+\-*/^]/gu);
  if (!tokens || tokens.join("") !== normalized || tokens.length > 240) return null;
  return tokens.filter((token) => !/^\s/u.test(token));
}

function parseGraphExpression(expression: string): ParsedGraph | null {
  const tokens = tokenize(expression) ?? [];
  if (!tokens.length) return null;
  const cuts: GraphCut[] = [];
  let index = 0;
  let depth = 0;
  const peek = () => tokens[index];
  function innerExpression(): GraphNode {
    let left = term();
    while (peek() === "+" || peek() === "-") {
      const operator = tokens[index++] as "+" | "-";
      left = { type: "binary", operator, left, right: term() };
    }
    return left;
  }
  function term(): GraphNode {
    let left = unary();
    for (let token = peek(); token; token = peek()) {
      let operator: "*" | "/";
      if (token === "*" || token === "/") {
        operator = token;
        index++;
      } else if (token === "(" || token === "x" || token === "pi" || token === "e" || isGraphFunction(token)) {
        operator = "*";
      } else break;
      const right = unary();
      if (operator === "/") cuts.push({ expression: right, kind: "division", roots: rootsForCut(right) });
      left = { type: "binary", operator, left, right };
    }
    return left;
  }
  function unary(): GraphNode {
    if (peek() === "-" || peek() === "+") {
      const operator = tokens[index++];
      const argument = unary();
      return operator === "-" ? { type: "apply", fn: "negate", argument } : argument;
    }
    const left = atom();
    if (peek() !== "^") return left;
    index++;
    const right = unary();
    if (numericValue(right, NaN) < 0) cuts.push({ expression: left, kind: "division", roots: rootsForCut(left) });
    return { type: "binary", operator: "^", left, right };
  }
  function parenthesized(): GraphNode {
    if (++depth > 24 || tokens[index++] !== "(") throw new Error("A parenthesis is needed.");
    const node = innerExpression();
    if (tokens[index++] !== ")") throw new Error("A closing parenthesis is needed.");
    depth--;
    return node;
  }
  function atom(): GraphNode {
    const token = peek();
    if (token === "(") return parenthesized();
    index++;
    if (token === "x") return { type: "variable" };
    if (isGraphFunction(token)) {
      const argument = parenthesized();
      if (token === "tan" || token === "sqrt" || token === "log") {
        cuts.push({ expression: argument, kind: token, roots: token === "tan" ? [] : rootsForCut(argument) });
      }
      return { type: "apply", fn: token, argument };
    }
    const value = token === "pi" ? Math.PI : token === "e" ? Math.E : Number(token);
    if (!token || !Number.isFinite(value)) throw new Error("Use a supported number or function.");
    return { type: "number", text: token, value };
  }
  try {
    const tree = innerExpression();
    return index === tokens.length ? { tree, cuts, polynomial: asPolynomial(tree) } : null;
  } catch {
    return null;
  }
}

function numericValue(node: GraphNode, x: number): number {
  switch (node.type) {
    case "number": return node.value;
    case "variable": return x;
    case "apply": {
      const value = numericValue(node.argument, x);
      if (!Number.isFinite(value)) return NaN;
      if (node.fn === "tan" && Math.abs(Math.cos(value)) <= 4 * Number.EPSILON) return NaN;
      return node.fn === "negate" ? -value : GRAPH_FUNCTIONS[node.fn](value);
    }
    case "binary": {
      const left = numericValue(node.left, x);
      const right = numericValue(node.right, x);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return NaN;
      switch (node.operator) {
        case "+": return left + right;
        case "-": return left - right;
        case "*": return left * right;
        case "/": return left / right;
        case "^": return left ** right;
      }
    }
  }
}

function rationalExpression(node: GraphNode): Expression | null {
  switch (node.type) {
    case "number": return node.text !== "pi" && node.text !== "e" && node.text.length <= 40
      ? { kind: "number", value: node.text } : null;
    case "variable": return { kind: "variable" };
    case "apply": {
      const argument = node.fn === "negate" ? rationalExpression(node.argument) : null;
      return argument ? { kind: "negate", child: argument } : null;
    }
    case "binary": {
      const left = rationalExpression(node.left);
      const right = rationalExpression(node.right);
      return left && right ? { kind: "binary", op: node.operator, left, right } : null;
    }
  }
}

function asPolynomial(node: GraphNode): Polynomial | null {
  try {
    const expression = rationalExpression(node);
    return expression ? polynomial(expression) : null;
  }
  catch { return null; }
}

function numberFor(value: Rational): number { return Number(value.n) / Number(value.d); }
function exactText(value: Rational): string { return value.d === 1n ? String(value.n) : `${value.n}/${value.d}`; }
function divide(left: Rational, right: Rational): Rational { return rational(left.n * right.d, left.d * right.n); }

function squareRootInteger(value: bigint): bigint {
  if (value < 2n) return value;
  let candidate = 1n << BigInt(Math.ceil(value.toString(2).length / 2));
  for (;;) {
    const next = (candidate + value / candidate) / 2n;
    if (next >= candidate) return candidate;
    candidate = next;
  }
}

function rootsForPolynomial(coefficients: Polynomial): GraphRoot[] | "overlap" | null {
  if (coefficients.length > 3) return null;
  const [c = ZERO, b = ZERO, a = ZERO] = coefficients;
  if (a.n === 0n) {
    if (b.n === 0n) return c.n === 0n ? "overlap" : [];
    const exact = divide(negate(c), b);
    return [{ x: numberFor(exact), exact }];
  }
  const discriminant = add(multiply(b, b), negate(multiply(rational(4n), multiply(a, c))));
  if (discriminant.n < 0n) return [];
  const n = squareRootInteger(discriminant.n);
  const d = squareRootInteger(discriminant.d);
  if (n * n === discriminant.n && d * d === discriminant.d) {
    const radical = rational(n, d);
    const numerators = n === 0n ? [negate(b)] : [add(negate(b), negate(radical)), add(negate(b), radical)];
    return numerators.map((numerator) => {
      const exact = divide(numerator, multiply(rational(2n), a));
      return { x: numberFor(exact), exact };
    });
  }
  const discriminantRoot = Math.sqrt(numberFor(discriminant));
  const bNumber = numberFor(b);
  const q = -0.5 * (bNumber + (bNumber < 0 ? -discriminantRoot : discriminantRoot));
  if (!Number.isFinite(q) || q === 0) return null;
  return [{ x: q / numberFor(a) }, { x: numberFor(c) / q }];
}

function rootsForCut(node: GraphNode): GraphRoot[] {
  try {
    const coefficients = asPolynomial(node);
    const roots = coefficients && rootsForPolynomial(coefficients);
    return Array.isArray(roots) ? roots : [];
  } catch { return []; }
}

function strictlyInside(x: number, min: number, max: number): boolean {
  return Number.isFinite(x) && x >= min && x <= max;
}

function atCut(x: number, root: number): boolean {
  return Math.abs(x - root) <= 4 * Number.EPSILON * Math.max(Math.abs(x), Math.abs(root), Number.MIN_VALUE);
}

function readableValue(parsed: ParsedGraph, x: number): number | null {
  if (!Number.isFinite(x)) return null;
  if (parsed.cuts.some(({ kind, roots }) => kind !== "sqrt" && roots.some((root) => atCut(x, root.x)))) return null;
  const value = numericValue(parsed.tree, x);
  return Number.isFinite(value) ? value : null;
}

export function evaluateGraphExpression(expression: string, x: number): number | null {
  const parsed = parseGraphExpression(expression);
  return parsed ? readableValue(parsed, x) : null;
}

function validRange(range: GraphRange): boolean {
  const span = range.max - range.min;
  return Number.isFinite(span) && span > 0 && Math.max(Math.abs(range.min), Math.abs(range.max)) <= 1_000_000
    && (range.step === undefined || (Number.isFinite(range.step) && range.step > 0));
}

function discontinuityBetween(parsed: ParsedGraph, left: number, right: number): boolean {
  const mid = left + (right - left) / 2;
  if (readableValue(parsed, mid) === null) return true;
  return parsed.cuts.some(({ expression, kind, roots }) => {
    const inner = roots.map(({ x }) => x).filter((x) => x > left && x < right);
    if (kind === "sqrt") {
      if (!inner.length) return false;
      const boundaries = [left, ...inner.sort((a, b) => a - b), right];
      return boundaries.slice(1).some((end, index) => numericValue(expression, (boundaries[index] + end) / 2) < 0);
    }
    if (inner.length) return true;
    if (kind === "log") return false;
    const markedValue = (x: number) => {
      const value = numericValue(expression, x);
      return kind === "tan" ? Math.cos(value) : value;
    };
    const signs = [markedValue(left), markedValue(mid), markedValue(right)].map(Math.sign);
    return signs.some((sign) => sign === 0 || !Number.isFinite(sign) || sign !== signs[0]);
  });
}

export function graphSegments(expression: string, range: GraphRange = DEFAULT_GRAPH_RANGE): GraphPoint[][] {
  const parsed = parseGraphExpression(expression);
  if (!parsed || !validRange(range)) return [];
  const width = range.max - range.min;
  const step = Math.max(range.step ?? width / 80, width / (MAX_SAMPLES - 1));
  const intervals = Math.min(MAX_SAMPLES - 1, Math.ceil(width / step));
  const segments: GraphPoint[][] = [];
  let run: GraphPoint[] = [];
  for (let index = 0; index <= intervals; index++) {
    const x = index === intervals ? range.max : range.min + index * step;
    const y = readableValue(parsed, x);
    const previous = run.at(-1);
    if (y === null || (previous && discontinuityBetween(parsed, previous.x, x))) {
      if (run.length) segments.push(run);
      run = [];
    }
    if (y !== null) run.push({ x, y });
  }
  if (run.length) segments.push(run);
  return segments;
}

export function graphPoints(expression: string, range: GraphRange = DEFAULT_GRAPH_RANGE): GraphPoint[] {
  return graphSegments(expression, range).flat();
}

function exactPolynomialValue(coefficients: Polynomial | null, x: Rational): Rational | null {
  try { return coefficients?.reduceRight((value, coefficient) => add(multiply(value, x), coefficient), ZERO) ?? null; }
  catch { return null; }
}

function resultPoint(parsed: ParsedGraph, root: GraphRoot, axis = false): GraphSolutionPoint | null {
  const evaluated = readableValue(parsed, root.x);
  if (evaluated === null) return null;
  const value = axis ? ZERO : root.exact && exactPolynomialValue(parsed.polynomial, root.exact);
  if (root.exact && value) return { x: root.x, y: numberFor(value), precision: "exact", exactX: exactText(root.exact), exactY: exactText(value) };
  return { x: root.x, y: axis ? 0 : evaluated, precision: "approximate" };
}

type ScalarSample = { x: number; difference: number; tolerance: number };

function solveGraph(left: ParsedGraph, right: ParsedGraph, range: GraphRange, axis: boolean): GraphCheckResult {
  if (left.polynomial && right.polynomial) {
    try {
      const roots = rootsForPolynomial(sum(left.polynomial, right.polynomial.map(negate)));
      if (roots === "overlap") return { status: "overlap", points: [] };
      if (roots) {
        const points = roots.filter(({ x }) => strictlyInside(x, range.min, range.max))
          .flatMap((root) => resultPoint(left, root, axis) ?? [])
          .sort((a, b) => a.x - b.x);
        return { status: points.length ? "matches" : "no_match", points };
      }
    } catch { /* Arithmetic bounds leave a numerical check available. */ }
  }
  function sample(x: number): ScalarSample | null {
    const a = readableValue(left, x);
    const b = readableValue(right, x);
    if (a === null || b === null || !Number.isFinite(a - b)) return null;
    return { x, difference: a - b, tolerance: Math.min(1e-7, Math.max(1e-10, Math.abs(a) * Number.EPSILON * 8, Math.abs(b) * Number.EPSILON * 8)) };
  }
  const samples = Array.from({ length: SOLVER_INTERVALS + 1 }, (_, index) =>
    sample(index === SOLVER_INTERVALS ? range.max : range.min + (range.max - range.min) * index / SOLVER_INTERVALS));
  const observed = samples.filter((item) => item !== null);
  if (!observed.length) return { status: "indeterminate", points: [], limited: true };
  if (JSON.stringify(left.tree) === JSON.stringify(right.tree)) return { status: "overlap", points: [] };
  if (observed.every(({ difference, tolerance }) => Math.abs(difference) <= tolerance)) return { status: "indeterminate", points: [], limited: true };

  const points: GraphSolutionPoint[] = [];
  let uncertain = false;
  function addRoot(hit: ScalarSample | null) {
    if (!hit || Math.abs(hit.difference) > hit.tolerance || points.length >= MAX_CHECK_POINTS) return;
    if (points.some(({ x }) => Math.abs(x - hit.x) <= Math.max(1e-8, Math.abs(x) * 1e-10))) return;
    const point = resultPoint(left, { x: hit.x }, axis);
    if (point) points.push(point);
  }
  for (const cut of [...left.cuts, ...right.cuts]) {
    if (cut.kind !== "sqrt") continue;
    for (const root of cut.roots) {
      if (strictlyInside(root.x, range.min, range.max)) addRoot(sample(root.x));
    }
  }
  function continuous(a: ScalarSample, b: ScalarSample): boolean {
    return !discontinuityBetween(left, a.x, b.x) && !discontinuityBetween(right, a.x, b.x);
  }
  for (let index = 0; index < samples.length && points.length < MAX_CHECK_POINTS; index++) {
    const middle = samples[index];
    if (!middle) continue;
    const before = samples[index - 1];
    const after = samples[index + 1];
    if (middle.difference === 0 && (before?.difference !== 0 || after?.difference !== 0)) addRoot(middle);
    if (after && Math.sign(middle.difference) * Math.sign(after.difference) < 0 && continuous(middle, after)) {
      addRoot(bracketRoot(sample, middle, after));
    }
    if (before && after && Math.abs(middle.difference) < Math.min(Math.abs(before.difference), Math.abs(after.difference))
      && Math.sign(before.difference) === Math.sign(after.difference) && continuous(before, after)) {
      const minimum = minimumResidual(sample, before.x, after.x);
      if (minimum && Math.abs(minimum.difference) <= 8 * Number.EPSILON) addRoot(minimum);
      else if (minimum && Math.abs(minimum.difference) <= minimum.tolerance) uncertain = true;
    }
  }
  points.sort((a, b) => a.x - b.x);
  return { status: points.length ? "matches" : uncertain ? "indeterminate" : "no_match", points, limited: true };
}

function bracketRoot(sample: (x: number) => ScalarSample | null, first: ScalarSample, last: ScalarSample): ScalarSample | null {
  let left = first;
  let right = last;
  let best = Math.abs(left.difference) <= Math.abs(right.difference) ? left : right;
  for (let step = 0; step < 54; step++) {
    const x = left.x + (right.x - left.x) / 2;
    if (x === left.x || x === right.x) break;
    const mid = sample(x);
    if (!mid) return null;
    if (Math.abs(mid.difference) < Math.abs(best.difference)) best = mid;
    if (mid.difference === 0) return mid;
    if (Math.sign(mid.difference) === Math.sign(left.difference)) left = mid;
    else right = mid;
  }
  return best;
}

function minimumResidual(sample: (x: number) => ScalarSample | null, low: number, high: number): ScalarSample | null {
  let best: ScalarSample | null = null;
  for (let step = 0; step < 76; step++) {
    const one = sample(low + (high - low) / 3);
    const two = sample(high - (high - low) / 3);
    if (!one || !two) return null;
    const firstIsBest = Math.abs(one.difference) <= Math.abs(two.difference);
    const candidate = firstIsBest ? one : two;
    if (candidate.difference === 0) return candidate;
    if (!best || Math.abs(candidate.difference) < Math.abs(best.difference)) best = candidate;
    if (one.x === two.x) break;
    if (firstIsBest) high = two.x;
    else low = one.x;
  }
  return best;
}

export function analyzeGraph({ expression, comparison, range = DEFAULT_GRAPH_RANGE }: {
  expression: string; comparison?: string; range?: GraphRange;
}): { yIntercept: GraphSolutionPoint | null; xIntercepts: GraphCheckResult; intersections: GraphCheckResult | null } {
  const left = parseGraphExpression(expression);
  const right = comparison?.trim() ? parseGraphExpression(comparison) : null;
  const invalid: GraphCheckResult = { status: "invalid", points: [] };
  if (!left || !validRange(range)) return { yIntercept: null, xIntercepts: invalid, intersections: comparison?.trim() ? invalid : null };
  const axis = parseGraphExpression("0")!;
  return {
    yIntercept: strictlyInside(0, range.min, range.max) ? resultPoint(left, { x: 0, exact: ZERO }) : null,
    xIntercepts: solveGraph(left, axis, range, true),
    intersections: right ? solveGraph(left, right, range, false) : comparison?.trim() ? invalid : null,
  };
}
