import { describe, expect, it } from 'vitest'
import { voiceJobScope } from './voice-job-scope'
describe('stored voice scope', () => {
  it('retains legacy general input and assignment scope', () => {
    expect(voiceJobScope({ input: {} })).toEqual({ ok: true, assignmentId: null })
    expect(voiceJobScope({ input: { assignmentId: ' a ' } })).toEqual({ ok: true, assignmentId: 'a' })
  })
  it.each([null, {}, [], { input: [] }, { input: { assignmentId: 2 } }, { input: { assignmentId: '' } }])('rejects malformed input %j', input => {
    expect(voiceJobScope(input)).toEqual({ ok: false })
  })
})
