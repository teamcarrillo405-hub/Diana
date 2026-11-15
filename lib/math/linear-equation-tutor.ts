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
  if (Math.abs(value) < 1e-9) return "0";
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
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

function formatMixedNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Number.isInteger(value)) return String(value);
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute);
  const denominator = 12;
  const numerator = Math.round((absolute - whole) * denominator);
  if (numerator === 0) return `${sign}${whole}`;
  if (numerator === denominator) return `${sign}${whole + 1}`;
  const fraction = formatFraction(numerator, denominator);
  return whole > 0 ? `${sign}${whole} ${fraction}` : `${sign}${fraction}`;
}
function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

function parseCoefficient(raw: string): number {
  const compact = raw.replace(/\s/gu, "");
  if (!compact || compact === "+") return 1;
  if (compact === "-") return -1;
  return Number(compact);
}

export function parseLinearEquation(text: string): LinearEquation | null {
  return parseLinearEquations(text)[0] ?? null;
}

function parseLinearEquations(text: string): LinearEquation[] {
  const normalized = text.replace(/[\u002d\u2013\u2014]/gu, "-");
  const matches = normalized.matchAll(/(^|[^a-z])([+-]?\s*\d*)\s*x\s*([+-]\s*\d+(?:\.\d+)?)?\s*=\s*([+-]?\d+(?:\.\d+)?)/giu);
  const equations: LinearEquation[] = [];
  for (const match of matches) {
    const coefficient = parseCoefficient(match[2] ?? "");
    const constant = match[3] ? Number(match[3].replace(/\s/gu, "")) : 0;
    const rhs = Number(match[4]);
    if (!Number.isFinite(coefficient) || coefficient === 0 || !Number.isFinite(constant) || !Number.isFinite(rhs)) continue;
    const isolatedRhs = rhs - constant;
    equations.push({
      original: match[0].trim(),
      coefficient,
      constant,
      rhs,
      isolatedRhs,
      solution: isolatedRhs / coefficient,
    });
  }
  return equations;
}

function problemText(fields: AssignmentReviewField[]): string {
  return fields.map((field) => `${field.label}: ${field.value}`).join("\n");
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
  const normalized = value.replace(/,/gu, "").trim();
  const mixed = normalized.match(/(?:x\s*=\s*)?([+-]?\d+)\s+([0-9]+)\s*\/\s*([1-9][0-9]*)/iu);
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (Number.isFinite(whole) && Number.isFinite(numerator) && Number.isFinite(denominator)) {
      return whole < 0 ? whole - numerator / denominator : whole + numerator / denominator;
    }
  }
  const fraction = normalized.match(/(?:x\s*=\s*)?([+-]?[0-9]+)\s*\/\s*([1-9][0-9]*)/iu);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    if (Number.isFinite(numerator) && Number.isFinite(denominator)) return numerator / denominator;
  }
  const match = normalized.match(/(?:x\s*=\s*)?([+-]?\d+(?:\.\d+)?)/iu);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}
function latestStudentChatText(input: StudyHelperInput): string {
  return input.conversation?.filter((turn) => turn.role === "student").at(-1)?.text ?? input.question;
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
  return parseLinearEquations(work).some((parsed) => nearlyEqual(parsed.coefficient, equation.coefficient) && nearlyEqual(parsed.constant, 0) && nearlyEqual(parsed.rhs, equation.isolatedRhs));
}

function asksAboutSubtractingFromX(question: string, equation: LinearEquation): boolean {
  const lower = question.toLocaleLowerCase("en-US");
  return lower.includes("subtract") && lower.includes("from") && lower.includes(`${formatNumber(equation.coefficient)}x`);
}

function mentionsSolution(work: string, equation: LinearEquation): boolean {
  const solution = formatNumber(equation.solution).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`\\bx\\s*=\\s*${solution}\\b`, "iu").test(work.replace(/\s+/gu, " "));
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
    reason: "Diana is checking the last thing you answered before moving on.",
    steps,
    anchor: "This help is anchored to: Student work",
    visualAid: visualAid(equation),
  };
}

function lastAssistantAsked(input: StudyHelperInput, pattern: RegExp): boolean {
  return pattern.test(latestAssistantChatText(input));
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
  const solution = formatNumber(equation.solution);

  if (asksAboutSubtractingFromX(question, equation)) {
    return {
      title: "Diana review",
      strength: "You found the number that needs to be undone first.",
      improvement: `Keep ${coefficient}x together. Subtract ${constant} from both whole sides, not from ${coefficient}x.`,
      nextMove: `Write ${coefficient}x + ${constant} - ${constant} = ${formatNumber(equation.rhs)} - ${constant}.`,
      question: `After the +${constant} and -${constant} cancel, what equation is left?`,
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
    nextMove: `Subtract ${constant} from both sides so the ${coefficient}x term is by itself.`,
    question: `What equation is left after you subtract ${constant} from both sides?`,
    evidenceAnchor: "Student work",
    visualAid: visualAid(equation),
  };
}

export function createLinearEquationStudyResponse(input: StudyHelperInput): StudyHelperResult | null {
  const combined = `${input.source}\n${input.question}`;
  const equation = parseLinearEquation(combined);
  if (!equation) return null;
  const sourceAnswer = parseStudentAnswer(input.source.match(/Student answer:\s*([^\n]+)/iu)?.[1] ?? "");
  const chatAnswer = parseChatAnswer(input);
  const studentAnswer = sourceAnswer ?? chatAnswer;
  const coefficient = formatNumber(equation.coefficient);
  const constant = formatNumber(Math.abs(equation.constant));
  const isolatedRhs = formatNumber(equation.isolatedRhs);
  const solutionText = formatMixedNumber(equation.solution);
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

  if (lastAssistantAsked(input, /what does\s+[+-]?\d+(?:\.\d+)?\s*[+-]\s*\d+(?:\.\d+)?\s+equal/iu)) {
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

  if (lastAssistantAsked(input, /undo multiplying|multiplying by\s*\d+/iu)) {
    if (/divid/iu.test(studentText)) {
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

  if (lastAssistantAsked(input, /what is\s*[+-]?\d+(?:\.\d+)?\s*(?:\/|divided by)\s*\d+/iu)) {
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
      `${isolatedRhs} / ${coefficient} does not divide evenly, so leave it as a fraction or mixed number.`,
      "",
      `How could you write ${isolatedRhs} / ${coefficient} as a fraction or mixed number?`,
    ].join("\n"), equation);
  }

  if (lastAssistantAsked(input, /fraction|mixed number/iu)) {
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

  if (lastAssistantAsked(input, /what is\s*\d+\s*x\s*/iu)) {
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

  if (hasIsolatedEquation(combined, equation)) {
    const answerMismatch = studentAnswer !== null && !nearlyEqual(studentAnswer, equation.solution);
    const chatAnswerCorrect = chatAnswer !== null && nearlyEqual(chatAnswer, equation.solution);
    return {
      title: "Guided step",
      main: chatAnswerCorrect
        ? `Yes, ${formatNumber(chatAnswer)} works for x after ${coefficient}x = ${isolatedRhs}.`
        : answerMismatch
        ? answerMismatchMessage(studentAnswer, equation, chatAnswer !== null ? "answer" : "answer box")
        : `Yes. From ${coefficient}x = ${isolatedRhs}, divide both sides by ${coefficient}.`,
      reason: chatAnswerCorrect
        ? `Because ${isolatedRhs} divided by ${coefficient} equals ${formatNumber(equation.solution)}.`
        : answerMismatch
        ? `A quick check shows ${coefficient} times ${formatNumber(studentAnswer)} plus ${constant} does not make ${formatNumber(equation.rhs)}.`
        : "Division undoes the multiplication attached to x.",
      steps: chatAnswerCorrect ? [
        `Write x = ${formatNumber(equation.solution)}.`,
        `Check: ${coefficient}(${formatNumber(equation.solution)}) + ${constant} = ${formatNumber(equation.rhs)}.`,
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
