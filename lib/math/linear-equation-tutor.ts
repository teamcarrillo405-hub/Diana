import type { AssignmentReviewField, AssignmentReviewResult } from "@/lib/assignment-review";
import type { StudyHelperInput, StudyHelperResult } from "@/lib/integrations/diana-study-helper-sidecar";

type LinearEquation = {
  original: string;
  coefficient: number;
  constant: number;
  rhs: number;
  isolatedRhs: number;
  solution: number;
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function formatFraction(numerator: number, denominator: number): string {
  const divisor = gcd(numerator, denominator);
  return `${formatNumber(numerator / divisor)}/${formatNumber(denominator / divisor)}`;
}

function formatMixedNumber(numerator: number, denominator: number): string {
  const sign = numerator / denominator < 0 ? "-" : "";
  const absolute = Math.abs(numerator);
  const divisor = Math.abs(denominator);
  const whole = Math.floor(absolute / divisor);
  const remainder = absolute % divisor;
  if (remainder === 0) return `${sign}${whole}`;
  const fraction = formatFraction(remainder, divisor);
  return whole > 0 ? `${sign}${whole} ${fraction}` : `${sign}${fraction}`;
}
function nearlyEqual(a: number, b: number): boolean {
  // Bounded integer equations and exact parsed rational answers need no tolerance.
  // A nearby decimal is not an exact solution.
  return a === b;
}

function parseCoefficient(raw: string): number {
  const compact = raw.replace(/\s/gu, "");
  if (!compact || compact === "+") return 1;
  if (compact === "-") return -1;
  return Number(compact);
}

// Deliberately narrow domain: one complete ax +/- b = c equation, integer
// operands bounded by 1,000,000. Unsupported syntax must never yield a suffix.
const MAX_OPERAND = 1_000_000;
export function parseLinearEquation(text: string): LinearEquation | null {
  if (text.length > 256 || /[\r\n]/u.test(text.trim())) return null;
  const normalized = text.trim().replace(/[\u2013\u2014\u2212]/gu, "-");
  const match = normalized.match(/^(?:Solve(?:\s+for\s+x\s*:)?\s+)?([+-]?\s*\d*)\s*x\s*([+-]\s*\d+)?\s*=\s*([+-]?\d+)\s*[.?]?$/iu);
  if (!match) return null;
  const coefficient = parseCoefficient(match[1]);
  const constant = match[2] ? Number(match[2].replace(/\s/gu, "")) : 0;
  const rhs = Number(match[3]);
  if (coefficient === 0 || ![coefficient, constant, rhs].every(value => Number.isSafeInteger(value) && Math.abs(value) <= MAX_OPERAND)) return null;
  const isolatedRhs = rhs - constant;
  if (Math.abs(isolatedRhs) > MAX_OPERAND) return null;
  return { original: normalized, coefficient, constant, rhs, isolatedRhs, solution: isolatedRhs / coefficient };
}

function parseLinearEquations(text: string): LinearEquation[] {
  return text.split(/\r?\n/u).flatMap(line => {
    const cleaned = line.replace(/^\s*(?:Student work|Student answer):\s*/iu, "")
      .replace(/\s+is what i get[.!]?$/iu, "");
    const equation = parseLinearEquation(cleaned);
    return equation ? [equation] : [];
  });
}

// This selects syntax, not ownership. The route must supply the owner-scoped
// current exercise separately from retrieved/reference/conversation material.
function sourceProblem(source: string): LinearEquation | null {
  const lines = source.split(/\r?\n/u);
  const problems = lines.filter(line => /^\s*Problem:/iu.test(line));
  if (problems.length === 0) return parseLinearEquation(source);
  if (problems.length !== 1) return null;
  if (lines.some(line => line.includes("=") && !/^\s*(?:Problem|Student work|Student answer):/iu.test(line))) return null;
  return parseLinearEquation(problems[0].replace(/^\s*Problem:\s*/iu, ""));
}

function problemText(fields: AssignmentReviewField[]): string {
  const problems = fields.filter(field => /^(?:problem|prompt|assignment)$/iu.test(field.label.trim()));
  return problems.length === 1 ? problems[0].value : "";
}

function studentWorkText(fields: AssignmentReviewField[]): string {
  return fields
    .filter((field) => !/problem|prompt|assignment/iu.test(field.label))
    .map((field) => field.value)
    .join("\n");
}
function studentAnswerText(fields: AssignmentReviewField[]): string {
  return fields.find((field) => /answer/iu.test(field.label))?.value ?? "";
}

function parseStudentAnswer(value: string): number | null {
  const normalized = value.trim().replace(/^(?:x\s*=|(?:my\s+)?answer\s*(?:is|=)|i\s+got)\s*/iu, "");
  const mixed = normalized.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*([1-9]\d*)$/u);
  const fraction = normalized.match(/^([+-]?\d+)\s*\/\s*([1-9]\d*)$/u);
  const bounded = (parts: number[]) => parts.every(part => Number.isSafeInteger(part) && Math.abs(part) <= MAX_OPERAND);
  if (mixed) {
    const [whole, numerator, denominator] = mixed.slice(1).map(Number);
    if (!bounded([whole, numerator, denominator]) || numerator >= denominator) return null;
    const sign = mixed[1].startsWith("-") ? -1 : 1;
    return sign * (Math.abs(whole) * denominator + numerator) / denominator;
  }
  if (fraction) {
    const [numerator, denominator] = fraction.slice(1).map(Number);
    return bounded([numerator, denominator]) ? numerator / denominator : null;
  }
  if (!/^[+-]?\d+(?:\.\d{1,6})?$/u.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && Math.abs(parsed) <= MAX_OPERAND ? parsed : null;
}
function latestStudentChatText(input: StudyHelperInput): string {
  return input.question;
}

function parseChatAnswer(input: StudyHelperInput): number | null {
  const text = latestStudentChatText(input).trim();
  if (!text || text.length > 80 || text.includes("?")) return null;
  if (/^(do|should|can|am|is|are|what|why|how|where|when)\b/iu.test(text)) return null;
  if (/^\s*[+-]?\d+\s*x\s*=/iu.test(text)) return null;
  if (!/(^\s*[+-]?\d+(?:\.\d+)?\s*$|^\s*[+-]?\d+\s+\d+\s*\/\s*\d+\s*$|^\s*[+-]?\d+\s*\/\s*\d+\s*$|\bx\s*=|\b(answer|equals?|got|get|is)\b)/iu.test(text)) return null;
  return parseStudentAnswer(text);
}

function answerMismatchMessage(answer: number, equation: LinearEquation, answerLabel = "answer box"): string {
  const coefficient = formatNumber(equation.coefficient);
  const isolatedRhs = formatNumber(equation.isolatedRhs);
  return `Your work says ${coefficient}x = ${isolatedRhs}, so the ${answerLabel} is not ready yet. Do not jump to ${formatNumber(answer)}. Divide both sides by ${coefficient} first.`;
}

function hasIsolatedEquation(work: string, equation: LinearEquation): boolean {
  const equationLines = work.split(/\r?\n/u).filter(line => line.includes("="));
  if (equationLines.length !== 1) return false;
  const [parsed] = parseLinearEquations(equationLines[0]);
  return !!parsed && nearlyEqual(parsed.coefficient, equation.coefficient) && nearlyEqual(parsed.constant, 0) && nearlyEqual(parsed.rhs, equation.isolatedRhs);
}

function asksAboutSubtractingFromX(question: string, equation: LinearEquation): boolean {
  const lower = question.toLocaleLowerCase("en-US");
  return lower.includes("subtract") && lower.includes("from") && lower.includes(`${formatNumber(equation.coefficient)}x`);
}

function mentionsSolution(work: string, equation: LinearEquation): boolean {
  return work.split(/\r?\n/u).some(line => /^\s*x\s*=/iu.test(line)
    && parseStudentAnswer(line) === equation.solution);
}

function equationLine(equation: LinearEquation): string {
  const coefficient = formatNumber(equation.coefficient);
  const constant = formatNumber(Math.abs(equation.constant));
  const sign = equation.constant >= 0 ? "+" : "-";
  return `${coefficient}x ${sign} ${constant} = ${formatNumber(equation.rhs)}`;
}

function latestAssistantChatText(input: StudyHelperInput): string {
  return input.conversation?.filter((turn) => turn.role === "assistant").at(-1)?.text ?? "";
}

function latestStudentText(input: StudyHelperInput): string {
  return latestStudentChatText(input).trim();
}

function constantOperationName(equation: LinearEquation): string {
  return equation.constant >= 0 ? "adding" : "subtracting";
}

function inverseVerb(equation: LinearEquation): "add" | "subtract" {
  return equation.constant >= 0 ? "subtract" : "add";
}

function inverseDisplayTerm(equation: LinearEquation): string {
  const constant = formatNumber(Math.abs(equation.constant));
  return equation.constant >= 0 ? `- ${constant}` : `+ ${constant}`;
}
function equationWithInverseLine(equation: LinearEquation): string {
  const coefficient = formatNumber(equation.coefficient);
  const constant = formatNumber(Math.abs(equation.constant));
  const sign = equation.constant >= 0 ? "+" : "-";
  return `${coefficient}x ${sign} ${constant} ${inverseDisplayTerm(equation)} = ${formatNumber(equation.rhs)} ${inverseDisplayTerm(equation)}`;
}

function constantArithmeticQuestion(equation: LinearEquation): string {
  return `What does ${formatNumber(equation.rhs)} ${inverseDisplayTerm(equation)} equal?`;
}

function response(main: string, equation: LinearEquation, steps: string[] = []): StudyHelperResult {
  return {
    title: "Guided step",
    main,
    reason: "This step uses the selected integer linear equation.",
    steps,
    anchor: "This help is anchored to: Student work",
    visualAid: visualAid(equation),
  };
}

function lastAssistantIncludes(input: StudyHelperInput, expected: string): boolean {
  const normalize = (text: string) => text.toLowerCase().replace(/\s+/gu, "");
  return normalize(latestAssistantChatText(input)).includes(normalize(expected));
}

function visualAid(equation: LinearEquation) {
  const coefficient = formatNumber(equation.coefficient);
  const constant = formatNumber(Math.abs(equation.constant));
  const isolatedRhs = formatNumber(equation.isolatedRhs);
  const operation = equation.constant >= 0 ? `-${constant}` : `+${constant}`;
  return {
    kind: "equation_steps" as const,
    title: "Line up both sides",
    description: "Put the same operation under each side. This builds the habit: whatever happens on the left also happens on the right.",
    steps: [
      equationLine(equation),
      `${operation}      ${operation}`,
      `${coefficient}x = ${isolatedRhs}`,
      `Your turn: divide both sides by ${coefficient}`,
    ],
    equationRows: [
      {
        kind: "equation" as const,
        cells: [
          { column: "left_term" as const, value: `${coefficient}x` },
          { column: "left_constant" as const, value: `${equation.constant >= 0 ? "+" : "-"}${constant}` },
          { column: "relation" as const, value: "=" },
          { column: "right_term" as const, value: formatNumber(equation.rhs) },
        ],
      },
      {
        kind: "operation" as const,
        cells: [
          { column: "left_constant" as const, value: operation },
          { column: "right_term" as const, value: operation },
        ],
      },
      { kind: "divider" as const, cells: [] },
      {
        kind: "equation" as const,
        cells: [
          { column: "left_term" as const, value: `${coefficient}x` },
          { column: "relation" as const, value: "=" },
          { column: "right_term" as const, value: isolatedRhs },
        ],
      },
    ],
  };
}

export function createLinearEquationReview(fields: AssignmentReviewField[], question = ""): AssignmentReviewResult | null {
  const equation = parseLinearEquation(problemText(fields));
  if (!equation) return null;
  const work = studentWorkText(fields);
  const studentAnswer = parseStudentAnswer(studentAnswerText(fields));
  const coefficient = formatNumber(equation.coefficient);
  const constant = formatNumber(Math.abs(equation.constant));
  const isolatedRhs = formatNumber(equation.isolatedRhs);
  const solution = formatMixedNumber(equation.isolatedRhs, equation.coefficient);

  if (asksAboutSubtractingFromX(question, equation)) {
    return {
      title: "Diana review",
      strength: "You found the number that needs to be undone first.",
      improvement: `Keep ${coefficient}x together. ${inverseVerb(equation) === "add" ? "Add" : "Subtract"} ${constant} on both whole sides, not on ${coefficient}x.`,
      nextMove: `Write ${equationWithInverseLine(equation)}.`,
      question: `After the constant and its opposite cancel, what equation is left?`,
      evidenceAnchor: "Student work",
      visualAid: visualAid(equation),
    };
  }

  if (hasIsolatedEquation(work, equation)) {
    const answerMismatch = studentAnswer !== null && !nearlyEqual(studentAnswer, equation.solution);
    return {
      title: "Diana review",
      strength: `You correctly simplified it to ${coefficient}x = ${isolatedRhs}.`,
      improvement: answerMismatch ? answerMismatchMessage(studentAnswer, equation) : `The next operation should undo multiplying by ${coefficient}.`,
      nextMove: `Write ${coefficient}x / ${coefficient} = ${isolatedRhs} / ${coefficient}.`,
      question: `What does ${isolatedRhs} divided by ${coefficient} equal? Put that value in the answer box.`,
      evidenceAnchor: "Student work",
      visualAid: visualAid(equation),
    };
  }

  if (mentionsSolution(work, equation)) {
    return {
      title: "Diana review",
      strength: `You reached x = ${solution}.`,
      improvement: "Now check it in the original equation before moving on.",
      nextMove: `Substitute ${solution} for x in ${equation.original} and simplify the left side.`,
      question: `Does the left side become ${formatNumber(equation.rhs)}?`,
      evidenceAnchor: "Student work",
      visualAid: visualAid(equation),
    };
  }

  return {
    title: "Diana review",
    strength: "You have the equation in front of you.",
    improvement: `Start by undoing the ${equation.constant >= 0 ? "+" : "-"}${constant} on both sides.`,
    nextMove: `${inverseVerb(equation) === "add" ? "Add" : "Subtract"} ${constant} on both sides so the ${coefficient}x term is by itself.`,
    question: `What equation is left after you ${inverseVerb(equation)} ${constant} on both sides?`,
    evidenceAnchor: "Student work",
    visualAid: visualAid(equation),
  };
}

export function createLinearEquationStudyResponse(input: StudyHelperInput): StudyHelperResult | null {
  const equation = sourceProblem(input.source);
  if (!equation) return null;
  const sourceAnswer = parseStudentAnswer(input.source.match(/Student answer:\s*([^\n]+)/iu)?.[1] ?? "");
  const chatAnswer = parseChatAnswer(input);
  const studentAnswer = chatAnswer ?? sourceAnswer;
  const coefficient = formatNumber(equation.coefficient);
  const constant = formatNumber(Math.abs(equation.constant));
  const isolatedRhs = formatNumber(equation.isolatedRhs);
  const solutionText = formatMixedNumber(equation.isolatedRhs, equation.coefficient);
  const studentText = latestStudentText(input);
  const inverse = inverseVerb(equation);
  const rhs = formatNumber(equation.rhs);

  if (/confus|stuck|lost|don't know|dont know/iu.test(studentText)) {
    return response([
      "Think of the equation like a balanced scale:",
      "",
      equationLine(equation),
      "",
      `The left side has ${equation.constant >= 0 ? "+" : "-"}${constant}. To remove that, use the opposite operation.`,
      `The opposite of ${constantOperationName(equation)} ${constant} is ${inverse}ing ${constant}.`,
      "",
      `So we ${inverse} ${constant} on both sides:`,
      "",
      equationWithInverseLine(equation),
      "",
      constantArithmeticQuestion(equation),
    ].join("\n"), equation);
  }

  if (lastAssistantIncludes(input, constantArithmeticQuestion(equation))) {
    if (chatAnswer !== null && nearlyEqual(chatAnswer, equation.isolatedRhs)) {
      return response([
        "Correct.",
        "",
        `Now the equation becomes: ${coefficient}x = ${isolatedRhs}`,
        "",
        `The ${coefficient} is multiplying x. To get x by itself, what operation should we use to undo multiplying by ${coefficient}?`,
      ].join("\n"), equation);
    }
    return response([
      "Close. Let's calculate that part carefully.",
      "",
      `${rhs} ${inverseDisplayTerm(equation)} = ${isolatedRhs}`,
      "",
      `So the equation becomes ${coefficient}x = ${isolatedRhs}.`,
      `What operation undoes multiplying by ${coefficient}?`,
    ].join("\n"), equation);
  }

  if (lastAssistantIncludes(input, `${coefficient}x = ${isolatedRhs}`) && lastAssistantIncludes(input, `undo multiplying by ${coefficient}?`)) {
    if (["divide", "division", `divide by ${coefficient}`, "divide both sides", `divide both sides by ${coefficient}`].includes(studentText.toLowerCase().replace(/[.!]$/u, ""))) {
      return response([
        "Correct. Division undoes multiplication.",
        "",
        `So we have: ${coefficient}x / ${coefficient} = ${isolatedRhs} / ${coefficient}`,
        "",
        `The left side becomes just x. What is ${isolatedRhs} / ${coefficient}?`,
      ].join("\n"), equation);
    }
    if (chatAnswer !== null && nearlyEqual(chatAnswer, equation.coefficient)) {
      return response([
        `You're very close. Since ${coefficient} is multiplying x, we undo it by dividing both sides by ${coefficient}.`,
        "",
        `So we have: ${coefficient}x / ${coefficient} = ${isolatedRhs} / ${coefficient}`,
        "",
        `The left side becomes just x. What is ${isolatedRhs} / ${coefficient}?`,
      ].join("\n"), equation);
    }
  }

  if ((lastAssistantIncludes(input, `What is ${isolatedRhs} / ${coefficient}?`) || lastAssistantIncludes(input, `What is ${isolatedRhs} divided by ${coefficient}?`))) {
    if (chatAnswer !== null && nearlyEqual(chatAnswer, equation.solution)) {
      return response([
        `Correct. ${isolatedRhs} / ${coefficient} = ${solutionText}.`,
        "",
        `So now you have: x = ${solutionText}`,
        "",
        `Let's check it in the original equation: ${equationLine(equation)}`,
        "",
        `If x = ${solutionText}, what is ${coefficient} x ${solutionText}?`,
      ].join("\n"), equation);
    }
    if (chatAnswer !== null && Number.isInteger(chatAnswer) && Math.trunc(equation.solution) === chatAnswer) {
      return response([
        "Close. Check it by multiplying:",
        "",
        `${coefficient} x ${formatNumber(chatAnswer)} = ${formatNumber(equation.coefficient * chatAnswer)}`,
        "",
        `But we need to reach ${isolatedRhs}, so there are ${formatNumber(equation.isolatedRhs - equation.coefficient * chatAnswer)} left over.`,
        "",
        `How could you write ${isolatedRhs} / ${coefficient} as a fraction or mixed number?`,
      ].join("\n"), equation);
    }
    return response([
      "Close. Let's keep the division visible.",
      "",
      `${isolatedRhs} / ${coefficient} is the division to check. Keep it as a fraction until you simplify it.`,
      "",
      `How could you write ${isolatedRhs} / ${coefficient} as a fraction or mixed number?`,
    ].join("\n"), equation);
  }

  if (lastAssistantIncludes(input, `How could you write ${isolatedRhs} / ${coefficient} as a fraction or mixed number?`)) {
    if (chatAnswer !== null && nearlyEqual(chatAnswer, equation.solution)) {
      return response([
        `Correct. ${isolatedRhs} / ${coefficient} = ${solutionText}.`,
        "",
        `So now you have: x = ${solutionText}`,
        "",
        `Let's check it in the original equation: ${equationLine(equation)}`,
        "",
        `If x = ${solutionText}, what is ${coefficient} x ${solutionText}?`,
      ].join("\n"), equation);
    }
  }

  if (lastAssistantIncludes(input, `what is ${coefficient} x ${solutionText}?`)) {
    if (chatAnswer !== null && nearlyEqual(chatAnswer, equation.isolatedRhs)) {
      return response([
        "Correct.",
        "",
        `${coefficient} x ${solutionText} = ${isolatedRhs}.`,
        "",
        `Now finish the check: ${isolatedRhs} ${equation.constant >= 0 ? "+" : "-"} ${constant}. What does that equal?`,
      ].join("\n"), equation);
    }
  }
  if (asksAboutSubtractingFromX(input.question, equation)) {
    return {
      title: "Guided step",
      main: `No. ${inverse[0].toUpperCase()}${inverse.slice(1)} ${constant} from both whole sides, not from ${coefficient}x.`,
      reason: "The x term has to stay together until the constant is gone.",
      steps: [
        `Write ${equationWithInverseLine(equation)}.`,
        `Simplify it to ${coefficient}x = ${isolatedRhs}.`,
        `Then divide both sides by ${coefficient}.`,
      ],
      anchor: "This help is anchored to: Student work",
      visualAid: visualAid(equation),
    };
  }

  if (hasIsolatedEquation(`${input.source.split(/\r?\n/u).filter(line => /^\s*Student work:/iu.test(line)).join("\n")}\n${input.question}`, equation)) {
    const answerMismatch = studentAnswer !== null && !nearlyEqual(studentAnswer, equation.solution);
    const chatAnswerCorrect = chatAnswer !== null && nearlyEqual(chatAnswer, equation.solution);
    return {
      title: "Guided step",
      main: chatAnswerCorrect
        ? `Yes, ${solutionText} works for x after ${coefficient}x = ${isolatedRhs}.`
        : answerMismatch
        ? answerMismatchMessage(studentAnswer, equation, chatAnswer !== null ? "answer" : "answer box")
        : `Yes. From ${coefficient}x = ${isolatedRhs}, divide both sides by ${coefficient}.`,
      reason: chatAnswerCorrect
        ? `Because ${isolatedRhs} divided by ${coefficient} equals ${solutionText}.`
        : answerMismatch
        ? `A quick check shows ${coefficient} times ${formatNumber(studentAnswer)} ${equation.constant >= 0 ? "plus" : "minus"} ${constant} does not make ${formatNumber(equation.rhs)}.`
        : "Division undoes the multiplication attached to x.",
      steps: chatAnswerCorrect ? [
        `Write x = ${solutionText}.`,
        `Check: ${coefficient}(${solutionText}) ${equation.constant >= 0 ? "+" : "-"} ${constant} = ${formatNumber(equation.rhs)}.`,
        "Put the checked answer in the answer box.",
      ] : [
        `Write ${coefficient}x / ${coefficient} = ${isolatedRhs} / ${coefficient}.`,
        "Simplify each side.",
        "Check your x value in the original equation.",
      ],
      anchor: "This help is anchored to: Student work",
      visualAid: visualAid(equation),
    };
  }

  if (equation.constant === 0) {
    return {
      title: "Guided step",
      main: `Divide both sides of ${coefficient}x = ${rhs} by ${coefficient}.`,
      reason: "Division undoes multiplication; this is a proposed next step.",
      steps: [`Write ${coefficient}x / ${coefficient} = ${rhs} / ${coefficient}.`, "Simplify each side.", "Check your value in the original equation."],
      anchor: "This help is anchored to: Problem",
      visualAid: visualAid(equation),
    };
  }

  return {
    title: "Guided step",
    main: `Start by ${inverse}ing ${constant} on both sides of the equation.`,
    reason: "That gets the x term by itself before you divide.",
    steps: [
      `Write ${equationWithInverseLine(equation)}.`,
      `Simplify it to ${coefficient}x = ${isolatedRhs}.`,
      `Divide both sides by ${coefficient}.`,
    ],
    anchor: "This help is anchored to: Student work",
    visualAid: visualAid(equation),
  };
}
