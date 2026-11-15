import { parseLinearEquation } from './linear-equation-tutor'
import type { StudyHelperResult } from '@/lib/integrations/diana-study-helper-sidecar'

export const LOCAL_FIRST_ALGEBRA_VERSION = 'owned-linear-initial-hint-v1'

/** Ownership/source confirmation are established by the calling authenticated route.
 * This is an initial scaffold only. No attempt checking, inference from chat history,
 * extracted source, textbook reasoning or general-language classification is performed.
 */
export function localFirstAlgebra(input: {
  ownedProblem: string | null
  visibleWork: string
  question: string
  mode: string
  conversationLength: number
  hasReferenceSelection: boolean
}): StudyHelperResult | null {
  if (input.ownedProblem === null || input.conversationLength !== 0 || input.hasReferenceSelection
    || !['hint', 'guide'].includes(input.mode)) return null
  const problem = input.ownedProblem.trim()
  // Existing work or other context requires the broader tutor; do not overwrite it
  // with an initial hint merely because an equation exists elsewhere in the request.
  const visible = input.visibleWork.trim()
  if (visible && ![problem, `Problem: ${problem}`, `Work unit: ${problem}`].includes(visible)) return null
  if (!/^(?:i(?: am|'m) stuck|help|help me(?: start)?|give me a hint|hint|how do i start|where do i start|what is the first step)[.!?]?$/iu.test(input.question.trim())) return null
  const equation = parseLinearEquation(problem)
  if (!equation) return null
  const { coefficient, constant, rhs } = equation
  const action = constant > 0 ? `Subtract ${constant} from both sides.`
    : constant < 0 ? `Add ${Math.abs(constant)} to both sides.`
    : coefficient !== 1 ? `Divide both sides by ${coefficient}.`
    : `Substitute ${rhs} for x in the original equation.`
  return {
    title: 'Your first step',
    main: action,
    reason: constant !== 0 || coefficient !== 1
      ? 'Applying the same operation to both sides keeps the equation balanced.'
      : 'Substitution checks the stated value in the original equation.',
    steps: [constant !== 0 ? 'What equation remains?' : 'What do you get on each side?'],
    anchor: `Selected problem: ${problem}`,
  }
}
