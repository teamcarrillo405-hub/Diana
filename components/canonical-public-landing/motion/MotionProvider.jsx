import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { MotionContext } from './MotionContext'
import {
  MOTION_OVERRIDE_SYSTEM,
  MOTION_STORAGE_KEY,
  getMotionMediaQuery,
  getSafeStorage,
  normalizeMotionOverride,
  persistMotionOverride,
  readMotionOverride,
  resolveReducedMotion,
  subscribeToMotionMediaQuery,
} from './motionPreference'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function getBrowserWindow() {
  return typeof window === 'undefined' ? null : window
}

export function MotionProvider({
  children,
  defaultOverride = MOTION_OVERRIDE_SYSTEM,
  storageKey = MOTION_STORAGE_KEY,
}) {
  const normalizedDefault = normalizeMotionOverride(defaultOverride)
  const [motionOverride, setMotionOverrideState] = useState(normalizedDefault)
  const [systemReducedMotion, setSystemReducedMotion] = useState(false)

  useIsomorphicLayoutEffect(() => {
    const browserWindow = getBrowserWindow()
    if (!browserWindow) return undefined

    const storage = getSafeStorage(browserWindow)
    setMotionOverrideState(readMotionOverride(storage, storageKey, normalizedDefault))

    const mediaQueryList = getMotionMediaQuery(browserWindow)
    if (mediaQueryList) setSystemReducedMotion(Boolean(mediaQueryList.matches))

    const unsubscribeFromMediaQuery = subscribeToMotionMediaQuery(
      mediaQueryList,
      setSystemReducedMotion,
    )

    const handleStorage = (event) => {
      if (event.key !== storageKey) return
      setMotionOverrideState(normalizeMotionOverride(event.newValue))
    }

    try {
      browserWindow.addEventListener?.('storage', handleStorage)
    } catch {
      // Storage can be disabled by browser policy; the in-memory override still works.
    }

    return () => {
      unsubscribeFromMediaQuery()
      try {
        browserWindow.removeEventListener?.('storage', handleStorage)
      } catch {
        // A restricted test/browser environment may also reject listener cleanup.
      }
    }
  }, [normalizedDefault, storageKey])

  const setMotionOverride = useCallback((nextOverride) => {
    const normalizedOverride = normalizeMotionOverride(nextOverride)
    setMotionOverrideState(normalizedOverride)

    const browserWindow = getBrowserWindow()
    persistMotionOverride(getSafeStorage(browserWindow), normalizedOverride, storageKey)
  }, [storageKey])

  const resetMotionOverride = useCallback(() => {
    setMotionOverride(MOTION_OVERRIDE_SYSTEM)
  }, [setMotionOverride])

  const reducedMotion = resolveReducedMotion(motionOverride, systemReducedMotion)
  const value = useMemo(() => ({
    motionOverride,
    reducedMotion,
    systemReducedMotion,
    setMotionOverride,
    resetMotionOverride,
  }), [
    motionOverride,
    reducedMotion,
    resetMotionOverride,
    setMotionOverride,
    systemReducedMotion,
  ])

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}
