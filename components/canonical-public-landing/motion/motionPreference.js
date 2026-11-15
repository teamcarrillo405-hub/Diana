export const MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)'
export const MOTION_STORAGE_KEY = 'diana.reduceMotion'

export const MOTION_OVERRIDE_SYSTEM = 'system'
export const MOTION_OVERRIDE_REDUCE = 'reduce'
export const MOTION_OVERRIDE_FULL = 'full'

const VALID_MOTION_OVERRIDES = new Set([
  MOTION_OVERRIDE_SYSTEM,
  MOTION_OVERRIDE_REDUCE,
  MOTION_OVERRIDE_FULL,
])

export function normalizeMotionOverride(value, fallback = MOTION_OVERRIDE_SYSTEM) {
  const normalizedFallback = VALID_MOTION_OVERRIDES.has(fallback)
    ? fallback
    : MOTION_OVERRIDE_SYSTEM

  return VALID_MOTION_OVERRIDES.has(value) ? value : normalizedFallback
}

export function resolveReducedMotion(motionOverride, systemReducedMotion) {
  const normalizedOverride = normalizeMotionOverride(motionOverride)

  if (normalizedOverride === MOTION_OVERRIDE_REDUCE) return true
  if (normalizedOverride === MOTION_OVERRIDE_FULL) return false

  return Boolean(systemReducedMotion)
}

export function getSafeStorage(windowObject) {
  if (!windowObject) return null

  try {
    return windowObject.localStorage ?? null
  } catch {
    return null
  }
}

export function readMotionOverride(
  storage,
  storageKey = MOTION_STORAGE_KEY,
  fallback = MOTION_OVERRIDE_SYSTEM,
) {
  const normalizedFallback = normalizeMotionOverride(fallback)
  if (!storage || typeof storage.getItem !== 'function') return normalizedFallback

  try {
    const storedValue = storage.getItem(storageKey)
    if (storedValue === null) return normalizedFallback

    return normalizeMotionOverride(storedValue, normalizedFallback)
  } catch {
    return normalizedFallback
  }
}

export function persistMotionOverride(
  storage,
  motionOverride,
  storageKey = MOTION_STORAGE_KEY,
) {
  if (!storage || typeof storage.setItem !== 'function') return false

  try {
    storage.setItem(storageKey, normalizeMotionOverride(motionOverride))
    return true
  } catch {
    return false
  }
}

export function getMotionMediaQuery(windowObject) {
  if (!windowObject || typeof windowObject.matchMedia !== 'function') return null

  try {
    return windowObject.matchMedia(MOTION_MEDIA_QUERY)
  } catch {
    return null
  }
}

export function subscribeToMotionMediaQuery(mediaQueryList, onChange) {
  if (!mediaQueryList || typeof onChange !== 'function') return () => {}

  const handleChange = (event) => onChange(Boolean(event.matches))

  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', handleChange)
    return () => mediaQueryList.removeEventListener?.('change', handleChange)
  }

  if (typeof mediaQueryList.addListener === 'function') {
    mediaQueryList.addListener(handleChange)
    return () => mediaQueryList.removeListener?.(handleChange)
  }

  return () => {}
}
