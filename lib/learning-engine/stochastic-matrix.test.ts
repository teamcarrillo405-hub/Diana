import { describe, expect, it } from 'vitest';
import { checkStochasticResponse, validateStochasticGivens, type StochasticSpecification } from './stochastic-matrix';

// Opaque arithmetic contract fixtures, not a held-out educational evaluation corpus.
const spec = (matrix: string[][] = [['3/4', '1/4'], ['1/2', '1/2']], initial = ['1/3', '2/3']): StochasticSpecification => ({
  convention: 'row_vector_p_times_P', states: matrix.map((_, i) => 'State ' + i), matrix, initial,
});
describe('bounded row-stochastic arithmetic', () => {
  it('uses pP, exact fractions and equivalent terminating decimal notation', () => {
    expect(checkStochasticResponse(spec(), '7/12,5/12').status).toBe('matches');
    expect(checkStochasticResponse(spec(undefined, ['0.5', '0.5']), '0.625,0.375').status).toBe('matches');
    expect(checkStochasticResponse(spec(), '5/12,7/12').status).toBe('revise');
  });
  it('preserves arbitrary valid vectors under identity and applies permutations', () => {
    const p = ['1/7', '2/7', '4/7'];
    expect(checkStochasticResponse(spec([['1','0','0'],['0','1','0'],['0','0','1']], p), p.join(',')).status).toBe('matches');
    expect(checkStochasticResponse(spec([['0','1','0'],['0','0','1'],['1','0','0']], p), '4/7,1/7,2/7').status).toBe('matches');
  });
  it('basis vectors select corresponding rows, including four states', () => {
    const m = [['1/10','2/10','3/10','4/10'],['0','0','1','0'],['1/4','1/4','1/4','1/4'],['0','1','0','0']];
    for (let i = 0; i < 4; i++) expect(checkStochasticResponse(spec(m, m.map((_, j) => i === j ? '1' : '0')), m[i].join(',')).status).toBe('matches');
  });
  it('is equivariant under consistent permutation of states', () => {
    const a = spec([['1/2','1/3','1/6'],['0','1/2','1/2'],['1/4','1/4','1/2']], ['1/2','1/3','1/6']);
    expect(checkStochasticResponse(a, '7/24,3/8,1/3').status).toBe('matches');
    const order = [2,0,1], b = { ...a, states: order.map(i => a.states[i]), initial: order.map(i => a.initial[i]), matrix: order.map(i => order.map(j => a.matrix[i][j])) };
    expect(checkStochasticResponse(b, '1/3,7/24,3/8').status).toBe('matches');
  });
  it('distinguishes row-stochastic from merely column-stochastic givens', () => {
    expect(validateStochasticGivens(spec([['1/2','1/4'],['1/2','3/4']]))).toMatchObject({ ok: false, code: 'matrix_row_sum' });
  });
  it.each([
    [['-1/4','5/4'],['1/2','1/2']],
    [['5/4','-1/4'],['1/2','1/2']],
    [['0.333333333','0.666666666'],['1/2','1/2']],
  ])('does not normalize or repair invalid matrix probabilities', (...matrix) => {
    const given = spec(matrix), before = JSON.stringify(given);
    expect(checkStochasticResponse(given, '1/2,1/2').status).toBe('unsupported');
    expect(JSON.stringify(given)).toBe(before);
  });
  it.each([['-1/2','3/2'], ['1/4','1/4']])('rejects invalid initial distributions', (...p) => {
    expect(validateStochasticGivens(spec(undefined, p)).ok).toBe(false);
  });
  it('rejects dimensions, ambiguous labels, unknown fields and column convention', () => {
    for (const raw of [{ ...spec(), matrix: [['1','0']] }, { ...spec(), initial: ['1'] }, { ...spec(), states: ['A','a'] },
      { ...spec(), convention: 'column_vector' }, { ...spec(), expected: ['1','0'] },
      spec(Array.from({ length: 5 }, () => ['1','0','0','0','0']), ['1','0','0','0','0'])]) expect(validateStochasticGivens(raw).ok).toBe(false);
  });
  it.each(['NaN', 'Infinity', '1/0', '1e-2', 'sqrt(1)', '1+0', '1234567890'])('rejects unsupported given %s', value => {
    expect(validateStochasticGivens(spec([[value,'0'],['0','1']])).ok).toBe(false);
  });
  it.each(['(7/12,5/12)', '[7/12,5/12]', 'A=7/12,B=5/12', '7/12', '7/12,5/12,0', '1'.repeat(701)])('requires explicit bounded response notation', value => {
    expect(checkStochasticResponse(spec(), value).status).toBe('unsupported');
  });
  it('rejects response violations of conservation, even if entries look plausible', () => {
    expect(checkStochasticResponse(spec(), '1/2,1/4')).toMatchObject({ status: 'revise', code: 'response_probability' });
    expect(checkStochasticResponse(spec(), '-1/2,3/2')).toMatchObject({ status: 'revise', code: 'response_probability' });
  });
  it('accepts exact derived fractions longer than the bounded givens', () => {
    const given = spec([['1/999999929','999999928/999999929'],['0','1']], ['1/999999937','999999936/999999937']);
    expect(validateStochasticGivens(given).ok).toBe(true);
    expect(checkStochasticResponse(given, '1/999999866000004473,999999866000004472/999999866000004473').status).toBe('matches');
  });
  it('returns unsupported rather than throwing on oversized response arithmetic', () => {
    const given = spec([['1','0','0','0'],['0','1','0','0'],['0','0','1','0'],['0','0','0','1']], ['1','0','0','0']);
    const denominators = [1n,3n,7n,9n].map(n => String(10n ** 79n + n));
    expect(checkStochasticResponse(given, denominators.map(d => '1/' + d).join(','))).toMatchObject({ status: 'unsupported', code: 'response_arithmetic_bounds' });
    expect(checkStochasticResponse(given, '1/' + '9'.repeat(81) + ',0,0,0')).toMatchObject({ status: 'unsupported', code: 'response_format' });
  });
});
