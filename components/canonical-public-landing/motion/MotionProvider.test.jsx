import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  MOTION_OVERRIDE_FULL,
  MOTION_OVERRIDE_REDUCE,
  MotionProvider,
  useMotion,
} from './index'

function MotionProbe() {
  const { motionOverride, reducedMotion, systemReducedMotion } = useMotion()

  return (
    <output
      data-override={motionOverride}
      data-reduced={String(reducedMotion)}
      data-system-reduced={String(systemReducedMotion)}
    />
  )
}

describe('MotionProvider', () => {
  it('renders safely without browser globals and honors a reduced default', () => {
    const markup = renderToString(
      <MotionProvider defaultOverride={MOTION_OVERRIDE_REDUCE}>
        <MotionProbe />
      </MotionProvider>,
    )

    expect(markup).toContain('data-override="reduce"')
    expect(markup).toContain('data-reduced="true"')
    expect(markup).toContain('data-system-reduced="false"')
  })

  it('allows a full-motion override even when no system preference is available', () => {
    const markup = renderToString(
      <MotionProvider defaultOverride={MOTION_OVERRIDE_FULL}>
        <MotionProbe />
      </MotionProvider>,
    )

    expect(markup).toContain('data-override="full"')
    expect(markup).toContain('data-reduced="false"')
  })

  it('requires consumers to be nested under the provider', () => {
    expect(() => renderToString(<MotionProbe />)).toThrow(
      'useMotion must be used within a MotionProvider',
    )
  })
})
