// Shared pure checker for Edge Functions, the browser and engineering evaluations.
export const VERIFIER_VERSION = "rational-polynomial-v1";
export type AssessmentResult = {
  status: "supported" | "unsupported" | "inconclusive" | "needs_confirmation";
  outcome: "supported" | "revise" | "unknown";
  claim: string;
  checkedInput: string;
  verifierVersion: string;
  observations: string[];
  limitations: string[];
  eligibleForKnowledge: boolean;
};

export type Rational = { n: bigint; d: bigint };
export type Polynomial = Rational[];
type Token = { kind: "number" | "variable" | "operator"; value: string };
export type Expression = { kind: "number"; value: string } | { kind: "variable" }
  | { kind: "negate"; child: Expression }
  | { kind: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Expression; right: Expression };

const ZERO: Rational = { n: 0n, d: 1n };
const ONE: Rational = { n: 1n, d: 1n };
const MAX_DEGREE = 8;

export function rational(n: bigint, d = 1n): Rational {
  if (d === 0n) throw new Error("Division by zero is outside this check.");
  if (n.toString().length > 160 || d.toString().length > 160) throw new Error("Expression exceeds arithmetic bounds.");
  let a = n < 0n ? -n : n;
  let b = d < 0n ? -d : d;
  while (b) { const remainder = a % b; a = b; b = remainder; }
  const gcd = a || 1n;
  return { n: n / gcd * (d < 0n ? -1n : 1n), d: (d < 0n ? -d : d) / gcd };
}
export function add(a: Rational, b: Rational): Rational { return rational(a.n * b.d + b.n * a.d, a.d * b.d); }
export function multiply(a: Rational, b: Rational): Rational { return rational(a.n * b.n, a.d * b.d); }
export function negate(a: Rational): Rational { return { n: -a.n, d: a.d }; }
function decimal(value: string): Rational {
  const [whole, fraction = ""] = value.split(".");
  return rational(BigInt((whole || "0") + fraction), 10n ** BigInt(fraction.length));
}
function trim(value: Polynomial): Polynomial {
  while (value.length > 1 && value[value.length - 1].n === 0n) value.pop();
  return value;
}
export function sum(a: Polynomial, b: Polynomial): Polynomial {
  return trim(Array.from({ length: Math.max(a.length, b.length) }, (_, index) => add(a[index] ?? ZERO, b[index] ?? ZERO)));
}
export function product(a: Polynomial, b: Polynomial): Polynomial {
  if (a.length + b.length - 2 > MAX_DEGREE) throw new Error("Polynomial degree exceeds this check.");
  const result = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
  a.forEach((left, i) => b.forEach((right, j) => { result[i + j] = add(result[i + j], multiply(left, right)); }));
  return trim(result);
}

/** Bounded parser, no eval, no function calls, no variable denominators. */
export function parseExpression(input: string, variable = "x"): Expression {
  if (!/^[a-z]$/i.test(variable) || input.length > 1000 || !input.trim()) throw new Error("Use one variable and a bounded expression.");
  const tokens: Token[] = [];
  let position = 0;
  while (position < input.length) {
    const character = input[position];
    if (/\s/.test(character)) { position++; continue; }
    const number = /^(?:\d+(?:\.\d+)?|\.\d+)/.exec(input.slice(position));
    if (number) {
      if (number[0].length > 40) throw new Error("Number exceeds arithmetic bounds.");
      tokens.push({ kind: "number", value: number[0] }); position += number[0].length;
    } else if (character.toLowerCase() === variable.toLowerCase()) {
      tokens.push({ kind: "variable", value: variable }); position++;
    } else if ("+-*/^()".includes(character)) {
      tokens.push({ kind: "operator", value: character }); position++;
    } else { throw new Error("This notation needs a different checker."); }
    if (tokens.length > 160) throw new Error("Expression exceeds parser bounds.");
  }
  // Standard implicit multiplication: 2x, 2(x+1), x(x+1), (x+1)(x-1).
  // Adjacent numbers are rejected rather than silently changing malformed input.
  const expanded: Token[] = [];
  for (const token of tokens) {
    const previous = expanded.at(-1);
    const finishes = previous && (previous.kind === "number" || previous.kind === "variable" || previous.value === ")");
    const starts = token.kind === "number" || token.kind === "variable" || token.value === "(";
    if (finishes && starts) {
      if (previous.kind === "number" && token.kind === "number") throw new Error("Separate numbers need an operator.");
      expanded.push({ kind: "operator", value: "*" });
    }
    expanded.push(token);
  }
  let cursor = 0;
  let depth = 0;
  const peek = () => expanded[cursor]?.value;
  function atom(): Expression {
    if (++depth > 24) throw new Error("Expression nesting exceeds this check.");
    const token = expanded[cursor++];
    let node: Expression;
    if (token?.kind === "number") node = { kind: "number", value: token.value };
    else if (token?.kind === "variable") node = { kind: "variable" };
    else if (token?.value === "(") {
      node = expression();
      if (expanded[cursor++]?.value !== ")") throw new Error("A parenthesis needs attention.");
    } else throw new Error("An expression is needed here.");
    depth--;
    return node;
  }
  function power(): Expression {
    const left = atom();
    if (peek() === "^") { cursor++; return { kind: "binary", op: "^", left, right: unary() }; }
    return left;
  }
  function unary(): Expression {
    if (peek() === "+" || peek() === "-") {
      // Unary chains count toward the same finite token budget.
      const negative = expanded[cursor++].value === "-";
      const child = unary();
      return negative ? { kind: "negate", child } : child;
    }
    return power();
  }
  function term(): Expression {
    let left = unary();
    while (peek() === "*" || peek() === "/") {
      const op = expanded[cursor++].value as "*" | "/";
      left = { kind: "binary", op, left, right: unary() };
    }
    return left;
  }
  function expression(): Expression {
    let left = term();
    while (peek() === "+" || peek() === "-") {
      const op = expanded[cursor++].value as "+" | "-";
      left = { kind: "binary", op, left, right: term() };
    }
    return left;
  }
  const result = expression();
  if (cursor !== expanded.length) throw new Error("The complete expression could not be read.");
  return result;
}

export function polynomial(node: Expression): Polynomial {
  if (node.kind === "number") return [decimal(node.value)];
  if (node.kind === "variable") return [ZERO, ONE];
  if (node.kind === "negate") return polynomial(node.child).map(negate);
  const left = polynomial(node.left);
  const right = polynomial(node.right);
  switch (node.op) {
    case "+": return sum(left, right);
    case "-": return sum(left, right.map(negate));
    case "*": return product(left, right);
    case "/":
      if (right.length !== 1) throw new Error("Variable denominators require a domain-aware checker.");
      return left.map((value) => multiply(value, rational(right[0].d, right[0].n)));
    case "^": {
      if (right.length !== 1 || right[0].d !== 1n || right[0].n < 0n || right[0].n > BigInt(MAX_DEGREE)) {
        throw new Error("Only bounded nonnegative integer powers are supported.");
      }
      // 0^0 is deliberately left inconclusive.
      if (right[0].n === 0n && left.length === 1 && left[0].n === 0n) throw new Error("Zero to zero needs clarification.");
      let result: Polynomial = [ONE];
      for (let index = 0n; index < right[0].n; index++) result = product(result, left);
      return result;
    }
  }
}

function result(input: string, supported: boolean, claim: string): AssessmentResult {
  return {
    status: "supported", outcome: supported ? "supported" : "revise", claim: supported ? claim : "The exact calculation does not support this response.", checkedInput: input,
    verifierVersion: VERIFIER_VERSION, observations: [supported ? "Exact rational arithmetic supports this result." : "The exact values differ."],
    limitations: ["This checks the stated mathematical claim only; it does not establish understanding."],
    eligibleForKnowledge: false,
  };
}
function unavailable(input: string, error: unknown): AssessmentResult {
  return {
    status: "unsupported", outcome: "unknown", checkedInput: input.slice(0, 4000),
    verifierVersion: VERIFIER_VERSION, claim: "No verified mathematical result.",
    observations: [], limitations: [error instanceof Error ? error.message : "This notation requires another checker."],
    eligibleForKnowledge: false,
  };
}

export function checkEquivalentExpressions(reference: string, input: string, variable = "x"): AssessmentResult {
  try {
    const difference = sum(polynomial(parseExpression(reference, variable)), polynomial(parseExpression(input, variable)).map(negate));
    return result(input, difference.every((value) => value.n === 0n), "The two polynomial expressions are equivalent.");
  } catch (error) { return unavailable(input, error); }
}

export function equationDegree(equation:string,variable="x"):number|null {
  try {
    if(equation.length>2000)return null;
    const sides=equation.split("=");
    if(sides.length!==2)return null;
    return sum(polynomial(parseExpression(sides[0],variable)),polynomial(parseExpression(sides[1],variable)).map(negate)).length-1;
  } catch { return null; }
}

/** Linear equations have one solution. Higher-degree substitution only verifies a candidate, never a full solution set. */
export function checkEquationValue(equation: string, input: string, variable = "x"): AssessmentResult {
  try {
    if (equation.length > 2000) throw new Error("Equation exceeds parser bounds.");
    const sides = equation.split("=");
    if (sides.length !== 2) throw new Error("Provide one equation with two sides.");
    const difference = sum(polynomial(parseExpression(sides[0], variable)), polynomial(parseExpression(sides[1], variable)).map(negate));
    if (difference.length < 2) throw new Error("This equation does not determine a single value.");
    const value = polynomial(parseExpression(input, variable));
    if (value.length !== 1) throw new Error("Provide a numeric value for the variable.");
    let evaluated = ZERO;
    for (let i = difference.length - 1; i >= 0; i--) evaluated = add(multiply(evaluated, value[0]), difference[i]);
    const assessment = result(input, evaluated.n === 0n, difference.length === 2
      ? "This value is the unique solution of the linear equation."
      : "This value satisfies the equation; other solutions may exist.");
    if (difference.length > 2) assessment.limitations.push("Completeness of the solution set was not checked.");
    return assessment;
  } catch (error) { return unavailable(input, error); }
}
