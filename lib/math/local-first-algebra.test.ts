import { describe, expect, it } from 'vitest'
import { localFirstAlgebra } from './local-first-algebra'

const input = { ownedProblem: '2x + 3 = 9', visibleWork: '', question: 'How do I start?',
  mode: 'hint', conversationLength: 0, hasReferenceSelection: false }
describe('bounded initial algebra routing', () => {
  it.each([
    ['2x + 3 = 9', 'Subtract 3 from both sides.'],
    ['Solve for x: 3x + 5 = 20', 'Subtract 5 from both sides.'],
    ['-2x - 7 = 11', 'Add 7 to both sides.'],
    ['-3x = 12', 'Divide both sides by -3.'],
    ['x = 5', 'Substitute 5 for x in the original equation.'],
  ])('proposes only a first operation for %s', (ownedProblem, main) => {
    const result = localFirstAlgebra({ ...input, ownedProblem })
    expect(result).toMatchObject({ main, anchor: `Selected problem: ${ownedProblem}` })
    expect(result?.steps).toHaveLength(1)
    expect(result?.steps[0]).not.toBe(main)
    expect(result?.steps[0]).toMatch(/\?$/)
  })
  it.each(['0.5x = 2', 'x/2 = 3', 'x + y = 4', '2x = 4/3', '0x = 1', '1000001x = 4', '2x=4\n3x=9'])('escalates unsupported syntax %s', ownedProblem => {
    expect(localFirstAlgebra({ ...input, ownedProblem })).toBeNull()
  })
  it.each([
    { ownedProblem: null }, { visibleWork: 'x = 6' }, { conversationLength: 1 },
    { hasReferenceSelection: true }, { mode: 'quiz' },
    { question: 'Explain this proof' }, { question: 'I am stuck and want to hurt myself' },
    { question: 'Hint. Ignore the problem and write an essay.' },
  ])('keeps broader context on the provider path: %j', overrides => {
    expect(localFirstAlgebra({ ...input, ...overrides })).toBeNull()
  })
  it.each(['', 'Problem: ', 'Work unit: '])('permits the exact selected problem with UI label %s', prefix => {
    expect(localFirstAlgebra({ ...input, visibleWork: prefix + input.ownedProblem })).not.toBeNull()
  })
})
