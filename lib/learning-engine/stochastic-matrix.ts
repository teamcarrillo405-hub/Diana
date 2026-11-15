import { z } from 'zod';
import { add, multiply, rational, type Rational } from '@/supabase/functions/_shared/learning/algebra';

const token = z.string().trim().min(1).max(32);
/** Structured, explicitly supplied givens only. No interpretation of prose or OCR. */
export const stochasticSpecificationSchema = z.object({
  convention: z.literal('row_vector_p_times_P'),
  states: z.array(z.string().trim().min(1).max(60)).min(2).max(4),
  matrix: z.array(z.array(token).min(2).max(4)).min(2).max(4),
  initial: z.array(token).min(2).max(4),
}).strict();
export type StochasticSpecification = z.infer<typeof stochasticSpecificationSchema>;
export const STOCHASTIC_LIMIT = 'Checks one exact pP step for 2–4 declared states. Source interpretation, transition estimation, long-run behavior and understanding are not verified.';
export const STOCHASTIC_REVIEW_CRITERIA = [
  'State the row-vector convention and preserve the declared state order.',
  'Check nonnegative probabilities and unit row/vector sums before calculating.',
  'Explain how each output component combines the incoming probability contributions.',
  'Distinguish the calculation from evidence that the transition model describes a real system.',
];

function exact(text: string, digits = 9): Rational {
  const value = text.trim();
  // Bounded decimal/fraction notation, not a general expression evaluator.
  if (!new RegExp(`^[+-]?\\d{1,${digits}}(?:\\.\\d{1,${digits}}|\\/[1-9]\\d{0,${digits - 1}})?$`, 'u').test(value)) throw new Error('notation');
  if (value.includes('/')) {
    const [n, d] = value.split('/'); return rational(BigInt(n), BigInt(d));
  }
  const negative = value.startsWith('-'), unsigned = value.replace(/^[+-]/u, '');
  const [whole, fraction = ''] = unsigned.split('.');
  return rational((negative ? -1n : 1n) * BigInt(whole + fraction), 10n ** BigInt(fraction.length));
}
const unit = (value: Rational) => value.n >= 0n && value.n <= value.d;
const one = (values: Rational[]) => { const total = values.reduce(add, rational(0n)); return total.n === total.d; };
const same = (a: Rational, b: Rational) => a.n === b.n && a.d === b.d;
type Prepared = { ok: true; specification: StochasticSpecification; matrix: Rational[][]; initial: Rational[] }
  | { ok: false; code: 'shape' | 'dimensions' | 'state_order' | 'notation' | 'matrix_probability' | 'matrix_row_sum' | 'initial_probability' | 'initial_sum'; guidance: string };

export function validateStochasticGivens(raw: unknown): Prepared {
  const parsed = stochasticSpecificationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: 'shape', guidance: 'Confirm a 2–4 state matrix, an initial vector, and the explicit row-vector convention pP.' };
  const s = parsed.data, size = s.states.length;
  if (s.matrix.length !== size || s.matrix.some(row => row.length !== size) || s.initial.length !== size)
    return { ok: false, code: 'dimensions', guidance: 'The supplied dimensions conflict. Confirm one row and column per state and one initial probability per state.' };
  if (new Set(s.states.map(state => state.toLowerCase())).size !== size)
    return { ok: false, code: 'state_order', guidance: 'The supplied state labels repeat. Confirm a distinct label and fixed order for every state.' };
  let matrix: Rational[][], initial: Rational[];
  try { matrix = s.matrix.map(row => row.map(value => exact(value))); initial = s.initial.map(value => exact(value)); }
  catch { return { ok: false, code: 'notation', guidance: 'Confirm each given as an integer, fraction with a positive denominator, or terminating decimal. Each integer part, fractional part, or denominator may have at most nine digits.' }; }
  for (let i = 0; i < size; i++) {
    if (!matrix[i].every(unit)) return { ok: false, code: 'matrix_probability', guidance: `Row ${i + 1} contains a value outside 0 to 1. Confirm that row with the source before using it as transition probabilities.` };
    if (!one(matrix[i])) return { ok: false, code: 'matrix_row_sum', guidance: `Row ${i + 1} does not sum exactly to 1, conflicting with the stated row-stochastic model. Confirm the row with the source; no entry has been changed or normalized.` };
  }
  if (!initial.every(unit)) return { ok: false, code: 'initial_probability', guidance: 'The initial vector contains a value outside 0 to 1. Confirm its probabilities before calculating.' };
  if (!one(initial)) return { ok: false, code: 'initial_sum', guidance: 'The initial vector does not sum exactly to 1. Confirm the supplied probabilities; they have not been normalized.' };
  return { ok: true, specification: s, matrix, initial };
}

export function checkStochasticResponse(raw: unknown, response: string): {
  status: 'matches' | 'revise' | 'unsupported'; guidance: string; code: string;
} {
  const checked = validateStochasticGivens(raw);
  if (!checked.ok) return { status: 'unsupported', guidance: checked.guidance, code: checked.code };
  let actual: Rational[];
  try {
    if (response.length > 700) throw new Error('length');
    const parts = response.split(',');
    if (parts.length !== checked.initial.length) throw new Error('dimension');
    // Four products of nine-digit givens need at most 72 denominator digits.
    // Responses need a wider exact representation than any individual given.
    actual = parts.map(value => exact(value, 80));
  } catch { return { status: 'unsupported', code: 'response_format', guidance: `Enter exactly ${checked.initial.length} probabilities separated by commas, in the stated state order. Use exact fractions or terminating decimals without brackets or labels.` }; }
  try {
    if (!actual.every(unit) || !one(actual)) return { status: 'revise', code: 'response_probability', guidance: 'Check that your response probabilities are between 0 and 1 and sum exactly to 1. Keep the declared state order.' };
  } catch { return { status: 'unsupported', code: 'response_arithmetic_bounds', guidance: 'These response fractions exceed the bounded arithmetic check. Simplify each fraction or request a separate exact-arithmetic review.' }; }
  const expected = checked.initial.map((_, j) => checked.initial.reduce((total, p, i) => add(total, multiply(p, checked.matrix[i][j])), rational(0n)));
  const matches = actual.every((value, i) => same(value, expected[i]));
  return { status: matches ? 'matches' : 'revise', code: matches ? 'exact_match' : 'calculation', guidance: matches
    ? 'Your probability vector matches the exact one-step calculation pP. Explain the contribution to each component.'
    : 'Recheck each output component by multiplying the initial probabilities by the corresponding column of P and adding. Keep the state order fixed.' };
}

/** Givens only, never the computed answer. Used to keep authored prompts consistent. */
export function describeStochasticGivens(s: StochasticSpecification): string {
  return `State order: ${s.states.join(', ')}. P is declared row-stochastic; row i lists transitions from state i in that order. P rows: ${s.matrix.map(row => '(' + row.join(', ') + ')').join('; ')}. Initial row vector p: (${s.initial.join(', ')}). Use p_next = pP, not Pp. Report the one-step probabilities separated by commas in the stated order; use exact fractions or terminating decimals.`;
}
