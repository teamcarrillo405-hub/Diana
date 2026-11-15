import { expect, it } from 'vitest';
import { lexicalDirectiveFallback } from './retrieval';
it('retains all opaque subject tokens and numbers as AND terms', () => {
  expect(lexicalDirectiveFallback('Please explain alpha and beta 3')).toBe('alpha beta 3');
  expect(lexicalDirectiveFallback('Compare alpha omega')).toBe('alpha omega');
  expect(lexicalDirectiveFallback('Compare alpha and beta and explain gamma')).toBe('alpha beta gamma');
  expect(lexicalDirectiveFallback('Explain SQL EXPLAIN alpha')).toBe('sql explain alpha');
  expect(lexicalDirectiveFallback('Describe compare opcode')).toBe('compare opcode');
});
it('does not invent a query for no directive or directive-only requests', () => {
  expect(lexicalDirectiveFallback('alpha beta')).toBeNull();
  expect(lexicalDirectiveFallback('Please explain')).toBeNull();
  expect(lexicalDirectiveFallback('SQL EXPLAIN alpha')).toBeNull();
  expect(lexicalDirectiveFallback('Explain ' + Array.from({ length: 41 }, (_, index) => `term${index}`).join(' '))).toBeNull();
});
it('preserves explicit negation, quoted phrases and OR syntax by declining fallback', () => {
  for (const query of ['Explain alpha -beta', 'Explain "alpha beta"', "Explain 'alpha beta'", 'Explain alpha OR beta', 'Explain alpha or beta']) expect(lexicalDirectiveFallback(query)).toBeNull();
});
